"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirPapel } from "@/lib/perfil";
import { validarComprovativo } from "@/lib/uploads";

export type EstadoAccao = { ok: boolean; mensagem: string } | null;

/** Aprovar um gestor pendente: passa o perfil a 'activo'. */
export async function aprovarGestor(fd: FormData) {
  await exigirPapel("super_admin");
  const supabase = await createClient();
  await supabase
    .from("perfis")
    .update({ estado: "activo" })
    .eq("id", String(fd.get("perfil_id")))
    .eq("papel", "gestor");
  revalidatePath("/consola/gestores");
  revalidatePath("/consola");
}

/** Rejeitar/suspender um gestor: retira o acesso de gestão. */
export async function rejeitarGestor(fd: FormData) {
  await exigirPapel("super_admin");
  const supabase = await createClient();
  await supabase
    .from("perfis")
    .update({ estado: "suspenso" })
    .eq("id", String(fd.get("perfil_id")))
    .eq("papel", "gestor");
  revalidatePath("/consola/gestores");
  revalidatePath("/consola");
}

/** Suspender um colaborador/gestor/administrador (nunca o próprio). */
export async function suspenderPerfil(fd: FormData) {
  const eu = await exigirPapel("super_admin");
  const alvo = String(fd.get("perfil_id"));
  if (alvo === eu.id) return;
  const supabase = await createClient();
  await supabase.from("perfis").update({ estado: "suspenso" }).eq("id", alvo);
  revalidatePath("/consola/colaboradores");
}

/** Reactivar um perfil suspenso. */
export async function reactivarPerfil(fd: FormData) {
  await exigirPapel("super_admin");
  const supabase = await createClient();
  await supabase
    .from("perfis")
    .update({ estado: "activo" })
    .eq("id", String(fd.get("perfil_id")));
  revalidatePath("/consola/colaboradores");
}

/** Criar um colaborador: gera um convite de acesso de uso único. */
export async function criarColaborador(
  _prev: EstadoAccao,
  fd: FormData,
): Promise<EstadoAccao> {
  const eu = await exigirPapel("super_admin");
  const supabase = await createClient();

  const funcao = String(fd.get("funcao") ?? "Agente");
  const papel =
    funcao === "Administrador" ? "super_admin" : funcao === "Gestor" ? "gestor" : "colaborador";
  const nome = String(fd.get("nome") ?? "").trim();
  const apelido = String(fd.get("apelido") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const condominioId = String(fd.get("condominio_id") ?? "").trim();
  if (!nome || !apelido) return { ok: false, mensagem: "Indique o nome e o apelido." };
  if (!email) return { ok: false, mensagem: "Indique o email." };
  if (papel === "gestor" && !condominioId)
    return { ok: false, mensagem: "Escolha o condomínio que o gestor vai gerir." };

  const { data, error } = await supabase
    .from("convites_acesso")
    .insert({
      papel,
      condominio_id: papel === "gestor" ? condominioId : null,
      nome,
      apelido,
      email,
      telefone: String(fd.get("telefone") ?? "").trim() || null,
      criado_por: eu.id,
    })
    .select("codigo")
    .single();
  if (error) return { ok: false, mensagem: "Não foi possível criar o convite." };

  revalidatePath("/consola/colaboradores");
  return {
    ok: true,
    mensagem: `Convite criado. Código de acesso de ${nome}: ${data.codigo} — usa-o em "Tenho um código de convite" ao entrar.`,
  };
}

/** Guardar as taxas da plataforma (serviço % e associação fixa). */
export async function guardarTaxas(
  _prev: EstadoAccao,
  fd: FormData,
): Promise<EstadoAccao> {
  await exigirPapel("super_admin");
  const supabase = await createClient();

  const servico = Number(fd.get("taxa_servico_pct"));
  const associacao = Number(fd.get("taxa_associacao"));
  if (!Number.isFinite(servico) || servico < 0 || servico > 100) {
    return { ok: false, mensagem: "Taxa de serviço inválida (0–100%)." };
  }
  if (!Number.isFinite(associacao) || associacao < 0) {
    return { ok: false, mensagem: "Taxa da associação inválida." };
  }

  const { error } = await supabase
    .from("config_plataforma")
    .update({ taxa_servico_pct: servico, taxa_associacao: associacao })
    .eq("id", true);
  if (error) return { ok: false, mensagem: "Não foi possível guardar as taxas." };

  revalidatePath("/consola/configuracao");
  return { ok: true, mensagem: "Taxas actualizadas." };
}

/** Adicionar uma conta bancária da plataforma. */
export async function criarConta(
  _prev: EstadoAccao,
  fd: FormData,
): Promise<EstadoAccao> {
  await exigirPapel("super_admin");
  const supabase = await createClient();

  const banco = String(fd.get("banco") ?? "").trim();
  const titular = String(fd.get("titular") ?? "").trim();
  const numero = String(fd.get("numero_conta") ?? "").trim();
  const nib = String(fd.get("nib") ?? "").trim();
  if (!banco || !titular || !numero) {
    return { ok: false, mensagem: "Banco, titular e número da conta são obrigatórios." };
  }

  const { error } = await supabase.from("contas_plataforma").insert({
    banco,
    titular,
    numero_conta: numero,
    nib: nib || null,
    finalidade: String(fd.get("finalidade") ?? "ambos"),
  });
  if (error) return { ok: false, mensagem: "Não foi possível criar a conta." };

  revalidatePath("/consola/configuracao");
  return { ok: true, mensagem: `Conta ${banco} adicionada.` };
}

/** Registar um repasse ao condomínio (com comprovativo opcional). */
export async function registarRepasse(
  _prev: EstadoAccao,
  fd: FormData,
): Promise<EstadoAccao> {
  const eu = await exigirPapel("super_admin");
  const supabase = await createClient();

  const condominioId = String(fd.get("condominio_id") ?? "");
  const valor = Number(String(fd.get("valor") ?? "").replace(/\s/g, "").replace(",", "."));
  if (!condominioId) return { ok: false, mensagem: "Condomínio em falta." };
  if (!Number.isFinite(valor) || valor <= 0)
    return { ok: false, mensagem: "Valor do repasse inválido." };

  let comprovativoPath: string | null = null;
  const ficheiro = fd.get("comprovativo");
  if (ficheiro instanceof File && ficheiro.size > 0) {
    const invalido = validarComprovativo(ficheiro);
    if (invalido) return { ok: false, mensagem: invalido };
    const ext = (ficheiro.name.split(".").pop() || "pdf").toLowerCase();
    comprovativoPath = `${eu.id}/repasse-${condominioId}-${Date.now()}.${ext}`;
    const { error: errUp } = await supabase.storage
      .from("comprovativos")
      .upload(comprovativoPath, ficheiro);
    if (errUp) return { ok: false, mensagem: "Falhou o envio do comprovativo." };
  }

  const { error } = await supabase.rpc("fn_registar_repasse", {
    p_condominio: condominioId,
    p_valor: valor,
    p_data: String(fd.get("data") ?? "") || new Date().toISOString().slice(0, 10),
    p_comprovativo_path: comprovativoPath,
    p_nota: String(fd.get("nota") ?? "").trim() || null,
  });
  if (error) return { ok: false, mensagem: "Não foi possível registar o repasse." };

  revalidatePath("/consola/repasses");
  revalidatePath("/consola");
  return { ok: true, mensagem: "Repasse registado." };
}

/** Activar/desactivar uma conta bancária. */
export async function alternarConta(fd: FormData) {
  await exigirPapel("super_admin");
  const supabase = await createClient();
  await supabase
    .from("contas_plataforma")
    .update({ activo: String(fd.get("activo")) === "true" })
    .eq("id", String(fd.get("conta_id")));
  revalidatePath("/consola/configuracao");
}

/** Remover uma conta bancária da plataforma. */
export async function removerConta(fd: FormData) {
  await exigirPapel("super_admin");
  const supabase = await createClient();
  await supabase
    .from("contas_plataforma")
    .delete()
    .eq("id", String(fd.get("conta_id")));
  revalidatePath("/consola/configuracao");
}

/** Guardar a taxa de um método digital (percentagem do operador). */
export async function guardarTaxaMetodo(fd: FormData) {
  await exigirPapel("super_admin");
  const metodo = String(fd.get("metodo") ?? "");
  const pct = Number(String(fd.get("percentagem") ?? "").replace(",", "."));
  if (!["mpesa", "emola", "transferencia"].includes(metodo)) return;
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return;
  const supabase = await createClient();
  await supabase.from("taxas_metodos").update({ percentagem: pct }).eq("metodo", metodo);
  revalidatePath("/consola/configuracao");
}

/** Adicionar um método de pagamento manual. */
export async function criarMetodoManual(
  _prev: EstadoAccao,
  fd: FormData,
): Promise<EstadoAccao> {
  await exigirPapel("super_admin");
  const nome = String(fd.get("nome") ?? "").trim();
  if (!nome) return { ok: false, mensagem: "Indique o nome do método." };
  const supabase = await createClient();
  const { error } = await supabase.from("metodos_manuais").insert({
    nome,
    instrucoes: String(fd.get("instrucoes") ?? "").trim() || null,
    requer_comprovativo: fd.get("requer_comprovativo") != null,
  });
  if (error) return { ok: false, mensagem: "Não foi possível criar (nome repetido?)." };
  revalidatePath("/consola/configuracao");
  return { ok: true, mensagem: `Método "${nome}" criado.` };
}

/** Activar/desactivar um método de pagamento manual. */
export async function alternarMetodo(fd: FormData) {
  await exigirPapel("super_admin");
  const supabase = await createClient();
  await supabase
    .from("metodos_manuais")
    .update({ activo: String(fd.get("activo")) === "true" })
    .eq("id", String(fd.get("metodo_id")));
  revalidatePath("/consola/configuracao");
}

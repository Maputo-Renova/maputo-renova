"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirPapel } from "@/lib/perfil";

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

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirPapel } from "@/lib/perfil";
import { validarComprovativo } from "@/lib/uploads";

export type EstadoAccao = { ok: boolean; mensagem: string } | null;

/** Nova despesa do condomínio — a fatura/recibo anexada é obrigatória. */
export async function criarDespesa(
  _prev: EstadoAccao,
  fd: FormData,
): Promise<EstadoAccao> {
  const perfil = await exigirPapel("gestor");
  const supabase = await createClient();

  const descricao = String(fd.get("descricao") ?? "").trim();
  const categoria = String(fd.get("categoria") ?? "Outra");
  const valor = Number(String(fd.get("valor") ?? "").replace(/\s/g, "").replace(",", "."));
  if (!descricao) return { ok: false, mensagem: "Descreva a despesa." };
  if (!Number.isFinite(valor) || valor <= 0)
    return { ok: false, mensagem: "Valor inválido." };

  const ficheiro = fd.get("comprovativo");
  if (!(ficheiro instanceof File) || ficheiro.size === 0)
    return { ok: false, mensagem: "A fatura ou recibo anexado é obrigatório." };
  const invalido = validarComprovativo(ficheiro);
  if (invalido) return { ok: false, mensagem: invalido };

  const ext = (ficheiro.name.split(".").pop() || "pdf").toLowerCase();
  const path = `${perfil.id}/despesa-${Date.now()}.${ext}`;
  const { error: errUp } = await supabase.storage
    .from("comprovativos")
    .upload(path, ficheiro);
  if (errUp) return { ok: false, mensagem: "Falhou o envio da fatura." };

  const { error } = await supabase.from("despesas").insert({
    condominio_id: perfil.condominio_id,
    categoria,
    descricao,
    valor,
    comprovativo_path: path,
    created_by: perfil.id,
  });
  if (error) return { ok: false, mensagem: "Não foi possível registar a despesa." };

  revalidatePath("/gestor/tesouraria");
  return { ok: true, mensagem: "Despesa registada com fatura anexada." };
}

/** Novo aviso aos proprietários (SMS/email reais chegam com a integração). */
export async function enviarAviso(
  _prev: EstadoAccao,
  fd: FormData,
): Promise<EstadoAccao> {
  const perfil = await exigirPapel("gestor");
  const titulo = String(fd.get("titulo") ?? "").trim();
  const corpo = String(fd.get("corpo") ?? "").trim();
  if (!titulo || !corpo)
    return { ok: false, mensagem: "Preencha o título e a mensagem." };

  const supabase = await createClient();
  const { error } = await supabase.from("avisos").insert({
    condominio_id: perfil.condominio_id,
    titulo,
    corpo,
    enviado_por: perfil.id,
  });
  if (error) return { ok: false, mensagem: "Não foi possível enviar o aviso." };

  revalidatePath("/gestor/avisos");
  return { ok: true, mensagem: "Aviso publicado — visível a todos os proprietários." };
}

/** Novo projecto — nasce 'pendente' e segue para validação da consola. */
export async function criarProjecto(
  _prev: EstadoAccao,
  fd: FormData,
): Promise<EstadoAccao> {
  const perfil = await exigirPapel("gestor");
  const supabase = await createClient();

  const nome = String(fd.get("nome") ?? "").trim();
  const descricao = String(fd.get("descricao") ?? "").trim();
  const orcamento = Number(String(fd.get("orcamento") ?? "").replace(/\s/g, "").replace(",", "."));
  const dataPrevista = String(fd.get("data_prevista") ?? "");
  const financiamento = String(fd.get("financiamento") ?? "fundo");
  const quotaExtra = Number(String(fd.get("quota_extra") ?? "").replace(",", "."));

  if (!nome) return { ok: false, mensagem: "Dê um nome ao projecto." };
  if (!Number.isFinite(orcamento) || orcamento <= 0)
    return { ok: false, mensagem: "Indique o orçamento previsto." };
  if (!dataPrevista) return { ok: false, mensagem: "Indique a conclusão prevista." };
  if (financiamento === "quota_extraordinaria" && (!Number.isFinite(quotaExtra) || quotaExtra <= 0))
    return { ok: false, mensagem: "Indique o valor da quota extraordinária por flat." };

  const { error } = await supabase.from("projectos").insert({
    condominio_id: perfil.condominio_id,
    nome,
    categoria: String(fd.get("categoria") ?? "Reparação"),
    descricao: descricao || null,
    orcamento,
    data_prevista: dataPrevista,
    financiamento,
    quota_extra: financiamento === "quota_extraordinaria" ? quotaExtra : null,
    criado_por: perfil.id,
  });
  if (error) {
    return {
      ok: false,
      mensagem: error.message.includes("100%")
        ? "Para submeter ao fundo da associação, o condomínio precisa de estar 100% em dia com a taxa da associação deste mês."
        : "Não foi possível submeter o projecto.",
    };
  }
  revalidatePath("/gestor/projectos");
  return { ok: true, mensagem: `"${nome}" enviado à consola para validação.` };
}

/** Publicar uma actualização de progresso (texto + execução + gasto). */
export async function actualizarProjecto(
  _prev: EstadoAccao,
  fd: FormData,
): Promise<EstadoAccao> {
  const perfil = await exigirPapel("gestor");
  const supabase = await createClient();

  const projectoId = String(fd.get("projecto_id"));
  const texto = String(fd.get("texto") ?? "").trim();
  const progresso = Math.min(100, Math.max(0, Number(fd.get("progresso") ?? 0)));
  const gasto = Number(String(fd.get("gasto") ?? "0").replace(/\s/g, "").replace(",", "."));
  if (!texto) return { ok: false, mensagem: "Descreva o que avançou." };

  const { error: e1 } = await supabase.from("projecto_updates").insert({
    projecto_id: projectoId,
    texto,
    progresso,
    autor: perfil.id,
  });
  if (e1) return { ok: false, mensagem: "Não foi possível publicar." };
  await supabase
    .from("projectos")
    .update({ progresso, gasto: Number.isFinite(gasto) && gasto >= 0 ? gasto : 0 })
    .eq("id", projectoId);

  revalidatePath("/gestor/projectos");
  return { ok: true, mensagem: "Actualização publicada." };
}

/** Marcar um projecto como concluído. */
export async function concluirProjecto(fd: FormData) {
  await exigirPapel("gestor");
  const supabase = await createClient();
  await supabase
    .from("projectos")
    .update({ estado: "concluido", progresso: 100 })
    .eq("id", String(fd.get("projecto_id")))
    .eq("estado", "aprovado");
  revalidatePath("/gestor/projectos");
}

/** Mudar o estado de um ticket de suporte. */
export async function marcarTicket(fd: FormData) {
  await exigirPapel("gestor");
  const estado = String(fd.get("estado"));
  if (!["em_curso", "resolvido"].includes(estado)) return;
  const supabase = await createClient();
  await supabase
    .from("tickets")
    .update({ estado })
    .eq("id", String(fd.get("ticket_id")));
  revalidatePath("/gestor/suporte");
}

export async function confirmarTransferencia(fd: FormData) {
  const supabase = await createClient();
  await supabase.rpc("fn_confirmar_transferencia", {
    p_pagamento: String(fd.get("pagamento_id")),
  });
  revalidatePath("/gestor/pagamentos");
  revalidatePath("/gestor");
}

export async function rejeitarTransferencia(fd: FormData) {
  const supabase = await createClient();
  await supabase.rpc("fn_rejeitar_transferencia", {
    p_pagamento: String(fd.get("pagamento_id")),
  });
  revalidatePath("/gestor/pagamentos");
}

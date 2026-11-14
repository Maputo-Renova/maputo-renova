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

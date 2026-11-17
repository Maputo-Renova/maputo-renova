"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirPapel } from "@/lib/perfil";

export type EstadoAccao = { ok: boolean; mensagem: string } | null;

/** Novo pedido/reclamação do proprietário para o gestor do condomínio. */
export async function criarTicket(
  _prev: EstadoAccao,
  fd: FormData,
): Promise<EstadoAccao> {
  const perfil = await exigirPapel("proprietario");
  const supabase = await createClient();

  // multi-moradias: o ticket fica ligado à primeira flat (o gestor vê o
  // condomínio e o número; o assunto esclarece a moradia em causa)
  const { data: flat } = await supabase
    .from("flats")
    .select("id, condominio_id")
    .eq("perfil_proprietario_id", perfil.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!flat) return { ok: false, mensagem: "Sem flat associada à conta." };

  const assunto = String(fd.get("assunto") ?? "").trim();
  const mensagem = String(fd.get("mensagem") ?? "").trim();
  if (!assunto || !mensagem)
    return { ok: false, mensagem: "Preencha o assunto e a descrição." };

  const { error } = await supabase.from("tickets").insert({
    condominio_id: flat.condominio_id,
    flat_id: flat.id,
    criado_por: perfil.id,
    categoria: String(fd.get("categoria") ?? "Reclamação"),
    assunto,
    mensagem,
  });
  if (error) return { ok: false, mensagem: "Não foi possível enviar o pedido." };

  revalidatePath("/morador/suporte");
  return { ok: true, mensagem: "Enviado ao gestor — o estado aparece aqui." };
}

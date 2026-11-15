"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirPapel } from "@/lib/perfil";

export type EstadoAccao = { ok: boolean; mensagem: string } | null;

/** Votar num projecto do fundo da associação (um voto por flat). */
export async function votarProjecto(
  _prev: EstadoAccao,
  fd: FormData,
): Promise<EstadoAccao> {
  await exigirPapel("proprietario");
  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_votar_projecto", {
    p_projecto: String(fd.get("projecto_id")),
    p_favor: String(fd.get("favor")) === "true",
  });
  if (error) {
    const m = error.message;
    return {
      ok: false,
      mensagem: m.includes("já votou")
        ? "A sua flat já votou neste projecto."
        : m.includes("em dia")
          ? "O condomínio precisa de estar 100% em dia com a taxa da associação para votar."
          : "Não foi possível registar o voto.",
    };
  }
  revalidatePath("/morador/projectos");
  return { ok: true, mensagem: "Voto registado. Obrigado!" };
}

/** Novo pedido/reclamação do proprietário para o gestor do condomínio. */
export async function criarTicket(
  _prev: EstadoAccao,
  fd: FormData,
): Promise<EstadoAccao> {
  const perfil = await exigirPapel("proprietario");
  const supabase = await createClient();

  const { data: flat } = await supabase
    .from("flats")
    .select("id, condominio_id")
    .eq("perfil_proprietario_id", perfil.id)
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

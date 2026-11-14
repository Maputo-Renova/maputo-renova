"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obterPerfil } from "@/lib/perfil";

export type EstadoAccao = { ok: boolean; mensagem: string } | null;

export async function guardarNome(
  _prev: EstadoAccao,
  fd: FormData,
): Promise<EstadoAccao> {
  const perfil = await obterPerfil();
  if (!perfil) return { ok: false, mensagem: "Sessão inválida." };

  const nome = String(fd.get("nome") ?? "").trim();
  const apelido = String(fd.get("apelido") ?? "").trim();
  if (!nome) return { ok: false, mensagem: "O nome é obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_actualizar_perfil", {
    p_nome: nome,
    p_apelido: apelido || null,
  });
  if (error) return { ok: false, mensagem: "Não foi possível guardar." };

  revalidatePath("/perfil");
  return { ok: true, mensagem: "Alterações guardadas." };
}

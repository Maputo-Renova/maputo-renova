import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Papel = "super_admin" | "colaborador" | "gestor" | "proprietario";

export type Perfil = {
  id: string;
  nome: string;
  apelido: string | null;
  papel: Papel;
  estado: "pendente" | "activo" | "suspenso";
  condominio_id: string | null;
  foto_path: string | null;
};

export const ROTA_POR_PAPEL: Record<Papel, string> = {
  super_admin: "/consola",
  gestor: "/gestor",
  proprietario: "/morador",
  colaborador: "/agente",
};

/** Sessão + perfil; redirecciona para /entrar sem sessão. */
export async function obterPerfil(): Promise<Perfil | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data } = await supabase
    .from("perfis")
    .select("id, nome, apelido, papel, estado, condominio_id, foto_path")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Perfil | null) ?? null;
}

/** Garante o papel esperado (e conta activa); senão manda para o sítio certo. */
export async function exigirPapel(papel: Papel): Promise<Perfil> {
  const perfil = await obterPerfil();
  if (!perfil) redirect("/conta/sem-perfil");
  if (perfil.estado === "pendente") redirect("/conta/pendente");
  if (perfil.estado === "suspenso") redirect("/conta/suspensa");
  if (perfil.papel !== papel) redirect(ROTA_POR_PAPEL[perfil.papel]);
  return perfil;
}

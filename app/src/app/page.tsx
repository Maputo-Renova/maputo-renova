export const instant = false;

import { redirect } from "next/navigation";
import { obterPerfil, ROTA_POR_PAPEL } from "@/lib/perfil";

export default async function Home() {
  const perfil = await obterPerfil();
  if (!perfil) redirect("/conta/sem-perfil");
  if (perfil.estado === "pendente") redirect("/conta/pendente");
  if (perfil.estado === "suspenso") redirect("/conta/suspensa");
  redirect(ROTA_POR_PAPEL[perfil.papel]);
}

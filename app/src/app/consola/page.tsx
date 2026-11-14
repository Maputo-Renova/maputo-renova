export const instant = false;

import { AppShell } from "@/components/AppShell";
import { Kpi } from "@/components/Kpi";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/consola", rotulo: "Visão geral" },
  { href: "/consola/condominios", rotulo: "Condomínios" },
  { href: "/consola/colaboradores", rotulo: "Colaboradores" },
  { href: "/consola/repasses", rotulo: "Repasses" },
  { href: "/consola/configuracao", rotulo: "Configuração" },
];

export default async function Consola() {
  const perfil = await exigirPapel("super_admin");
  const supabase = await createClient();

  const [condos, flats, gestoresPendentes] = await Promise.all([
    supabase.from("condominios").select("id", { count: "exact", head: true }),
    supabase.from("flats").select("id", { count: "exact", head: true }),
    supabase
      .from("perfis")
      .select("id", { count: "exact", head: true })
      .eq("papel", "gestor")
      .eq("estado", "pendente"),
  ]);

  return (
    <AppShell perfil={perfil} sub="Super administração" itens={NAV}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Visão geral</h1>
        <p className="text-sm text-ink-2">Todas as organizações</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Kpi rotulo="Condomínios" valor={String(condos.count ?? 0)} detalhe="organizações no sistema" />
        <Kpi rotulo="Flats" valor={String(flats.count ?? 0)} detalhe="unidades cadastradas" />
        <Kpi rotulo="Gestores por aprovar" valor={String(gestoresPendentes.count ?? 0)} detalhe="aguardam aprovação da consola" />
      </div>
    </AppShell>
  );
}

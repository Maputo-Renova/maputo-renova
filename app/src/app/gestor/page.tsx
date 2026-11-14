export const instant = false;

import { AppShell } from "@/components/AppShell";
import { Kpi, MT } from "@/components/Kpi";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/gestor", rotulo: "Painel" },
  { href: "/gestor/pagamentos", rotulo: "Pagamentos" },
  { href: "/gestor/tesouraria", rotulo: "Tesouraria" },
  { href: "/gestor/suporte", rotulo: "Suporte" },
  { href: "/gestor/avisos", rotulo: "Avisos" },
];

export default async function PainelGestor() {
  const perfil = await exigirPapel("gestor");
  const supabase = await createClient();

  const [{ data: condominio }, { data: flats }, { data: faturas }] =
    await Promise.all([
      supabase
        .from("condominios")
        .select("nome, bairro, codigo")
        .eq("id", perfil.condominio_id!)
        .maybeSingle(),
      supabase.from("flats").select("id, quota_mensal"),
      supabase
        .from("faturas")
        .select("id, valor_quota, estado")
        .gte("mes_referencia", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
    ]);

  const pagas = (faturas ?? []).filter((f) => f.estado === "paga");
  const cobrado = pagas.reduce((s, f) => s + Number(f.valor_quota), 0);
  const porCobrar = (faturas ?? [])
    .filter((f) => f.estado === "pendente" || f.estado === "em_atraso")
    .reduce((s, f) => s + Number(f.valor_quota), 0);
  const emAtraso = (faturas ?? []).filter((f) => f.estado === "em_atraso").length;

  return (
    <AppShell perfil={perfil} sub={condominio?.nome ?? "Condomínio"} itens={NAV}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">
          Olá, {perfil.nome.split(" ")[0]}
        </h1>
        <p className="text-sm text-ink-2">
          {condominio ? `${condominio.nome} · ${flats?.length ?? 0} flats${condominio.bairro ? ` · ${condominio.bairro}` : ""}` : "—"}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Kpi rotulo="Cobrado este mês" valor={MT(cobrado)} detalhe={`${pagas.length} faturas pagas`} />
        <Kpi rotulo="Por cobrar" valor={MT(porCobrar)} detalhe={`${(faturas ?? []).length - pagas.length} faturas em aberto`} />
        <Kpi rotulo="Em atraso" valor={String(emAtraso)} detalhe="faturas em atraso" />
      </div>
      {(flats?.length ?? 0) === 0 ? (
        <div className="card mt-4 text-sm text-ink-2">
          Ainda não há flats cadastradas neste condomínio. O cadastro é feito
          pelo agente da plataforma; as faturas mensais são geradas
          automaticamente a partir daí.
        </div>
      ) : null}
    </AppShell>
  );
}

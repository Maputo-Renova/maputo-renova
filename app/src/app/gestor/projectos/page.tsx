
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { Icone } from "@/components/Icone";
import { MT } from "@/components/Kpi";
import { ProjectoCard, type Projecto, type Actualizacao } from "@/components/ProjectoCard";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_GESTOR } from "@/lib/navs";
import { mesDe } from "@/lib/mes";
import { concluirProjecto } from "../actions";
import { FormNovoProjecto } from "./FormNovoProjecto";
import { FormActualizacao } from "./FormActualizacao";

export default async function ProjectosGestor() {
  await connection();
  const perfil = await exigirPapel("gestor");
  const supabase = await createClient();
  const mes = mesDe(undefined);

  const [{ data: projectos }, { data: updates }, { data: assoc }, { data: flats }] =
    await Promise.all([
      supabase
        .from("projectos")
        .select("*")
        .neq("estado", "rejeitado")
        .order("created_at", { ascending: false }),
      supabase
        .from("projecto_updates")
        .select("projecto_id, texto, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("associacao_mensal")
        .select("flats_total, flats_pagas, valor_por_flat")
        .eq("mes_referencia", mes.iso)
        .maybeSingle(),
      supabase.from("flats").select("id"),
    ]);

  const lista = (projectos ?? []) as Projecto[];
  const updatesPor = new Map<string, Actualizacao[]>();
  for (const u of updates ?? []) {
    const arr = updatesPor.get(u.projecto_id) ?? [];
    arr.push(u);
    updatesPor.set(u.projecto_id, arr);
  }
  const emDia = !!assoc && assoc.flats_total > 0 && assoc.flats_pagas === assoc.flats_total;
  const falta = assoc
    ? (assoc.flats_total - assoc.flats_pagas) * Number(assoc.valor_por_flat)
    : 0;

  return (
    <AppShell perfil={perfil} sub="Gestão do condomínio" itens={NAV_GESTOR}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Projectos</h1>
        <p className="text-sm text-ink-2">
          Obras e melhorias do condomínio · aprovadas pela consola, acompanhadas
          pelos proprietários
        </p>
      </div>

      {!emDia && assoc ? (
        <div
          className="note mb-4 items-center"
          style={{ borderColor: "var(--amber-700)", background: "var(--amber-100)" }}
        >
          <span style={{ color: "var(--amber-700)" }}>
            <Icone nome="alert" sm />
          </span>
          <span className="flex-1">
            <b style={{ color: "var(--amber-700)" }}>
              Associação: {assoc.flats_pagas} de {assoc.flats_total} flats pagaram{" "}
              {mes.rotulo.split(" ")[0]}.
            </b>{" "}
            Para submeter projectos ao fundo da associação e votar na assembleia,
            o condomínio precisa de estar 100% em dia — faltam{" "}
            <b className="num">{MT(falta)}</b>. Projectos com fundo do condomínio
            ou quota extraordinária não são afectados.
          </span>
        </div>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="grid gap-4">
          {lista.length === 0 ? (
            <div className="card">
              <div className="empty">
                <span className="e-ico">
                  <Icone nome="obra" />
                </span>
                <b>Sem projectos</b>
                <p>Crie o primeiro projecto de obra ou melhoria do condomínio.</p>
              </div>
            </div>
          ) : (
            lista.map((p) => (
              <ProjectoCard key={p.id} p={p} updates={updatesPor.get(p.id) ?? []}>
                {p.estado === "aprovado" ? (
                  <div className="mt-3 grid gap-3">
                    <details>
                      <summary className="cursor-pointer text-[13.5px] font-bold text-green-700">
                        Actualizar progresso
                      </summary>
                      <div className="mt-3">
                        <FormActualizacao
                          projectoId={p.id}
                          progresso={p.progresso}
                          gasto={Number(p.gasto)}
                        />
                      </div>
                    </details>
                    <form action={concluirProjecto}>
                      <input type="hidden" name="projecto_id" value={p.id} />
                      <button className="btn btn-ghost btn-sm">
                        <Icone nome="check" sm />
                        Marcar concluído
                      </button>
                    </form>
                  </div>
                ) : p.estado === "pendente" ? (
                  <div className="note mt-3">
                    <Icone nome="shield" sm />
                    <span>
                      Enviado à consola.{" "}
                      {p.financiamento === "quota_extraordinaria"
                        ? "A quota extraordinária só é cobrada depois da aprovação."
                        : p.financiamento === "associacao"
                          ? "Depois de validado, segue para votação na assembleia da associação de condomínios."
                          : "Será pago pelo fundo do condomínio depois da aprovação."}
                    </span>
                  </div>
                ) : null}
              </ProjectoCard>
            ))
          )}
        </div>

        <div className="card">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="card-ico">
              <Icone nome="plus" />
            </span>
            <h2 className="text-base font-extrabold">Novo projecto</h2>
          </div>
          <FormNovoProjecto nFlats={(flats ?? []).length} />
        </div>
      </div>
    </AppShell>
  );
}

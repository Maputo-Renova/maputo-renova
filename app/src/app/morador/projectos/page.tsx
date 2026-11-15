
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { Icone } from "@/components/Icone";
import { ProjectoCard, type Projecto, type Actualizacao } from "@/components/ProjectoCard";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_MORADOR } from "@/lib/navs";
import { mesDe } from "@/lib/mes";

export default async function ProjectosMorador() {
  await connection();
  const perfil = await exigirPapel("proprietario");
  const supabase = await createClient();
  const mes = mesDe(undefined);

  const [
    { data: projectos },
    { data: updates },
    { data: condo },
    { data: assoc },
  ] = await Promise.all([
    supabase
      .from("projectos")
      .select("*")
      .in("estado", ["aprovado", "concluido"])
      .order("created_at", { ascending: false }),
    supabase
      .from("projecto_updates")
      .select("projecto_id, texto, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("condominios").select("nome").limit(1).maybeSingle(),
    supabase
      .from("associacao_mensal")
      .select("flats_total, flats_pagas")
      .eq("mes_referencia", mes.iso)
      .maybeSingle(),
  ]);

  const lista = (projectos ?? []) as Projecto[];
  const updatesPor = new Map<string, Actualizacao[]>();
  for (const u of updates ?? []) {
    const arr = updatesPor.get(u.projecto_id) ?? [];
    arr.push(u);
    updatesPor.set(u.projecto_id, arr);
  }
  const emDia = !!assoc && assoc.flats_total > 0 && assoc.flats_pagas === assoc.flats_total;

  return (
    <AppShell perfil={perfil} sub="Proprietário" itens={NAV_MORADOR}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">
          Projectos do condomínio
        </h1>
        <p className="text-sm text-ink-2">
          Obras aprovadas e o seu andamento{condo ? ` · ${condo.nome}` : ""}
        </p>
      </div>

      {lista.length === 0 ? (
        <div className="card">
          <div className="empty">
            <span className="e-ico">
              <Icone nome="obra" />
            </span>
            <b>Sem projectos em curso</b>
            <p>
              Quando o condomínio aprovar uma obra, acompanha aqui o progresso e
              os custos.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid max-w-190 gap-4">
          {lista.map((p) => {
            const emAssembleia =
              p.financiamento === "associacao" &&
              p.estado === "aprovado" &&
              p.votos_favor + p.votos_contra === 0;
            return (
              <ProjectoCard key={p.id} p={p} updates={updatesPor.get(p.id) ?? []}>
                {emAssembleia ? (
                  <p className="mt-3 text-[13px] font-semibold text-ink-2">
                    A decisão é tomada em <b>assembleia da associação de
                    condomínios</b>
                    {emDia
                      ? " — o condomínio está em dia e participa."
                      : " — o condomínio participa quando estiver 100% em dia com a taxa da associação."}
                  </p>
                ) : null}
              </ProjectoCard>
            );
          })}
        </div>
      )}

      <div className="note mt-4">
        <Icone nome="shield" sm />
        <span>
          Quotas extraordinárias aprovadas aparecem nas suas <b>Faturas</b> e
          pagam-se como a quota normal.
        </span>
      </div>
    </AppShell>
  );
}

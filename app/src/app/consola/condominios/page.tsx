
import { connection } from "next/server";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { MT } from "@/components/Kpi";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_CONSOLA } from "@/lib/navs";
import { obterTaxas } from "@/lib/taxas";

export default async function CondominiosConsola() {
  await connection();
  const perfil = await exigirPapel("super_admin");
  const supabase = await createClient();

  const [{ data: condominios }, { data: flats }, taxas] = await Promise.all([
    supabase
      .from("condominios")
      .select(
        "id, nome, codigo, bairro, provincia, gestor_nome, gestor_apelido, estado, quota_padrao, taxa_servico_pct",
      )
      .order("nome"),
    supabase.from("flats").select("id, condominio_id, quota_mensal"),
    obterTaxas(supabase),
  ]);

  const lista = condominios ?? [];
  const porCondo = new Map<string, { n: number; esperado: number }>();
  for (const f of flats ?? []) {
    const atual = porCondo.get(f.condominio_id) ?? { n: 0, esperado: 0 };
    atual.n += 1;
    atual.esperado += Number(f.quota_mensal ?? 0);
    porCondo.set(f.condominio_id, atual);
  }

  const totalFlats = (flats ?? []).length;

  return (
    <AppShell perfil={perfil} sub="Super administração" itens={NAV_CONSOLA}>
      <div className="mb-5 mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Condomínios</h1>
          <p className="text-sm text-ink-2">
            {lista.length} organizações · {totalFlats} flats
          </p>
        </div>
        <Link href="/consola/condominios/novo" className="btn btn-primary">
          + Novo condomínio
        </Link>
      </div>
      <div className="card">
        {lista.length === 0 ? (
          <div className="empty">
            <span className="e-ico">∅</span>
            <b>Ainda não há condomínios</b>
            <p>Crie o primeiro ou peça ao agente para o cadastrar.</p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Condomínio</th>
                  <th>Gestor</th>
                  <th className="r">Flats</th>
                  <th className="r">Esperado/mês</th>
                  <th className="r">% serviço</th>
                  <th>Estado</th>
                  <th className="r"></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => {
                  const agg = porCondo.get(c.id) ?? { n: 0, esperado: 0 };
                  const esperado =
                    agg.esperado +
                    (agg.n > 0
                      ? (flats ?? []).filter(
                          (f) => f.condominio_id === c.id && f.quota_mensal == null,
                        ).length * Number(c.quota_padrao)
                      : 0);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/consola/condominios/${c.id}`} className="block">
                          <div className="cell-main">
                            {c.nome}{" "}
                            <span className="num rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
                              {c.codigo}
                            </span>
                          </div>
                          <div className="cell-sub">
                            {[c.bairro, c.provincia].filter(Boolean).join(" · ")}
                          </div>
                        </Link>
                      </td>
                      <td>
                        {[c.gestor_nome, c.gestor_apelido].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="r num">{agg.n}</td>
                      <td className="r num b">{MT(esperado)}</td>
                      <td className="r num">
                        {Number(c.taxa_servico_pct ?? taxas.servicoPct)}%
                      </td>
                      <td>
                        <span
                          className={
                            c.estado === "activo" ? "pill pill-pago" : "pill pill-pendente"
                          }
                        >
                          {c.estado === "activo" ? "Activo" : c.estado}
                        </span>
                      </td>
                      <td className="r">
                        <Link
                          href={`/consola/condominios/${c.id}`}
                          className="text-[13px] font-bold text-green-700 hover:underline"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

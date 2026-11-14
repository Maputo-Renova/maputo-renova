
import { connection } from "next/server";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Icone } from "@/components/Icone";
import { Kpi, MT } from "@/components/Kpi";
import { MonthPicker } from "@/components/MonthPicker";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_CONSOLA } from "@/lib/navs";
import { mesDe } from "@/lib/mes";
import { obterTaxas } from "@/lib/taxas";
import { aprovarGestor, rejeitarGestor } from "./actions";

export default async function Consola({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await connection();
  const perfil = await exigirPapel("super_admin");
  const { mes: mesParam } = await searchParams;
  const mes = mesDe(mesParam);
  const supabase = await createClient();

  const [
    { data: condominios },
    { data: flats },
    { data: faturas },
    { data: pendentes },
    { data: movimentos },
    { data: auditoria },
    taxas,
  ] = await Promise.all([
    supabase
      .from("condominios")
      .select("id, nome, bairro, provincia, gestor_nome, estado")
      .order("nome"),
    supabase.from("flats").select("id, condominio_id"),
    supabase
      .from("faturas")
      .select("condominio_id, valor_quota, taxa_associacao, estado")
      .eq("mes_referencia", mes.iso),
    supabase
      .from("perfis")
      .select("id, nome, apelido, telefone, condominio_id, created_at")
      .eq("papel", "gestor")
      .eq("estado", "pendente"),
    supabase.from("movimentos").select("condominio_id, valor"),
    supabase
      .from("auditoria")
      .select("acao, entidade, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    obterTaxas(supabase),
  ]);

  const lista = condominios ?? [];
  const fts = faturas ?? [];
  const flatsPorCondo = new Map<string, number>();
  for (const f of flats ?? []) {
    flatsPorCondo.set(f.condominio_id, (flatsPorCondo.get(f.condominio_id) ?? 0) + 1);
  }
  const saldoPorCondo = new Map<string, number>();
  for (const m of movimentos ?? []) {
    saldoPorCondo.set(
      m.condominio_id,
      (saldoPorCondo.get(m.condominio_id) ?? 0) + Number(m.valor),
    );
  }

  const porCondo = lista.map((c) => {
    const doCondo = fts.filter((f) => f.condominio_id === c.id);
    const pagas = doCondo.filter((f) => f.estado === "paga");
    const esperado = doCondo.reduce((s, f) => s + Number(f.valor_quota), 0);
    const cobrado = pagas.reduce((s, f) => s + Number(f.valor_quota), 0);
    const atraso = doCondo.filter((f) => f.estado === "em_atraso").length;
    const nFlats = flatsPorCondo.get(c.id) ?? 0;
    return {
      ...c,
      nFlats,
      esperado,
      cobrado,
      pagas: pagas.length,
      atraso,
      pct: esperado ? Math.round((cobrado / esperado) * 100) : 0,
      inad: nFlats ? Math.round((atraso / nFlats) * 100) : 0,
      saldo: saldoPorCondo.get(c.id) ?? 0,
      emDia: doCondo.length > 0 && pagas.length === doCondo.length,
    };
  });

  const proc = porCondo.reduce((s, c) => s + c.cobrado, 0);
  const receita = (proc * taxas.servicoPct) / 100;
  const pagasTotal = porCondo.reduce((s, c) => s + c.pagas, 0);
  const fundo = fts
    .filter((f) => f.estado === "paga")
    .reduce((s, f) => s + Number(f.taxa_associacao), 0);
  const ranking = porCondo
    .filter((c) => c.nFlats > 0)
    .sort((a, b) => a.inad - b.inad || b.pct - a.pct);

  const condoDe = (id: string | null) => lista.find((c) => c.id === id);

  return (
    <AppShell perfil={perfil} sub="Super administração" itens={NAV_CONSOLA}>
      <div className="mb-5 mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Visão geral</h1>
          <p className="text-sm text-ink-2">
            Todas as organizações · {mes.rotulo}
          </p>
        </div>
        <MonthPicker base="/consola" {...mes} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi
          icone="wallet"
          rotulo="Cobranças processadas"
          valor={MT(proc)}
          detalhe={mes.corrente ? "mês corrente" : "mês fechado"}
        />
        <Kpi
          icone="arrUp"
          rotulo={`Taxa de serviço (${taxas.servicoPct}%)`}
          valor={MT(receita)}
          detalhe="cobrada aos apartamentos sobre a quota"
        />
        <Kpi
          icone="shield"
          rotulo="Fundo da associação"
          valor={MT(fundo)}
          detalhe={`${taxas.associacao} MT × ${pagasTotal} flats pagas`}
        />
      </div>

      {(pendentes ?? []).length > 0 ? (
        <div
          className="card mt-4"
          style={{ border: "1px solid var(--amber-700)", background: "#FFFDF8" }}
        >
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className="card-ico"
              style={{ background: "var(--amber-100)", color: "var(--amber-700)" }}
            >
              <Icone nome="shield" />
            </span>
            <h2 className="text-base font-extrabold">Gestores por aprovar</h2>
            <span className="pill pill-pendente ml-auto">
              {pendentes!.length} pendente{pendentes!.length > 1 ? "s" : ""}
            </span>
          </div>
          <p className="mb-1 text-[13px] text-ink-2">
            O gestor já consegue entrar na conta, mas só pode gerir o condomínio
            depois de aprovado aqui.
          </p>
          <ul className="row-list">
            {pendentes!.map((g) => {
              const condo = condoDe(g.condominio_id);
              return (
                <li key={g.id}>
                  <span className="row-ico a">
                    <Icone nome="users" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="cell-main">
                      {[g.nome, g.apelido].filter(Boolean).join(" ")}
                      {condo ? ` — ${condo.nome}` : ""}
                    </div>
                    <div className="cell-sub">
                      {g.telefone ? <span className="num">{g.telefone} · </span> : null}
                      {condo ? (
                        <Link
                          href={`/consola/condominios/${condo.id}`}
                          className="font-bold text-green-700 hover:underline"
                        >
                          Ver dados completos
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={rejeitarGestor}>
                      <input type="hidden" name="perfil_id" value={g.id} />
                      <button className="btn btn-danger btn-sm">Rejeitar</button>
                    </form>
                    <form action={aprovarGestor}>
                      <input type="hidden" name="perfil_id" value={g.id} />
                      <button className="btn btn-primary btn-sm">
                        <Icone nome="check" sm />
                        Aprovar
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="card">
          <div className="mb-2 flex items-center">
            <h2 className="text-base font-extrabold">Condomínios</h2>
            <Link
              href="/consola/condominios"
              className="ml-auto text-[13px] font-bold text-green-700 hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Condomínio</th>
                  <th className="r">Flats</th>
                  <th>Cobrança do mês</th>
                  <th className="r">Inadimpl.</th>
                  <th className="r">Repasse</th>
                </tr>
              </thead>
              <tbody>
                {porCondo.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/consola/condominios/${c.id}`} className="block">
                        <div className="cell-main">{c.nome}</div>
                        <div className="cell-sub">
                          {[c.bairro, c.gestor_nome].filter(Boolean).join(" · ")}
                        </div>
                      </Link>
                    </td>
                    <td className="r num">{c.nFlats}</td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`prog flex-1 ${c.pct < 75 ? "bad" : c.pct < 88 ? "warn" : ""}`}
                          style={{ maxWidth: 160 }}
                        >
                          <i style={{ width: `${Math.min(c.pct, 100)}%` }} />
                        </span>
                        <span className="num b text-[13px]">{c.pct}%</span>
                      </div>
                    </td>
                    <td className="r num">{c.inad}%</td>
                    <td className="r num b">{MT(c.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="card">
            <div className="mb-1 flex items-center gap-2.5">
              <span className="card-ico">
                <Icone nome="arrUp" />
              </span>
              <h2 className="text-base font-extrabold">Ranking de adimplência</h2>
            </div>
            <p className="mb-1 text-[12.5px] text-ink-3">
              Menor inadimplência primeiro · &quot;Em dia&quot; = elegível para o
              fundo da associação
            </p>
            {ranking.length === 0 ? (
              <p className="py-3 text-sm text-ink-2">Ainda sem condomínios com flats.</p>
            ) : (
              <ul className="row-list">
                {ranking.map((c, i) => (
                  <li key={c.id}>
                    <span
                      className={`row-ico ${i === 0 ? "g" : "b"} num`}
                      style={{ borderRadius: "50%", fontSize: 13 }}
                    >
                      {i + 1}º
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="cell-main">{c.nome}</div>
                      <div className="cell-sub">{c.bairro ?? c.provincia}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="num b text-[13.5px]">{c.inad}% inadimpl.</span>
                      {c.emDia ? (
                        <span className="pill pill-pago">Em dia</span>
                      ) : (
                        <span className="pill pill-pendente">Em dívida</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <div className="mb-1 flex items-center gap-2.5">
              <span className="card-ico">
                <Icone nome="shield" />
              </span>
              <h2 className="text-base font-extrabold">Auditoria recente</h2>
            </div>
            {(auditoria ?? []).length === 0 ? (
              <p className="py-3 text-sm text-ink-2">
                Sem registos recentes — as acções sensíveis (aprovações, taxas,
                contas) ficam registadas aqui.
              </p>
            ) : (
              <ul className="row-list">
                {auditoria!.map((a, i) => (
                  <li key={i}>
                    <span className="row-ico b">
                      <Icone nome="clock" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="cell-main">{a.acao}</div>
                      <div className="cell-sub">{a.entidade}</div>
                    </div>
                    <span className="cell-sub">
                      {new Date(a.created_at).toLocaleDateString("pt-PT")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

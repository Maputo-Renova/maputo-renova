
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { Kpi, MT } from "@/components/Kpi";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_GESTOR } from "@/lib/navs";
import { mesDe } from "@/lib/mes";
import { obterTaxas } from "@/lib/taxas";
import { FormDespesa } from "./FormDespesa";

const TIPO_MOV: Record<string, { rotulo: string; ico: string }> = {
  credito_cobranca: { rotulo: "Cobrança confirmada", ico: "g" },
  taxa_plataforma: { rotulo: "Taxa de serviço", ico: "a" },
  repasse: { rotulo: "Repasse recebido", ico: "b" },
};

export default async function Tesouraria() {
  await connection();
  const perfil = await exigirPapel("gestor");
  const mes = mesDe(undefined);
  const supabase = await createClient();

  const [
    { data: movimentos },
    { data: despesas },
    { data: faturas },
    taxas,
  ] = await Promise.all([
    supabase
      .from("movimentos")
      .select("tipo, valor, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("despesas")
      .select("id, descricao, categoria, valor, data, comprovativo_path")
      .order("data", { ascending: false })
      .limit(20),
    supabase
      .from("faturas")
      .select("id, estado, taxa_associacao, flat_id")
      .eq("mes_referencia", mes.iso),
    obterTaxas(supabase),
  ]);

  const movs = movimentos ?? [];
  const saldo = movs.reduce((s, m) => s + Number(m.valor), 0);
  const mesIni = new Date(`${mes.iso}T00:00:00`);
  const entradasMes = movs
    .filter((m) => m.tipo === "credito_cobranca" && new Date(m.created_at) >= mesIni)
    .reduce((s, m) => s + Number(m.valor), 0);
  const nEntradas = movs.filter(
    (m) => m.tipo === "credito_cobranca" && new Date(m.created_at) >= mesIni,
  ).length;
  const despesasMes = (despesas ?? []).filter((d) => d.data >= mes.iso);
  const totalDespesas = despesasMes.reduce((s, d) => s + Number(d.valor), 0);

  const fts = faturas ?? [];
  const pagas = fts.filter((f) => f.estado === "paga").length;
  const total = fts.length;
  const pct = total ? Math.round((pagas / total) * 100) : 0;
  const valorTotal = fts.reduce((s, f) => s + Number(f.taxa_associacao), 0);
  const falta = fts
    .filter((f) => f.estado !== "paga")
    .reduce((s, f) => s + Number(f.taxa_associacao), 0);
  const emDia = total > 0 && pagas === total;
  const mesNome = mes.rotulo.split(" ")[0];

  return (
    <AppShell perfil={perfil} sub="Gestão do condomínio" itens={NAV_GESTOR}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Tesouraria</h1>
        <p className="text-sm text-ink-2">Razão do condomínio · valores líquidos de taxas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi rotulo="Saldo a repassar" valor={MT(saldo)} detalhe="repasse registado pela plataforma" />
        <Kpi
          rotulo={`Entradas em ${mesNome}`}
          valor={MT(entradasMes)}
          detalhe={`${nEntradas} cobranças confirmadas`}
        />
        <Kpi
          rotulo={`Despesas em ${mesNome}`}
          valor={MT(totalDespesas)}
          detalhe={`${despesasMes.length} despesas · todas com fatura anexada`}
        />
      </div>

      <div className="card mt-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div>
            <h2 className="text-base font-extrabold">
              Taxa da associação · {mesNome}
            </h2>
            <div className="cell-sub">
              Fatura consolidada: {taxas.associacao} MT × {total} flats ={" "}
              <b className="num">{MT(valorTotal)}</b> · liquidada automaticamente
              pelos pagamentos dos moradores
            </div>
          </div>
          <span className={`ml-auto ${emDia ? "pill pill-pago" : "pill pill-atraso"}`}>
            {emDia ? "Em dia" : "Em dívida"}
          </span>
        </div>
        <div className="mb-1.5 flex justify-between text-[13px] font-bold">
          <span className="num">
            {pagas} de {total} flats pagaram
          </span>
          <span className="num">{pct}%</span>
        </div>
        <span className={`prog ${pct < 100 ? "warn" : ""}`}>
          <i style={{ width: `${pct}%` }} />
        </span>
        {!emDia && total > 0 ? (
          <div className="cell-sub mt-2">
            Faltam <b className="num">{MT(falta)}</b>
          </div>
        ) : null}
        <div className="note mt-3">
          <span>
            Só com <b>100% das flats em dia</b> o condomínio pode submeter
            projectos ao fundo da associação e votar na assembleia. Os valores já
            pagos transitam sempre — ninguém perde o que pagou.
          </span>
        </div>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 text-base font-extrabold">Movimentos recentes</h2>
          {movs.length === 0 ? (
            <p className="py-3 text-sm text-ink-2">
              Sem movimentos — aparecem com a primeira cobrança confirmada.
            </p>
          ) : (
            <ul className="row-list">
              {movs.slice(0, 8).map((m, i) => {
                const t = TIPO_MOV[m.tipo] ?? { rotulo: m.tipo, ico: "b" };
                const v = Number(m.valor);
                return (
                  <li key={i}>
                    <span className={`row-ico ${t.ico}`}>{v > 0 ? "+" : "−"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="cell-main">{t.rotulo}</div>
                      <div className="cell-sub">
                        {new Date(m.created_at).toLocaleDateString("pt-PT")}
                      </div>
                    </div>
                    <div
                      className="num cell-main"
                      style={{ color: v > 0 ? "var(--green-700)" : "var(--ink)" }}
                    >
                      {v > 0 ? "+" : "−"} {MT(Math.abs(v))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="grid gap-4">
          <div className="card">
            <h2 className="mb-2 text-base font-extrabold">Despesas recentes</h2>
            {(despesas ?? []).length === 0 ? (
              <p className="py-3 text-sm text-ink-2">
                Ainda sem despesas registadas.
              </p>
            ) : (
              <ul className="row-list">
                {despesas!.slice(0, 6).map((d) => (
                  <li key={d.id}>
                    <span className="row-ico a">−</span>
                    <div className="min-w-0 flex-1">
                      <div className="cell-main">{d.descricao ?? d.categoria}</div>
                      <div className="cell-sub">
                        {d.categoria} ·{" "}
                        {new Date(`${d.data}T00:00:00`).toLocaleDateString("pt-PT")} ·
                        fatura anexada
                      </div>
                    </div>
                    <div className="num cell-main">{MT(Number(d.valor))}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card">
            <h2 className="mb-3 text-base font-extrabold">Nova despesa</h2>
            <FormDespesa />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

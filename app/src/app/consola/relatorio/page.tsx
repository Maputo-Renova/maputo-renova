
import { connection } from "next/server";
import Link from "next/link";
import { MT } from "@/components/Kpi";
import { MarcaSimbolo } from "@/components/Marca";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { mesDe } from "@/lib/mes";
import { obterTaxas } from "@/lib/taxas";
import { BotaoImprimir } from "./BotaoImprimir";

export const metadata = { title: "Relatório mensal — Maputo Renova" };

export default async function Relatorio({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await connection();
  await exigirPapel("super_admin");
  const { mes: mesParam } = await searchParams;
  const mes = mesDe(mesParam);
  const supabase = await createClient();

  const proxMes = new Date(`${mes.iso}T00:00:00`);
  proxMes.setMonth(proxMes.getMonth() + 1);
  const fimMes = proxMes.toISOString().slice(0, 10);

  const [
    { data: condominios },
    { data: faturas },
    { data: repasses },
    { data: despesas },
    { data: assoc },
    taxas,
  ] = await Promise.all([
    supabase
      .from("condominios")
      .select("id, nome, codigo, bairro, gestor_nome, gestor_apelido")
      .order("nome"),
    supabase
      .from("faturas")
      .select("condominio_id, valor_quota, taxa_associacao, estado")
      .eq("mes_referencia", mes.iso),
    supabase
      .from("repasses")
      .select("condominio_id, valor, data")
      .gte("data", mes.iso)
      .lt("data", fimMes),
    supabase
      .from("despesas")
      .select("condominio_id, valor")
      .gte("data", mes.iso)
      .lt("data", fimMes),
    supabase
      .from("associacao_mensal")
      .select("condominio_id, flats_total, flats_pagas")
      .eq("mes_referencia", mes.iso),
    obterTaxas(supabase),
  ]);

  const fts = faturas ?? [];
  const assocPor = new Map((assoc ?? []).map((a) => [a.condominio_id, a]));

  const linhas = (condominios ?? []).map((c) => {
    const doCondo = fts.filter((f) => f.condominio_id === c.id);
    const pagas = doCondo.filter((f) => f.estado === "paga");
    const esperado = doCondo.reduce((s, f) => s + Number(f.valor_quota), 0);
    const cobrado = pagas.reduce((s, f) => s + Number(f.valor_quota), 0);
    const atraso = doCondo.filter((f) => f.estado === "em_atraso").length;
    const fundo = pagas.reduce((s, f) => s + Number(f.taxa_associacao), 0);
    const servico = Math.round(cobrado * taxas.servicoPct) / 100;
    const repassado = (repasses ?? [])
      .filter((r) => r.condominio_id === c.id)
      .reduce((s, r) => s + Number(r.valor), 0);
    const gastoDespesas = (despesas ?? [])
      .filter((d) => d.condominio_id === c.id)
      .reduce((s, d) => s + Number(d.valor), 0);
    const a = assocPor.get(c.id);
    return {
      ...c,
      nFaturas: doCondo.length,
      pagas: pagas.length,
      atraso,
      esperado,
      cobrado,
      pct: esperado ? Math.round((cobrado / esperado) * 100) : 0,
      fundo,
      servico,
      repassado,
      gastoDespesas,
      emDia: !!a && a.flats_total > 0 && a.flats_pagas === a.flats_total,
    };
  });

  const total = (f: (l: (typeof linhas)[number]) => number) =>
    linhas.reduce((s, l) => s + f(l), 0);

  return (
    <main className="relatorio mx-auto max-w-3xl px-6 py-8">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .relatorio { padding: 0 !important; max-width: none !important; }
          .card { box-shadow: none !important; border: 1px solid var(--line) !important; }
        }
      `}</style>

      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <Link
          href="/consola"
          className="text-[13px] font-bold text-green-700 hover:underline"
        >
          ← Visão geral
        </Link>
        <BotaoImprimir />
      </div>

      <header className="mb-6 flex items-center gap-3 border-b border-line pb-5">
        <MarcaSimbolo tamanho={44} />
        <div>
          <div className="text-[20px] font-extrabold tracking-tight">
            Maputo Renova — Relatório mensal
          </div>
          <div className="text-sm text-ink-2">
            {mes.rotulo} · emitido a {new Date().toLocaleDateString("pt-PT")}
          </div>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Cobranças processadas", MT(total((l) => l.cobrado))],
          [`Taxa de serviço (${taxas.servicoPct}%)`, MT(total((l) => l.servico))],
          ["Fundo da associação", MT(total((l) => l.fundo))],
          ["Repassado no mês", MT(total((l) => l.repassado))],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="card !p-4">
            <div className="text-[12px] font-bold text-ink-3">{rotulo}</div>
            <div className="num mt-1 text-[18px] font-extrabold">{valor}</div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="mb-2 text-base font-extrabold">Por condomínio</h2>
        <table className="tbl w-full">
          <thead>
            <tr>
              <th>Condomínio</th>
              <th className="r">Faturas</th>
              <th className="r">Cobrado</th>
              <th className="r">%</th>
              <th className="r">Atraso</th>
              <th className="r">Fundo assoc.</th>
              <th className="r">Repassado</th>
              <th>Associação</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id}>
                <td>
                  <div className="cell-main">
                    {l.nome} <span className="num text-[11px] text-ink-3">{l.codigo}</span>
                  </div>
                  <div className="cell-sub">
                    {[l.bairro, [l.gestor_nome, l.gestor_apelido].filter(Boolean).join(" ")]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </td>
                <td className="r num">
                  {l.pagas}/{l.nFaturas}
                </td>
                <td className="r num b">{MT(l.cobrado)}</td>
                <td className="r num">{l.pct}%</td>
                <td className="r num">{l.atraso}</td>
                <td className="r num">{MT(l.fundo)}</td>
                <td className="r num">{MT(l.repassado)}</td>
                <td>
                  <span className={l.emDia ? "pill pill-pago" : "pill pill-pendente"}>
                    {l.emDia ? "Em dia" : "Em dívida"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-extrabold">
              <td>Total</td>
              <td className="r num">
                {total((l) => l.pagas)}/{total((l) => l.nFaturas)}
              </td>
              <td className="r num">{MT(total((l) => l.cobrado))}</td>
              <td className="r num">
                {total((l) => l.esperado)
                  ? Math.round((total((l) => l.cobrado) / total((l) => l.esperado)) * 100)
                  : 0}
                %
              </td>
              <td className="r num">{total((l) => l.atraso)}</td>
              <td className="r num">{MT(total((l) => l.fundo))}</td>
              <td className="r num">{MT(total((l) => l.repassado))}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </section>

      <p className="mt-5 text-[12px] leading-relaxed text-ink-3">
        Cobrado = taxas de condomínio liquidadas no mês (repassadas por inteiro
        ao condomínio). Fundo assoc. = {taxas.associacao} MT × flats pagas,
        transita sempre. &quot;Em dia&quot; = 100% das flats com a taxa da
        associação paga — condição de elegibilidade para submeter projectos ao
        fundo e votar na assembleia. Taxa de serviço de {taxas.servicoPct}%
        cobrada ao apartamento sobre a quota; operadores e SMS deduzidos dela.
      </p>
    </main>
  );
}

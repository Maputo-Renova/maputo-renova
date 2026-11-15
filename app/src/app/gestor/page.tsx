
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { Kpi, MT } from "@/components/Kpi";
import { MonthPicker } from "@/components/MonthPicker";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_GESTOR } from "@/lib/navs";
import { mesDe } from "@/lib/mes";

const MESES_S = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default async function PainelGestor({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await connection();
  const perfil = await exigirPapel("gestor");
  const { mes: mesParam } = await searchParams;
  const mes = mesDe(mesParam);
  const ano = mes.iso.slice(0, 4);
  const mesIdx = Number(mes.iso.slice(5, 7)) - 1;
  const supabase = await createClient();

  const [{ data: condominio }, { data: flats }, { data: faturasAno }] =
    await Promise.all([
      supabase
        .from("condominios")
        .select("nome, bairro, codigo")
        .eq("id", perfil.condominio_id!)
        .maybeSingle(),
      supabase.from("flats").select("id"),
      supabase
        .from("faturas")
        .select("mes_referencia, valor_quota, estado")
        .gte("mes_referencia", `${ano}-01-01`)
        .lte("mes_referencia", `${ano}-12-01`),
    ]);

  const fts = faturasAno ?? [];
  const doMes = fts.filter((f) => f.mes_referencia === mes.iso);
  const pagas = doMes.filter((f) => f.estado === "paga");
  const cobrado = pagas.reduce((s, f) => s + Number(f.valor_quota), 0);
  const porCobrar = doMes
    .filter((f) => f.estado === "pendente" || f.estado === "em_atraso")
    .reduce((s, f) => s + Number(f.valor_quota), 0);
  const emAtraso = doMes.filter((f) => f.estado === "em_atraso").length;

  const porMes = Array.from({ length: 12 }, (_, i) => {
    const chave = `${ano}-${String(i + 1).padStart(2, "0")}-01`;
    return fts
      .filter((f) => f.mes_referencia === chave && f.estado === "paga")
      .reduce((s, f) => s + Number(f.valor_quota), 0);
  });
  const maximo = Math.max(...porMes, 1);

  return (
    <AppShell perfil={perfil} sub={condominio?.nome ?? "Condomínio"} itens={NAV_GESTOR}>
      <div className="mb-5 mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">
            Olá, {perfil.nome.split(" ")[0]}
          </h1>
          <p className="text-sm text-ink-2">
            {condominio
              ? `${condominio.nome} · ${flats?.length ?? 0} flats${condominio.bairro ? ` · ${condominio.bairro}` : ""}`
              : "—"}{" "}
            · {mes.rotulo}
          </p>
        </div>
        <MonthPicker base="/gestor" {...mes} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi
          icone="wallet"
          rotulo={`Cobrado em ${MESES_S[mesIdx]}`}
          valor={MT(cobrado)}
          detalhe={`${pagas.length} faturas pagas`}
        />
        <Kpi
          icone="clock"
          rotulo="Por cobrar"
          valor={MT(porCobrar)}
          detalhe={`${doMes.length - pagas.length} faturas em aberto`}
        />
        <Kpi
          icone="alert"
          rotulo="Em atraso"
          valor={String(emAtraso)}
          detalhe="faturas em atraso"
        />
      </div>

      <div className="card mt-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold">Cobranças de {ano}</h2>
          <div className="chart-legend">
            <span>
              <i style={{ background: "var(--green-600)" }} />
              Mês seleccionado
            </span>
            <span>
              <i style={{ background: "var(--green-150)" }} />
              Cobrado
            </span>
          </div>
        </div>
        <div className="chart-bars">
          {porMes.map((v, i) => (
            <div key={i} className="bar-col">
              <span
                className={`bar ${i === mesIdx ? "sel" : ""}`}
                data-v={MT(v)}
                style={{ height: `${Math.max(4, Math.round((v / maximo) * 100))}%` }}
                role="img"
                aria-label={`${MESES_S[i]}: ${MT(v)}`}
              />
              <span className="bar-lbl">{MESES_S[i]}</span>
            </div>
          ))}
        </div>
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

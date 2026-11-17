
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { MT } from "@/components/Kpi";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_MORADOR } from "@/lib/navs";
import { obterTaxas, decomporFatura } from "@/lib/taxas";
import { PagarFatura } from "./PagarFatura";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const PILLS: Record<string, { classe: string; rotulo: string }> = {
  paga: { classe: "pill pill-pago", rotulo: "Paga" },
  pendente: { classe: "pill pill-pendente", rotulo: "Pendente" },
  em_atraso: { classe: "pill pill-atraso", rotulo: "Em atraso" },
  a_confirmar: { classe: "pill pill-confirmar", rotulo: "A confirmar" },
};

export default async function Faturas() {
  await connection();
  const perfil = await exigirPapel("proprietario");
  const supabase = await createClient();

  // multi-moradias: faturas de todas as flats do proprietário
  const { data: flats } = await supabase
    .from("flats")
    .select("id, numero, bloco, referencia")
    .eq("perfil_proprietario_id", perfil.id)
    .order("created_at");
  const porFlat = new Map((flats ?? []).map((f) => [f.id, f]));
  const varias = (flats ?? []).length > 1;

  const taxas = await obterTaxas(supabase);

  // métodos móveis: só aparecem quando o payment-worker está configurado e
  // o método está activo na consola (taxas_metodos)
  const workerConfigurado = Boolean(
    process.env.PAYMENT_WORKER_URL && process.env.PAYMENT_WORKER_SECRET,
  );

  const [{ data: faturas }, { data: pagamentos }, { data: conta }, { data: metodosDigitais }] = await Promise.all([
    (flats ?? []).length
      ? supabase
          .from("faturas")
          .select("id, flat_id, referencia, mes_referencia, valor_quota, estado, vencimento")
          .in("flat_id", (flats ?? []).map((f) => f.id))
          .order("mes_referencia", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("pagamentos").select("fatura_id, estado, metodo"),
    supabase
      .from("contas_plataforma")
      .select("banco, titular, numero_conta, nib")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("taxas_metodos")
      .select("metodo, activo")
      .in("metodo", ["mpesa", "emola"]),
  ]);

  const metodosMoveis = workerConfigurado
    ? ((metodosDigitais ?? [])
        .filter((m) => m.activo)
        .map((m) => m.metodo) as ("mpesa" | "emola")[])
    : [];

  const pendentesPorFatura = new Set(
    (pagamentos ?? []).filter((p) => p.estado === "a_confirmar").map((p) => p.fatura_id),
  );

  return (
    <AppShell
      perfil={perfil}
      sub={
        varias
          ? `${flats!.length} moradias`
          : flats?.[0]
            ? `Flat ${flats[0].numero} · ${flats[0].referencia}`
            : "Faturas"
      }
      itens={NAV_MORADOR}
    >
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Faturas</h1>
        <p className="text-sm text-ink-2">
          As suas quotas · taxa de condomínio + associação + serviço, num total único
        </p>
      </div>

      {(faturas ?? []).length === 0 ? (
        <div className="card max-w-130 text-sm text-ink-2">
          Ainda não há faturas — são emitidas automaticamente no dia 1 de cada mês.
        </div>
      ) : (
        <div className="grid max-w-180 gap-4">
          {faturas!.map((f) => {
            const d = decomporFatura(Number(f.valor_quota), taxas);
            const data = new Date(`${f.mes_referencia}T00:00:00`);
            const aguarda = pendentesPorFatura.has(f.id) && f.estado !== "paga";
            const pill = aguarda ? PILLS.a_confirmar : (PILLS[f.estado] ?? PILLS.pendente);
            const pagavel = !aguarda && (f.estado === "pendente" || f.estado === "em_atraso");
            return (
              <div key={f.id} className="card">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <div className="font-extrabold">
                      {MESES[data.getMonth()]} {data.getFullYear()}
                    </div>
                    <div className="num text-[12.5px] text-ink-3">
                      {varias && porFlat.get(f.flat_id)
                        ? `Flat ${porFlat.get(f.flat_id)!.numero} · `
                        : ""}
                      {f.referencia} · vence a {new Date(`${f.vencimento}T00:00:00`).toLocaleDateString("pt-PT")}
                    </div>
                  </div>
                  <span className={`${pill.classe} ml-auto`}>{pill.rotulo}</span>
                  <div className="num text-lg font-extrabold">{MT(d.total)}</div>
                </div>
                <div className="mt-3 grid gap-1 text-[13px] text-ink-2 sm:grid-cols-3">
                  <span>Condomínio: <b className="num">{MT(d.quota)}</b></span>
                  <span>Associação: <b className="num">{MT(d.associacao)}</b></span>
                  <span>Serviço ({taxas.servicoPct}%): <b className="num">{MT(d.servico)}</b></span>
                </div>
                {aguarda ? (
                  <p className="mt-3 text-[13px] font-semibold text-blue-700">
                    Comprovativo enviado — aguarda a confirmação do gestor.
                  </p>
                ) : null}
                {pagavel ? (
                  <div className="mt-4 border-t border-line-soft pt-3.5">
                    <PagarFatura
                      faturaId={f.id}
                      referencia={f.referencia}
                      total={d.total}
                      servico={d.servico}
                      associacao={d.associacao}
                      conta={conta ?? null}
                      metodosMoveis={metodosMoveis}
                      totalRotulo={MT(d.total)}
                    />
                    {metodosMoveis.length === 0 ? (
                      <p className="mt-2 text-[12px] font-semibold text-ink-3">
                        M-Pesa e eMola em activação com as operadoras — por agora, transferência bancária com comprovativo.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

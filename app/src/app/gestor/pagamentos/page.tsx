
import { connection } from "next/server";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Icone } from "@/components/Icone";
import { MT } from "@/components/Kpi";
import { MonthPicker } from "@/components/MonthPicker";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_GESTOR } from "@/lib/navs";
import { MESES, mesDe } from "@/lib/mes";
import { confirmarTransferencia, rejeitarTransferencia } from "../actions";
import { LinhaFlat, type FlatDrawer } from "./DrawerFlat";

const PILLS: Record<string, { classe: string; rotulo: string }> = {
  paga: { classe: "pill pill-pago", rotulo: "Paga" },
  pendente: { classe: "pill pill-pendente", rotulo: "Pendente" },
  em_atraso: { classe: "pill pill-atraso", rotulo: "Em atraso" },
  a_confirmar: { classe: "pill pill-confirmar", rotulo: "A confirmar" },
  cancelada: { classe: "pill", rotulo: "Cancelada" },
};

const FILTROS = [
  ["todos", "Todas"],
  ["paga", "Pagas"],
  ["pendente", "Pendentes"],
  ["em_atraso", "Em atraso"],
] as const;

export default async function Pagamentos({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; mes?: string; q?: string }>;
}) {
  await connection();
  const perfil = await exigirPapel("gestor");
  const { estado: filtro = "todos", mes: mesParam, q = "" } = await searchParams;
  const mes = mesDe(mesParam);
  const supabase = await createClient();

  // histórico: o mês seleccionado + os 5 anteriores (para o drawer)
  const [anoM, mesM] = [Number(mes.iso.slice(0, 4)), Number(mes.iso.slice(5, 7)) - 1];
  const inicioHist = new Date(Date.UTC(anoM, mesM - 5, 1)).toISOString().slice(0, 10);

  const [{ data: faturas }, { data: fila }, { data: historico }] = await Promise.all([
    supabase
      .from("faturas")
      .select(
        "id, referencia, valor_quota, estado, flat_id, flats(id, numero, bloco, andar, referencia, proprietario_nome, proprietario_apelido, proprietario_telefone, proprietario_email, proprietario_nuit, proprietario_documento, proprietario_doc_tipo, perfil_proprietario_id, comprovativo_endereco_path)",
      )
      .eq("mes_referencia", mes.iso)
      .order("referencia"),
    supabase
      .from("pagamentos")
      .select(
        "id, valor_bruto, comprovativo_path, created_at, faturas(referencia, flats(numero, proprietario_nome, proprietario_apelido))",
      )
      .eq("estado", "a_confirmar")
      .eq("metodo", "transferencia")
      .order("created_at"),
    supabase
      .from("faturas")
      .select("flat_id, mes_referencia, referencia, estado")
      .gte("mes_referencia", inicioHist)
      .lte("mes_referencia", mes.iso)
      .order("mes_referencia", { ascending: false }),
  ]);

  const filaComUrl = await Promise.all(
    (fila ?? []).map(async (p) => {
      let url: string | null = null;
      if (p.comprovativo_path) {
        const { data } = await supabase.storage
          .from("comprovativos")
          .createSignedUrl(p.comprovativo_path, 3600);
        url = data?.signedUrl ?? null;
      }
      return { ...p, url };
    }),
  );

  const aConfirmarIds = new Set(
    (fila ?? []).map((p) => (Array.isArray(p.faturas) ? null : (p.faturas as { referencia?: string } | null)?.referencia)),
  );

  const histPorFlat = new Map<string, { mes: string; estado: string; referencia: string }[]>();
  for (const h of historico ?? []) {
    const lista = histPorFlat.get(h.flat_id) ?? [];
    const data = new Date(`${h.mes_referencia}T00:00:00`);
    lista.push({
      mes: `${MESES[data.getMonth()]} ${data.getFullYear()}`,
      estado: h.estado,
      referencia: h.referencia,
    });
    histPorFlat.set(h.flat_id, lista);
  }

  const termo = q.trim().toLowerCase();
  const linhas = (faturas ?? [])
    .filter((f) => (filtro === "todos" ? true : f.estado === filtro))
    .filter((f) => {
      if (!termo) return true;
      const flat = Array.isArray(f.flats) ? f.flats[0] : f.flats;
      return [
        flat?.numero,
        flat?.bloco,
        flat?.referencia,
        f.referencia,
        `${flat?.proprietario_nome ?? ""} ${flat?.proprietario_apelido ?? ""}`,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(termo));
    });

  const ligacao = (novoFiltro: string) => {
    const p = new URLSearchParams();
    if (novoFiltro !== "todos") p.set("estado", novoFiltro);
    if (mesParam) p.set("mes", mesParam);
    if (q) p.set("q", q);
    const s = p.toString();
    return `/gestor/pagamentos${s ? `?${s}` : ""}`;
  };

  return (
    <AppShell perfil={perfil} sub="Pagamentos do mês" itens={NAV_GESTOR}>
      <div className="mb-5 mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Pagamentos</h1>
          <p className="text-sm text-ink-2">
            {(faturas ?? []).length} faturas · estados de {mes.rotulo}
          </p>
        </div>
        <MonthPicker base="/gestor/pagamentos" {...mes} />
      </div>

      {filaComUrl.length > 0 ? (
        <div className="card mb-5">
          <h2 className="mb-3 text-base font-extrabold">
            Transferências a confirmar{" "}
            <span className="pill pill-confirmar align-middle">{filaComUrl.length}</span>
          </h2>
          <ul className="divide-y divide-line-soft">
            {filaComUrl.map((p) => {
              const fat = Array.isArray(p.faturas) ? p.faturas[0] : p.faturas;
              const flat = fat && (Array.isArray(fat.flats) ? fat.flats[0] : fat.flats);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-55">
                    <div className="font-bold">
                      Flat {flat?.numero} · {flat?.proprietario_nome} {flat?.proprietario_apelido ?? ""}
                    </div>
                    <div className="num text-[12.5px] text-ink-3">
                      {fat?.referencia} ·{" "}
                      {p.url ? (
                        <a className="font-bold text-green-700 hover:underline" href={p.url} target="_blank">
                          ver comprovativo
                        </a>
                      ) : (
                        "sem comprovativo"
                      )}
                    </div>
                  </div>
                  <div className="num ml-auto font-extrabold">{MT(Number(p.valor_bruto))}</div>
                  <form action={rejeitarTransferencia}>
                    <input type="hidden" name="pagamento_id" value={p.id} />
                    <button className="btn btn-ghost !text-red-700">Rejeitar</button>
                  </form>
                  <form action={confirmarTransferencia}>
                    <input type="hidden" name="pagamento_id" value={p.id} />
                    <button className="btn btn-primary">Confirmar</button>
                  </form>
                </li>
              );
            })}
          </ul>
          <div className="note mt-3 items-center">
            <Icone nome="shield" sm />
            <span className="flex-1 text-[12.5px]">
              Ao confirmar, a fatura é marcada como paga, o proprietário recebe
              o recibo por email, e o valor entra no razão do condomínio.
              M-Pesa e eMola confirmam automaticamente.
            </span>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {FILTROS.map(([valor, rotulo]) => (
            <Link
              key={valor}
              href={ligacao(valor)}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition ${
                filtro === valor
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-card text-ink-2 hover:border-green-600 hover:text-green-700"
              }`}
            >
              {rotulo}
            </Link>
          ))}
          <form className="ml-auto w-full sm:w-auto" action="/gestor/pagamentos">
            {filtro !== "todos" ? <input type="hidden" name="estado" value={filtro} /> : null}
            {mesParam ? <input type="hidden" name="mes" value={mesParam} /> : null}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Procurar flat, proprietário, referência…"
              aria-label="Procurar flats"
              className="w-full sm:w-64"
            />
          </form>
        </div>
        {linhas.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-2">
            {faturas?.length
              ? "Nenhuma flat corresponde ao filtro ou à procura."
              : "Não há faturas neste mês."}
          </p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {linhas.map((f) => {
              const flat = Array.isArray(f.flats) ? f.flats[0] : f.flats;
              const temPagamentoPendente = aConfirmarIds.has(f.referencia);
              const pill = temPagamentoPendente && f.estado !== "paga"
                ? PILLS.a_confirmar
                : (PILLS[f.estado] ?? PILLS.pendente);
              const dados: FlatDrawer = {
                faturaId: f.id,
                flatId: flat?.id ?? "",
                numero: flat?.numero ?? "—",
                bloco: flat?.bloco ?? null,
                andar: flat?.andar ?? null,
                referencia: flat?.referencia ?? null,
                proprietario: `${flat?.proprietario_nome ?? "—"} ${flat?.proprietario_apelido ?? ""}`.trim(),
                telefone: flat?.proprietario_telefone ?? null,
                email: flat?.proprietario_email ?? null,
                nuit: flat?.proprietario_nuit ?? null,
                documento: flat?.proprietario_documento
                  ? `${flat?.proprietario_doc_tipo === "passaporte" ? "Passaporte" : "BI"} · ${flat.proprietario_documento}`
                  : null,
                comTemConta: Boolean(flat?.perfil_proprietario_id),
                comComprovativo: Boolean(flat?.comprovativo_endereco_path),
                quotaRotulo: MT(Number(f.valor_quota)),
                historico: histPorFlat.get(f.flat_id) ?? [],
              };
              return (
                <li key={f.id}>
                  <LinhaFlat flat={dados}>
                    <div className="min-w-55">
                      <div className="font-bold">
                        Flat {flat?.numero}
                        {flat?.bloco ? ` · Bloco ${flat.bloco}` : ""}
                        {flat?.andar ? ` · ${flat.andar}º` : ""}
                      </div>
                      <div className="text-[12.5px] text-ink-3">
                        {flat?.proprietario_nome} {flat?.proprietario_apelido ?? ""} ·{" "}
                        <span className="num">{flat?.referencia}</span>
                      </div>
                    </div>
                    <span className="num text-[12.5px] text-ink-3">{f.referencia}</span>
                    <div className="num ml-auto font-extrabold">{MT(Number(f.valor_quota))}</div>
                    <span className={pill.classe}>{pill.rotulo}</span>
                    <span className="text-ink-3">
                      <Icone nome="chevR" sm />
                    </span>
                  </LinhaFlat>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

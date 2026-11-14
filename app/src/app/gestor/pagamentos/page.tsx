
import { connection } from "next/server";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { MT } from "@/components/Kpi";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_GESTOR } from "@/lib/navs";
import { confirmarTransferencia, rejeitarTransferencia } from "../actions";

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
  searchParams: Promise<{ estado?: string }>;
}) {
  await connection();
  const perfil = await exigirPapel("gestor");
  const { estado: filtro = "todos" } = await searchParams;
  const supabase = await createClient();

  const inicioMes = new Date();
  const mesIso = `${inicioMes.getFullYear()}-${String(inicioMes.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data: faturas }, { data: fila }] = await Promise.all([
    supabase
      .from("faturas")
      .select(
        "id, referencia, valor_quota, estado, vencimento, flats(numero, bloco, andar, referencia, proprietario_nome, proprietario_apelido, proprietario_telefone)",
      )
      .eq("mes_referencia", mesIso)
      .order("referencia"),
    supabase
      .from("pagamentos")
      .select(
        "id, valor_bruto, comprovativo_path, created_at, faturas(referencia, flats(numero, proprietario_nome, proprietario_apelido))",
      )
      .eq("estado", "a_confirmar")
      .eq("metodo", "transferencia")
      .order("created_at"),
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

  const linhas = (faturas ?? []).filter((f) =>
    filtro === "todos" ? true : f.estado === filtro,
  );

  return (
    <AppShell perfil={perfil} sub="Pagamentos do mês" itens={NAV_GESTOR}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Pagamentos</h1>
        <p className="text-sm text-ink-2">Faturas do mês corrente e transferências a confirmar</p>
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
        </div>
      ) : null}

      <div className="card">
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTROS.map(([valor, rotulo]) => (
            <Link
              key={valor}
              href={valor === "todos" ? "/gestor/pagamentos" : `/gestor/pagamentos?estado=${valor}`}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition ${
                filtro === valor
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-card text-ink-2 hover:border-green-600 hover:text-green-700"
              }`}
            >
              {rotulo}
            </Link>
          ))}
        </div>
        {linhas.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-2">
            {faturas?.length
              ? "Nenhuma fatura corresponde ao filtro."
              : "Ainda não há faturas este mês — são geradas automaticamente no dia 1."}
          </p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {linhas.map((f) => {
              const flat = Array.isArray(f.flats) ? f.flats[0] : f.flats;
              const temPagamentoPendente = aConfirmarIds.has(f.referencia);
              const pill = temPagamentoPendente && f.estado !== "paga"
                ? PILLS.a_confirmar
                : (PILLS[f.estado] ?? PILLS.pendente);
              return (
                <li key={f.id} className="flex flex-wrap items-center gap-3 py-3.5">
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
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

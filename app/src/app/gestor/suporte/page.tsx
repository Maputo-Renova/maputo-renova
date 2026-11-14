
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_GESTOR } from "@/lib/navs";
import { marcarTicket } from "../actions";

const PILL_TK: Record<string, { classe: string; rotulo: string }> = {
  novo: { classe: "pill pill-confirmar", rotulo: "Novo" },
  em_curso: { classe: "pill pill-pendente", rotulo: "Em curso" },
  resolvido: { classe: "pill pill-pago", rotulo: "Resolvido" },
};

export default async function SuporteGestor() {
  await connection();
  const perfil = await exigirPapel("gestor");
  const supabase = await createClient();

  const [{ data: tickets }, { data: flats }] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, flat_id, categoria, assunto, mensagem, estado, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("flats").select("id, numero, proprietario_nome"),
  ]);

  const flatPorId = new Map((flats ?? []).map((f) => [f.id, f]));
  const todos = tickets ?? [];
  const abertos = todos.filter((t) => t.estado !== "resolvido");
  const resolvidos = todos.filter((t) => t.estado === "resolvido");

  return (
    <AppShell perfil={perfil} sub="Gestão do condomínio" itens={NAV_GESTOR}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Suporte</h1>
        <p className="text-sm text-ink-2">
          Reclamações e pedidos dos proprietários · {abertos.length} em aberto
        </p>
      </div>

      {abertos.length === 0 ? (
        <div className="card">
          <div className="empty">
            <span className="e-ico">✓</span>
            <b>Tudo resolvido</b>
            <p>Não há reclamações nem pedidos em aberto.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {abertos.map((t) => {
            const flat = flatPorId.get(t.flat_id);
            const pill = PILL_TK[t.estado] ?? PILL_TK.novo;
            return (
              <div key={t.id} className="card flex flex-wrap items-start gap-3.5">
                <span className={`row-ico ${t.estado === "em_curso" ? "a" : "b"}`}>✉</span>
                <div className="min-w-55 flex-1">
                  <div className="text-[15px] font-extrabold">{t.assunto}</div>
                  <p className="mt-0.5 text-[13.5px] text-ink-2">{t.mensagem}</p>
                  <div className="cell-sub mt-1.5">
                    {flat ? `Flat ${flat.numero} · ${flat.proprietario_nome} · ` : ""}
                    {t.categoria} ·{" "}
                    {new Date(t.created_at).toLocaleDateString("pt-PT")}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className={pill.classe}>{pill.rotulo}</span>
                  {t.estado === "novo" ? (
                    <form action={marcarTicket}>
                      <input type="hidden" name="ticket_id" value={t.id} />
                      <input type="hidden" name="estado" value="em_curso" />
                      <button className="btn btn-ghost btn-sm">Em curso</button>
                    </form>
                  ) : null}
                  <form action={marcarTicket}>
                    <input type="hidden" name="ticket_id" value={t.id} />
                    <input type="hidden" name="estado" value="resolvido" />
                    <button className="btn btn-primary btn-sm">Resolver</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {resolvidos.length > 0 ? (
        <div className="card mt-4">
          <h2 className="mb-2 text-base font-extrabold">Resolvidos</h2>
          <ul className="row-list">
            {resolvidos.map((t) => {
              const flat = flatPorId.get(t.flat_id);
              return (
                <li key={t.id}>
                  <span className="row-ico g">✓</span>
                  <div className="min-w-0 flex-1">
                    <div className="cell-main">{t.assunto}</div>
                    <div className="cell-sub">
                      {flat ? `Flat ${flat.numero} · ${flat.proprietario_nome} · ` : ""}
                      {new Date(t.created_at).toLocaleDateString("pt-PT")}
                    </div>
                  </div>
                  <span className="pill pill-pago">Resolvido</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </AppShell>
  );
}

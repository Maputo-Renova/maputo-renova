
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_MORADOR } from "@/lib/navs";
import { FormTicket } from "./FormTicket";

const PILL_TK: Record<string, { classe: string; rotulo: string }> = {
  novo: { classe: "pill pill-confirmar", rotulo: "Novo" },
  em_curso: { classe: "pill pill-pendente", rotulo: "Em curso" },
  resolvido: { classe: "pill pill-pago", rotulo: "Resolvido" },
};

export default async function SuporteMorador({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  await connection();
  const perfil = await exigirPapel("proprietario");
  const { categoria } = await searchParams;
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, categoria, assunto, estado, created_at")
    .order("created_at", { ascending: false });

  return (
    <AppShell perfil={perfil} sub="Proprietário" itens={NAV_MORADOR}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Suporte</h1>
        <p className="text-sm text-ink-2">
          Reclamações e pedidos enviados directamente ao gestor do condomínio
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="card">
          <h2 className="mb-3 text-base font-extrabold">Novo pedido</h2>
          <FormTicket
            categoriaInicial={categoria === "correccao" ? "Correcção de dados" : undefined}
          />
        </div>

        <div className="card">
          <h2 className="mb-2 text-base font-extrabold">Os meus pedidos</h2>
          {(tickets ?? []).length === 0 ? (
            <div className="empty">
              <span className="e-ico">✓</span>
              <b>Sem pedidos</b>
              <p>Quando enviar uma reclamação ou pedido, aparece aqui com o estado.</p>
            </div>
          ) : (
            <ul className="row-list">
              {tickets!.map((t) => {
                const pill = PILL_TK[t.estado] ?? PILL_TK.novo;
                return (
                  <li key={t.id}>
                    <span
                      className={`row-ico ${t.estado === "resolvido" ? "g" : t.estado === "em_curso" ? "a" : "b"}`}
                    >
                      ✉
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="cell-main">{t.assunto}</div>
                      <div className="cell-sub">
                        {t.categoria} ·{" "}
                        {new Date(t.created_at).toLocaleDateString("pt-PT")}
                      </div>
                    </div>
                    <span className={pill.classe}>{pill.rotulo}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

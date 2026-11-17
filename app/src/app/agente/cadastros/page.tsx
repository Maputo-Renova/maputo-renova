
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { Icone } from "@/components/Icone";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_AGENTE } from "@/lib/navs";

// Meus Cadastros: o histórico de trabalho do agente — cada condomínio com os
// seus dados e, dentro dele, as flats cadastradas e o estado de cada convite.
export default async function MeusCadastros() {
  await connection();
  const perfil = await exigirPapel("colaborador");
  const supabase = await createClient();

  const [{ data: condominios }, { data: flats }] = await Promise.all([
    supabase
      .from("condominios")
      .select("id, nome, codigo, bairro, provincia, rua, numero_porta, total_moradias, estado, gestor_nome, gestor_apelido")
      .order("nome"),
    supabase
      .from("flats")
      .select("id, condominio_id, referencia, bloco, andar, numero, proprietario_nome, proprietario_apelido, perfil_proprietario_id")
      .order("referencia"),
  ]);

  const lista = condominios ?? [];
  const flatsPorCondo = new Map<string, NonNullable<typeof flats>>();
  for (const f of flats ?? []) {
    const atual = flatsPorCondo.get(f.condominio_id) ?? [];
    atual.push(f);
    flatsPorCondo.set(f.condominio_id, atual);
  }

  return (
    <AppShell perfil={perfil} sub="Cadastro de condomínios" itens={NAV_AGENTE}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Meus Cadastros</h1>
        <p className="text-sm text-ink-2">
          {lista.length} condomínio{lista.length === 1 ? "" : "s"} ·{" "}
          {(flats ?? []).length} flats · o seu histórico de cadastros
        </p>
      </div>

      {lista.length === 0 ? (
        <div className="card max-w-180">
          <div className="empty">
            <span className="e-ico">
              <Icone nome="building" />
            </span>
            <b>Ainda sem cadastros</b>
            <p>Os condomínios e flats que cadastrar aparecem aqui, com o estado de cada convite.</p>
          </div>
        </div>
      ) : (
        <div className="grid max-w-180 gap-4">
          {lista.map((c) => {
            const minhas = flatsPorCondo.get(c.id) ?? [];
            const porUsar = minhas.filter((f) => !f.perfil_proprietario_id).length;
            return (
              <div key={c.id} className="card">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="card-ico">
                    <Icone nome="building" />
                  </span>
                  <h2 className="text-base font-extrabold">{c.nome}</h2>
                  <span className="num rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">
                    {c.codigo}
                  </span>
                  {c.estado !== "activo" ? (
                    <span className="pill pill-pendente">{c.estado}</span>
                  ) : null}
                </div>
                <p className="num mt-1 text-[13px] text-ink-3">
                  {[
                    [c.rua, c.numero_porta].filter(Boolean).join(", "),
                    c.bairro,
                    c.provincia,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  {c.gestor_nome ? ` · Gestor: ${c.gestor_nome}${c.gestor_apelido ? ` ${c.gestor_apelido}` : ""}` : ""}
                </p>
                <p className="num text-[13px] font-semibold text-ink-2">
                  {minhas.length} de {c.total_moradias ?? "—"} moradias cadastradas
                  {porUsar ? ` · ${porUsar} convite${porUsar === 1 ? "" : "s"} por usar` : ""}
                </p>

                {minhas.length === 0 ? (
                  <p className="mt-3 border-t border-line-soft pt-3 text-sm text-ink-3">
                    Ainda sem flats neste condomínio.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-line-soft border-t border-line-soft">
                    {minhas.map((f) => (
                      <li key={f.id} className="flex flex-wrap items-center gap-2 py-2.5">
                        <span className="num rounded-lg bg-bg px-2 py-0.5 text-[12.5px] font-bold">
                          {f.referencia}
                        </span>
                        <span className="text-[13.5px] font-semibold">
                          {[f.bloco ? `Bloco ${f.bloco}` : null, f.andar ? `${f.andar}.º` : null, `Flat ${f.numero}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        <span className="text-[13px] text-ink-3">
                          {[f.proprietario_nome, f.proprietario_apelido].filter(Boolean).join(" ")}
                        </span>
                        <span
                          className={`ml-auto pill ${f.perfil_proprietario_id ? "pill-pago" : "pill-pendente"}`}
                        >
                          {f.perfil_proprietario_id ? "Conta activa" : "Convite por usar"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

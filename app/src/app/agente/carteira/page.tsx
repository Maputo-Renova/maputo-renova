
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { Icone } from "@/components/Icone";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_AGENTE } from "@/lib/navs";

// Carteira do agente: o histórico dos condomínios que cadastrou, com o
// progresso de cada um (flats cadastradas e convites por usar).
export default async function Carteira() {
  await connection();
  const perfil = await exigirPapel("colaborador");
  const supabase = await createClient();

  const [{ data: condominios }, { data: flats }] = await Promise.all([
    supabase
      .from("condominios")
      .select("id, nome, codigo, bairro, provincia, total_moradias, estado")
      .order("nome"),
    supabase.from("flats").select("id, condominio_id, perfil_proprietario_id"),
  ]);

  const lista = condominios ?? [];
  const porCondominio = new Map<string, { flats: number; porUsar: number }>();
  for (const f of flats ?? []) {
    const atual = porCondominio.get(f.condominio_id) ?? { flats: 0, porUsar: 0 };
    atual.flats++;
    if (!f.perfil_proprietario_id) atual.porUsar++;
    porCondominio.set(f.condominio_id, atual);
  }

  return (
    <AppShell perfil={perfil} sub="Cadastro de condomínios" itens={NAV_AGENTE}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Carteira</h1>
        <p className="text-sm text-ink-2">
          {lista.length} condomínio{lista.length === 1 ? "" : "s"} cadastrado
          {lista.length === 1 ? "" : "s"} · o seu histórico de trabalho
        </p>
      </div>
      <div className="card max-w-180">
        {lista.length === 0 ? (
          <div className="empty">
            <span className="e-ico">
              <Icone nome="building" />
            </span>
            <b>Ainda sem condomínios</b>
            <p>Os condomínios que cadastrar aparecem aqui, com o progresso das flats e dos convites.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line-soft">
            {lista.map((c) => {
              const n = porCondominio.get(c.id);
              return (
                <li key={c.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{c.nome}</span>
                    <span className="num rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">
                      {c.codigo}
                    </span>
                    {c.estado !== "activo" ? (
                      <span className="pill pill-pendente">{c.estado}</span>
                    ) : null}
                  </div>
                  <p className="num mt-0.5 text-[13px] text-ink-3">
                    {[c.bairro, c.provincia].filter(Boolean).join(" · ")}
                    {c.total_moradias ? ` · ${c.total_moradias} moradias` : ""}
                    {n ? ` · ${n.flats} flats cadastradas` : " · 0 flats cadastradas"}
                    {n?.porUsar ? ` · ${n.porUsar} convites por usar` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

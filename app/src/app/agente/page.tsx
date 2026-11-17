
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_AGENTE } from "@/lib/navs";
import { Separadores } from "./Separadores";
import { FormNovaFlat, FormNovoCondominio } from "./formularios";

export default async function Agente() {
  await connection();
  const perfil = await exigirPapel("colaborador");
  const supabase = await createClient();

  const [{ data: condominios }, { data: flats }] = await Promise.all([
    supabase
      .from("condominios")
      .select("id, nome, codigo, bairro, provincia, total_moradias")
      .eq("estado", "activo")
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
        <h1 className="text-[26px] font-extrabold tracking-tight">Cadastro</h1>
        <p className="text-sm text-ink-2">
          Condomínios e flats · sem acesso a dados financeiros
        </p>
      </div>
      <div className="max-w-180">
        <Separadores
          paineis={[
            {
              id: "flat",
              rotulo: "Nova flat",
              conteudo: (
                <div className="card">
                  <h2 className="mb-4 text-base font-extrabold">Nova flat</h2>
                  <FormNovaFlat condominios={lista.map(({ id, nome }) => ({ id, nome }))} />
                </div>
              ),
            },
            {
              id: "condominio",
              rotulo: "Novo condomínio",
              conteudo: (
                <div className="card">
                  <h2 className="mb-4 text-base font-extrabold">Novo condomínio</h2>
                  <FormNovoCondominio />
                </div>
              ),
            },
            {
              id: "lista",
              rotulo: `Cadastrados (${lista.length})`,
              conteudo: (
                <div className="card">
                  <h2 className="mb-3 text-base font-extrabold">Condomínios cadastrados</h2>
                  {lista.length === 0 ? (
                    <p className="text-sm text-ink-2">
                      Ainda não há condomínios — crie o primeiro no separador
                      &quot;Novo condomínio&quot;.
                    </p>
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
                            </div>
                            <p className="num mt-0.5 text-[13px] text-ink-3">
                              {[c.bairro, c.provincia].filter(Boolean).join(" · ")}
                              {c.total_moradias ? ` · ${c.total_moradias} moradias` : ""}
                              {n ? ` · ${n.flats} flats cadastradas` : ""}
                              {n?.porUsar ? ` · ${n.porUsar} convites por usar` : ""}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </AppShell>
  );
}

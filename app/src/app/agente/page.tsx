
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_AGENTE } from "@/lib/navs";
import { FormNovaFlat, FormNovoCondominio } from "./formularios";

export default async function Agente() {
  await connection();
  const perfil = await exigirPapel("colaborador");
  const supabase = await createClient();

  const { data: condominios } = await supabase
    .from("condominios")
    .select("id, nome, codigo, bairro, provincia, total_moradias")
    .eq("estado", "activo")
    .order("nome");

  const lista = condominios ?? [];

  return (
    <AppShell perfil={perfil} sub="Cadastro de condomínios" itens={NAV_AGENTE}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Cadastro</h1>
        <p className="text-sm text-ink-2">
          Condomínios e flats · sem acesso a dados financeiros
        </p>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-base font-extrabold">Nova flat</h2>
          <FormNovaFlat condominios={lista.map(({ id, nome }) => ({ id, nome }))} />
        </div>
        <div className="grid gap-5">
          <div className="card">
            <h2 className="mb-3 text-base font-extrabold">Condomínios cadastrados</h2>
            {lista.length === 0 ? (
              <p className="text-sm text-ink-2">
                Ainda não há condomínios — crie o primeiro no formulário abaixo.
              </p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {lista.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2 py-3">
                    <span className="font-bold">{c.nome}</span>
                    <span className="num rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">
                      {c.codigo}
                    </span>
                    <span className="ml-auto text-[13px] text-ink-3">
                      {[c.bairro, c.provincia].filter(Boolean).join(" · ")}
                      {c.total_moradias ? ` · ${c.total_moradias} moradias` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card">
            <h2 className="mb-4 text-base font-extrabold">Novo condomínio</h2>
            <FormNovoCondominio />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

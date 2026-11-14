export const instant = false;

import { AppShell } from "@/components/AppShell";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

const NAV = [{ href: "/agente", rotulo: "Cadastro" }];

export default async function Agente() {
  const perfil = await exigirPapel("colaborador");
  const supabase = await createClient();

  const { data: condominios } = await supabase
    .from("condominios")
    .select("id, nome, codigo, bairro, provincia, total_moradias")
    .order("nome");

  return (
    <AppShell perfil={perfil} sub="Cadastro de condomínios" itens={NAV}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Cadastro</h1>
        <p className="text-sm text-ink-2">
          Condomínios e flats · sem acesso a dados financeiros
        </p>
      </div>
      <div className="card">
        <h2 className="mb-3 text-base font-extrabold">Condomínios cadastrados</h2>
        {(condominios?.length ?? 0) === 0 ? (
          <p className="text-sm text-ink-2">
            Ainda não há condomínios. O formulário de cadastro completo chega no
            próximo incremento da Fase 1.
          </p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {condominios!.map((c) => (
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
    </AppShell>
  );
}

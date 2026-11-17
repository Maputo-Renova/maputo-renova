
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

  // só o necessário ao cadastro; o histórico vive na Carteira (menu lateral)
  const { data: condominios } = await supabase
    .from("condominios")
    .select("id, nome")
    .eq("estado", "activo")
    .order("nome");

  const lista = condominios ?? [];

  return (
    <AppShell perfil={perfil} sub="Cadastro de condomínios" itens={NAV_AGENTE}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Cadastrar</h1>
        <p className="text-sm text-ink-2">
          Condomínios e flats · sem acesso a dados financeiros
        </p>
      </div>
      <div className="max-w-180">
        <Separadores
          paineis={[
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
              id: "flat",
              rotulo: "Nova flat",
              conteudo: (
                <div className="card">
                  <h2 className="mb-4 text-base font-extrabold">Nova flat</h2>
                  <FormNovaFlat condominios={lista} />
                </div>
              ),
            },
          ]}
        />
      </div>
    </AppShell>
  );
}

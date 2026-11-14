
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { Icone } from "@/components/Icone";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_GESTOR } from "@/lib/navs";
import { FormAviso } from "./FormAviso";

export default async function AvisosGestor() {
  await connection();
  const perfil = await exigirPapel("gestor");
  const supabase = await createClient();

  const [{ data: avisos }, { data: flats }] = await Promise.all([
    supabase
      .from("avisos")
      .select("id, titulo, corpo, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("flats").select("id"),
  ]);

  const nFlats = (flats ?? []).length;

  return (
    <AppShell perfil={perfil} sub="Gestão do condomínio" itens={NAV_GESTOR}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Avisos</h1>
        <p className="text-sm text-ink-2">
          Comunicações enviadas por SMS e email a todos os proprietários
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="grid gap-4">
          <div className="card">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="card-ico">
                <Icone nome="send" />
              </span>
              <h2 className="text-base font-extrabold">Novo aviso</h2>
            </div>
            <FormAviso nFlats={nFlats} />
          </div>
          <div className="card">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="card-ico">
                <Icone nome="clock" />
              </span>
              <h2 className="text-base font-extrabold">Régua de cobrança automática</h2>
            </div>
            <p className="text-[13px] text-ink-2">
              O sistema envia SMS e email sem intervenção do gestor:{" "}
              <b>5 dias antes do vencimento</b>, <b>no vencimento</b>, e aos{" "}
              <b>3 e 7 dias de atraso</b>. Cada envio fica registado com o custo.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="mb-2 flex items-center gap-2.5">
            <span className="card-ico">
              <Icone nome="bell" />
            </span>
            <h2 className="text-base font-extrabold">Avisos enviados</h2>
          </div>
          {(avisos ?? []).length === 0 ? (
            <div className="empty">
              <span className="e-ico">
                <Icone nome="bell" />
              </span>
              <b>Ainda sem avisos</b>
              <p>O primeiro aviso que enviar aparece aqui e na conta de cada proprietário.</p>
            </div>
          ) : (
            <ul className="row-list">
              {avisos!.map((a) => (
                <li key={a.id}>
                  <span className="row-ico g">
                    <Icone nome="bell" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="cell-main">{a.titulo}</div>
                    <div className="cell-sub">{a.corpo}</div>
                  </div>
                  <span className="cell-sub">
                    {new Date(a.created_at).toLocaleDateString("pt-PT")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

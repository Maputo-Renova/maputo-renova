
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_MORADOR } from "@/lib/navs";

export default async function AvisosMorador() {
  await connection();
  const perfil = await exigirPapel("proprietario");
  const supabase = await createClient();

  const [{ data: avisos }, { data: condo }] = await Promise.all([
    supabase
      .from("avisos")
      .select("id, titulo, corpo, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("condominios").select("nome").limit(1).maybeSingle(),
  ]);

  return (
    <AppShell perfil={perfil} sub="Proprietário" itens={NAV_MORADOR}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">
          Avisos do condomínio
        </h1>
        <p className="text-sm text-ink-2">{condo?.nome ?? "—"}</p>
      </div>

      {(avisos ?? []).length === 0 ? (
        <div className="card">
          <div className="empty">
            <span className="e-ico">!</span>
            <b>Sem avisos</b>
            <p>Os avisos da administração do condomínio aparecem aqui.</p>
          </div>
        </div>
      ) : (
        <div className="grid max-w-180 gap-4">
          {avisos!.map((a) => (
            <div key={a.id} className="card flex gap-3.5">
              <span className="row-ico g">!</span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-extrabold">{a.titulo}</div>
                <p className="mt-1 text-sm text-ink-2">{a.corpo}</p>
                <div className="cell-sub mt-2">
                  {new Date(a.created_at).toLocaleDateString("pt-PT")} · Administração
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

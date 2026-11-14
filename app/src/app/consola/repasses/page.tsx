
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { MT } from "@/components/Kpi";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_CONSOLA } from "@/lib/navs";
import { FormRepasse } from "./FormRepasse";

const MESES_S = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default async function Repasses() {
  await connection();
  const perfil = await exigirPapel("super_admin");
  const supabase = await createClient();

  const [{ data: condominios }, { data: movimentos }, { data: repasses }] =
    await Promise.all([
      supabase
        .from("condominios")
        .select("id, nome, bairro, banco_nome, banco_conta")
        .eq("estado", "activo")
        .order("nome"),
      supabase.from("movimentos").select("condominio_id, valor"),
      supabase
        .from("repasses")
        .select("condominio_id, valor, data")
        .order("data", { ascending: false }),
    ]);

  const saldoPorCondo = new Map<string, number>();
  for (const m of movimentos ?? []) {
    saldoPorCondo.set(
      m.condominio_id,
      (saldoPorCondo.get(m.condominio_id) ?? 0) + Number(m.valor),
    );
  }
  const ultimoPorCondo = new Map<string, string>();
  for (const r of repasses ?? []) {
    if (!ultimoPorCondo.has(r.condominio_id)) ultimoPorCondo.set(r.condominio_id, r.data);
  }

  return (
    <AppShell perfil={perfil} sub="Super administração" itens={NAV_CONSOLA}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Repasses</h1>
        <p className="text-sm text-ink-2">
          Saldos por repassar aos condomínios · transferência bancária com comprovativo
        </p>
      </div>
      <div className="grid gap-4">
        {(condominios ?? []).map((c) => {
          const saldo = saldoPorCondo.get(c.id) ?? 0;
          const ultimo = ultimoPorCondo.get(c.id);
          const destino = c.banco_nome
            ? `${c.banco_nome}${c.banco_conta ? ` · ${c.banco_conta}` : ""} (conta do condomínio)`
            : null;
          return (
            <div key={c.id} className="card">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-44">
                  <div className="cell-main text-[15px]">{c.nome}</div>
                  <div className="cell-sub">{c.bairro ?? "—"}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="cell-sub">Saldo a repassar</div>
                  <div className="num text-lg font-extrabold">{MT(saldo)}</div>
                </div>
                <div className="min-w-28 text-right">
                  <div className="cell-sub">Último repasse</div>
                  <div className="num text-sm font-bold">
                    {ultimo
                      ? (() => {
                          const d = new Date(`${ultimo}T00:00:00`);
                          return `${String(d.getDate()).padStart(2, "0")} ${MESES_S[d.getMonth()]}`;
                        })()
                      : "—"}
                  </div>
                </div>
              </div>
              {saldo > 0 ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-[13.5px] font-bold text-green-700">
                    Registar repasse
                  </summary>
                  <div className="mt-3 max-w-xl">
                    <FormRepasse condominioId={c.id} saldo={saldo} destino={destino} />
                  </div>
                </details>
              ) : (
                <p className="mt-2 text-[12.5px] text-ink-3">
                  Sem saldo por repassar — o saldo cresce com as cobranças confirmadas.
                </p>
              )}
            </div>
          );
        })}
        {(condominios ?? []).length === 0 ? (
          <div className="card">
            <div className="empty">
              <span className="e-ico">∅</span>
              <b>Sem condomínios activos</b>
              <p>Os repasses aparecem aqui quando houver cobranças confirmadas.</p>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

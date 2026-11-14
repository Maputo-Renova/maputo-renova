
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_CONSOLA } from "@/lib/navs";
import { alternarConta, alternarMetodo } from "../actions";
import { FormTaxas, FormNovaConta } from "./formularios";

export default async function ConfiguracaoConsola() {
  await connection();
  const perfil = await exigirPapel("super_admin");
  const supabase = await createClient();

  const [{ data: config }, { data: contas }, { data: metodos }] = await Promise.all([
    supabase
      .from("config_plataforma")
      .select("taxa_servico_pct, taxa_associacao")
      .maybeSingle(),
    supabase
      .from("contas_plataforma")
      .select("id, banco, titular, numero_conta, nib, finalidade, activo")
      .order("created_at"),
    supabase
      .from("metodos_manuais")
      .select("id, nome, instrucoes, requer_comprovativo, activo")
      .order("nome"),
  ]);

  const FINALIDADE: Record<string, string> = {
    ambos: "recebimentos e repasses",
    recebimentos: "só recebimentos",
    repasses: "só repasses",
  };

  return (
    <AppShell perfil={perfil} sub="Super administração" itens={NAV_CONSOLA}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Configuração</h1>
        <p className="text-sm text-ink-2">
          Taxas da plataforma, contas bancárias e métodos de pagamento manuais
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="grid gap-4">
          <div className="card">
            <h2 className="mb-4 text-base font-extrabold">Taxas</h2>
            <FormTaxas
              servicoPct={Number(config?.taxa_servico_pct ?? 15)}
              associacao={Number(config?.taxa_associacao ?? 499)}
            />
          </div>

          <div className="card">
            <h2 className="mb-3 text-base font-extrabold">Métodos manuais</h2>
            <ul className="divide-y divide-line-soft">
              {(metodos ?? []).map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-2 py-3">
                  <div>
                    <div className="font-bold">{m.nome}</div>
                    <div className="text-[12.5px] text-ink-3">
                      {m.requer_comprovativo ? "exige comprovativo" : "sem comprovativo"}
                    </div>
                  </div>
                  <form action={alternarMetodo} className="ml-auto">
                    <input type="hidden" name="metodo_id" value={m.id} />
                    <input type="hidden" name="activo" value={String(!m.activo)} />
                    <button className="btn btn-ghost btn-sm">
                      {m.activo ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                  <span className={m.activo ? "pill pill-pago" : "pill pill-pendente"}>
                    {m.activo ? "Activo" : "Inactivo"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12.5px] text-ink-3">
              M-Pesa e eMola automáticos chegam na Fase 2, com os contratos dos
              operadores.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="card">
            <h2 className="mb-3 text-base font-extrabold">Contas da plataforma</h2>
            {(contas ?? []).length === 0 ? (
              <p className="mb-3 text-sm text-ink-2">
                Sem contas — os moradores só conseguem pagar por transferência
                quando houver uma conta activa de recebimentos.
              </p>
            ) : (
              <ul className="mb-2 divide-y divide-line-soft">
                {contas!.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2 py-3">
                    <div>
                      <div className="font-bold">
                        {c.banco} <span className="num">· {c.numero_conta}</span>
                      </div>
                      <div className="text-[12.5px] text-ink-3">
                        {c.titular}
                        {c.nib ? (
                          <span className="num"> · NIB {c.nib}</span>
                        ) : null}{" "}
                        · {FINALIDADE[c.finalidade] ?? c.finalidade}
                      </div>
                    </div>
                    <form action={alternarConta} className="ml-auto">
                      <input type="hidden" name="conta_id" value={c.id} />
                      <input type="hidden" name="activo" value={String(!c.activo)} />
                      <button className="btn btn-ghost btn-sm">
                        {c.activo ? "Desactivar" : "Activar"}
                      </button>
                    </form>
                    <span className={c.activo ? "pill pill-pago" : "pill pill-pendente"}>
                      {c.activo ? "Activa" : "Inactiva"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card">
            <h2 className="mb-4 text-base font-extrabold">Nova conta</h2>
            <FormNovaConta />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

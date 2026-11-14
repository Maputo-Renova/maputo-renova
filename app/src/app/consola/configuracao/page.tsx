
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_CONSOLA } from "@/lib/navs";
import {
  alternarConta,
  alternarMetodo,
  removerConta,
  guardarTaxaMetodo,
} from "../actions";
import { FormTaxas, FormNovaConta } from "./formularios";
import { FormNovoMetodo } from "./FormNovoMetodo";

export default async function ConfiguracaoConsola() {
  await connection();
  const perfil = await exigirPapel("super_admin");
  const supabase = await createClient();

  const [{ data: config }, { data: contas }, { data: metodos }, { data: digitais }] =
    await Promise.all([
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
      supabase.from("taxas_metodos").select("metodo, percentagem, activo"),
    ]);

  const FINALIDADE: Record<string, string> = {
    ambos: "Recebimentos e repasses",
    recebimentos: "Só recebimentos",
    repasses: "Só repasses",
  };

  const mpesa = (digitais ?? []).find((d) => d.metodo === "mpesa");
  const emola = (digitais ?? []).find((d) => d.metodo === "emola");

  return (
    <AppShell perfil={perfil} sub="Super administração" itens={NAV_CONSOLA}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Configuração</h1>
        <p className="text-sm text-ink-2">
          Métodos de pagamento, contas bancárias, métodos manuais e receita da plataforma
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 text-base font-extrabold">Métodos digitais</h2>
          <p className="mb-1 text-[13px] text-ink-2">
            Confirmação automática por webhook. As taxas dos operadores são{" "}
            <b>deduzidas da taxa de serviço</b> — nunca cobradas à parte ao
            morador. Cada pagamento grava a taxa do momento da transacção.
          </p>
          <div className="cfg-row">
            <span
              className="grid h-9.5 w-9.5 flex-none place-items-center rounded-[10px] text-[9px] font-extrabold text-white"
              style={{ background: "#e60000" }}
            >
              M-PESA
            </span>
            <div className="min-w-0 flex-1">
              <div className="cell-main">M-Pesa</div>
              <div className="cell-sub">
                Vodacom · {mpesa?.activo ? "activo (Fase 2: contrato e webhook)" : "inactivo"}
              </div>
            </div>
            <form action={guardarTaxaMetodo} className="flex items-center gap-2">
              <input type="hidden" name="metodo" value="mpesa" />
              <input
                name="percentagem"
                className="num w-20 rounded-[10px] border border-line px-2.5 py-1.5 text-right text-sm font-bold"
                defaultValue={`${Number(mpesa?.percentagem ?? 0)}`}
                aria-label="Taxa M-Pesa (%)"
              />
              <span className="text-sm font-bold text-ink-3">%</span>
              <button className="btn btn-ghost btn-sm">Guardar</button>
            </form>
          </div>
          <div className="cfg-row">
            <span
              className="grid h-9.5 w-9.5 flex-none place-items-center rounded-[10px] text-[9px] font-extrabold text-white"
              style={{ background: "#f26522" }}
            >
              e-MOLA
            </span>
            <div className="min-w-0 flex-1">
              <div className="cell-main">eMola</div>
              <div className="cell-sub">Movitel · aguarda contrato</div>
            </div>
            <span className={emola?.activo ? "pill pill-pago" : "pill pill-pendente"}>
              {emola?.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-2 text-base font-extrabold">Contas bancárias da plataforma</h2>
          <p className="mb-1 text-[13px] text-ink-2">
            Para receber as transferências dos proprietários e enviar os repasses
            aos condomínios.
          </p>
          {(contas ?? []).length === 0 ? (
            <div className="empty">
              <span className="e-ico">B</span>
              <b>Sem contas</b>
              <p>Adicione a primeira conta bancária da plataforma.</p>
            </div>
          ) : (
            contas!.map((c) => (
              <div key={c.id} className="cfg-row">
                <span className="row-ico g">B</span>
                <div className="min-w-0 flex-1">
                  <div className="cell-main">
                    {c.banco} · <span className="num">{c.numero_conta}</span>
                  </div>
                  <div className="cell-sub">
                    {c.titular}
                    {c.nib ? (
                      <>
                        {" "}
                        · NIB <span className="num">{c.nib}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={c.activo ? "pill pill-pago" : "pill pill-pendente"}>
                    {FINALIDADE[c.finalidade] ?? c.finalidade}
                    {c.activo ? "" : " · inactiva"}
                  </span>
                  <div className="flex gap-2">
                    <form action={alternarConta}>
                      <input type="hidden" name="conta_id" value={c.id} />
                      <input type="hidden" name="activo" value={String(!c.activo)} />
                      <button className="text-[12.5px] font-bold text-ink-3 hover:underline">
                        {c.activo ? "Desactivar" : "Activar"}
                      </button>
                    </form>
                    <form action={removerConta}>
                      <input type="hidden" name="conta_id" value={c.id} />
                      <button className="text-[12.5px] font-bold text-red-700 hover:underline">
                        Remover
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))
          )}
          <details className="mt-3">
            <summary className="cursor-pointer text-[13.5px] font-bold text-green-700">
              + Adicionar conta
            </summary>
            <div className="mt-3">
              <FormNovaConta />
            </div>
          </details>
        </div>
      </div>

      <div className="card mt-4">
        <h2 className="mb-2 text-base font-extrabold">Métodos manuais</h2>
        <p className="mb-1 text-[13px] text-ink-2">
          Pagamentos confirmados pelo gestor depois de validar o comprovativo.
          Aparecem ao proprietário na hora de pagar.
        </p>
        {(metodos ?? []).map((m) => (
          <div key={m.id} className="cfg-row">
            <span className="row-ico g">T</span>
            <div className="min-w-0 flex-1">
              <div className="cell-main">{m.nome}</div>
              <div className="cell-sub">
                {m.instrucoes ?? "—"}
                {m.requer_comprovativo ? " · requer comprovativo" : ""}
              </div>
            </div>
            <span className={m.activo ? "pill pill-pago" : "pill pill-pendente"}>
              {m.activo ? "Activo" : "Inactivo"}
            </span>
            <form action={alternarMetodo}>
              <input type="hidden" name="metodo_id" value={m.id} />
              <input type="hidden" name="activo" value={String(!m.activo)} />
              <button className="btn btn-ghost btn-sm">
                {m.activo ? "Desactivar" : "Activar"}
              </button>
            </form>
          </div>
        ))}
        <details className="mt-3">
          <summary className="cursor-pointer text-[13.5px] font-bold text-green-700">
            + Adicionar método manual
          </summary>
          <div className="mt-3 max-w-xl">
            <FormNovoMetodo />
          </div>
        </details>
      </div>

      <div className="card mt-4 max-w-2xl">
        <h2 className="mb-4 text-base font-extrabold">Taxa de serviço</h2>
        <FormTaxas
          servicoPct={Number(config?.taxa_servico_pct ?? 15)}
          associacao={Number(config?.taxa_associacao ?? 499)}
        />
        <div className="note mt-4">
          <span>
            A fatura do morador tem 3 linhas: taxa de condomínio (variável,
            repassada ao condomínio), taxa da associação (fixa, para o fundo de
            projectos votados em assembleia) e serviço (operadores, SMS e
            plataforma são deduzidos dela). Alterações de taxas e de contas
            aplicam-se só a cobranças futuras.
          </span>
        </div>
      </div>
    </AppShell>
  );
}

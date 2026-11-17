"use client";

import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Icone } from "@/components/Icone";
import { reenviarConviteFlat, type EstadoAccao } from "../actions";

const semSubscricao = () => () => {};

export type FlatDrawer = {
  faturaId: string;
  flatId: string;
  numero: string;
  bloco: string | null;
  andar: string | null;
  referencia: string | null;
  proprietario: string;
  telefone: string | null;
  email: string | null;
  nuit: string | null;
  documento: string | null;
  comTemConta: boolean;
  comComprovativo: boolean;
  quotaRotulo: string;
  historico: { mes: string; estado: string; referencia: string }[];
};

const PILL: Record<string, { classe: string; rotulo: string }> = {
  paga: { classe: "pill pill-pago", rotulo: "Paga" },
  pendente: { classe: "pill pill-pendente", rotulo: "Pendente" },
  em_atraso: { classe: "pill pill-atraso", rotulo: "Em atraso" },
  a_confirmar: { classe: "pill pill-confirmar", rotulo: "A confirmar" },
};

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div className="field">
      <label>{rotulo}</label>
      <input value={valor ?? "—"} readOnly className="!bg-bg !text-ink-2" />
    </div>
  );
}

/** Drawer com o detalhe da flat (protótipo: Gestor → Pagamentos). */
export function DrawerFlat({ flat, aoFechar }: { flat: FlatDrawer; aoFechar: () => void }) {
  const montado = useSyncExternalStore(semSubscricao, () => true, () => false);
  const [resultado, accao, pendente] = useActionState<EstadoAccao, FormData>(
    reenviarConviteFlat,
    null,
  );

  // trava o scroll de fundo enquanto aberto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!montado) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/35" onClick={aoFechar} aria-hidden />
      <aside
        className="absolute inset-y-0 right-0 flex w-[420px] max-w-[94vw] flex-col overflow-y-auto bg-card shadow-2xl"
        aria-label={`Flat ${flat.numero}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line-soft px-5 py-4">
          <div>
            <h3 className="text-[17px] font-extrabold">
              Flat {flat.numero}
              {flat.bloco ? ` · Bloco ${flat.bloco}` : ""}
            </h3>
            <p className="num text-[12.5px] text-ink-3">
              {flat.andar ? `${flat.andar}.º andar · ` : ""}
              {flat.referencia}
            </p>
          </div>
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="grid size-9 shrink-0 place-items-center rounded-[10px] text-ink-2 hover:bg-bg"
          >
            <Icone nome="x" sm />
          </button>
        </div>

        <div className="grid gap-3.5 px-5 py-4">
          <div className="note items-center">
            <Icone nome="shield" sm />
            <span className="flex-1 text-[12.5px]">
              Registo em nome do <b>proprietário</b>. Mudança de titular só por
              acção administrativa, com auditoria.
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Proprietário" valor={flat.proprietario} />
            <Campo rotulo="Telefone" valor={flat.telefone} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Documento" valor={flat.documento} />
            <Campo rotulo="NUIT" valor={flat.nuit} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Quota mensal" valor={flat.quotaRotulo} />
            <Campo
              rotulo="Comprovativo de endereço"
              valor={flat.comComprovativo ? "entregue" : "por entregar"}
            />
          </div>

          <h4 className="mt-1 text-[14px] font-extrabold">Acesso do proprietário</h4>
          {flat.comTemConta ? (
            <>
              <Campo rotulo="Email de acesso" valor={flat.email} />
              <p className="-mt-1 text-xs font-semibold text-ink-3">
                Conta activa. A alteração do email de uma conta activa é feita
                pela consola.
              </p>
            </>
          ) : (
            <form action={accao} className="grid gap-2.5">
              <input type="hidden" name="flat_id" value={flat.flatId} />
              <div className="field">
                <label htmlFor={`dr-email-${flat.flatId}`}>Email de acesso</label>
                <input
                  id={`dr-email-${flat.flatId}`}
                  name="email"
                  type="email"
                  required
                  defaultValue={flat.email ?? ""}
                  placeholder="email do proprietário"
                />
                <span className="text-xs font-semibold text-ink-3">
                  O proprietário recebe um link e só define a password.
                </span>
              </div>
              {resultado ? (
                <p
                  className={`text-[13px] font-semibold ${resultado.ok ? "rounded-xl bg-green-100 p-2.5 text-green-800" : "text-red-700"}`}
                >
                  {resultado.mensagem}
                </p>
              ) : null}
              <button className="btn btn-primary" disabled={pendente}>
                <Icone nome="send" sm />
                {pendente ? "A reenviar…" : "Guardar email e reenviar acesso"}
              </button>
            </form>
          )}

          <h4 className="mt-1 text-[14px] font-extrabold">Últimos meses</h4>
          <ul className="divide-y divide-line-soft">
            {flat.historico.map((h) => {
              const pill = PILL[h.estado] ?? PILL.pendente;
              return (
                <li key={h.mes} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold">{h.mes}</div>
                    <div className="num text-[12px] text-ink-3">Referência {h.referencia}</div>
                  </div>
                  <span className={pill.classe}>{pill.rotulo}</span>
                </li>
              );
            })}
            {flat.historico.length === 0 ? (
              <li className="py-2.5 text-sm text-ink-3">Ainda sem faturas.</li>
            ) : null}
          </ul>
        </div>

        <div className="mt-auto border-t border-line-soft px-5 py-3.5">
          <button className="btn btn-ghost w-full" onClick={aoFechar}>
            Fechar
          </button>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

/** Linha clicável da tabela que abre o drawer. */
export function LinhaFlat({
  flat,
  children,
}: {
  flat: FlatDrawer;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex w-full flex-wrap items-center gap-3 py-3.5 text-left transition-colors hover:bg-green-50/60"
      >
        {children}
      </button>
      {aberto ? <DrawerFlat flat={flat} aoFechar={() => setAberto(false)} /> : null}
    </>
  );
}

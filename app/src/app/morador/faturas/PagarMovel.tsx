"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { iniciarPagamentoMovel, estadoPagamentoMovel } from "./actions";

const ROTULO: Record<"mpesa" | "emola", string> = { mpesa: "M-Pesa", emola: "eMola" };
const DICA: Record<"mpesa" | "emola", string> = {
  mpesa: "Número Vodacom (84/85)",
  emola: "Número Movitel (86/87)",
};

function mensagemDoCodigo(codigo: string | null): string {
  switch (codigo) {
    case "EMOLA-11":
      return "O pedido expirou sem o PIN — verifique o telemóvel e tente de novo.";
    case "EMOLA-12":
      return "Este número não tem conta eMola.";
    case "EMOLA-20":
      return "O número está ocupado noutra operação — aguarde uns segundos e tente de novo.";
    case "EMOLA-07":
    case "INS-2051":
      return "Número inválido — confirme e tente de novo.";
    case "INS-2006":
      return "Saldo insuficiente na conta M-Pesa.";
    default:
      return `O pagamento não foi concluído${codigo ? ` (${codigo})` : ""} — tente de novo.`;
  }
}

type Fase =
  | { nome: "formulario"; erro: string | null; aEnviar: boolean }
  | { nome: "a_confirmar"; transId: string }
  | { nome: "incerto" };

/** Painel do pagamento móvel para o método escolhido no selector. */
export function PainelMovel({
  faturaId,
  metodo,
  totalRotulo,
  aoCancelar,
}: {
  faturaId: string;
  metodo: "mpesa" | "emola";
  totalRotulo: string;
  aoCancelar: () => void;
}) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>({ nome: "formulario", erro: null, aEnviar: false });
  const numeroRef = useRef<HTMLInputElement>(null);

  // acompanha o pedido: o cliente está a confirmar o PIN no telemóvel
  useEffect(() => {
    if (fase.nome !== "a_confirmar") return;
    const inicio = Date.now();
    let activo = true;
    const intervalo = setInterval(async () => {
      if (!activo) return;
      const t = await estadoPagamentoMovel(fase.transId);
      if (!activo || !t) return;
      if (t.estado === "SUCCESS") {
        activo = false;
        clearInterval(intervalo);
        router.refresh(); // a fatura já está Paga
      } else if (t.estado === "FAILED") {
        activo = false;
        clearInterval(intervalo);
        setFase({ nome: "formulario", erro: mensagemDoCodigo(t.codigo), aEnviar: false });
      } else if (t.estado === "UNKNOWN" || Date.now() - inicio > 120_000) {
        activo = false;
        clearInterval(intervalo);
        setFase({ nome: "incerto" });
      }
    }, 2500);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [fase, router]);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (fase.nome !== "formulario") return;
    setFase({ nome: "formulario", erro: null, aEnviar: true });
    const r = await iniciarPagamentoMovel(faturaId, metodo, numeroRef.current?.value ?? "");
    if (r.ok) setFase({ nome: "a_confirmar", transId: r.transId });
    else setFase({ nome: "formulario", erro: r.mensagem, aEnviar: false });
  }

  if (fase.nome === "incerto") {
    return (
      <div className="mt-3 rounded-2xl border border-line bg-green-50 p-4 text-[13.5px] text-ink-2">
        A operadora ainda não confirmou o pagamento. O estado actualiza
        automaticamente — se o valor tiver saído da sua conta, a fatura ficará
        Paga sem precisar de fazer nada.
      </div>
    );
  }

  if (fase.nome === "a_confirmar") {
    return (
      <div className="mt-3 rounded-2xl border border-line bg-green-50 p-4">
        <p className="text-[13.5px] font-semibold">
          Enviámos um pedido {ROTULO[metodo]} para o seu telemóvel.
        </p>
        <p className="mt-1 text-[13px] text-ink-2">
          Confirme o pagamento de <b className="num">{totalRotulo}</b> com o seu
          PIN. Esta página actualiza sozinha.
        </p>
        <p className="mt-2 text-[12.5px] font-semibold text-ink-3">A aguardar confirmação…</p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-3 rounded-2xl border border-line bg-green-50 p-4">
      <p className="mb-2 text-[13.5px] text-ink-2">
        Vai receber um pedido {ROTULO[metodo]} no telemóvel para confirmar{" "}
        <b className="num">{totalRotulo}</b> com o seu PIN.
      </p>
      <div className="field">
        <label htmlFor={`msisdn-${faturaId}`}>{DICA[metodo]}</label>
        <input
          id={`msisdn-${faturaId}`}
          ref={numeroRef}
          name="msisdn"
          type="tel"
          inputMode="numeric"
          placeholder={metodo === "mpesa" ? "84 000 0000" : "86 000 0000"}
          required
        />
      </div>
      {fase.erro ? (
        <p className="mt-2 text-[13px] font-semibold text-red-700">{fase.erro}</p>
      ) : null}
      <div className="mt-3 flex gap-2.5">
        <button type="button" className="btn btn-ghost" onClick={aoCancelar}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={fase.aEnviar}>
          {fase.aEnviar ? "A enviar…" : "Enviar pedido ao telemóvel"}
        </button>
      </div>
    </form>
  );
}

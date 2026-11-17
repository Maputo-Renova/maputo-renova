"use client";

import { useState } from "react";
import { Icone } from "@/components/Icone";
import { PainelMovel } from "./PagarMovel";
import { PainelTransferencia, type Conta } from "./PagarTransferencia";

type Metodo = "mpesa" | "emola" | "transferencia";

const ROTULO: Record<Metodo, string> = {
  mpesa: "M-Pesa",
  emola: "eMola",
  transferencia: "Transferência",
};
const ICONE: Record<Metodo, "phone" | "bank"> = {
  mpesa: "phone",
  emola: "phone",
  transferencia: "bank",
};

// Selector de método de pagamento da fatura: botões de largura igual
// (activo verde, inactivos cinza claro) e o painel do método escolhido.
export function PagarFatura({
  faturaId,
  referencia,
  total,
  servico,
  associacao,
  conta,
  metodosMoveis,
  totalRotulo,
}: {
  faturaId: string;
  referencia: string;
  total: number;
  servico: number;
  associacao: number;
  conta: Conta;
  metodosMoveis: ("mpesa" | "emola")[];
  totalRotulo: string;
}) {
  const [metodo, setMetodo] = useState<Metodo | null>(null);
  const opcoes: Metodo[] = [...metodosMoveis, "transferencia"];

  return (
    <div>
      <p className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-ink-3">
        Pagar com
      </p>
      <div className="grid auto-cols-fr grid-flow-col gap-2">
        {opcoes.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={metodo === o}
            onClick={() => setMetodo(metodo === o ? null : o)}
            className={`flex items-center justify-center gap-2 rounded-[12px] px-3 py-2.5 text-[13.5px] font-bold transition-colors ${
              metodo === o
                ? "bg-green-600 text-white"
                : "bg-bg text-ink-2 hover:bg-green-50"
            }`}
          >
            <Icone nome={ICONE[o]} sm />
            {ROTULO[o]}
          </button>
        ))}
      </div>

      {metodo === "transferencia" ? (
        <PainelTransferencia
          faturaId={faturaId}
          referencia={referencia}
          total={total}
          servico={servico}
          associacao={associacao}
          conta={conta}
          aoCancelar={() => setMetodo(null)}
        />
      ) : null}
      {metodo === "mpesa" || metodo === "emola" ? (
        <PainelMovel
          key={metodo}
          faturaId={faturaId}
          metodo={metodo}
          totalRotulo={totalRotulo}
          aoCancelar={() => setMetodo(null)}
        />
      ) : null}
    </div>
  );
}

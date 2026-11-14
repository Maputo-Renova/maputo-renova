"use client";

import { useActionState } from "react";
import { Icone } from "@/components/Icone";
import { criarDespesa, type EstadoAccao } from "../actions";

export function FormDespesa() {
  const [estado, accao, pendente] = useActionState<EstadoAccao, FormData>(
    criarDespesa,
    null,
  );
  return (
    <form action={accao} className="grid gap-3">
      <div className="field">
        <label>Descrição</label>
        <input name="descricao" required placeholder="Ex.: Reparação do portão" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field">
          <label>Categoria</label>
          <select name="categoria" defaultValue="Manutenção">
            <option>Manutenção</option>
            <option>Limpeza</option>
            <option>Segurança</option>
            <option>Energia</option>
            <option>Outra</option>
          </select>
        </div>
        <div className="field">
          <label>Valor (MT)</label>
          <input name="valor" className="num" inputMode="decimal" required placeholder="0" />
        </div>
      </div>
      <div className="field">
        <label>Fatura ou recibo (obrigatório)</label>
        <input name="comprovativo" type="file" accept=".pdf,image/*" required />
        <span className="mt-1 text-[12px] text-ink-3">
          Toda a despesa precisa da fatura anexada — entra no extrato visível à
          consola e aos proprietários.
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary btn-sm" disabled={pendente}>
          <Icone nome="check" sm />
          {pendente ? "A registar…" : "Registar despesa"}
        </button>
        {estado ? (
          <p
            className={`text-[13px] font-semibold ${estado.ok ? "text-green-700" : "text-red-700"}`}
            role="status"
          >
            {estado.mensagem}
          </p>
        ) : null}
      </div>
    </form>
  );
}

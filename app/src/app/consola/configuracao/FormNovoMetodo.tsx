"use client";

import { useActionState } from "react";
import { criarMetodoManual, type EstadoAccao } from "../actions";

export function FormNovoMetodo() {
  const [estado, accao, pendente] = useActionState<EstadoAccao, FormData>(
    criarMetodoManual,
    null,
  );
  return (
    <form action={accao} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field">
          <label>Nome</label>
          <input name="nome" required placeholder="Ex.: Depósito no balcão" />
        </div>
        <div className="field">
          <label>Instruções</label>
          <input name="instrucoes" placeholder="O que o morador deve fazer" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-[13.5px] font-semibold">
        <input type="checkbox" name="requer_comprovativo" defaultChecked />
        Requer comprovativo
      </label>
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost btn-sm" disabled={pendente}>
          {pendente ? "A criar…" : "Adicionar método manual"}
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

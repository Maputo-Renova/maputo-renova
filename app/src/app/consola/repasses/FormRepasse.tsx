"use client";

import { useActionState } from "react";
import { registarRepasse, type EstadoAccao } from "../actions";

export function FormRepasse({
  condominioId,
  saldo,
  destino,
}: {
  condominioId: string;
  saldo: number;
  destino: string | null;
}) {
  const [estado, accao, pendente] = useActionState<EstadoAccao, FormData>(
    registarRepasse,
    null,
  );
  const hoje = new Date().toISOString().slice(0, 10);
  return (
    <form action={accao} className="grid gap-3">
      <input type="hidden" name="condominio_id" value={condominioId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field">
          <label>Valor (MT)</label>
          <input
            name="valor"
            className="num"
            inputMode="decimal"
            defaultValue={saldo > 0 ? String(Math.round(saldo)) : ""}
            required
          />
        </div>
        <div className="field">
          <label>Data</label>
          <input name="data" type="date" className="num" defaultValue={hoje} required />
        </div>
      </div>
      <div className="field">
        <label>Conta de destino</label>
        <input
          name="nota"
          defaultValue={destino ?? ""}
          placeholder="Banco · conta do condomínio"
        />
      </div>
      <div className="field">
        <label>Comprovativo da transferência</label>
        <input name="comprovativo" type="file" accept=".pdf,image/*" />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary btn-sm" disabled={pendente}>
          {pendente ? "A registar…" : "Registar repasse"}
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

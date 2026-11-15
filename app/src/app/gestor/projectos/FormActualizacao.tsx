"use client";

import { useActionState } from "react";
import { Icone } from "@/components/Icone";
import { actualizarProjecto, type EstadoAccao } from "../actions";

export function FormActualizacao({
  projectoId,
  progresso,
  gasto,
}: {
  projectoId: string;
  progresso: number;
  gasto: number;
}) {
  const [estado, accao, pendente] = useActionState<EstadoAccao, FormData>(
    actualizarProjecto,
    null,
  );
  return (
    <form action={accao} className="grid gap-3">
      <input type="hidden" name="projecto_id" value={projectoId} />
      <div className="field">
        <label>O que avançou</label>
        <textarea
          name="texto"
          rows={2}
          required
          placeholder="Ex.: Fachada do Bloco A concluída; iniciado o Bloco B."
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field">
          <label>Execução (%)</label>
          <input
            name="progresso"
            type="number"
            min={0}
            max={100}
            defaultValue={progresso}
            className="num"
            required
          />
        </div>
        <div className="field">
          <label>Gasto até agora (MT)</label>
          <input name="gasto" className="num" inputMode="decimal" defaultValue={gasto || 0} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary btn-sm" disabled={pendente}>
          <Icone nome="check" sm />
          {pendente ? "A publicar…" : "Publicar actualização"}
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

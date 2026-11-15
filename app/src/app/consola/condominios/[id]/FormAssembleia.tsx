"use client";

import { useActionState } from "react";
import { Icone } from "@/components/Icone";
import { registarAssembleia, type EstadoAccao } from "../../actions";

export function FormAssembleia({ projectoId }: { projectoId: string }) {
  const [estado, accao, pendente] = useActionState<EstadoAccao, FormData>(
    registarAssembleia,
    null,
  );
  return (
    <form action={accao} className="grid max-w-xl gap-3">
      <input type="hidden" name="projecto_id" value={projectoId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="field">
          <label>Votos a favor</label>
          <input name="votos_favor" type="number" min={0} required className="num" placeholder="0" />
        </div>
        <div className="field">
          <label>Votos contra</label>
          <input name="votos_contra" type="number" min={0} required className="num" placeholder="0" />
        </div>
        <div className="field">
          <label>Decisão</label>
          <select name="decisao" defaultValue="aprovado">
            <option value="aprovado">Aprovado em assembleia</option>
            <option value="rejeitado">Chumbado em assembleia</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary btn-sm" disabled={pendente}>
          <Icone nome="check" sm />
          {pendente ? "A registar…" : "Registar resultado"}
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

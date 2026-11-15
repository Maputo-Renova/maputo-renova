"use client";

import { useActionState } from "react";
import { Icone } from "@/components/Icone";
import { votarProjecto, type EstadoAccao } from "../actions";

export function FormVoto({ projectoId }: { projectoId: string }) {
  const [estado, accao, pendente] = useActionState<EstadoAccao, FormData>(
    votarProjecto,
    null,
  );
  return (
    <div className="mt-3 grid gap-2">
      <div className="text-[13px] font-bold">Votação na assembleia — a sua flat:</div>
      <div className="flex flex-wrap items-center gap-2.5">
        <form action={accao}>
          <input type="hidden" name="projecto_id" value={projectoId} />
          <input type="hidden" name="favor" value="true" />
          <button className="btn btn-primary btn-sm" disabled={pendente}>
            <Icone nome="check" sm />A favor
          </button>
        </form>
        <form action={accao}>
          <input type="hidden" name="projecto_id" value={projectoId} />
          <input type="hidden" name="favor" value="false" />
          <button className="btn btn-ghost btn-sm" disabled={pendente}>
            <Icone nome="x" sm />
            Contra
          </button>
        </form>
        {estado ? (
          <p
            className={`text-[13px] font-semibold ${estado.ok ? "text-green-700" : "text-red-700"}`}
            role="status"
          >
            {estado.mensagem}
          </p>
        ) : null}
      </div>
    </div>
  );
}

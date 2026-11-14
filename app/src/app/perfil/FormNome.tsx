"use client";

import { useActionState } from "react";
import { guardarNome, type EstadoAccao } from "./actions";

export function FormNome({
  nome,
  apelido,
  email,
  mensagemEmail,
}: {
  nome: string;
  apelido: string;
  email: string;
  mensagemEmail: string;
}) {
  const [estado, accao, pendente] = useActionState<EstadoAccao, FormData>(
    guardarNome,
    null,
  );
  return (
    <form action={accao} className="grid gap-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="pf-nome">Nome</label>
          <input id="pf-nome" name="nome" defaultValue={nome} required />
        </div>
        <div className="field">
          <label htmlFor="pf-apelido">Apelido</label>
          <input id="pf-apelido" name="apelido" defaultValue={apelido} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="pf-email">Email</label>
        <input
          id="pf-email"
          value={email}
          readOnly
          className="!bg-bg !text-ink-2"
        />
        <span className="mt-1 text-[12.5px] text-ink-3">{mensagemEmail}</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pendente}>
          {pendente ? "A guardar…" : "Guardar alterações"}
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

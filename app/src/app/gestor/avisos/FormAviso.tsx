"use client";

import { useActionState } from "react";
import { enviarAviso, type EstadoAccao } from "../actions";

export function FormAviso({ nFlats }: { nFlats: number }) {
  const [estado, accao, pendente] = useActionState<EstadoAccao, FormData>(
    enviarAviso,
    null,
  );
  return (
    <form action={accao} className="grid gap-3">
      <div className="field">
        <label htmlFor="av-t">Título</label>
        <input id="av-t" name="titulo" required placeholder="Ex.: Corte de energia na sexta" />
      </div>
      <div className="field">
        <label htmlFor="av-c">Mensagem</label>
        <textarea
          id="av-c"
          name="corpo"
          rows={4}
          required
          placeholder="Escreva o aviso. O SMS usa os primeiros 150 caracteres."
        />
      </div>
      <button className="btn btn-primary w-full justify-center" disabled={pendente}>
        {pendente ? "A enviar…" : `Enviar a ${nFlats} flats`}
      </button>
      {estado ? (
        <p
          className={`text-[13px] font-semibold ${estado.ok ? "text-green-700" : "text-red-700"}`}
          role="status"
        >
          {estado.mensagem}
        </p>
      ) : null}
      <p className="text-[12px] text-ink-3">
        O envio por SMS e email activa-se com a integração de mensagens; até lá o
        aviso fica visível na conta de cada proprietário.
      </p>
    </form>
  );
}

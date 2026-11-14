"use client";

import { useActionState } from "react";
import { Icone } from "@/components/Icone";
import { criarTicket, type EstadoAccao } from "../actions";

export function FormTicket({ categoriaInicial }: { categoriaInicial?: string }) {
  const [estado, accao, pendente] = useActionState<EstadoAccao, FormData>(
    criarTicket,
    null,
  );
  return (
    <form action={accao} className="grid gap-3">
      <div className="field">
        <label htmlFor="tk-cat">Tipo</label>
        <select id="tk-cat" name="categoria" defaultValue={categoriaInicial ?? "Reclamação"}>
          <option>Reclamação</option>
          <option>Avaria</option>
          <option>Pedido</option>
          <option>Correcção de dados</option>
          <option>Outro</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="tk-assunto">Assunto</label>
        <input id="tk-assunto" name="assunto" required placeholder="Ex.: Fuga de água na garagem" />
      </div>
      <div className="field">
        <label htmlFor="tk-msg">Descrição</label>
        <textarea
          id="tk-msg"
          name="mensagem"
          rows={4}
          required
          placeholder="Descreva o problema ou o pedido."
        />
      </div>
      <button className="btn btn-primary w-full justify-center" disabled={pendente}>
        <Icone nome="send" sm />
        {pendente ? "A enviar…" : "Enviar ao gestor"}
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
        O gestor responde por SMS ou email; o estado aparece aqui.
      </p>
    </form>
  );
}

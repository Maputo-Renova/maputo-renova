"use client";

import { useActionState, useState } from "react";
import { Icone } from "@/components/Icone";
import { criarColaborador, type EstadoAccao } from "../actions";

export function FormNovoColaborador({
  condominios,
}: {
  condominios: { id: string; nome: string }[];
}) {
  const [estado, accao, pendente] = useActionState<EstadoAccao, FormData>(
    criarColaborador,
    null,
  );
  const [funcao, setFuncao] = useState("Agente");

  return (
    <form action={accao} className="grid gap-3.5">
      <div className="field">
        <label htmlFor="cl-funcao">Função</label>
        <select
          id="cl-funcao"
          name="funcao"
          value={funcao}
          onChange={(e) => setFuncao(e.target.value)}
        >
          <option value="Agente">Agente — faz os cadastros de condomínios e flats</option>
          <option value="Administrador">Administrador — acesso total à consola</option>
          <option value="Gestor">Gestor — gere um condomínio</option>
        </select>
      </div>
      {funcao === "Gestor" ? (
        <div className="field">
          <label htmlFor="cl-condo">Condomínio a gerir</label>
          <select id="cl-condo" name="condominio_id" required>
            {condominios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="cl-nome">Nome</label>
          <input id="cl-nome" name="nome" required />
        </div>
        <div className="field">
          <label htmlFor="cl-apelido">Apelido</label>
          <input id="cl-apelido" name="apelido" required />
        </div>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="cl-email">Email</label>
          <input id="cl-email" name="email" type="email" required placeholder="email@exemplo.co.mz" />
        </div>
        <div className="field">
          <label htmlFor="cl-tel">Contacto</label>
          <input id="cl-tel" name="telefone" className="num" inputMode="tel" placeholder="84 000 0000" />
        </div>
      </div>
      <p className="text-[12.5px] text-ink-3">
        É gerado um código de convite de uso único, enviado automaticamente por
        email; a pessoa cria a conta em &quot;Tenho um código de convite&quot; na
        página de entrada.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={pendente}>
          <Icone nome="check" sm />
          {pendente ? "A criar…" : "Criar e convidar"}
        </button>
      </div>
      {estado ? (
        <p
          className={`break-words text-[13px] font-semibold ${estado.ok ? "text-green-700" : "text-red-700"}`}
          role="status"
        >
          {estado.mensagem}
        </p>
      ) : null}
    </form>
  );
}

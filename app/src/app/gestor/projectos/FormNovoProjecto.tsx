"use client";

import { useActionState, useState } from "react";
import { Icone } from "@/components/Icone";
import { criarProjecto, type EstadoAccao } from "../actions";

export function FormNovoProjecto({ nFlats }: { nFlats: number }) {
  const [estado, accao, pendente] = useActionState<EstadoAccao, FormData>(
    criarProjecto,
    null,
  );
  const [financiamento, setFinanciamento] = useState("fundo");

  return (
    <form action={accao} className="grid gap-3.5">
      <div className="field">
        <label htmlFor="pj-nome">Nome do projecto</label>
        <input id="pj-nome" name="nome" required placeholder="Ex.: Reparação do portão da garagem" />
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="pj-cat">Categoria</label>
          <select id="pj-cat" name="categoria" defaultValue="Reparação">
            <option>Reparação</option>
            <option>Construção</option>
            <option>Melhoria</option>
            <option>Segurança</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="pj-data">Conclusão prevista</label>
          <input id="pj-data" name="data_prevista" type="date" required className="num" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="pj-desc">Descrição</label>
        <textarea
          id="pj-desc"
          name="descricao"
          rows={3}
          placeholder="O que vai ser feito, porquê, e o que fica resolvido."
        />
      </div>
      <div className="field">
        <label htmlFor="pj-orc">Orçamento previsto (MT)</label>
        <input id="pj-orc" name="orcamento" className="num" inputMode="decimal" required placeholder="0" />
      </div>
      <div className="field">
        <label htmlFor="pj-fin">Financiamento</label>
        <select
          id="pj-fin"
          name="financiamento"
          defaultValue="fundo"
          onChange={(e) => setFinanciamento(e.target.value)}
        >
          <option value="fundo">Fundo do condomínio (sem cobrança extra)</option>
          <option value="quota_extraordinaria">
            Quota extraordinária (dividida pelas {nFlats} flats)
          </option>
          <option value="associacao">
            Fundo da associação de condomínios (votação na assembleia)
          </option>
        </select>
        <span className="mt-1 text-[12px] text-ink-3">
          Quota extraordinária: o valor por flat entra nas faturas depois da
          aprovação. Fundo da associação: exige o condomínio 100% em dia com a
          taxa da associação e passa por votação na assembleia.
        </span>
      </div>
      {financiamento === "quota_extraordinaria" ? (
        <div className="field">
          <label htmlFor="pj-quota">Quota extraordinária por flat (MT)</label>
          <input id="pj-quota" name="quota_extra" className="num" inputMode="decimal" placeholder="0" />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={pendente}>
          <Icone nome="send" sm />
          {pendente ? "A enviar…" : "Enviar à consola"}
        </button>
      </div>
      {estado ? (
        <p
          className={`text-[13px] font-semibold ${estado.ok ? "text-green-700" : "text-red-700"}`}
          role="status"
        >
          {estado.mensagem}
        </p>
      ) : null}
    </form>
  );
}

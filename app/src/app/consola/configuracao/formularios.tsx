"use client";

import { Icone } from "@/components/Icone";
import { useActionState } from "react";
import { guardarTaxas, criarConta, type EstadoAccao } from "../actions";

function Mensagem({ estado }: { estado: EstadoAccao }) {
  if (!estado) return null;
  return (
    <p
      className={`text-[13px] font-semibold ${estado.ok ? "text-green-700" : "text-red-700"}`}
      role="status"
    >
      {estado.mensagem}
    </p>
  );
}

export function FormTaxas({
  servicoPct,
  associacao,
}: {
  servicoPct: number;
  associacao: number;
}) {
  const [estado, accao, pendente] = useActionState(guardarTaxas, null);
  return (
    <form action={accao} className="grid gap-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="taxa_servico_pct">Taxa de serviço (%)</label>
          <input
            id="taxa_servico_pct"
            name="taxa_servico_pct"
            type="number"
            step="0.5"
            min="0"
            max="100"
            defaultValue={servicoPct}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="taxa_associacao">Taxa da associação (MT)</label>
          <input
            id="taxa_associacao"
            name="taxa_associacao"
            type="number"
            step="1"
            min="0"
            defaultValue={associacao}
            required
          />
        </div>
      </div>
      <p className="text-[12.5px] text-ink-3">
        A taxa de serviço incide sobre a quota de cada flat; os custos de
        operadores e SMS são deduzidos dela. A taxa da associação é fixa por
        flat e alimenta o fundo de projectos.
      </p>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pendente}>
          <Icone nome="check" sm />
          {pendente ? "A guardar…" : "Guardar taxas"}
        </button>
        <Mensagem estado={estado} />
      </div>
    </form>
  );
}

export function FormNovaConta() {
  const [estado, accao, pendente] = useActionState(criarConta, null);
  return (
    <form action={accao} className="grid gap-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="banco">Banco</label>
          <input id="banco" name="banco" required placeholder="BCI" />
        </div>
        <div className="field">
          <label htmlFor="titular">Titular</label>
          <input id="titular" name="titular" required placeholder="Maputo Renova, Lda." />
        </div>
        <div className="field">
          <label htmlFor="numero_conta">Número da conta</label>
          <input id="numero_conta" name="numero_conta" required inputMode="numeric" />
        </div>
        <div className="field">
          <label htmlFor="nib">NIB (opcional)</label>
          <input id="nib" name="nib" inputMode="numeric" />
        </div>
        <div className="field sm:col-span-2">
          <label htmlFor="finalidade">Finalidade</label>
          <select id="finalidade" name="finalidade" defaultValue="ambos">
            <option value="ambos">Recebimentos e repasses</option>
            <option value="recebimentos">Só recebimentos</option>
            <option value="repasses">Só repasses</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pendente}>
          <Icone nome="check" sm />
          {pendente ? "A adicionar…" : "Adicionar conta"}
        </button>
        <Mensagem estado={estado} />
      </div>
    </form>
  );
}

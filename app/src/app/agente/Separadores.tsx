"use client";

import { useState, type ReactNode } from "react";

// Separadores da área do agente: registar flat é o dia-a-dia (predefinido),
// registar condomínio é raro, e a lista dá contexto — como no protótipo.
export function Separadores({
  paineis,
}: {
  paineis: { id: string; rotulo: string; conteudo: ReactNode }[];
}) {
  const [activo, setActivo] = useState(paineis[0]?.id);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Cadastro"
        className="mb-4 flex gap-1.5 overflow-x-auto rounded-[14px] border border-line bg-card p-1.5"
      >
        {paineis.map((p) => (
          <button
            key={p.id}
            role="tab"
            id={`separador-${p.id}`}
            aria-selected={activo === p.id}
            aria-controls={`painel-${p.id}`}
            onClick={() => setActivo(p.id)}
            className={`whitespace-nowrap rounded-[10px] px-3.5 py-2 text-[13.5px] font-bold transition-colors ${
              activo === p.id
                ? "bg-green-600 text-white"
                : "text-ink-2 hover:bg-green-50"
            }`}
          >
            {p.rotulo}
          </button>
        ))}
      </div>
      {paineis.map((p) => (
        <div
          key={p.id}
          role="tabpanel"
          id={`painel-${p.id}`}
          aria-labelledby={`separador-${p.id}`}
          hidden={activo !== p.id}
        >
          {p.conteudo}
        </div>
      ))}
    </div>
  );
}

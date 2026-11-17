"use client";

import { useState } from "react";
import { Icone } from "@/components/Icone";

/** Campo de password com o "olho" para ver o que se escreve e, opcionalmente,
    a sugestão de password forte (ecrãs de criação). */
export function CampoPassword({
  id,
  name,
  label,
  placeholder,
  autoComplete,
  sugestao = false,
  required = true,
}: {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  sugestao?: boolean;
  required?: boolean;
}) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visivel ? "text" : "password"}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full pr-11"
        />
        <button
          type="button"
          onClick={() => setVisivel(!visivel)}
          aria-label={visivel ? "Esconder a password" : "Mostrar a password"}
          aria-pressed={visivel}
          className={`absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-[10px] ${
            visivel ? "text-green-700" : "text-ink-3"
          }`}
        >
          <Icone nome="eye" sm />
        </button>
      </div>
      {sugestao ? (
        <span className="text-xs font-semibold text-ink-3">
          Password forte: pelo menos 8 caracteres, com maiúsculas, minúsculas,
          números e um símbolo (ex.: Renova!2026).
        </span>
      ) : null}
    </div>
  );
}

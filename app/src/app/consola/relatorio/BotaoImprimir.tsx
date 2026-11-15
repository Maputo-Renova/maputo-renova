"use client";

import { Icone } from "@/components/Icone";

export function BotaoImprimir() {
  return (
    <button className="btn btn-primary no-print" onClick={() => window.print()}>
      <Icone nome="file" sm />
      Imprimir / Guardar PDF
    </button>
  );
}

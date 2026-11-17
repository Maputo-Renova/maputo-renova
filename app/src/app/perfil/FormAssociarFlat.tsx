"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Proprietário com várias moradias: associa outra flat à mesma conta com o
// código de uso único entregue pelo condomínio (fn_consumir_convite).
export function FormAssociarFlat() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(false);
    const form = e.currentTarget;
    const codigo = String(new FormData(form).get("codigo")).trim();
    if (!codigo) return;
    setAEnviar(true);
    const { error } = await createClient().rpc("fn_consumir_convite", { p_codigo: codigo });
    setAEnviar(false);
    if (error) { setErro(error.message); return; }
    setOk(true);
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submeter} className="grid gap-3">
      <p className="text-sm text-ink-2">
        Tem mais do que uma moradia? Associe outra flat a esta conta com o
        código de uso único entregue pelo condomínio.
      </p>
      <div className="field">
        <label htmlFor="assoc-codigo">Código da flat</label>
        <input id="assoc-codigo" name="codigo" required className="num" placeholder="Cole aqui o código do convite" />
      </div>
      {erro ? <p className="text-[13px] font-semibold text-red-700">{erro}</p> : null}
      {ok ? (
        <p className="rounded-xl bg-green-100 p-3 text-[13px] font-semibold text-green-800">
          Flat associada à sua conta.
        </p>
      ) : null}
      <button className="btn btn-primary" disabled={aEnviar}>
        {aEnviar ? "A associar…" : "Associar flat"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Recuperar() {
  const [estado, setEstado] = useState<"inicial" | "enviado">("inicial");
  const [erro, setErro] = useState<string | null>(null);

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const email = String(new FormData(e.currentTarget).get("email"));
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/redefinir`,
    });
    if (error) { setErro(error.message); return; }
    setEstado("enviado");
  }

  return (
    <div className="card">
      <h1 className="mb-2 text-[17px] font-extrabold">Recuperar password</h1>
      {estado === "enviado" ? (
        <p className="text-sm text-ink-2">
          Se o email existir no sistema, enviámos um link de recuperação. Abra-o
          no mesmo dispositivo para definir a nova password.
        </p>
      ) : (
        <form onSubmit={submeter} className="grid gap-3.5">
          <p className="text-sm text-ink-2">
            Indique o email da sua conta e enviamos-lhe o link para definir uma
            nova password.
          </p>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="o.seu@email.co.mz" />
          </div>
          {erro ? <p className="text-[13px] font-semibold text-red-700">{erro}</p> : null}
          <button className="btn btn-primary w-full">Enviar link de recuperação</button>
        </form>
      )}
      <div className="mt-4 text-[13.5px] font-bold">
        <Link className="text-green-700 hover:underline" href="/entrar">Voltar ao login</Link>
      </div>
    </div>
  );
}

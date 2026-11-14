"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Entrar() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setAEnviar(true);
    const dados = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(dados.get("email")),
      password: String(dados.get("password")),
    });
    if (error) {
      setErro(
        error.message === "Invalid login credentials"
          ? "Email ou password incorrectos."
          : error.message,
      );
      setAEnviar(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="card">
      <h1 className="mb-4 text-[17px] font-extrabold">Entrar</h1>
      <form onSubmit={submeter} className="grid gap-3.5">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="o.seu@email.co.mz" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
        </div>
        {erro ? <p className="text-[13px] font-semibold text-red-700">{erro}</p> : null}
        <button className="btn btn-primary w-full" disabled={aEnviar}>
          {aEnviar ? "A entrar…" : "Entrar"}
        </button>
      </form>
      <div className="mt-4 flex flex-wrap justify-between gap-2 text-[13.5px] font-bold">
        <Link className="text-green-700 hover:underline" href="/recuperar">Esqueci a password</Link>
        <Link className="text-green-700 hover:underline" href="/convite">Tenho um código de convite</Link>
      </div>
    </div>
  );
}

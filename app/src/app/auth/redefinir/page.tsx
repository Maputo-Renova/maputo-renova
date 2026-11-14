"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MarcaSimbolo } from "@/components/Marca";

export default function Redefinir() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const dados = new FormData(e.currentTarget);
    const pw = String(dados.get("password"));
    if (pw.length < 8) { setErro("A password precisa de pelo menos 8 caracteres."); return; }
    if (pw !== String(dados.get("password2"))) { setErro("As passwords não coincidem."); return; }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setErro(error.message); return; }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 pt-[10vh]">
      <div className="mb-6"><MarcaSimbolo tamanho={56} /></div>
      <div className="card w-full max-w-105">
        <h1 className="mb-4 text-[17px] font-extrabold">Definir nova password</h1>
        <form onSubmit={submeter} className="grid gap-3.5">
          <div className="field">
            <label htmlFor="password">Nova password</label>
            <input id="password" name="password" type="password" required placeholder="Mínimo 8 caracteres" />
          </div>
          <div className="field">
            <label htmlFor="password2">Confirmar nova password</label>
            <input id="password2" name="password2" type="password" required placeholder="Repita a password" />
          </div>
          {erro ? <p className="text-[13px] font-semibold text-red-700">{erro}</p> : null}
          <button className="btn btn-primary w-full">Guardar e entrar</button>
        </form>
      </div>
    </main>
  );
}

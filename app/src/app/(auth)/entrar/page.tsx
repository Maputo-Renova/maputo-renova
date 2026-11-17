"use client";

import { useState } from "react";
import { CampoPassword } from "@/components/CampoPassword";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Entrar() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

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

    // Verificação em dois passos: se a conta tem um factor TOTP verificado,
    // a sessão fica em aal1 até o código ser introduzido.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
      const { data: factores } = await supabase.auth.mfa.listFactors();
      const totp = factores?.totp?.[0];
      if (totp) {
        setMfaFactorId(totp.id);
        setAEnviar(false);
        return;
      }
    }

    router.replace("/");
    router.refresh();
  }

  async function verificarCodigo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setAEnviar(true);
    const codigo = String(new FormData(e.currentTarget).get("codigo") ?? "").trim();
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorId!,
      code: codigo,
    });
    if (error) {
      setErro("Código incorrecto — tente outra vez.");
      setAEnviar(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  if (mfaFactorId) {
    return (
      <div className="card">
        <h1 className="mb-1 text-[17px] font-extrabold">Verificação em dois passos</h1>
        <p className="mb-4 text-[13.5px] text-ink-2">
          Introduza o código de 6 dígitos da sua aplicação de autenticação.
        </p>
        <form onSubmit={verificarCodigo} className="grid gap-3.5">
          <div className="field">
            <label htmlFor="codigo">Código</label>
            <input
              id="codigo"
              name="codigo"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              className="num"
              placeholder="000000"
            />
          </div>
          {erro ? <p className="text-[13px] font-semibold text-red-700">{erro}</p> : null}
          <button className="btn btn-primary w-full" disabled={aEnviar}>
            {aEnviar ? "A verificar…" : "Verificar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="mb-4 text-[17px] font-extrabold">Entrar</h1>
      <form onSubmit={submeter} className="grid gap-3.5">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="o.seu@email.co.mz" />
        </div>
        <CampoPassword id="password" name="password" label="Password" autoComplete="current-password" placeholder="••••••••" />
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

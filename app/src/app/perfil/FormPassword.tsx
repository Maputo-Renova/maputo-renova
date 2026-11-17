"use client";

import { Icone } from "@/components/Icone";
import { CampoPassword } from "@/components/CampoPassword";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function FormPassword({ email }: { email: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, setPendente] = useState(false);

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const actual = String(fd.get("actual") ?? "");
    const nova = String(fd.get("nova") ?? "");
    const conf = String(fd.get("conf") ?? "");

    if (nova.length < 8) {
      setMsg({ ok: false, texto: "A nova password precisa de pelo menos 8 caracteres." });
      return;
    }
    if (nova !== conf) {
      setMsg({ ok: false, texto: "A confirmação não coincide com a nova password." });
      return;
    }

    setPendente(true);
    setMsg(null);
    const supabase = createClient();
    const { error: errActual } = await supabase.auth.signInWithPassword({
      email,
      password: actual,
    });
    if (errActual) {
      setPendente(false);
      setMsg({ ok: false, texto: "A password actual não está correcta." });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: nova });
    setPendente(false);
    if (error) {
      setMsg({ ok: false, texto: "Não foi possível alterar a password." });
      return;
    }
    (e.target as HTMLFormElement).reset?.();
    setMsg({ ok: true, texto: "Password alterada." });
  }

  return (
    <form onSubmit={submeter} className="grid gap-3.5">
      <CampoPassword id="pw-actual" name="actual" label="Password actual" placeholder="••••••••" autoComplete="current-password" />
      <CampoPassword id="pw-nova" name="nova" label="Nova password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" sugestao />
      <CampoPassword id="pw-conf" name="conf" label="Confirmar nova password" placeholder="Repita a nova password" autoComplete="new-password" />
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pendente}>
          <Icone nome="check" sm />
          {pendente ? "A alterar…" : "Alterar password"}
        </button>
        {msg ? (
          <p className={`text-[13px] font-semibold ${msg.ok ? "text-green-700" : "text-red-700"}`} role="status">
            {msg.texto}
          </p>
        ) : null}
      </div>
      <p className="mt-1 text-[12.5px] text-ink-3">
        Se esquecer a password, use &quot;Esqueci a password&quot; na página de
        entrada — o link de recuperação vai para o seu email.
      </p>
    </form>
  );
}

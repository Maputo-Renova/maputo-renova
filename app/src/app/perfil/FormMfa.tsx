"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icone } from "@/components/Icone";
import { createClient } from "@/lib/supabase/client";

type Estado =
  | { fase: "a_carregar" }
  | { fase: "inactivo" }
  | { fase: "a_inscrever"; factorId: string; qr: string; segredo: string }
  | { fase: "activo"; factorId: string };

export function FormMfa() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ fase: "a_carregar" });
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, setPendente] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const verificado = data?.totp?.find((f) => f.status === "verified");
      setEstado(verificado ? { fase: "activo", factorId: verificado.id } : { fase: "inactivo" });
    })();
  }, []);

  async function iniciar() {
    setErro(null);
    setPendente(true);
    const supabase = createClient();
    // limpa inscrições incompletas anteriores
    const { data: existentes } = await supabase.auth.mfa.listFactors();
    for (const f of existentes?.totp ?? []) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Maputo Renova",
    });
    setPendente(false);
    if (error || !data) {
      setErro("Não foi possível iniciar a activação.");
      return;
    }
    setEstado({
      fase: "a_inscrever",
      factorId: data.id,
      qr: data.totp.qr_code,
      segredo: data.totp.secret,
    });
  }

  async function confirmar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (estado.fase !== "a_inscrever") return;
    setErro(null);
    setPendente(true);
    const codigo = String(new FormData(e.currentTarget).get("codigo") ?? "").trim();
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: estado.factorId,
      code: codigo,
    });
    setPendente(false);
    if (error) {
      setErro("Código incorrecto — confirme na aplicação e tente outra vez.");
      return;
    }
    setEstado({ fase: "activo", factorId: estado.factorId });
    router.refresh();
  }

  async function desactivar() {
    if (estado.fase !== "activo") return;
    setErro(null);
    setPendente(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId: estado.factorId });
    setPendente(false);
    if (error) {
      setErro("Não foi possível desactivar.");
      return;
    }
    setEstado({ fase: "inactivo" });
    router.refresh();
  }

  if (estado.fase === "a_carregar") {
    return <p className="text-sm text-ink-3">A carregar…</p>;
  }

  if (estado.fase === "a_inscrever") {
    return (
      <div className="grid gap-3">
        <p className="text-[13.5px] text-ink-2">
          Leia o código QR com a sua aplicação de autenticação (Google
          Authenticator, Authy, 1Password…) e introduza o código de 6 dígitos.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={estado.qr}
          alt="Código QR para a aplicação de autenticação"
          width={168}
          height={168}
          className="rounded-xl border border-line bg-white p-2"
        />
        <p className="num break-all text-[12px] text-ink-3">
          Sem câmara? Introduza manualmente: {estado.segredo}
        </p>
        <form onSubmit={confirmar} className="flex flex-wrap items-end gap-3">
          <div className="field">
            <label htmlFor="mfa-codigo">Código de 6 dígitos</label>
            <input
              id="mfa-codigo"
              name="codigo"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              className="num"
              placeholder="000000"
              style={{ maxWidth: 140 }}
            />
          </div>
          <button className="btn btn-primary" disabled={pendente}>
            <Icone nome="check" sm />
            {pendente ? "A confirmar…" : "Confirmar"}
          </button>
        </form>
        {erro ? <p className="text-[13px] font-semibold text-red-700">{erro}</p> : null}
      </div>
    );
  }

  if (estado.fase === "activo") {
    return (
      <div className="grid gap-3">
        <div className="flex items-center gap-2.5">
          <span className="pill pill-pago">Activa</span>
          <span className="text-[13.5px] text-ink-2">
            O código da aplicação é pedido em cada início de sessão.
          </span>
        </div>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={desactivar} disabled={pendente}>
            {pendente ? "A desactivar…" : "Desactivar"}
          </button>
        </div>
        {erro ? <p className="text-[13px] font-semibold text-red-700">{erro}</p> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-[13.5px] text-ink-2">
        Proteja a conta com um código gerado no seu telemóvel, pedido em cada
        início de sessão. Fortemente recomendado para contas da consola e de
        gestores.
      </p>
      <div>
        <button className="btn btn-primary" onClick={iniciar} disabled={pendente}>
          <Icone nome="shield" sm />
          {pendente ? "A preparar…" : "Activar verificação em dois passos"}
        </button>
      </div>
      {erro ? <p className="text-[13px] font-semibold text-red-700">{erro}</p> : null}
    </div>
  );
}

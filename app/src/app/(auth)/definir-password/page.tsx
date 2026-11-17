"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Chegada pelo link do email de convite: a sessão já existe (criada em
// /auth/confirmar) e os dados foram inseridos pelo agente — só falta a
// password. O código vem pré-preenchido no link mas fica editável: o mesmo
// dono pode ter várias moradias e usar aqui o código de outra flat.
function Definir() {
  const router = useRouter();
  const params = useSearchParams();
  const [sessao, setSessao] = useState<"a_verificar" | "ok" | "ausente">("a_verificar");
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setSessao(data.user ? "ok" : "ausente"));
  }, []);

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const dados = new FormData(e.currentTarget);
    const codigo = String(dados.get("codigo")).trim();
    const pw = String(dados.get("password"));
    if (pw.length < 8) { setErro("A password precisa de pelo menos 8 caracteres."); return; }
    if (pw !== String(dados.get("password2"))) { setErro("As passwords não coincidem."); return; }
    if (!dados.get("termos")) { setErro("Aceite os Termos e Condições para continuar."); return; }

    setAEnviar(true);
    const supabase = createClient();
    const { error: erroPw } = await supabase.auth.updateUser({ password: pw });
    if (erroPw) { setErro(erroPw.message); setAEnviar(false); return; }

    const { error: erroRpc } = await supabase.rpc("fn_consumir_convite", { p_codigo: codigo });
    if (erroRpc) { setErro(erroRpc.message); setAEnviar(false); return; }

    router.replace("/");
    router.refresh();
  }

  if (sessao === "a_verificar") {
    return <p className="text-sm text-ink-2">A verificar o convite…</p>;
  }

  if (sessao === "ausente") {
    return (
      <>
        <h1 className="mb-1 text-[17px] font-extrabold">Link expirado ou já usado</h1>
        <p className="mb-4 text-sm text-ink-2">
          Este link de convite já não está activo. Pode criar a conta com o
          código de uso único que segue no mesmo email, ou pedir um novo
          convite ao condomínio.
        </p>
        <div className="grid gap-2 text-[13.5px] font-bold">
          <Link className="text-green-700 hover:underline" href="/convite">Criar conta com código</Link>
          <Link className="text-green-700 hover:underline" href="/entrar">Já tenho conta — entrar</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-1 text-[17px] font-extrabold">Quase lá — defina a sua password</h1>
      <p className="mb-4 text-sm text-ink-2">
        Os seus dados já foram preenchidos pelo condomínio. Defina a password
        para entrar no seu painel.
      </p>
      <form onSubmit={submeter} className="grid gap-3.5">
        <div className="field">
          <label htmlFor="password">Criar password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required placeholder="Mínimo 8 caracteres" />
        </div>
        <div className="field">
          <label htmlFor="password2">Confirmar password</label>
          <input id="password2" name="password2" type="password" autoComplete="new-password" required placeholder="Repita a password" />
        </div>
        <div className="field">
          <label htmlFor="codigo">Código da flat</label>
          <input id="codigo" name="codigo" required defaultValue={params.get("codigo") ?? ""} className="num" placeholder="Código de uso único da flat" />
          <span className="text-xs font-semibold text-ink-3">
            Já veio preenchido a partir do convite do condomínio.
          </span>
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] text-ink-2">
          <input type="checkbox" name="termos" className="mt-0.5 size-4.5 accent-green-600" />
          <span>
            Li e aceito os{" "}
            <Link href="/termos" target="_blank" className="font-bold text-green-700 underline">Termos e Condições</Link>{" "}
            e a{" "}
            <Link href="/privacidade" target="_blank" className="font-bold text-green-700 underline">Política de Privacidade</Link>{" "}
            do Maputo Renova.
          </span>
        </label>
        {erro ? <p className="text-[13px] font-semibold text-red-700">{erro}</p> : null}
        <button className="btn btn-primary w-full" disabled={aEnviar}>
          {aEnviar ? "A concluir…" : "Concluir e entrar"}
        </button>
      </form>
    </>
  );
}

export default function DefinirPassword() {
  return (
    <div className="card">
      <Suspense fallback={<p className="text-sm text-ink-2">A carregar…</p>}>
        <Definir />
      </Suspense>
    </div>
  );
}

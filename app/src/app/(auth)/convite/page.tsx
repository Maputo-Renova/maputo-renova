"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Convite() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const dados = new FormData(e.currentTarget);
    const codigo = String(dados.get("codigo")).trim();
    const email = String(dados.get("email")).trim();
    const pw = String(dados.get("password"));
    const pw2 = String(dados.get("password2"));
    if (pw.length < 8) { setErro("A password precisa de pelo menos 8 caracteres."); return; }
    if (pw !== pw2) { setErro("As passwords não coincidem."); return; }
    if (!dados.get("termos")) { setErro("Aceite os Termos e Condições para criar a conta."); return; }

    setAEnviar(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: { data: { codigo_convite: codigo } },
    });
    if (error) { setErro(error.message); setAEnviar(false); return; }

    if (data.session) {
      // Sessão imediata: liga a conta à flat já.
      const { error: erroRpc } = await supabase.rpc("fn_consumir_convite", {
        p_codigo: codigo,
      });
      if (erroRpc) { setErro(erroRpc.message); setAEnviar(false); return; }
      router.replace("/");
      router.refresh();
      return;
    }

    // Confirmação de email activa: concluir depois do primeiro login.
    setAviso(
      "Conta criada. Confirme o seu email e volte a entrar — o código do convite fica guardado e a ligação à flat conclui-se no primeiro acesso.",
    );
    setAEnviar(false);
  }

  return (
    <div className="card">
      <h1 className="mb-1 text-[17px] font-extrabold">Criar conta com convite</h1>
      <p className="mb-4 text-sm text-ink-2">
        Use o código único da sua flat, entregue pelo condomínio. A conta fica
        ligada à flat em nome do proprietário.
      </p>
      {aviso ? (
        <p className="rounded-xl bg-green-100 p-3 text-sm font-semibold text-green-800">{aviso}</p>
      ) : (
        <form onSubmit={submeter} className="grid gap-3.5">
          <div className="field">
            <label htmlFor="codigo">Código de convite</label>
            <input id="codigo" name="codigo" required placeholder="Cole aqui o código do convite" className="num" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="o.seu@email.co.mz" />
            <span className="text-xs font-semibold text-ink-3">
              Use o email que deu no cadastro — um convite com email fica
              reservado a esse endereço.
            </span>
          </div>
          <div className="field">
            <label htmlFor="password">Criar password</label>
            <input id="password" name="password" type="password" required placeholder="Mínimo 8 caracteres" />
          </div>
          <div className="field">
            <label htmlFor="password2">Confirmar password</label>
            <input id="password2" name="password2" type="password" required placeholder="Repita a password" />
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
            {aEnviar ? "A criar conta…" : "Criar conta e entrar"}
          </button>
        </form>
      )}
      <div className="mt-4 text-[13.5px] font-bold">
        <Link className="text-green-700 hover:underline" href="/entrar">Voltar ao login</Link>
      </div>
    </div>
  );
}

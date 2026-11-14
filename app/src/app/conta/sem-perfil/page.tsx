"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MarcaSimbolo } from "@/components/Marca";

export default function SemPerfil() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [aEnviar, setAEnviar] = useState(false);

  // Se o registo guardou o código nos metadados, tenta concluir sozinho.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const guardado = data.user?.user_metadata?.codigo_convite as string | undefined;
      if (guardado) setCodigo(guardado);
    });
  }, []);

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setAEnviar(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("fn_consumir_convite", {
      p_codigo: codigo.trim(),
    });
    if (error) { setErro(error.message); setAEnviar(false); return; }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 pt-[10vh]">
      <div className="mb-6"><MarcaSimbolo tamanho={56} /></div>
      <div className="card w-full max-w-120">
        <h1 className="mb-2 text-[18px] font-extrabold">Ligar a conta à sua flat</h1>
        <p className="mb-4 text-sm text-ink-2">
          A sua conta existe mas ainda não está ligada a nenhuma flat. Cole o
          código de convite entregue pelo condomínio para concluir.
        </p>
        <form onSubmit={submeter} className="grid gap-3.5">
          <div className="field">
            <label htmlFor="codigo">Código de convite</label>
            <input
              id="codigo"
              className="num"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
              placeholder="Cole aqui o código do convite"
            />
          </div>
          {erro ? <p className="text-[13px] font-semibold text-red-700">{erro}</p> : null}
          <button className="btn btn-primary w-full" disabled={aEnviar}>
            {aEnviar ? "A ligar…" : "Ligar à minha flat"}
          </button>
        </form>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validarComprovativo } from "@/lib/uploads";

export type Conta = { banco: string; titular: string; numero_conta: string; nib: string | null } | null;

/** Painel da transferência bancária (aberto pelo selector de métodos). */
export function PainelTransferencia({
  faturaId,
  referencia,
  total,
  servico,
  associacao,
  conta,
  aoCancelar,
}: {
  faturaId: string;
  referencia: string;
  total: number;
  servico: number;
  associacao: number;
  conta: Conta;
  aoCancelar: () => void;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const ficheiro = (new FormData(e.currentTarget).get("comprovativo") as File) ?? null;
    if (!ficheiro || ficheiro.size === 0) {
      setErro("Anexe o comprovativo da transferência (PDF ou foto).");
      return;
    }
    const invalido = validarComprovativo(ficheiro);
    if (invalido) {
      setErro(invalido);
      return;
    }
    setAEnviar(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) { setErro("Sessão expirada — volte a entrar."); setAEnviar(false); return; }

    const extensao = ficheiro.name.split(".").pop()?.toLowerCase() || "pdf";
    const caminho = `${user.id}/${faturaId}-${Date.now()}.${extensao}`;

    const { error: erroUpload } = await supabase.storage
      .from("comprovativos")
      .upload(caminho, ficheiro, { upsert: false });
    if (erroUpload) { setErro(erroUpload.message); setAEnviar(false); return; }

    const { error: erroInsert } = await supabase.from("pagamentos").insert({
      fatura_id: faturaId,
      metodo: "transferencia",
      estado: "a_confirmar",
      valor_bruto: total,
      taxa_operador: 0,
      valor_liquido: total,
      taxa_servico: servico,
      valor_associacao: associacao,
      comprovativo_path: caminho,
    });
    if (erroInsert) { setErro(erroInsert.message); setAEnviar(false); return; }

    router.refresh();
  }

  return (
    <div className="mt-3 rounded-2xl border border-line bg-green-50 p-4">
      <p className="mb-2 text-[13.5px] text-ink-2">
        Transfira <b className="num">{Math.round(total).toLocaleString("pt-PT")} MT</b> com a
        referência <b className="num">{referencia}</b> no descritivo e anexe o comprovativo.
        O gestor confirma depois de validar.
      </p>
      {conta ? (
        <p className="num mb-3 rounded-xl bg-card p-3 text-[13.5px] font-bold">
          {conta.banco} · Conta {conta.numero_conta}
          {conta.nib ? ` · NIB ${conta.nib}` : ""}
          <span className="block text-[12px] font-semibold text-ink-3">{conta.titular}</span>
        </p>
      ) : null}
      <form onSubmit={submeter} className="grid gap-3">
        <div className="field">
          <label htmlFor={`comp-${faturaId}`}>Comprovativo (PDF ou foto)</label>
          <input id={`comp-${faturaId}`} name="comprovativo" type="file" accept=".pdf,image/*" required />
        </div>
        {erro ? <p className="text-[13px] font-semibold text-red-700">{erro}</p> : null}
        <div className="flex gap-2.5">
          <button type="button" className="btn btn-ghost" onClick={aoCancelar}>Cancelar</button>
          <button className="btn btn-primary" disabled={aEnviar}>
            {aEnviar ? "A enviar…" : "Enviar comprovativo"}
          </button>
        </div>
      </form>
    </div>
  );
}

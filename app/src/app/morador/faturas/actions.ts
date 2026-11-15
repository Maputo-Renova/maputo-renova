"use server";

import { createClient } from "@/lib/supabase/server";
import { exigirPapel } from "@/lib/perfil";
import { obterTaxas, decomporFatura } from "@/lib/taxas";

// O payment-worker corre numa VPS com IP fixo (os gateways M-Pesa/eMola
// validam o IP de origem). Estes actions são a única ponte da app para ele;
// o valor cobrado é SEMPRE calculado aqui no servidor a partir da fatura.
const WORKER_URL = process.env.PAYMENT_WORKER_URL;
const WORKER_SECRET = process.env.PAYMENT_WORKER_SECRET;

const MSISDN: Record<string, RegExp> = {
  mpesa: /^(258)?8[45]\d{7}$/, // Vodacom 84/85
  emola: /^(258)?8[67]\d{7}$/, // Movitel 86/87
};

export type InicioMovel =
  | { ok: true; transId: string }
  | { ok: false; mensagem: string };

export async function iniciarPagamentoMovel(
  faturaId: string,
  provedor: "mpesa" | "emola",
  msisdn: string,
): Promise<InicioMovel> {
  await exigirPapel("proprietario");
  if (!WORKER_URL || !WORKER_SECRET)
    return { ok: false, mensagem: "Pagamentos móveis ainda não estão activos." };
  if (provedor !== "mpesa" && provedor !== "emola")
    return { ok: false, mensagem: "Método inválido." };

  const numero = String(msisdn).replace(/\D/g, "");
  if (!MSISDN[provedor].test(numero))
    return {
      ok: false,
      mensagem:
        provedor === "mpesa"
          ? "Número M-Pesa inválido — comece por 84 ou 85."
          : "Número eMola inválido — comece por 86 ou 87.",
    };

  const supabase = await createClient();
  // o RLS garante que só as faturas do próprio são visíveis
  const { data: fatura } = await supabase
    .from("faturas")
    .select("id, referencia, valor_quota, estado")
    .eq("id", faturaId)
    .maybeSingle();
  if (!fatura) return { ok: false, mensagem: "Fatura não encontrada." };
  if (fatura.estado !== "pendente" && fatura.estado !== "em_atraso")
    return { ok: false, mensagem: "Esta fatura já não está por pagar." };

  const taxas = await obterTaxas(supabase);
  const { total } = decomporFatura(Number(fatura.valor_quota), taxas);

  try {
    const res = await fetch(`${WORKER_URL.replace(/\/$/, "")}/pagamentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-worker-secret": WORKER_SECRET },
      body: JSON.stringify({
        provedor,
        msisdn: numero,
        valor: total,
        referencia: fatura.referencia,
        fatura_id: fatura.id,
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (res.status !== 202) {
      const corpo = await res.json().catch(() => null);
      return { ok: false, mensagem: corpo?.erro ?? "Não foi possível iniciar o pagamento." };
    }
    const { trans_id } = await res.json();
    return { ok: true, transId: trans_id };
  } catch {
    return { ok: false, mensagem: "O serviço de pagamentos não respondeu — tente mais tarde." };
  }
}

export type EstadoMovel = {
  estado: "PROCESSING" | "SUCCESS" | "FAILED" | "UNKNOWN";
  codigo: string | null;
};

export async function estadoPagamentoMovel(transId: string): Promise<EstadoMovel | null> {
  await exigirPapel("proprietario");
  if (!WORKER_URL || !WORKER_SECRET) return null;
  if (!/^[A-F0-9]{16}$/.test(transId)) return null;
  try {
    const res = await fetch(`${WORKER_URL.replace(/\/$/, "")}/pagamentos/${transId}`, {
      headers: { "x-worker-secret": WORKER_SECRET },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const t = await res.json();
    return { estado: t.estado, codigo: t.codigo ?? null };
  } catch {
    return null;
  }
}

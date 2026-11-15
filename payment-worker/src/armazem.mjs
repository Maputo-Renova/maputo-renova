// Armazém de transacções móveis.
// Em produção o worker escreve na tabela public.transaccoes_moveis do
// Supabase (service role — a tabela tem RLS sem políticas, só o worker toca).
// Nos testes usa-se o armazém em memória com a mesma interface.

export function armazemMemoria() {
  const porTransId = new Map();
  const registados = [];
  return {
    registados, // visível nos testes: transIds entregues à app
    async registarPagamento(transId) {
      registados.push(transId);
    },
    async criar(tx) {
      const linha = { tentativas: 0, created_at: new Date().toISOString(), ...tx };
      porTransId.set(tx.trans_id, linha);
      return linha;
    },
    async actualizar(transId, campos) {
      const linha = porTransId.get(transId);
      if (!linha) throw new Error(`transacção desconhecida: ${transId}`);
      Object.assign(linha, campos, { updated_at: new Date().toISOString() });
      return linha;
    },
    async obter(transId) {
      return porTransId.get(transId) ?? null;
    },
    async porReconciliar() {
      return [...porTransId.values()].filter(
        (t) => t.estado === "UNKNOWN" || t.estado === "PROCESSING",
      );
    },
  };
}

/** PostgREST com service role; mesma interface do armazém em memória. */
export function armazemSupabase({ url, serviceKey }) {
  const base = `${url.replace(/\/$/, "")}/rest/v1/transaccoes_moveis`;
  const cab = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  const um = async (res) => {
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const linhas = await res.json();
    return Array.isArray(linhas) ? (linhas[0] ?? null) : linhas;
  };
  const rpc = `${url.replace(/\/$/, "")}/rest/v1/rpc/fn_registar_pagamento_movel`;
  return {
    /** SUCCESS → fatura paga + movimentos na app (função idempotente no Postgres). */
    async registarPagamento(transId) {
      const res = await fetch(rpc, {
        method: "POST",
        headers: cab,
        body: JSON.stringify({ p_trans_id: transId }),
      });
      if (!res.ok)
        throw new Error(`fn_registar_pagamento_movel ${res.status}: ${(await res.text()).slice(0, 200)}`);
    },
    async criar(tx) {
      return um(await fetch(base, { method: "POST", headers: cab, body: JSON.stringify(tx) }));
    },
    async actualizar(transId, campos) {
      return um(
        await fetch(`${base}?trans_id=eq.${encodeURIComponent(transId)}`, {
          method: "PATCH",
          headers: cab,
          body: JSON.stringify(campos),
        }),
      );
    },
    async obter(transId) {
      return um(
        await fetch(`${base}?trans_id=eq.${encodeURIComponent(transId)}&limit=1`, { headers: cab }),
      );
    },
    async porReconciliar() {
      const res = await fetch(
        `${base}?estado=in.(UNKNOWN,PROCESSING)&order=created_at.asc&limit=100`,
        { headers: cab },
      );
      if (!res.ok) throw new Error(`Supabase ${res.status}`);
      return res.json();
    },
  };
}

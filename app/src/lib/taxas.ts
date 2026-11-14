import type { SupabaseClient } from "@supabase/supabase-js";

export type Taxas = { servicoPct: number; associacao: number };

export async function obterTaxas(supabase: SupabaseClient): Promise<Taxas> {
  const { data } = await supabase
    .from("config_plataforma")
    .select("taxa_servico_pct, taxa_associacao")
    .maybeSingle();
  return {
    servicoPct: Number(data?.taxa_servico_pct ?? 15),
    associacao: Number(data?.taxa_associacao ?? 499),
  };
}

export function decomporFatura(quota: number, taxas: Taxas) {
  const servico = Math.round(quota * taxas.servicoPct) / 100;
  return { quota, servico, associacao: taxas.associacao, total: quota + servico + taxas.associacao };
}


import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { MT } from "@/components/Kpi";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_MORADOR } from "@/lib/navs";

export default async function PainelMorador() {
  await connection();
  const perfil = await exigirPapel("proprietario");
  const supabase = await createClient();

  const { data: flat } = await supabase
    .from("flats")
    .select("id, bloco, andar, numero, referencia, quota_mensal, condominio_id, condominios(nome, quota_padrao)")
    .eq("perfil_proprietario_id", perfil.id)
    .maybeSingle();

  const { data: config } = await supabase
    .from("config_plataforma")
    .select("taxa_servico_pct, taxa_associacao")
    .maybeSingle();

  const condominio = Array.isArray(flat?.condominios)
    ? flat?.condominios[0]
    : flat?.condominios;
  const quota = Number(flat?.quota_mensal ?? condominio?.quota_padrao ?? 0);
  const servicoPct = Number(config?.taxa_servico_pct ?? 15);
  const associacao = Number(config?.taxa_associacao ?? 499);
  const servico = Math.round(quota * servicoPct) / 100;
  const total = quota + associacao + servico;

  return (
    <AppShell
      perfil={perfil}
      sub={flat ? `Flat ${flat.numero} · ${flat.referencia ?? ""}` : "Proprietário"}
      itens={NAV_MORADOR}
    >
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">
          Olá, {perfil.nome.split(" ")[0]}
        </h1>
        <p className="text-sm text-ink-2">
          {flat
            ? `Flat ${flat.numero}${flat.bloco ? ` · Bloco ${flat.bloco}` : ""} · ${condominio?.nome ?? ""}`
            : "A sua conta ainda não está ligada a uma flat."}
        </p>
      </div>

      {flat && quota > 0 ? (
        <div className="max-w-130 rounded-2xl bg-gradient-to-br from-green-700 to-green-600 p-6 text-white shadow-[0_2px_4px_rgba(23,30,26,.08),0_18px_40px_rgba(23,30,26,.18)]">
          <div className="text-[13.5px] font-bold opacity-85">Quota mensal</div>
          <div className="num my-1 text-[36px] font-extrabold tracking-tight">{MT(total)}</div>
          <div className="mt-4 grid gap-2 text-[13.5px] font-semibold">
            <div className="flex justify-between border-b border-white/20 pb-2">
              <span>Taxa de condomínio</span><span className="num font-extrabold">{MT(quota)}</span>
            </div>
            <div className="flex justify-between border-b border-white/20 pb-2">
              <span>Taxa da associação de condomínios</span><span className="num font-extrabold">{MT(associacao)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxa de serviço ({servicoPct}%)</span><span className="num font-extrabold">{MT(servico)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="card max-w-130 text-sm text-ink-2">
          Quando o condomínio emitir a primeira fatura, ela aparece aqui com o
          pagamento por M-Pesa, eMola ou transferência bancária.
        </div>
      )}
    </AppShell>
  );
}

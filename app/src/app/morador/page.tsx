
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

  // multi-moradias: o mesmo proprietário pode ter várias flats
  const { data: flats } = await supabase
    .from("flats")
    .select("id, bloco, andar, numero, referencia, condominio_id, condominios(nome, quota_padrao)")
    .eq("perfil_proprietario_id", perfil.id)
    .order("created_at");

  const { data: config } = await supabase
    .from("config_plataforma")
    .select("taxa_servico_pct, taxa_associacao")
    .maybeSingle();

  const servicoPct = Number(config?.taxa_servico_pct ?? 15);
  const associacao = Number(config?.taxa_associacao ?? 499);

  const moradias = (flats ?? []).map((flat) => {
    const condominio = Array.isArray(flat.condominios) ? flat.condominios[0] : flat.condominios;
    const quota = Number(condominio?.quota_padrao ?? 0);
    const servico = Math.round(quota * servicoPct) / 100;
    return { flat, condominio, quota, servico, total: quota + associacao + servico };
  });

  const quota = moradias.reduce((s, m) => s + m.quota, 0);
  const servico = moradias.reduce((s, m) => s + m.servico, 0);
  const total = moradias.reduce((s, m) => s + m.total, 0);
  const varias = moradias.length > 1;
  const primeira = moradias[0];

  return (
    <AppShell
      perfil={perfil}
      sub={
        varias
          ? `${moradias.length} moradias`
          : primeira
            ? `Flat ${primeira.flat.numero} · ${primeira.flat.referencia ?? ""}`
            : "Proprietário"
      }
      itens={NAV_MORADOR}
    >
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">
          Olá, {perfil.nome.split(" ")[0]}
        </h1>
        <p className="text-sm text-ink-2">
          {primeira
            ? varias
              ? moradias
                  .map((m) => `Flat ${m.flat.numero}${m.flat.bloco ? ` · Bloco ${m.flat.bloco}` : ""}`)
                  .join(" · ")
              : `Flat ${primeira.flat.numero}${primeira.flat.bloco ? ` · Bloco ${primeira.flat.bloco}` : ""} · ${primeira.condominio?.nome ?? ""}`
            : "A sua conta ainda não está ligada a uma flat."}
        </p>
      </div>

      {primeira && total > 0 ? (
        <div className="max-w-130 rounded-2xl bg-gradient-to-br from-green-700 to-green-600 p-6 text-white shadow-[0_2px_4px_rgba(23,30,26,.08),0_18px_40px_rgba(23,30,26,.18)]">
          <div className="text-[13.5px] font-bold opacity-85">
            {varias ? `Quotas mensais · ${moradias.length} moradias` : "Quota mensal"}
          </div>
          <div className="num my-1 text-[36px] font-extrabold tracking-tight">{MT(total)}</div>
          <div className="mt-4 grid gap-2 text-[13.5px] font-semibold">
            {varias ? (
              <>
                {moradias.map((m) => (
                  <div key={m.flat.id} className="flex justify-between border-b border-white/20 pb-2">
                    <span>Flat {m.flat.numero}{m.flat.bloco ? ` · Bloco ${m.flat.bloco}` : ""}</span>
                    <span className="num font-extrabold">{MT(m.total)}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span>Inclui associação ({MT(associacao)}/flat) e serviço ({servicoPct}%)</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between border-b border-white/20 pb-2">
                  <span>Taxa de condomínio</span><span className="num font-extrabold">{MT(quota)}</span>
                </div>
                <div className="flex justify-between border-b border-white/20 pb-2">
                  <span>Taxa da associação de condomínios</span><span className="num font-extrabold">{MT(associacao)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxa de serviço ({servicoPct}%)</span><span className="num font-extrabold">{MT(servico)}</span>
                </div>
              </>
            )}
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

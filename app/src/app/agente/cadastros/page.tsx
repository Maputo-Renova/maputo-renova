
import { connection } from "next/server";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Icone } from "@/components/Icone";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_AGENTE } from "@/lib/navs";

// Meus Cadastros (nível 1): só a lista de condomínios — clicar abre a lista
// de flats do condomínio, e daí o detalhe de cada flat.
export default async function MeusCadastros() {
  await connection();
  const perfil = await exigirPapel("colaborador");
  const supabase = await createClient();

  const [{ data: condominios }, { data: flats }] = await Promise.all([
    supabase
      .from("condominios")
      .select("id, nome, codigo, bairro, provincia, rua, numero_porta, total_moradias, estado, gestor_nome, gestor_apelido")
      .order("nome"),
    supabase.from("flats").select("id, condominio_id, perfil_proprietario_id"),
  ]);

  const lista = condominios ?? [];
  const porCondominio = new Map<string, { flats: number; porUsar: number }>();
  for (const f of flats ?? []) {
    const atual = porCondominio.get(f.condominio_id) ?? { flats: 0, porUsar: 0 };
    atual.flats++;
    if (!f.perfil_proprietario_id) atual.porUsar++;
    porCondominio.set(f.condominio_id, atual);
  }

  return (
    <AppShell perfil={perfil} sub="Cadastro de condomínios" itens={NAV_AGENTE}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Meus Cadastros</h1>
        <p className="text-sm text-ink-2">
          {lista.length} condomínio{lista.length === 1 ? "" : "s"} ·{" "}
          {(flats ?? []).length} flats · o seu histórico de cadastros
        </p>
      </div>

      {lista.length === 0 ? (
        <div className="card max-w-180">
          <div className="empty">
            <span className="e-ico">
              <Icone nome="building" />
            </span>
            <b>Ainda sem cadastros</b>
            <p>Os condomínios que cadastrar aparecem aqui.</p>
          </div>
        </div>
      ) : (
        <div className="grid max-w-180 gap-3">
          {lista.map((c) => {
            const n = porCondominio.get(c.id);
            return (
              <Link
                key={c.id}
                href={`/agente/cadastros/${c.id}`}
                className="card flex items-center gap-3 transition-shadow hover:shadow-lg"
              >
                <span className="card-ico shrink-0">
                  <Icone nome="building" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold">{c.nome}</span>
                    <span className="num rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">
                      {c.codigo}
                    </span>
                    {c.estado !== "activo" ? (
                      <span className="pill pill-pendente">{c.estado}</span>
                    ) : null}
                  </span>
                  <span className="num mt-0.5 block text-[13px] text-ink-3">
                    {[c.bairro, c.provincia].filter(Boolean).join(" · ")}
                  </span>
                  <span className="num block text-[13px] font-semibold text-ink-2">
                    {n?.flats ?? 0} de {c.total_moradias ?? "—"} moradias cadastradas
                    {n?.porUsar
                      ? ` · ${n.porUsar} convite${n.porUsar === 1 ? "" : "s"} por usar`
                      : ""}
                  </span>
                </span>
                <span className="shrink-0 text-ink-3">
                  <Icone nome="chevR" sm />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

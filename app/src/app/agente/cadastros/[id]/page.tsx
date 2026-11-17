
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Icone } from "@/components/Icone";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_AGENTE } from "@/lib/navs";

// Meus Cadastros (nível 2): as flats de um condomínio — clicar numa flat
// abre o detalhe do cadastro dela.
export default async function CondominioCadastros({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const perfil = await exigirPapel("colaborador");
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: condo }, { data: flats }] = await Promise.all([
    supabase
      .from("condominios")
      .select("id, nome, codigo, bairro, provincia, rua, numero_porta, cidade, total_moradias, quota_padrao, estado, gestor_nome, gestor_apelido")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("flats")
      .select("id, referencia, bloco, andar, numero, proprietario_nome, proprietario_apelido, perfil_proprietario_id")
      .eq("condominio_id", id)
      .order("referencia"),
  ]);
  if (!condo) notFound();

  const lista = flats ?? [];
  const porUsar = lista.filter((f) => !f.perfil_proprietario_id).length;

  return (
    <AppShell perfil={perfil} sub="Cadastro de condomínios" itens={NAV_AGENTE}>
      <div className="mb-5 mt-2">
        <Link
          href="/agente/cadastros"
          className="mb-1 inline-flex items-center gap-1 text-[13px] font-bold text-green-700 hover:underline"
        >
          <Icone nome="chevL" sm />
          Meus Cadastros
        </Link>
        <h1 className="flex flex-wrap items-center gap-2.5 text-[26px] font-extrabold tracking-tight">
          {condo.nome}
          <span className="num rounded-full bg-green-100 px-2.5 py-1 text-[13px] font-bold text-green-800">
            {condo.codigo}
          </span>
        </h1>
        <p className="num text-sm text-ink-2">
          {[
            [condo.rua, condo.numero_porta].filter(Boolean).join(", "),
            condo.bairro,
            condo.cidade,
          ]
            .filter(Boolean)
            .join(" · ")}
          {condo.gestor_nome
            ? ` · Gestor: ${condo.gestor_nome}${condo.gestor_apelido ? ` ${condo.gestor_apelido}` : ""}`
            : ""}
        </p>
        <p className="num text-sm font-semibold text-ink-2">
          {lista.length} de {condo.total_moradias ?? "—"} moradias cadastradas
          {porUsar ? ` · ${porUsar} convite${porUsar === 1 ? "" : "s"} por usar` : ""}
        </p>
      </div>

      {lista.length === 0 ? (
        <div className="card max-w-180">
          <div className="empty">
            <span className="e-ico">
              <Icone nome="flats" />
            </span>
            <b>Ainda sem flats</b>
            <p>As flats que cadastrar neste condomínio aparecem aqui.</p>
          </div>
        </div>
      ) : (
        <div className="card max-w-180">
          <ul className="divide-y divide-line-soft">
            {lista.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/agente/cadastros/${condo.id}/${f.id}`}
                  className="flex flex-wrap items-center gap-2.5 py-3 transition-colors hover:bg-green-50/60"
                >
                  <span className="num rounded-lg bg-bg px-2 py-0.5 text-[12.5px] font-bold">
                    {f.referencia}
                  </span>
                  <span className="text-[13.5px] font-semibold">
                    {[f.bloco ? `Bloco ${f.bloco}` : null, f.andar ? `${f.andar}.º` : null, `Flat ${f.numero}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="text-[13px] text-ink-3">
                    {[f.proprietario_nome, f.proprietario_apelido].filter(Boolean).join(" ")}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    <span className={`pill ${f.perfil_proprietario_id ? "pill-pago" : "pill-pendente"}`}>
                      {f.perfil_proprietario_id ? "Conta activa" : "Convite por usar"}
                    </span>
                    <span className="text-ink-3">
                      <Icone nome="chevR" sm />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}

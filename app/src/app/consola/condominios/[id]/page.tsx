
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Kpi, MT } from "@/components/Kpi";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_CONSOLA } from "@/lib/navs";
import { aprovarGestor, rejeitarGestor } from "../../actions";

const PILL_FATURA: Record<string, string> = {
  paga: "pill pill-pago",
  pendente: "pill pill-pendente",
  em_atraso: "pill pill-atraso",
};

function Dado({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <div>
      <div className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">
        {rotulo}
      </div>
      <div className="break-words text-sm font-semibold">{valor}</div>
    </div>
  );
}

export default async function CondominioDetalhe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const perfil = await exigirPapel("super_admin");
  const { id } = await params;
  const supabase = await createClient();

  const { data: condo } = await supabase
    .from("condominios")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!condo) notFound();

  const inicioMes = new Date();
  const mes = `${inicioMes.getFullYear()}-${String(inicioMes.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data: flats }, { data: faturas }, { data: gestor }] = await Promise.all([
    supabase
      .from("flats")
      .select(
        "id, referencia, bloco, andar, numero, quota_mensal, proprietario_nome, proprietario_telefone, perfil_proprietario_id, estado",
      )
      .eq("condominio_id", id)
      .order("referencia"),
    supabase
      .from("faturas")
      .select("id, flat_id, valor_quota, estado")
      .eq("condominio_id", id)
      .eq("mes_referencia", mes),
    supabase
      .from("perfis")
      .select("id, nome, apelido, estado, telefone")
      .eq("condominio_id", id)
      .eq("papel", "gestor")
      .maybeSingle(),
  ]);

  const lista = flats ?? [];
  const fts = faturas ?? [];
  const pagas = fts.filter((f) => f.estado === "paga");
  const cobrado = pagas.reduce((s, f) => s + Number(f.valor_quota), 0);
  const emAtraso = fts.filter((f) => f.estado === "em_atraso").length;
  const faturaPorFlat = new Map(fts.map((f) => [f.flat_id, f]));

  const morada = [condo.rua, condo.numero_porta, condo.bairro, condo.cidade, condo.provincia]
    .filter(Boolean)
    .join(", ");

  return (
    <AppShell perfil={perfil} sub="Super administração" itens={NAV_CONSOLA}>
      <div className="mb-5 mt-2">
        <Link
          href="/consola/condominios"
          className="text-[13px] font-bold text-green-700 hover:underline"
        >
          ← Condomínios
        </Link>
        <h1 className="mt-1 flex flex-wrap items-center gap-2 text-[26px] font-extrabold tracking-tight">
          {condo.nome}
          <span className="num rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-bold text-green-800">
            {condo.codigo}
          </span>
        </h1>
        <p className="text-sm text-ink-2">{morada || condo.endereco}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi rotulo="Cobrado este mês" valor={MT(cobrado)} detalhe={`${pagas.length} de ${fts.length} faturas pagas`} />
        <Kpi rotulo="Flats" valor={String(lista.length)} detalhe={`quota padrão ${MT(Number(condo.quota_padrao))}`} />
        <Kpi rotulo="Em atraso" valor={String(emAtraso)} detalhe={`vencimento dia ${condo.dia_vencimento}`} />
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold">Gestor</h2>
            {gestor ? (
              <span
                className={
                  gestor.estado === "activo"
                    ? "pill pill-pago"
                    : gestor.estado === "pendente"
                      ? "pill pill-confirmar"
                      : "pill pill-atraso"
                }
              >
                {gestor.estado === "activo"
                  ? "Aprovado"
                  : gestor.estado === "pendente"
                    ? "Por aprovar"
                    : "Suspenso"}
              </span>
            ) : (
              <span className="pill pill-pendente">Sem registo</span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Dado
              rotulo="Nome"
              valor={
                gestor
                  ? [gestor.nome, gestor.apelido].filter(Boolean).join(" ")
                  : [condo.gestor_nome, condo.gestor_apelido].filter(Boolean).join(" ")
              }
            />
            <Dado rotulo="Email" valor={condo.gestor_email} />
            <Dado rotulo="Contacto" valor={gestor?.telefone ?? condo.gestor_telefone} />
            <Dado rotulo="Contacto alternativo" valor={condo.gestor_telefone_alt} />
            <Dado rotulo="NUIT" valor={condo.gestor_nuit} />
            <Dado
              rotulo={condo.gestor_doc_tipo === "passaporte" ? "Passaporte" : "BI"}
              valor={condo.gestor_doc_numero}
            />
          </div>
          {gestor && gestor.estado !== "activo" ? (
            <div className="mt-4 flex gap-2">
              <form action={aprovarGestor}>
                <input type="hidden" name="perfil_id" value={gestor.id} />
                <button className="btn btn-primary">Aprovar gestor</button>
              </form>
              {gestor.estado === "pendente" ? (
                <form action={rejeitarGestor}>
                  <input type="hidden" name="perfil_id" value={gestor.id} />
                  <button className="btn btn-ghost">Rejeitar</button>
                </form>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="card">
          <h2 className="mb-3 text-base font-extrabold">Dados do condomínio</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Dado rotulo="Província" valor={condo.provincia} />
            <Dado rotulo="Cidade" valor={condo.cidade} />
            <Dado rotulo="Bairro" valor={condo.bairro} />
            <Dado rotulo="Código postal" valor={condo.codigo_postal} />
            <Dado
              rotulo="Moradias"
              valor={condo.total_moradias ? String(condo.total_moradias) : null}
            />
            <Dado
              rotulo="Taxa de serviço"
              valor={
                condo.taxa_servico_pct != null
                  ? `${Number(condo.taxa_servico_pct)}% (própria)`
                  : "padrão da plataforma"
              }
            />
            <Dado rotulo="Banco (repasses)" valor={condo.banco_nome} />
            <Dado rotulo="Conta" valor={condo.banco_conta} />
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <h2 className="mb-3 text-base font-extrabold">Flats</h2>
        {lista.length === 0 ? (
          <p className="text-sm text-ink-2">Ainda não há flats cadastradas.</p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {lista.map((f) => {
              const fat = faturaPorFlat.get(f.id);
              return (
                <li key={f.id} className="flex flex-wrap items-center gap-2 py-3">
                  <div className="min-w-44">
                    <div className="font-bold">
                      Flat {f.numero}
                      {f.bloco ? ` · Bloco ${f.bloco}` : ""}
                      {f.andar ? ` · ${f.andar}º` : ""}
                    </div>
                    <div className="num text-[12.5px] text-ink-3">{f.referencia}</div>
                  </div>
                  <div className="text-[13px] text-ink-2">
                    {f.proprietario_nome}
                    <span className="text-ink-3"> · {f.proprietario_telefone}</span>
                    {!f.perfil_proprietario_id ? (
                      <span className="ml-2 text-[12px] font-bold text-ink-3">
                        (convite por usar)
                      </span>
                    ) : null}
                  </div>
                  <div className="num ml-auto font-bold">
                    {MT(Number(f.quota_mensal ?? condo.quota_padrao))}
                  </div>
                  {fat ? (
                    <span className={PILL_FATURA[fat.estado] ?? "pill pill-pendente"}>
                      {fat.estado === "paga"
                        ? "Paga"
                        : fat.estado === "em_atraso"
                          ? "Em atraso"
                          : "Pendente"}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

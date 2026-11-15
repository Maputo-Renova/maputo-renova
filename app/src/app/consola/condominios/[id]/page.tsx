
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Icone, type NomeIcone } from "@/components/Icone";
import { Kpi, MT } from "@/components/Kpi";
import { MonthPicker } from "@/components/MonthPicker";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_CONSOLA } from "@/lib/navs";
import { mesDe } from "@/lib/mes";
import { aprovarGestor, rejeitarGestor } from "../../actions";

const METODO: Record<string, string> = {
  transferencia: "Transferência",
  mpesa: "M-Pesa",
  emola: "eMola",
};

const PILL_FATURA: Record<string, { classe: string; rotulo: string }> = {
  paga: { classe: "pill pill-pago", rotulo: "Paga" },
  pendente: { classe: "pill pill-pendente", rotulo: "Pendente" },
  em_atraso: { classe: "pill pill-atraso", rotulo: "Em atraso" },
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  await connection();
  const perfil = await exigirPapel("super_admin");
  const { id } = await params;
  const { mes: mesParam } = await searchParams;
  const mes = mesDe(mesParam);
  const supabase = await createClient();

  const { data: condo } = await supabase
    .from("condominios")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!condo) notFound();

  const [
    { data: flats },
    { data: faturas },
    { data: gestor },
    { data: movimentos },
    { data: despesas },
    { data: avisos },
  ] = await Promise.all([
    supabase
      .from("flats")
      .select(
        "id, referencia, bloco, andar, numero, quota_mensal, proprietario_nome, proprietario_telefone, perfil_proprietario_id",
      )
      .eq("condominio_id", id)
      .order("referencia"),
    supabase
      .from("faturas")
      .select("id, flat_id, valor_quota, estado")
      .eq("condominio_id", id)
      .eq("mes_referencia", mes.iso),
    supabase
      .from("perfis")
      .select("id, nome, apelido, estado, telefone")
      .eq("condominio_id", id)
      .eq("papel", "gestor")
      .maybeSingle(),
    supabase
      .from("movimentos")
      .select("tipo, valor, created_at")
      .eq("condominio_id", id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("despesas")
      .select("descricao, categoria, valor, data")
      .eq("condominio_id", id)
      .gte("data", mes.iso)
      .order("data", { ascending: false })
      .limit(8),
    supabase
      .from("avisos")
      .select("titulo, corpo, created_at")
      .eq("condominio_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const { data: projectos } = await supabase
    .from("projectos")
    .select("id, nome, categoria, orcamento, financiamento, estado, progresso, votos_favor, votos_contra")
    .eq("condominio_id", id)
    .order("created_at", { ascending: false })
    .limit(8);

  const lista = flats ?? [];
  const fts = faturas ?? [];
  const pagas = fts.filter((f) => f.estado === "paga");
  const esperado = fts.reduce((s, f) => s + Number(f.valor_quota), 0);
  const cobrado = pagas.reduce((s, f) => s + Number(f.valor_quota), 0);
  const pct = esperado ? Math.round((cobrado / esperado) * 100) : 0;
  const emAtraso = fts.filter((f) => f.estado === "em_atraso").length;
  const inad = lista.length ? Math.round((emAtraso / lista.length) * 100) : 0;
  const saldo = (await supabase
    .from("movimentos")
    .select("valor")
    .eq("condominio_id", id)).data?.reduce((s, m) => s + Number(m.valor), 0) ?? 0;
  const faturaPorFlat = new Map(fts.map((f) => [f.flat_id, f]));

  const { data: pagamentos } = fts.length
    ? await supabase
        .from("pagamentos")
        .select("fatura_id, metodo, estado")
        .in("fatura_id", fts.map((f) => f.id))
    : { data: [] as { fatura_id: string; metodo: string; estado: string }[] };
  const metodoPorFatura = new Map(
    (pagamentos ?? [])
      .filter((p) => p.estado === "confirmado" || p.estado === "a_confirmar")
      .map((p) => [p.fatura_id, p.metodo]),
  );

  const nomeGestor = gestor
    ? [gestor.nome, gestor.apelido].filter(Boolean).join(" ")
    : [condo.gestor_nome, condo.gestor_apelido].filter(Boolean).join(" ");

  const TIPO_MOV: Record<string, { rotulo: string; ico: string; icone: NomeIcone }> = {
    credito_cobranca: { rotulo: "Cobrança confirmada", ico: "g", icone: "arrUp" },
    taxa_plataforma: { rotulo: "Taxa de serviço", ico: "a", icone: "receipt" },
    repasse: { rotulo: "Repasse ao condomínio", ico: "b", icone: "bank" },
  };

  return (
    <AppShell perfil={perfil} sub="Super administração" itens={NAV_CONSOLA}>
      <div className="mb-5 mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
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
          <p className="text-sm text-ink-2">
            {[condo.bairro, nomeGestor ? `Gestor: ${nomeGestor}` : null, `${lista.length} flats`]
              .filter(Boolean)
              .join(" · ")}{" "}
            · {mes.rotulo}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className="pill pill-pago"
            title="SMS e email enviados automaticamente: 5 dias antes do vencimento, no vencimento e aos 3 e 7 dias de atraso"
          >
            Lembretes automáticos
          </span>
          <MonthPicker base={`/consola/condominios/${id}`} {...mes} />
          <Link href="/consola/repasses" className="btn btn-primary">
            <Icone nome="bank" sm />
            Registar repasse
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi
          icone="wallet"
          rotulo={`Cobrança de ${mes.rotulo.split(" ")[0]}`}
          valor={MT(cobrado)}
          detalhe={`${pct}% do esperado · de ${MT(esperado)}`}
        />
        <Kpi icone="alert" rotulo="Em atraso" valor={`${emAtraso} flats`} detalhe={`${inad}% de inadimplência`} />
        <Kpi icone="bank" rotulo="Saldo a repassar" valor={MT(saldo)} detalhe={`vencimento dia ${condo.dia_vencimento}`} />
      </div>

      <div className="card mt-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="text-base font-extrabold">Flats · {mes.rotulo.split(" ")[0]}</h2>
          <span className="cell-sub ml-auto">
            Visão da consola — os mesmos dados do gestor
          </span>
        </div>
        {lista.length === 0 ? (
          <div className="empty">
            <span className="e-ico">
              <Icone nome="flats" />
            </span>
            <b>Ainda sem flats</b>
            <p>
              {condo.total_moradias
                ? `0 de ${condo.total_moradias} moradias cadastradas. `
                : ""}
              As flats serão registadas pelo agente, com convite de registo para
              cada proprietário.
            </p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Flat</th>
                  <th>Proprietário</th>
                  <th className="r">Quota</th>
                  <th>Método</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((f) => {
                  const fat = faturaPorFlat.get(f.id);
                  const metodo = fat ? metodoPorFatura.get(fat.id) : undefined;
                  const pill = fat ? PILL_FATURA[fat.estado] : undefined;
                  return (
                    <tr key={f.id}>
                      <td>
                        <div className="cell-main">Flat {f.numero}</div>
                        <div className="cell-sub">
                          {[f.bloco ? `Bloco ${f.bloco}` : null, f.andar ? `${f.andar}º andar` : null]
                            .filter(Boolean)
                            .join(" · ")}
                          {f.bloco || f.andar ? " · " : ""}
                          <span className="num">{f.referencia}</span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-main">{f.proprietario_nome}</div>
                        <div className="cell-sub num">
                          {f.proprietario_telefone}
                          {!f.perfil_proprietario_id ? " · convite por usar" : ""}
                        </div>
                      </td>
                      <td className="r num b">
                        {MT(Number(f.quota_mensal ?? condo.quota_padrao))}
                      </td>
                      <td>{metodo ? METODO[metodo] ?? metodo : <span className="cell-sub">—</span>}</td>
                      <td>
                        {pill ? (
                          <span className={pill.classe}>{pill.rotulo}</span>
                        ) : (
                          <span className="cell-sub">sem fatura</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-2 flex items-center gap-2.5">
            <span className="card-ico">
              <Icone nome="ledger" />
            </span>
            <h2 className="text-base font-extrabold">Movimentos recentes</h2>
          </div>
          {(movimentos ?? []).length === 0 ? (
            <p className="py-3 text-sm text-ink-2">
              Sem movimentos — aparecem com a primeira cobrança confirmada.
            </p>
          ) : (
            <ul className="row-list">
              {movimentos!.map((m, i) => {
                const t = TIPO_MOV[m.tipo] ?? { rotulo: m.tipo, ico: "b", icone: "bank" as NomeIcone };
                const v = Number(m.valor);
                return (
                  <li key={i}>
                    <span className={`row-ico ${t.ico}`}>
                      <Icone nome={t.icone} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="cell-main">{t.rotulo}</div>
                      <div className="cell-sub">
                        {new Date(m.created_at).toLocaleDateString("pt-PT")}
                      </div>
                    </div>
                    <div
                      className="num cell-main"
                      style={{ color: v > 0 ? "var(--green-700)" : "var(--ink)" }}
                    >
                      {v > 0 ? "+" : "−"} {MT(Math.abs(v))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="mb-2 flex items-center gap-2.5">
            <span className="card-ico">
              <Icone nome="receipt" />
            </span>
            <h2 className="text-base font-extrabold">
              Despesas de {mes.rotulo.split(" ")[0]}
            </h2>
          </div>
          {(despesas ?? []).length === 0 ? (
            <p className="py-3 text-sm text-ink-2">
              Sem despesas registadas neste mês — toda a despesa do gestor exige
              fatura anexada.
            </p>
          ) : (
            <ul className="row-list">
              {despesas!.map((d, i) => (
                <li key={i}>
                  <span className="row-ico a">
                    <Icone nome="receipt" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="cell-main">{d.descricao ?? d.categoria}</div>
                    <div className="cell-sub">
                      {d.categoria} · {new Date(`${d.data}T00:00:00`).toLocaleDateString("pt-PT")}
                    </div>
                  </div>
                  <div className="num cell-main">{MT(Number(d.valor))}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
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
            <Dado rotulo="Nome" valor={nomeGestor} />
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
                <button className="btn btn-primary">
                  {gestor.estado === "pendente" ? "Aprovar gestor" : "Reactivar"}
                </button>
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
            <Dado rotulo="Quota padrão" valor={MT(Number(condo.quota_padrao))} />
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

      {(projectos ?? []).length > 0 ? (
        <div className="card mt-4">
          <div className="mb-2 flex items-center gap-2.5">
            <span className="card-ico">
              <Icone nome="obra" />
            </span>
            <h2 className="text-base font-extrabold">Projectos</h2>
          </div>
          <ul className="row-list">
            {projectos!.map((p) => (
              <li key={p.id}>
                <span className="row-ico b">
                  <Icone nome="obra" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="cell-main">{p.nome}</div>
                  <div className="cell-sub">
                    {p.categoria} · orçamento <b className="num">{MT(Number(p.orcamento))}</b>
                    {p.financiamento === "associacao"
                      ? ` · votos ${p.votos_favor}/${p.votos_contra}`
                      : ""}
                  </div>
                </div>
                <span className="num cell-sub">{p.progresso}%</span>
                <span
                  className={
                    p.estado === "concluido"
                      ? "pill pill-pago"
                      : p.estado === "aprovado"
                        ? "pill pill-confirmar"
                        : p.estado === "rejeitado"
                          ? "pill pill-atraso"
                          : "pill pill-pendente"
                  }
                >
                  {p.estado === "concluido"
                    ? "Concluído"
                    : p.estado === "aprovado"
                      ? "Em curso"
                      : p.estado === "rejeitado"
                        ? "Rejeitado"
                        : "Por aprovar"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card mt-4">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="card-ico">
            <Icone nome="bell" />
          </span>
          <h2 className="text-base font-extrabold">Avisos enviados pelo gestor</h2>
        </div>
        {(avisos ?? []).length === 0 ? (
          <p className="py-3 text-sm text-ink-2">Ainda sem avisos enviados.</p>
        ) : (
          <ul className="row-list">
            {avisos!.map((a, i) => (
              <li key={i}>
                <span className="row-ico g">
                  <Icone nome="bell" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="cell-main">{a.titulo}</div>
                  <div className="cell-sub">{a.corpo}</div>
                </div>
                <span className="cell-sub">
                  {new Date(a.created_at).toLocaleDateString("pt-PT")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

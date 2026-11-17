
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Icone } from "@/components/Icone";
import { MT } from "@/components/Kpi";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_AGENTE } from "@/lib/navs";

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div className="field">
      <label>{rotulo}</label>
      <input value={valor ?? "—"} readOnly className="!bg-bg !text-ink-2" />
    </div>
  );
}

function Estado({ rotulo, ok, simRotulo, naoRotulo }: {
  rotulo: string;
  ok: boolean;
  simRotulo: string;
  naoRotulo: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-[13.5px] font-semibold text-ink-2">{rotulo}</span>
      <span className={`pill ${ok ? "pill-pago" : "pill-pendente"}`}>
        {ok ? simRotulo : naoRotulo}
      </span>
    </div>
  );
}

// Meus Cadastros (nível 3): o detalhe do cadastro de uma flat.
export default async function DetalheFlatCadastro({
  params,
}: {
  params: Promise<{ id: string; flat: string }>;
}) {
  await connection();
  const perfil = await exigirPapel("colaborador");
  const { id, flat: flatId } = await params;
  const supabase = await createClient();

  const { data: flat } = await supabase
    .from("flats")
    .select(
      "id, referencia, bloco, andar, numero, condominio_id, proprietario_nome, proprietario_apelido, proprietario_telefone, proprietario_email, proprietario_nuit, proprietario_documento, proprietario_doc_tipo, proprietario_data_nascimento, proprietario_doc_path, comprovativo_endereco_path, perfil_proprietario_id, codigo_convite, convite_expira_em, condominios(nome, quota_padrao)",
    )
    .eq("id", flatId)
    .eq("condominio_id", id)
    .maybeSingle();
  if (!flat) notFound();
  const condo = Array.isArray(flat.condominios) ? flat.condominios[0] : flat.condominios;

  return (
    <AppShell perfil={perfil} sub="Cadastro de condomínios" itens={NAV_AGENTE}>
      <div className="mb-5 mt-2">
        <Link
          href={`/agente/cadastros/${id}`}
          className="mb-1 inline-flex items-center gap-1 text-[13px] font-bold text-green-700 hover:underline"
        >
          <Icone nome="chevL" sm />
          {condo?.nome ?? "Condomínio"}
        </Link>
        <h1 className="flex flex-wrap items-center gap-2.5 text-[26px] font-extrabold tracking-tight">
          Flat {flat.numero}
          <span className="num rounded-full bg-green-100 px-2.5 py-1 text-[13px] font-bold text-green-800">
            {flat.referencia}
          </span>
        </h1>
        <p className="text-sm text-ink-2">
          Detalhe do cadastro{condo ? ` · ${condo.nome}` : ""}
        </p>
      </div>

      <div className="grid max-w-180 items-start gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="card-ico">
              <Icone nome="flats" />
            </span>
            <h2 className="text-base font-extrabold">Flat</h2>
          </div>
          <div className="grid gap-3.5">
            <div className="grid grid-cols-3 gap-3.5">
              <Campo rotulo="Bloco" valor={flat.bloco} />
              <Campo rotulo="Andar" valor={flat.andar} />
              <Campo rotulo="Número" valor={flat.numero} />
            </div>
          </div>
          <div className="mt-4 grid gap-2.5 border-t border-line-soft pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13.5px] font-semibold text-ink-2">Quota mensal</span>
              <span className="num text-[17px] font-extrabold">
                {MT(Number(condo?.quota_padrao ?? 0))}
              </span>
            </div>
            <Estado
              rotulo="Acesso do proprietário"
              ok={Boolean(flat.perfil_proprietario_id)}
              simRotulo="Conta activa"
              naoRotulo="Convite por usar"
            />
            <Estado
              rotulo="Cópia do documento"
              ok={Boolean(flat.proprietario_doc_path)}
              simRotulo="Anexada"
              naoRotulo="Por anexar"
            />
            <Estado
              rotulo="Comprovativo de endereço"
              ok={Boolean(flat.comprovativo_endereco_path)}
              simRotulo="Entregue"
              naoRotulo="Por entregar"
            />
          </div>
          {!flat.perfil_proprietario_id ? (
            <div className="note mt-4 items-center">
              <Icone nome="key" sm />
              <span className="flex-1 text-[13px]">
                Código de convite (entregar ao proprietário):{" "}
                <b className="num break-all">{flat.codigo_convite}</b>
                {flat.convite_expira_em
                  ? ` · expira a ${new Date(flat.convite_expira_em).toLocaleDateString("pt-PT")}`
                  : ""}
              </span>
            </div>
          ) : null}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="card-ico">
              <Icone nome="shield" />
            </span>
            <h2 className="text-base font-extrabold">Proprietário(a)</h2>
          </div>
          <div className="grid gap-3.5">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Campo rotulo="Nome" valor={flat.proprietario_nome} />
              <Campo rotulo="Apelido" valor={flat.proprietario_apelido} />
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Campo
                rotulo="Data de nascimento"
                valor={
                  flat.proprietario_data_nascimento
                    ? new Date(`${flat.proprietario_data_nascimento}T00:00:00`).toLocaleDateString("pt-PT")
                    : null
                }
              />
              <Campo rotulo="NUIT" valor={flat.proprietario_nuit} />
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Campo
                rotulo="Documento"
                valor={
                  flat.proprietario_documento
                    ? `${flat.proprietario_doc_tipo === "passaporte" ? "Passaporte" : "BI"} · ${flat.proprietario_documento}`
                    : null
                }
              />
              <Campo rotulo="Telefone" valor={flat.proprietario_telefone} />
            </div>
            <Campo rotulo="Email" valor={flat.proprietario_email} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

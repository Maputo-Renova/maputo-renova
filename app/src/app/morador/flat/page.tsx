
import { connection } from "next/server";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { MT } from "@/components/Kpi";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_MORADOR } from "@/lib/navs";

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div className="field">
      <label>{rotulo}</label>
      <input value={valor ?? "—"} readOnly className="!bg-bg !text-ink-2" />
    </div>
  );
}

export default async function MinhaFlat() {
  await connection();
  const perfil = await exigirPapel("proprietario");
  const supabase = await createClient();

  const { data: flat } = await supabase
    .from("flats")
    .select(
      "id, referencia, bloco, andar, numero, quota_mensal, condominio_id, proprietario_nome, proprietario_apelido, proprietario_telefone, proprietario_email, proprietario_nuit, proprietario_documento, proprietario_doc_tipo, proprietario_data_nascimento, comprovativo_endereco_path",
    )
    .eq("perfil_proprietario_id", perfil.id)
    .maybeSingle();

  const { data: condo } = flat
    ? await supabase
        .from("condominios")
        .select("nome, endereco, quota_padrao")
        .eq("id", flat.condominio_id)
        .maybeSingle()
    : { data: null };

  return (
    <AppShell
      perfil={perfil}
      sub={flat ? `Flat ${flat.numero} · ${flat.referencia}` : "A minha flat"}
      itens={NAV_MORADOR}
    >
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">A minha flat</h1>
        <p className="text-sm text-ink-2">
          Dados de cadastro{condo ? ` · ${condo.nome}` : ""}
        </p>
      </div>

      {!flat ? (
        <div className="card max-w-130 text-sm text-ink-2">
          Sem flat associada a esta conta.
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="card">
            <h2 className="mb-3 text-base font-extrabold">Identificação</h2>
            <div className="grid gap-3.5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Campo rotulo="Referência de cadastro" valor={flat.referencia} />
                <Campo rotulo="Condomínio" valor={condo?.nome} />
              </div>
              <div className="grid gap-3.5 sm:grid-cols-3">
                <Campo rotulo="Bloco" valor={flat.bloco} />
                <Campo rotulo="Andar" valor={flat.andar} />
                <Campo rotulo="Número" valor={flat.numero} />
              </div>
              <Campo rotulo="Endereço" valor={condo?.endereco} />
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Campo
                  rotulo="Comprovativo de endereço"
                  valor={flat.comprovativo_endereco_path ? "entregue · verificado" : "por entregar"}
                />
                <Campo
                  rotulo="Quota mensal"
                  valor={MT(Number(flat.quota_mensal ?? condo?.quota_padrao ?? 0))}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="card">
              <h2 className="mb-3 text-base font-extrabold">Proprietário(a)</h2>
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
                        ? new Date(
                            `${flat.proprietario_data_nascimento}T00:00:00`,
                          ).toLocaleDateString("pt-PT")
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
            <div className="note items-center">
              <span className="flex-1">
                Os dados de cadastro só podem ser alterados pela administração do
                condomínio.
              </span>
              <Link href="/morador/suporte?categoria=correccao" className="btn btn-ghost btn-sm">
                Pedir correcção
              </Link>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

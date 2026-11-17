
import { connection } from "next/server";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Icone } from "@/components/Icone";
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

  // multi-moradias: uma secção por flat
  const { data: flats } = await supabase
    .from("flats")
    .select(
      "id, referencia, bloco, andar, numero, condominio_id, proprietario_nome, proprietario_apelido, proprietario_telefone, proprietario_email, proprietario_nuit, proprietario_documento, proprietario_doc_tipo, proprietario_data_nascimento, comprovativo_endereco_path, condominios(nome, endereco, quota_padrao)",
    )
    .eq("perfil_proprietario_id", perfil.id)
    .order("created_at");

  const lista = (flats ?? []).map((flat) => ({
    flat,
    condo: Array.isArray(flat.condominios) ? flat.condominios[0] : flat.condominios,
  }));
  const varias = lista.length > 1;

  return (
    <AppShell
      perfil={perfil}
      sub={
        varias
          ? `${lista.length} moradias`
          : lista[0]
            ? `Flat ${lista[0].flat.numero} · ${lista[0].flat.referencia}`
            : "A minha flat"
      }
      itens={NAV_MORADOR}
    >
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">
          {varias ? "As minhas flats" : "A minha flat"}
        </h1>
        <p className="text-sm text-ink-2">
          Dados de cadastro
          {!varias && lista[0]?.condo ? ` · ${lista[0].condo.nome}` : ""}
        </p>
      </div>

      {lista.length === 0 ? (
        <div className="card max-w-130 text-sm text-ink-2">
          Sem flat associada a esta conta.
        </div>
      ) : (
        <div className="grid gap-6">
          {lista.map(({ flat, condo }) => (
        <div key={flat.id} className="grid items-start gap-4 lg:grid-cols-2">
          <div className="card">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="card-ico">
                <Icone nome="flats" />
              </span>
              <h2 className="text-base font-extrabold">
                {varias ? `Flat ${flat.numero} · ${condo?.nome ?? "Identificação"}` : "Identificação"}
              </h2>
            </div>
            <div className="grid gap-3.5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Campo rotulo="Condomínio" valor={condo?.nome} />
                <Campo rotulo="Referência de cadastro" valor={flat.referencia} />
              </div>
              <div className="grid grid-cols-3 gap-3.5">
                <Campo rotulo="Bloco" valor={flat.bloco} />
                <Campo rotulo="Andar" valor={flat.andar} />
                <Campo rotulo="Número" valor={flat.numero} />
              </div>
              <Campo rotulo="Endereço" valor={condo?.endereco} />
            </div>
            <div className="mt-4 grid gap-2.5 border-t border-line-soft pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13.5px] font-semibold text-ink-2">Quota mensal</span>
                <span className="num text-[17px] font-extrabold">
                  {MT(Number(condo?.quota_padrao ?? 0))}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13.5px] font-semibold text-ink-2">Comprovativo de endereço</span>
                <span className={`pill ${flat.comprovativo_endereco_path ? "pill-pago" : "pill-pendente"}`}>
                  {flat.comprovativo_endereco_path ? "Entregue" : "Por entregar"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
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
              <Icone nome="shield" sm />
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
          ))}
        </div>
      )}
    </AppShell>
  );
}

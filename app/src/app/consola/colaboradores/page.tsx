
import { connection } from "next/server";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_CONSOLA } from "@/lib/navs";
import { suspenderPerfil, reactivarPerfil } from "../actions";
import { FormNovoColaborador } from "./FormNovoColaborador";

const FUNCAO: Record<string, { rotulo: string; area: string }> = {
  super_admin: { rotulo: "Administrador", area: "Consola" },
  colaborador: { rotulo: "Agente", area: "Cadastro" },
  gestor: { rotulo: "Gestor", area: "Condomínio" },
};

const CHIPS: [string, string][] = [
  ["todos", "Todos"],
  ["super_admin", "Administradores"],
  ["colaborador", "Agentes"],
  ["gestor", "Gestores"],
];

export default async function Colaboradores({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  await connection();
  const perfil = await exigirPapel("super_admin");
  const { f } = await searchParams;
  const filtro = f && f in FUNCAO ? f : "todos";
  const supabase = await createClient();

  const [{ data: equipa }, { data: condominios }, { data: convites }] =
    await Promise.all([
      supabase
        .from("perfis")
        .select("id, nome, apelido, telefone, papel, estado, condominio_id, created_at")
        .in("papel", ["super_admin", "colaborador", "gestor"])
        .order("created_at", { ascending: false }),
      supabase.from("condominios").select("id, nome").order("nome"),
      supabase
        .from("convites_acesso")
        .select("id, codigo, papel, nome, apelido, email, expira_em")
        .is("usado_por", null)
        .gt("expira_em", new Date().toISOString())
        .order("created_at", { ascending: false }),
    ]);

  const condoPorId = new Map((condominios ?? []).map((c) => [c.id, c.nome]));
  const lista = (equipa ?? []).filter(
    (p) => filtro === "todos" || p.papel === filtro,
  );

  return (
    <AppShell perfil={perfil} sub="Super administração" itens={NAV_CONSOLA}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Colaboradores</h1>
        <p className="text-sm text-ink-2">
          Equipa da plataforma — gestão exclusiva do super administrador, com auditoria
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="grid gap-4">
          <div className="card">
            <div className="chips mb-3">
              {CHIPS.map(([k, rotulo]) => (
                <Link
                  key={k}
                  href={k === "todos" ? "/consola/colaboradores" : `/consola/colaboradores?f=${k}`}
                  className={`chip ${filtro === k ? "on" : ""}`}
                >
                  {rotulo}
                </Link>
              ))}
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Função</th>
                    <th>Área</th>
                    <th>Desde</th>
                    <th>Estado</th>
                    <th className="r"></th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((p) => {
                    const fn = FUNCAO[p.papel];
                    const area =
                      p.papel === "gestor"
                        ? condoPorId.get(p.condominio_id ?? "") ?? "Condomínio"
                        : fn.area;
                    const eu = p.id === perfil.id;
                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="cell-main">
                            {[p.nome, p.apelido].filter(Boolean).join(" ")}
                            {eu ? <span className="cell-sub"> (você)</span> : null}
                          </div>
                          <div className="cell-sub num">{p.telefone ?? "—"}</div>
                        </td>
                        <td>{fn.rotulo}</td>
                        <td>{area}</td>
                        <td className="num">
                          {new Date(p.created_at).toLocaleDateString("pt-PT")}
                        </td>
                        <td>
                          <span
                            className={
                              p.estado === "activo"
                                ? "pill pill-pago"
                                : p.estado === "pendente"
                                  ? "pill pill-confirmar"
                                  : "pill pill-atraso"
                            }
                          >
                            {p.estado === "activo"
                              ? "Activo"
                              : p.estado === "pendente"
                                ? "Pendente"
                                : "Suspenso"}
                          </span>
                        </td>
                        <td className="r">
                          {eu ? (
                            <span className="cell-sub">—</span>
                          ) : p.estado === "suspenso" ? (
                            <form action={reactivarPerfil} className="inline">
                              <input type="hidden" name="perfil_id" value={p.id} />
                              <button className="btn btn-ghost btn-sm">Reactivar</button>
                            </form>
                          ) : (
                            <form action={suspenderPerfil} className="inline">
                              <input type="hidden" name="perfil_id" value={p.id} />
                              <button className="btn btn-danger btn-sm">Suspender</button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {(convites ?? []).length > 0 ? (
            <div className="card">
              <h2 className="mb-2 text-base font-extrabold">Convites por usar</h2>
              <ul className="row-list">
                {convites!.map((c) => (
                  <li key={c.id}>
                    <span className="row-ico b">✉</span>
                    <div className="min-w-0 flex-1">
                      <div className="cell-main">
                        {[c.nome, c.apelido].filter(Boolean).join(" ")} ·{" "}
                        {FUNCAO[c.papel]?.rotulo ?? c.papel}
                      </div>
                      <div className="cell-sub break-all">
                        {c.email ? `${c.email} · ` : ""}
                        código <span className="num">{c.codigo}</span>
                      </div>
                    </div>
                    <span className="cell-sub">
                      expira {new Date(c.expira_em).toLocaleDateString("pt-PT")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="note">
            <span>
              <b>Agente</b> faz os cadastros de condomínios e flats (sem finanças);{" "}
              <b>Administrador</b> tem acesso total à consola; <b>Gestor</b> gere
              apenas o seu condomínio. Um colaborador suspenso perde o acesso de
              imediato; o histórico fica preservado.
            </span>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-base font-extrabold">Novo colaborador</h2>
          <FormNovoColaborador condominios={condominios ?? []} />
        </div>
      </div>
    </AppShell>
  );
}

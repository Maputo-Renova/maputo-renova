
import { connection } from "next/server";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_CONSOLA } from "@/lib/navs";
import { aprovarGestor, rejeitarGestor } from "../actions";

export default async function GestoresConsola() {
  await connection();
  const perfil = await exigirPapel("super_admin");
  const supabase = await createClient();

  const [{ data: gestores }, { data: condominios }] = await Promise.all([
    supabase
      .from("perfis")
      .select("id, nome, apelido, telefone, estado, condominio_id, created_at")
      .eq("papel", "gestor")
      .order("created_at", { ascending: false }),
    supabase.from("condominios").select("id, nome, codigo"),
  ]);

  const condoPorId = new Map((condominios ?? []).map((c) => [c.id, c]));
  const lista = gestores ?? [];
  const pendentes = lista.filter((g) => g.estado === "pendente");
  const restantes = lista.filter((g) => g.estado !== "pendente");

  const Linha = ({ g }: { g: (typeof lista)[number] }) => {
    const condo = g.condominio_id ? condoPorId.get(g.condominio_id) : null;
    return (
      <li className="flex flex-wrap items-center gap-2 py-3">
        <div className="min-w-44">
          <div className="font-bold">
            {[g.nome, g.apelido].filter(Boolean).join(" ")}
          </div>
          <div className="text-[12.5px] text-ink-3">{g.telefone ?? "—"}</div>
        </div>
        {condo ? (
          <Link
            href={`/consola/condominios/${condo.id}`}
            className="text-[13px] font-bold text-green-700 hover:underline"
          >
            {condo.nome} · {condo.codigo}
          </Link>
        ) : (
          <span className="text-[13px] text-ink-3">sem condomínio</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {g.estado === "pendente" ? (
            <>
              <span className="pill pill-confirmar">Por aprovar</span>
              <form action={aprovarGestor}>
                <input type="hidden" name="perfil_id" value={g.id} />
                <button className="btn btn-primary btn-sm">Aprovar</button>
              </form>
              <form action={rejeitarGestor}>
                <input type="hidden" name="perfil_id" value={g.id} />
                <button className="btn btn-ghost btn-sm">Rejeitar</button>
              </form>
            </>
          ) : g.estado === "activo" ? (
            <span className="pill pill-pago">Activo</span>
          ) : (
            <>
              <span className="pill pill-atraso">Suspenso</span>
              <form action={aprovarGestor}>
                <input type="hidden" name="perfil_id" value={g.id} />
                <button className="btn btn-ghost btn-sm">Reactivar</button>
              </form>
            </>
          )}
        </div>
      </li>
    );
  };

  return (
    <AppShell perfil={perfil} sub="Super administração" itens={NAV_CONSOLA}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Gestores</h1>
        <p className="text-sm text-ink-2">
          Antes de aprovar, abra o condomínio para ver todos os dados do registo
        </p>
      </div>

      {pendentes.length > 0 ? (
        <div className="card mb-4">
          <h2 className="mb-2 text-base font-extrabold">
            Por aprovar ({pendentes.length})
          </h2>
          <ul className="divide-y divide-line-soft">
            {pendentes.map((g) => (
              <Linha key={g.id} g={g} />
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card">
        <h2 className="mb-2 text-base font-extrabold">Todos</h2>
        {restantes.length === 0 && pendentes.length === 0 ? (
          <p className="text-sm text-ink-2">
            Ainda não há gestores registados — o registo acontece quando o gestor
            usa o convite criado no cadastro do condomínio.
          </p>
        ) : restantes.length === 0 ? (
          <p className="text-sm text-ink-2">Sem gestores aprovados ou suspensos.</p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {restantes.map((g) => (
              <Linha key={g.id} g={g} />
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

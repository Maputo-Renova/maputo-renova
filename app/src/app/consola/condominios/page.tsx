
import { connection } from "next/server";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { exigirPapel } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_CONSOLA } from "@/lib/navs";

export default async function CondominiosConsola() {
  await connection();
  const perfil = await exigirPapel("super_admin");
  const supabase = await createClient();

  const [{ data: condominios }, { data: flats }] = await Promise.all([
    supabase
      .from("condominios")
      .select("id, nome, codigo, bairro, provincia, gestor_nome, estado, quota_padrao")
      .order("nome"),
    supabase.from("flats").select("id, condominio_id"),
  ]);

  const flatsPorCondo = new Map<string, number>();
  for (const f of flats ?? []) {
    flatsPorCondo.set(f.condominio_id, (flatsPorCondo.get(f.condominio_id) ?? 0) + 1);
  }

  return (
    <AppShell perfil={perfil} sub="Super administração" itens={NAV_CONSOLA}>
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Condomínios</h1>
        <p className="text-sm text-ink-2">
          Clique num condomínio para ver tudo o que o gestor vê
        </p>
      </div>
      <div className="card">
        {(condominios ?? []).length === 0 ? (
          <p className="text-sm text-ink-2">Ainda não há condomínios cadastrados.</p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {condominios!.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/consola/condominios/${c.id}`}
                  className="flex flex-wrap items-center gap-2 rounded-[10px] px-2 py-3 hover:bg-green-50"
                >
                  <span className="font-bold">{c.nome}</span>
                  <span className="num rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">
                    {c.codigo}
                  </span>
                  {c.estado !== "activo" ? (
                    <span className="pill pill-pendente">{c.estado}</span>
                  ) : null}
                  <span className="ml-auto text-[13px] text-ink-3">
                    {[c.bairro, c.provincia].filter(Boolean).join(" · ")}
                    {` · ${flatsPorCondo.get(c.id) ?? 0} flats`}
                    {c.gestor_nome ? ` · ${c.gestor_nome}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

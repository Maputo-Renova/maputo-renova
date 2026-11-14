
import { connection } from "next/server";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { exigirPapel } from "@/lib/perfil";
import { NAV_CONSOLA } from "@/lib/navs";
import { FormNovoCondominio } from "@/app/agente/formularios";

export default async function NovoCondominioConsola() {
  await connection();
  const perfil = await exigirPapel("super_admin");

  return (
    <AppShell perfil={perfil} sub="Super administração" itens={NAV_CONSOLA}>
      <div className="mb-5 mt-2">
        <Link
          href="/consola/condominios"
          className="text-[13px] font-bold text-green-700 hover:underline"
        >
          ← Condomínios
        </Link>
        <h1 className="mt-1 text-[26px] font-extrabold tracking-tight">
          Novo condomínio
        </h1>
        <p className="text-sm text-ink-2">
          Localização completa e dados do gestor · o convite de acesso do gestor
          é gerado no fim
        </p>
      </div>
      <div className="card max-w-3xl">
        <FormNovoCondominio />
      </div>
    </AppShell>
  );
}

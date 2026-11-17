
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Icone } from "@/components/Icone";
import { obterPerfil } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { NAV_POR_PAPEL, SUB_POR_PAPEL } from "@/lib/navs";
import { FormFoto } from "./FormFoto";
import { FormNome } from "./FormNome";
import { FormPassword } from "./FormPassword";
import { FormMfa } from "./FormMfa";

const EMAIL_LOCK: Record<string, string> = {
  gestor: "O email está bloqueado. Só a consola pode alterá-lo e reenviar o acesso.",
  proprietario:
    "O email está bloqueado. Só o gestor do condomínio pode alterá-lo e reenviar o acesso.",
  super_admin:
    "O email está bloqueado. Alterações de email de administradores são feitas pelo suporte da plataforma.",
  colaborador: "O email está bloqueado. Só a consola pode alterá-lo e reenviar o acesso.",
};

export default async function Perfil() {
  await connection();
  const perfil = await obterPerfil();
  if (!perfil) redirect("/conta/sem-perfil");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fotoUrl: string | null = null;
  if (perfil.foto_path) {
    const { data: assinada } = await supabase.storage
      .from("comprovativos")
      .createSignedUrl(perfil.foto_path, 3600);
    fotoUrl = assinada?.signedUrl ?? null;
  }
  const iniciais = perfil.nome
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppShell
      perfil={perfil}
      sub={SUB_POR_PAPEL[perfil.papel]}
      itens={NAV_POR_PAPEL[perfil.papel]}
    >
      <div className="mb-5 mt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">O meu perfil</h1>
        <p className="text-sm text-ink-2">A sua conta no Maputo Renova</p>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="card-ico">
              <Icone nome="users" />
            </span>
            <h2 className="text-base font-extrabold">Perfil</h2>
          </div>
          <FormFoto fotoUrl={fotoUrl} iniciais={iniciais} />
          <FormNome
            nome={perfil.nome}
            apelido={perfil.apelido ?? ""}
            email={user?.email ?? ""}
            mensagemEmail={EMAIL_LOCK[perfil.papel]}
          />
        </div>
        <div className="grid gap-4">
          <div className="card">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="card-ico">
                <Icone nome="key" />
              </span>
              <h2 className="text-base font-extrabold">Password</h2>
            </div>
            <FormPassword email={user?.email ?? ""} />
          </div>
          <div className="card">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="card-ico">
                <Icone nome="shield" />
              </span>
              <h2 className="text-base font-extrabold">Verificação em dois passos</h2>
            </div>
            <FormMfa />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

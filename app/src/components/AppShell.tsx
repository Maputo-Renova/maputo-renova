import { Marca } from "@/components/Marca";
import { NavLateral, type ItemNav } from "@/components/NavLateral";
import { sair } from "@/app/actions/sair";
import type { Perfil } from "@/lib/perfil";

export function AppShell({
  perfil,
  sub,
  itens,
  children,
}: {
  perfil: Perfil;
  sub: string;
  itens: ItemNav[];
  children: React.ReactNode;
}) {
  const iniciais = perfil.nome
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="hidden flex-col gap-1.5 border-r border-line bg-card px-4 pb-4 pt-5 md:flex">
        <div className="px-2 pb-4">
          <Marca sub={sub} />
        </div>
        <NavLateral itens={itens} />
        <form action={sair} className="mt-auto border-t border-line-soft pt-3">
          <button className="nav-item w-full text-left">Terminar sessão</button>
        </form>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line/60 bg-bg/85 px-5 py-3.5 backdrop-blur md:px-8">
          <div className="md:hidden">
            <Marca />
          </div>
          <span className="ml-auto flex items-center gap-2.5 rounded-full border border-line bg-card py-1.5 pl-1.5 pr-4">
            <span className="grid size-8 place-items-center rounded-full bg-green-150 text-[12.5px] font-extrabold text-green-800">
              {iniciais}
            </span>
            <span className="text-[13px] font-bold">{perfil.nome}</span>
          </span>
        </header>
        <main className="mx-auto w-full max-w-290 px-5 pb-12 pt-4 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

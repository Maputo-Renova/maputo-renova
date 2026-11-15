"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

const semSubscricao = () => () => {};
import { Marca } from "@/components/Marca";
import { NavLateral, type ItemNav } from "@/components/NavLateral";

export function MenuMobile({
  itens,
  sub,
  children,
}: {
  itens: ItemNav[];
  sub: string;
  children?: React.ReactNode; // rodapé (terminar sessão)
}) {
  const pathname = usePathname();
  // guarda o pathname no momento da abertura: ao navegar, o pathname muda e
  // "aberto" passa a falso por derivação — fecha sozinho, sem efeitos
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === pathname;
  const setAberto = (v: boolean) => setAbertoEm(v ? pathname : null);
  // só renderiza o portal no cliente
  const montado = useSyncExternalStore(semSubscricao, () => true, () => false);

  // trava o scroll de fundo enquanto aberto (sincronização com o DOM)
  useEffect(() => {
    document.body.style.overflow = aberto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  return (
    <div className="md:hidden">
      <button
        aria-label="Abrir menu"
        aria-expanded={aberto}
        onClick={() => setAberto(true)}
        className="grid size-10 place-items-center rounded-[10px] border border-line bg-card"
      >
        <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {/* portal para o body: o backdrop-blur do header criaria um containing
          block e prenderia o position:fixed à altura do header */}
      {aberto && montado ? (
        createPortal(
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-ink/35"
            onClick={() => setAberto(false)}
            aria-hidden
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col gap-1.5 overflow-y-auto bg-card px-4 pb-4 pt-5 shadow-2xl"
            aria-label="Menu"
          >
            <div className="flex items-start justify-between px-2 pb-4">
              <Marca sub={sub} />
              <button
                aria-label="Fechar menu"
                onClick={() => setAberto(false)}
                className="grid size-9 place-items-center rounded-[10px] text-ink-2"
              >
                <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <NavLateral itens={itens} />
            <div className="mt-auto border-t border-line-soft pt-3">{children}</div>
          </aside>
        </div>,
        document.body,
        )
      ) : null}
    </div>
  );
}

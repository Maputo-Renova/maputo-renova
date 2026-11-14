"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ItemNav = { href: string; rotulo: string };

export function NavLateral({ itens }: { itens: ItemNav[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu" className="grid gap-1.5">
      <div className="px-2.5 pb-1 pt-3 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-3">
        Menu
      </div>
      {itens.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className="nav-item"
          aria-current={pathname === i.href ? "page" : undefined}
        >
          {i.rotulo}
        </Link>
      ))}
    </nav>
  );
}

import type { ItemNav } from "@/components/NavLateral";

export const NAV_GESTOR: ItemNav[] = [
  { href: "/gestor", rotulo: "Painel" },
  { href: "/gestor/pagamentos", rotulo: "Pagamentos" },
];

export const NAV_MORADOR: ItemNav[] = [
  { href: "/morador", rotulo: "A minha quota" },
  { href: "/morador/faturas", rotulo: "Faturas" },
];

export const NAV_CONSOLA: ItemNav[] = [
  { href: "/consola", rotulo: "Visão geral" },
  { href: "/consola/condominios", rotulo: "Condomínios" },
  { href: "/consola/gestores", rotulo: "Gestores" },
  { href: "/consola/configuracao", rotulo: "Configuração" },
];

export const NAV_AGENTE: ItemNav[] = [{ href: "/agente", rotulo: "Cadastro" }];

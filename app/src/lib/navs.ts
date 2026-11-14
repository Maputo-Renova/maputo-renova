import type { ItemNav } from "@/components/NavLateral";
import type { Papel } from "@/lib/perfil";

/* Navegação por papel — ícones e ordem do protótipo aprovado. */

export const NAV_GESTOR: ItemNav[] = [
  { href: "/gestor", rotulo: "Painel", icone: "grid" },
  { href: "/gestor/pagamentos", rotulo: "Pagamentos", icone: "bank" },
  { href: "/gestor/tesouraria", rotulo: "Tesouraria", icone: "wallet" },
  { href: "/gestor/suporte", rotulo: "Suporte", icone: "mail" },
  { href: "/gestor/avisos", rotulo: "Avisos", icone: "bell" },
  { href: "/perfil", rotulo: "O meu perfil", icone: "settings" },
];

export const NAV_MORADOR: ItemNav[] = [
  { href: "/morador", rotulo: "A minha quota", icone: "home" },
  { href: "/morador/flat", rotulo: "A minha flat", icone: "flats" },
  { href: "/morador/faturas", rotulo: "Faturas", icone: "receipt" },
  { href: "/morador/suporte", rotulo: "Suporte", icone: "mail" },
  { href: "/morador/avisos", rotulo: "Avisos", icone: "bell" },
  { href: "/perfil", rotulo: "O meu perfil", icone: "settings" },
];

export const NAV_CONSOLA: ItemNav[] = [
  { href: "/consola", rotulo: "Visão geral", icone: "grid" },
  { href: "/consola/condominios", rotulo: "Condomínios", icone: "building" },
  { href: "/consola/colaboradores", rotulo: "Colaboradores", icone: "users" },
  { href: "/consola/repasses", rotulo: "Repasses", icone: "bank" },
  { href: "/consola/configuracao", rotulo: "Configuração", icone: "settings" },
  { href: "/perfil", rotulo: "O meu perfil", icone: "users" },
];

export const NAV_AGENTE: ItemNav[] = [
  { href: "/agente", rotulo: "Cadastro", icone: "plus" },
  { href: "/perfil", rotulo: "O meu perfil", icone: "settings" },
];

export const NAV_POR_PAPEL: Record<Papel, ItemNav[]> = {
  super_admin: NAV_CONSOLA,
  gestor: NAV_GESTOR,
  proprietario: NAV_MORADOR,
  colaborador: NAV_AGENTE,
};

export const SUB_POR_PAPEL: Record<Papel, string> = {
  super_admin: "Super administração",
  gestor: "Gestão do condomínio",
  proprietario: "Proprietário",
  colaborador: "Cadastro de condomínios",
};

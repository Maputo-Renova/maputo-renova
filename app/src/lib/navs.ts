import type { ItemNav } from "@/components/NavLateral";
import type { Papel } from "@/lib/perfil";

export const NAV_GESTOR: ItemNav[] = [
  { href: "/gestor", rotulo: "Painel" },
  { href: "/gestor/pagamentos", rotulo: "Pagamentos" },
  { href: "/gestor/tesouraria", rotulo: "Tesouraria" },
  { href: "/gestor/suporte", rotulo: "Suporte" },
  { href: "/gestor/avisos", rotulo: "Avisos" },
  { href: "/perfil", rotulo: "O meu perfil" },
];

export const NAV_MORADOR: ItemNav[] = [
  { href: "/morador", rotulo: "A minha quota" },
  { href: "/morador/flat", rotulo: "A minha flat" },
  { href: "/morador/faturas", rotulo: "Faturas" },
  { href: "/morador/suporte", rotulo: "Suporte" },
  { href: "/morador/avisos", rotulo: "Avisos" },
  { href: "/perfil", rotulo: "O meu perfil" },
];

export const NAV_CONSOLA: ItemNav[] = [
  { href: "/consola", rotulo: "Visão geral" },
  { href: "/consola/condominios", rotulo: "Condomínios" },
  { href: "/consola/colaboradores", rotulo: "Colaboradores" },
  { href: "/consola/repasses", rotulo: "Repasses" },
  { href: "/consola/configuracao", rotulo: "Configuração" },
  { href: "/perfil", rotulo: "O meu perfil" },
];

export const NAV_AGENTE: ItemNav[] = [
  { href: "/agente", rotulo: "Cadastro" },
  { href: "/perfil", rotulo: "O meu perfil" },
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

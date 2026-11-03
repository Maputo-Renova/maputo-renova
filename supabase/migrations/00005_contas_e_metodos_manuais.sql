-- Contas bancárias da plataforma (recebimentos e repasses) e
-- métodos de pagamento manuais configuráveis pelo super admin.

create table public.contas_plataforma (
  id uuid primary key default gen_random_uuid(),
  banco text not null,
  titular text not null,
  numero_conta text not null,
  nib text,
  finalidade text not null default 'ambos' check (finalidade in ('recebimentos','repasses','ambos')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.metodos_manuais (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  instrucoes text,
  requer_comprovativo boolean not null default true,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.metodos_manuais (nome, instrucoes, requer_comprovativo, activo) values
  ('Transferência bancária', 'Transferir com a referência da fatura no descritivo e carregar o comprovativo.', true, true);

alter table public.contas_plataforma enable row level security;
alter table public.metodos_manuais enable row level security;

-- Super admin gere tudo
create policy sa_all_contas on public.contas_plataforma
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');
create policy sa_all_metodos_manuais on public.metodos_manuais
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');

-- Utilizadores autenticados (gestor/proprietário) só leem o que está activo:
-- o proprietário precisa da conta de recebimentos para transferir, e dos
-- métodos manuais activos na hora de pagar.
create policy auth_sel_contas_activas on public.contas_plataforma
  for select using (activo and finalidade in ('recebimentos','ambos') and auth.uid() is not null);
create policy auth_sel_metodos_activos on public.metodos_manuais
  for select using (activo and auth.uid() is not null);

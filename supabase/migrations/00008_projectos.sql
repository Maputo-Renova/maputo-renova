-- Projectos (obras do condomínio): criados pelo gestor, aprovados pela
-- consola, acompanhados pelos proprietários. Financiamento pelo fundo do
-- condomínio ou por quota extraordinária cobrada nas faturas.

create type public.estado_projecto as enum ('pendente', 'aprovado', 'rejeitado', 'concluido');

create table public.projectos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios (id),
  nome text not null,
  categoria text not null,
  descricao text,
  orcamento numeric(14,2) not null check (orcamento > 0),
  data_prevista date not null,
  financiamento text not null default 'fundo' check (financiamento in ('fundo', 'quota_extraordinaria')),
  quota_extra numeric(12,2) check (quota_extra > 0),
  gasto numeric(14,2) not null default 0 check (gasto >= 0),
  estado public.estado_projecto not null default 'pendente',
  progresso smallint not null default 0 check (progresso between 0 and 100),
  criado_por uuid references auth.users (id),
  aprovado_por uuid references auth.users (id),
  aprovado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projecto_updates (
  id bigint generated always as identity primary key,
  projecto_id uuid not null references public.projectos (id) on delete cascade,
  texto text not null,
  progresso smallint check (progresso between 0 and 100),
  autor uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- Despesas podem ser ligadas a um projecto (gasto real vs orçamento)
alter table public.despesas add column projecto_id uuid references public.projectos (id);

create trigger trg_touch_projectos before update on public.projectos
  for each row execute function public.fn_touch();

alter table public.projectos enable row level security;
alter table public.projecto_updates enable row level security;

-- Super admin: tudo (inclui aprovar/rejeitar — mudança de estado)
create policy sa_all_projectos on public.projectos
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');
create policy sa_all_proj_updates on public.projecto_updates
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');

-- Gestor: cria (nasce pendente) e lê os do seu condomínio; actualiza
-- progresso/gasto e conclui, mas nunca se auto-aprova (estado 'aprovado'
-- só entra pela consola; a transição é validada na app/Edge Function).
create policy gestor_sel_projectos on public.projectos
  for select using (condominio_id = public.fn_meu_condominio());
create policy gestor_ins_projectos on public.projectos
  for insert with check (condominio_id = public.fn_meu_condominio() and estado = 'pendente');
create policy gestor_upd_projectos on public.projectos
  for update using (condominio_id = public.fn_meu_condominio())
  with check (condominio_id = public.fn_meu_condominio() and estado in ('pendente', 'aprovado', 'concluido'));
create policy gestor_proj_updates on public.projecto_updates
  for all using (
    projecto_id in (select id from public.projectos where condominio_id = public.fn_meu_condominio())
  ) with check (
    projecto_id in (select id from public.projectos where condominio_id = public.fn_meu_condominio())
  );

-- Proprietário: acompanha os projectos aprovados/concluídos do seu condomínio
create policy prop_sel_projectos on public.projectos
  for select using (
    estado in ('aprovado', 'concluido')
    and condominio_id in (select condominio_id from public.flats where id in (select public.fn_meus_flats()))
  );
create policy prop_sel_proj_updates on public.projecto_updates
  for select using (
    projecto_id in (
      select id from public.projectos
      where estado in ('aprovado', 'concluido')
        and condominio_id in (select condominio_id from public.flats where id in (select public.fn_meus_flats()))
    )
  );

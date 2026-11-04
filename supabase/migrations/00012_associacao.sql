-- Modelo de 3 taxas e associação de condomínios:
-- fatura do morador = taxa de condomínio (variável, repassada ao condomínio)
--  + taxa da associação (fixa, 499 MT, fundo de projectos votados em assembleia)
--  + taxa de manutenção (15%, plataforma; operadores/SMS deduzidos dela).
-- Elegibilidade: o condomínio só submete projectos ao fundo e vota na
-- assembleia quando 100% das flats pagaram a taxa da associação do mês;
-- os valores pagos transitam sempre (ninguém perde o que pagou).

alter table public.config_plataforma
  add column taxa_associacao numeric(12,2) not null default 499.00;
comment on column public.config_plataforma.taxa_associacao is
  'Taxa fixa mensal da associação de condomínios, por flat (linha própria na fatura do morador).';

alter table public.faturas
  add column taxa_associacao numeric(12,2) not null default 499.00;
alter table public.pagamentos
  add column valor_associacao numeric(12,2) not null default 0;
comment on column public.pagamentos.valor_associacao is
  'Parte do pagamento destinada ao fundo da associação, gravada no momento da transacção.';

-- Fatura consolidada mensal da associação, por condomínio (prestação de contas
-- ao gestor; liquidada automaticamente pelos pagamentos individuais).
create table public.associacao_mensal (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios (id),
  mes_referencia date not null,
  valor_por_flat numeric(12,2) not null default 499.00,
  flats_total integer not null check (flats_total >= 0),
  flats_pagas integer not null default 0 check (flats_pagas >= 0),
  created_at timestamptz not null default now(),
  constraint uq_assoc_condominio_mes unique (condominio_id, mes_referencia),
  constraint chk_assoc_pagas check (flats_pagas <= flats_total)
);
comment on table public.associacao_mensal is
  'Em dia quando flats_pagas = flats_total: condição para submeter projectos ao fundo da associação e votar na assembleia.';

alter table public.associacao_mensal enable row level security;
create policy sa_all_assoc on public.associacao_mensal
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');
create policy gestor_sel_assoc on public.associacao_mensal
  for select using (condominio_id = public.fn_meu_condominio());
create policy prop_sel_assoc on public.associacao_mensal
  for select using (
    condominio_id in (select condominio_id from public.flats where id in (select public.fn_meus_flats()))
  );

-- Projectos: financiamento pelo fundo da associação, com votação em assembleia
alter table public.projectos drop constraint projectos_financiamento_check;
alter table public.projectos add constraint projectos_financiamento_check
  check (financiamento in ('fundo', 'quota_extraordinaria', 'associacao'));
alter table public.projectos
  add column votos_favor integer not null default 0 check (votos_favor >= 0),
  add column votos_contra integer not null default 0 check (votos_contra >= 0);

-- Despesas: fatura de pagamento anexada é obrigatória
alter table public.despesas alter column comprovativo_path set not null;
comment on column public.despesas.comprovativo_path is
  'Fatura/recibo da despesa (obrigatório) — o extrato do condomínio é verificável pela consola e pelos proprietários.';

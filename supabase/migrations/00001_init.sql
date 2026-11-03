-- =============================================================================
-- Maputo Renova — Migração inicial
-- Schema, papéis, anti-duplicação de flats, tesouraria (razão/repasses) e RLS.
-- Moeda: MZN. Convenção: nomes em português, snake_case.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensões
-- ---------------------------------------------------------------------------
create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.papel as enum ('super_admin', 'colaborador', 'gestor', 'proprietario');
create type public.estado_conta as enum ('activo', 'suspenso');
create type public.estado_fatura as enum ('pendente', 'paga', 'em_atraso', 'cancelada');
create type public.metodo_pagamento as enum ('mpesa', 'emola', 'transferencia');
create type public.estado_pagamento as enum ('iniciado', 'a_confirmar', 'confirmado', 'rejeitado');
create type public.quem_absorve_taxa as enum ('apartamento', 'condominio');
create type public.tipo_movimento as enum ('credito_cobranca', 'taxa_plataforma', 'repasse');
create type public.canal_aviso as enum ('sms', 'email');

-- ---------------------------------------------------------------------------
-- Normalização de texto (base da anti-duplicação)
-- lower + sem acentos + trim + espaços colapsados; null -> ''
-- Wrapper immutable sobre unaccent para poder ser usada em índices.
-- ---------------------------------------------------------------------------
create or replace function public.fn_norm(txt text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(trim(txt), ''))),
    '\s+', ' ', 'g'
  );
$$;

-- ---------------------------------------------------------------------------
-- Configuração global da plataforma (singleton) e taxas por método
-- ---------------------------------------------------------------------------
create table public.config_plataforma (
  id boolean primary key default true check (id), -- força linha única
  taxa_plataforma_pct numeric(5,2) not null default 5.00 check (taxa_plataforma_pct >= 0 and taxa_plataforma_pct <= 100),
  updated_at timestamptz not null default now()
);
insert into public.config_plataforma (id) values (true);

create table public.taxas_metodos (
  metodo public.metodo_pagamento primary key,
  percentagem numeric(5,2) not null default 0 check (percentagem >= 0 and percentagem <= 100),
  valor_fixo numeric(12,2) not null default 0 check (valor_fixo >= 0),
  activo boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.taxas_metodos (metodo, percentagem, valor_fixo, activo) values
  ('mpesa', 0, 0, true),
  ('emola', 0, 0, false),          -- activa quando o contrato Movitel sair
  ('transferencia', 0, 0, true);

-- ---------------------------------------------------------------------------
-- Condomínios
-- ---------------------------------------------------------------------------
create table public.condominios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  endereco text not null,
  cidade text not null default 'Maputo',
  dia_vencimento smallint not null default 5 check (dia_vencimento between 1 and 28),
  quota_padrao numeric(12,2) not null check (quota_padrao > 0),
  -- override da % da plataforma (null = usa config_plataforma)
  taxa_plataforma_pct numeric(5,2) check (taxa_plataforma_pct >= 0 and taxa_plataforma_pct <= 100),
  -- quem absorve a taxa do operador (decisão por condomínio; padrão: apartamento)
  taxa_operador_absorvida_por public.quem_absorve_taxa not null default 'apartamento',
  -- dados bancários para transferências dos proprietários e repasses
  banco_nome text,
  banco_conta text,
  banco_nib text,
  estado public.estado_conta not null default 'activo',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uq_condominios_nome_endereco
  on public.condominios (public.fn_norm(nome), public.fn_norm(endereco));

-- ---------------------------------------------------------------------------
-- Perfis (espelha auth.users; papel + vínculo + estado)
-- ---------------------------------------------------------------------------
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  telefone text,
  papel public.papel not null,
  estado public.estado_conta not null default 'activo',
  condominio_id uuid references public.condominios (id), -- para gestor
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- coerência papel/vínculo
  constraint chk_vinculo_gestor check (papel <> 'gestor' or condominio_id is not null)
);

-- Helpers de RLS -------------------------------------------------------------
-- security definer para poderem ler perfis sem recursão nas policies.
create or replace function public.fn_meu_papel()
returns public.papel
language sql stable security definer
set search_path = ''
as $$
  select papel from public.perfis
  where id = auth.uid() and estado = 'activo';
$$;

create or replace function public.fn_meu_condominio()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select condominio_id from public.perfis
  where id = auth.uid() and estado = 'activo' and papel = 'gestor';
$$;

-- ---------------------------------------------------------------------------
-- Flats — registo em nome do PROPRIETÁRIO, com anti-duplicação em 2 camadas
-- ---------------------------------------------------------------------------
create table public.flats (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios (id),
  bloco text,
  andar text,
  numero text not null,
  quota_mensal numeric(12,2) check (quota_mensal > 0), -- null = usa quota_padrao do condomínio
  -- proprietário (titular da flat e da conta)
  proprietario_nome text not null,
  proprietario_documento text,
  proprietario_telefone text not null,
  proprietario_email text,
  -- registo único por flat
  codigo_convite uuid not null unique default gen_random_uuid(),
  convite_expira_em timestamptz not null default now() + interval '30 days',
  perfil_proprietario_id uuid unique references public.perfis (id), -- preenchido ao consumir o convite
  -- anti-duplicação camada 2: fingerprint proprietário+flat+endereço (via trigger)
  fingerprint text not null,
  estado public.estado_conta not null default 'activo',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Camada 1: identidade física única por condomínio (normalizada)
create unique index uq_flats_identidade
  on public.flats (condominio_id, public.fn_norm(bloco), public.fn_norm(andar), public.fn_norm(numero));

-- Camada 2: fingerprint único (proprietário + flat + endereço do condomínio)
create unique index uq_flats_fingerprint on public.flats (fingerprint);

create or replace function public.fn_flat_fingerprint()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_endereco text;
begin
  select public.fn_norm(c.endereco) into v_endereco
  from public.condominios c
  where c.id = new.condominio_id;

  new.fingerprint := md5(
    public.fn_norm(new.proprietario_nome) || '|' ||
    public.fn_norm(new.bloco) || '|' ||
    public.fn_norm(new.andar) || '|' ||
    public.fn_norm(new.numero) || '|' ||
    coalesce(v_endereco, '')
  );
  return new;
end;
$$;

create trigger trg_flats_fingerprint
  before insert or update of proprietario_nome, bloco, andar, numero, condominio_id
  on public.flats
  for each row execute function public.fn_flat_fingerprint();

-- Helper RLS: flats do proprietário autenticado
create or replace function public.fn_meus_flats()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select f.id from public.flats f
  join public.perfis p on p.id = f.perfil_proprietario_id
  where p.id = auth.uid() and p.estado = 'activo';
$$;

-- ---------------------------------------------------------------------------
-- Faturas (mensalidades)
-- ---------------------------------------------------------------------------
create sequence public.seq_ref_fatura;

create table public.faturas (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references public.flats (id),
  condominio_id uuid not null references public.condominios (id),
  mes_referencia date not null, -- sempre dia 1 do mês
  valor_quota numeric(12,2) not null check (valor_quota > 0),
  estado public.estado_fatura not null default 'pendente',
  referencia text not null unique
    default ('MR-' || to_char(nextval('public.seq_ref_fatura'), 'FM000000')),
  vencimento date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_fatura_flat_mes unique (flat_id, mes_referencia),
  constraint chk_mes_dia1 check (extract(day from mes_referencia) = 1)
);

create index ix_faturas_condominio_estado on public.faturas (condominio_id, estado);

-- ---------------------------------------------------------------------------
-- Pagamentos — grava bruto, taxa do operador e líquido NO MOMENTO da transacção
-- ---------------------------------------------------------------------------
create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  fatura_id uuid not null references public.faturas (id),
  metodo public.metodo_pagamento not null,
  valor_bruto numeric(12,2) not null check (valor_bruto > 0),        -- o que o proprietário pagou
  taxa_operador numeric(12,2) not null default 0 check (taxa_operador >= 0),
  valor_liquido numeric(12,2) not null check (valor_liquido >= 0),   -- bruto - taxa_operador
  taxa_plataforma numeric(12,2) not null default 0 check (taxa_plataforma >= 0), -- % sobre a quota
  estado public.estado_pagamento not null,
  transacao_operador_id text,          -- id M-Pesa/eMola
  msisdn text,                         -- número que pagou
  comprovativo_path text,              -- Storage, para transferências
  confirmado_por uuid references auth.users (id), -- gestor, nas transferências
  confirmado_em timestamptz,
  created_at timestamptz not null default now(),
  constraint chk_liquido check (valor_liquido = valor_bruto - taxa_operador)
);

create index ix_pagamentos_fatura on public.pagamentos (fatura_id);
-- idempotência de webhooks: uma transacção do operador só entra uma vez
create unique index uq_pagamentos_transacao_operador
  on public.pagamentos (metodo, transacao_operador_id)
  where transacao_operador_id is not null;

-- ---------------------------------------------------------------------------
-- Tesouraria: razão por condomínio + repasses
-- ---------------------------------------------------------------------------
create table public.repasses (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios (id),
  valor numeric(12,2) not null check (valor > 0),
  data date not null default current_date,
  comprovativo_path text,
  nota text,
  registado_por uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.movimentos (
  id bigint generated always as identity primary key,
  condominio_id uuid not null references public.condominios (id),
  tipo public.tipo_movimento not null,
  pagamento_id uuid references public.pagamentos (id),
  repasse_id uuid references public.repasses (id),
  -- crédito positivo (cobrança), débitos negativos (taxa da plataforma, repasse)
  valor numeric(12,2) not null,
  created_at timestamptz not null default now(),
  constraint chk_origem check (
    (tipo = 'repasse' and repasse_id is not null) or
    (tipo in ('credito_cobranca', 'taxa_plataforma') and pagamento_id is not null)
  )
);

create index ix_movimentos_condominio on public.movimentos (condominio_id);

-- ---------------------------------------------------------------------------
-- Despesas do condomínio
-- ---------------------------------------------------------------------------
create table public.despesas (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios (id),
  categoria text not null,
  descricao text,
  valor numeric(12,2) not null check (valor > 0),
  data date not null default current_date,
  comprovativo_path text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Avisos e envios (SMS/email, com custo por envio)
-- ---------------------------------------------------------------------------
create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios (id),
  titulo text not null,
  corpo text not null,
  enviado_por uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.envios (
  id bigint generated always as identity primary key,
  aviso_id uuid references public.avisos (id),
  fatura_id uuid references public.faturas (id), -- régua de cobrança
  flat_id uuid references public.flats (id),
  canal public.canal_aviso not null,
  destinatario text not null,
  estado text not null default 'enviado', -- enviado | entregue | falhou
  custo numeric(12,4) not null default 0,
  created_at timestamptz not null default now()
);

create index ix_envios_fatura on public.envios (fatura_id);

-- ---------------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------------
create table public.auditoria (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id),
  acao text not null,            -- ex.: 'colaborador.suspender', 'flat.criar'
  entidade text not null,        -- nome da tabela/entidade
  entidade_id text,
  detalhes jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.fn_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_touch_condominios before update on public.condominios
  for each row execute function public.fn_touch();
create trigger trg_touch_perfis before update on public.perfis
  for each row execute function public.fn_touch();
create trigger trg_touch_flats before update on public.flats
  for each row execute function public.fn_touch();
create trigger trg_touch_faturas before update on public.faturas
  for each row execute function public.fn_touch();

-- =============================================================================
-- ROW LEVEL SECURITY
-- Isolamento: super_admin tudo; colaborador cadastra sem ver finanças;
-- gestor só o seu condomínio; proprietário só a sua flat.
-- Escritas financeiras sensíveis (pagamentos confirmados, movimentos, repasses)
-- são feitas por Edge Functions com service_role — não há policy de INSERT
-- para elas além das indicadas.
-- =============================================================================
alter table public.config_plataforma enable row level security;
alter table public.taxas_metodos     enable row level security;
alter table public.condominios       enable row level security;
alter table public.perfis            enable row level security;
alter table public.flats             enable row level security;
alter table public.faturas           enable row level security;
alter table public.pagamentos        enable row level security;
alter table public.repasses          enable row level security;
alter table public.movimentos        enable row level security;
alter table public.despesas          enable row level security;
alter table public.avisos            enable row level security;
alter table public.envios            enable row level security;
alter table public.auditoria         enable row level security;

-- Super admin: acesso total ---------------------------------------------------
create policy sa_all_config on public.config_plataforma
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');
create policy sa_all_taxas on public.taxas_metodos
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');
create policy sa_all_condominios on public.condominios
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');
create policy sa_all_perfis on public.perfis
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');
create policy sa_all_flats on public.flats
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');
create policy sa_all_faturas on public.faturas
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');
create policy sa_all_pagamentos on public.pagamentos
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');
create policy sa_all_repasses on public.repasses
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');
create policy sa_all_movimentos on public.movimentos
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');
create policy sa_all_despesas on public.despesas
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');
create policy sa_all_avisos on public.avisos
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');
create policy sa_all_envios on public.envios
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');
create policy sa_all_auditoria on public.auditoria
  for all using (public.fn_meu_papel() = 'super_admin') with check (public.fn_meu_papel() = 'super_admin');

-- Todos os autenticados: ler o próprio perfil ---------------------------------
create policy perfil_proprio on public.perfis
  for select using (id = auth.uid());

-- Colaborador: cadastro, sem finanças -----------------------------------------
create policy colab_sel_condominios on public.condominios
  for select using (public.fn_meu_papel() = 'colaborador');
create policy colab_ins_condominios on public.condominios
  for insert with check (public.fn_meu_papel() = 'colaborador');
create policy colab_sel_flats on public.flats
  for select using (public.fn_meu_papel() = 'colaborador');
create policy colab_ins_flats on public.flats
  for insert with check (public.fn_meu_papel() = 'colaborador');
-- (sem UPDATE/DELETE: correcções de cadastro passam pelo super admin; sem acesso
--  a faturas, pagamentos, movimentos, repasses ou despesas)

-- Gestor: apenas o seu condomínio ---------------------------------------------
create policy gestor_sel_condominio on public.condominios
  for select using (id = public.fn_meu_condominio());
create policy gestor_sel_flats on public.flats
  for select using (condominio_id = public.fn_meu_condominio());
create policy gestor_sel_faturas on public.faturas
  for select using (condominio_id = public.fn_meu_condominio());
create policy gestor_upd_faturas on public.faturas
  for update using (condominio_id = public.fn_meu_condominio())
  with check (condominio_id = public.fn_meu_condominio());
create policy gestor_sel_pagamentos on public.pagamentos
  for select using (
    fatura_id in (select id from public.faturas where condominio_id = public.fn_meu_condominio())
  );
-- confirmar/rejeitar transferências bancárias (a_confirmar -> confirmado/rejeitado
-- é validada na app/Edge Function; aqui restringe-se ao método e ao condomínio)
create policy gestor_upd_transferencias on public.pagamentos
  for update using (
    metodo = 'transferencia'
    and fatura_id in (select id from public.faturas where condominio_id = public.fn_meu_condominio())
  )
  with check (
    metodo = 'transferencia'
    and fatura_id in (select id from public.faturas where condominio_id = public.fn_meu_condominio())
  );
create policy gestor_sel_movimentos on public.movimentos
  for select using (condominio_id = public.fn_meu_condominio());
create policy gestor_sel_repasses on public.repasses
  for select using (condominio_id = public.fn_meu_condominio());
create policy gestor_despesas on public.despesas
  for all using (condominio_id = public.fn_meu_condominio())
  with check (condominio_id = public.fn_meu_condominio());
create policy gestor_avisos on public.avisos
  for all using (condominio_id = public.fn_meu_condominio())
  with check (condominio_id = public.fn_meu_condominio());
create policy gestor_sel_envios on public.envios
  for select using (
    flat_id in (select id from public.flats where condominio_id = public.fn_meu_condominio())
  );

-- Proprietário: apenas a sua flat ---------------------------------------------
create policy prop_sel_flat on public.flats
  for select using (id in (select public.fn_meus_flats()));
create policy prop_sel_condominio on public.condominios
  for select using (
    id in (select condominio_id from public.flats where id in (select public.fn_meus_flats()))
  );
create policy prop_sel_faturas on public.faturas
  for select using (flat_id in (select public.fn_meus_flats()));
create policy prop_sel_pagamentos on public.pagamentos
  for select using (
    fatura_id in (select id from public.faturas where flat_id in (select public.fn_meus_flats()))
  );
-- iniciar pagamento: só nas suas faturas; estados iniciais apenas
create policy prop_ins_pagamentos on public.pagamentos
  for insert with check (
    fatura_id in (select id from public.faturas where flat_id in (select public.fn_meus_flats()))
    and estado in ('iniciado', 'a_confirmar')
    and confirmado_por is null
  );
create policy prop_sel_avisos on public.avisos
  for select using (
    condominio_id in (select condominio_id from public.flats where id in (select public.fn_meus_flats()))
  );

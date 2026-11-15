-- Fase 3 — pagamentos móveis (M-Pesa / eMola): registo de transacções do
-- payment-worker. O worker corre numa VPS com IP fixo (os gateways validam o
-- IP de origem) e escreve aqui com a service role; nenhum papel da app lê ou
-- escreve directamente nesta tabela — a app vê o resultado via `pagamentos`,
-- que o worker regista quando a transacção é SUCCESS.
--
-- Máquina de estados: PENDING → PROCESSING → SUCCESS | FAILED | UNKNOWN.
-- UNKNOWN (timeout, resposta sem código) é resolvido pelo job de
-- reconciliação do worker, que consulta o gateway — nunca se assume sucesso.

create type public.estado_transaccao_movel as enum
  ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'UNKNOWN', 'REFUNDED');

create table public.transaccoes_moveis (
  id              uuid primary key default gen_random_uuid(),
  trans_id        text not null unique,          -- id enviado ao gateway; nunca reutilizar
  provedor        public.metodo_pagamento not null check (provedor in ('mpesa', 'emola')),
  tipo            text not null default 'C2B' check (tipo in ('C2B', 'B2C')),
  referencia      text not null,                 -- refNo / referência da fatura
  fatura_id       uuid references public.faturas (id),
  msisdn          text not null,
  valor           numeric(12,2) not null check (valor > 0),
  estado          public.estado_transaccao_movel not null default 'PENDING',
  codigo          text,                          -- EMOLA-0, EMOLA-11, INS-0, INS-2006…
  mensagem        text,
  id_operador     text,                          -- gwtransid (eMola) / TransactionID (M-Pesa)
  request_id      text,                          -- reqeustId (eMola) / ConversationID (M-Pesa)
  tentativas      int not null default 0,
  consultado_em   timestamptz,
  resposta_bruta  text,                          -- diagnóstico; sem credenciais (o worker mascara)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index ix_transaccoes_moveis_estado on public.transaccoes_moveis (estado, created_at);
create index ix_transaccoes_moveis_referencia on public.transaccoes_moveis (referencia);
create index ix_transaccoes_moveis_fatura on public.transaccoes_moveis (fatura_id)
  where fatura_id is not null;

-- RLS ligado SEM políticas: só a service role (worker) acede.
alter table public.transaccoes_moveis enable row level security;
revoke all on public.transaccoes_moveis from anon, authenticated;

-- updated_at automático
create or replace function public.fn_tg_transaccoes_moveis_updated()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.fn_tg_transaccoes_moveis_updated() from public, anon, authenticated;

create trigger tg_transaccoes_moveis_updated
  before update on public.transaccoes_moveis
  for each row execute function public.fn_tg_transaccoes_moveis_updated();

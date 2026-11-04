-- Aceitação de Termos e Condições com prova de data e autor:
-- no registo da conta (perfis) e no cadastro do condomínio.

alter table public.perfis add column termos_aceites_em timestamptz;
alter table public.condominios
  add column termos_aceites_em timestamptz,
  add column termos_aceites_por uuid references auth.users (id);

comment on column public.perfis.termos_aceites_em is
  'Momento em que o utilizador aceitou os Termos e Condições ao criar a conta (obrigatório no fluxo de registo).';
comment on column public.condominios.termos_aceites_em is
  'Momento da aceitação dos Termos e do contrato de serviço no cadastro do condomínio.';
comment on column public.condominios.termos_aceites_por is
  'Quem declarou a aceitação no cadastro (consola ou agente).';

-- Modelo de taxas: o morador paga quota + TAXA DE MANUTENÇÃO (15% padrão),
-- a única taxa visível para ele. Taxas de operadores, SMS e demais custos
-- são deduzidos da manutenção; o condomínio recebe a quota por inteiro.

alter table public.config_plataforma rename column taxa_plataforma_pct to taxa_manutencao_pct;
alter table public.config_plataforma alter column taxa_manutencao_pct set default 15.00;
update public.config_plataforma set taxa_manutencao_pct = 15.00;

alter table public.condominios rename column taxa_plataforma_pct to taxa_manutencao_pct;
alter table public.condominios drop column taxa_operador_absorvida_por;
drop type public.quem_absorve_taxa;

alter table public.pagamentos rename column taxa_plataforma to taxa_manutencao;

comment on column public.config_plataforma.taxa_manutencao_pct is
  'Taxa de manutenção cobrada ao apartamento sobre a quota (única taxa visível ao morador); operadores/SMS são deduzidos dela.';
comment on column public.condominios.taxa_manutencao_pct is
  'Override da taxa de manutenção para este condomínio (null = padrão da plataforma).';
comment on column public.pagamentos.taxa_manutencao is
  'Valor da manutenção cobrado neste pagamento, gravado no momento da transacção.';
comment on type public.tipo_movimento is
  'taxa_plataforma mantém-se por compatibilidade histórica; no modelo actual o condomínio recebe a quota por inteiro.';

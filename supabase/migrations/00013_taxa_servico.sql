-- Renomear "taxa de manutenção" para "taxa de serviço" (mesma semântica:
-- 15% sobre a quota, receita da plataforma; operadores/SMS deduzidos dela).

alter table public.config_plataforma rename column taxa_manutencao_pct to taxa_servico_pct;
alter table public.condominios rename column taxa_manutencao_pct to taxa_servico_pct;
alter table public.pagamentos rename column taxa_manutencao to taxa_servico;

comment on column public.config_plataforma.taxa_servico_pct is
  'Taxa de serviço cobrada ao apartamento sobre a quota (linha própria na fatura); operadores/SMS são deduzidos dela.';
comment on column public.condominios.taxa_servico_pct is
  'Override da taxa de serviço para este condomínio (null = padrão da plataforma).';
comment on column public.pagamentos.taxa_servico is
  'Valor da taxa de serviço cobrado neste pagamento, gravado no momento da transacção.';

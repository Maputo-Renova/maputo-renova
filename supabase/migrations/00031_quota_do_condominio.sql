-- Decisão do cliente (17 Nov 2026): as quotas são definidas pelo CONDOMÍNIO,
-- não pelas flats. A quota por flat (flats.quota_mensal, herdada do desenho
-- inicial) sai do esquema; a faturação passa a usar exclusivamente a
-- quota_padrao do condomínio. Verificado em produção antes de remover:
-- a única flat com quota própria era demo e tinha o mesmo valor do padrão.

create or replace function public.fn_gerar_faturas(p_mes date default (date_trunc('month', now()))::date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mes date := (date_trunc('month', p_mes))::date;
  v_count integer := 0;
begin
  insert into public.faturas (flat_id, condominio_id, mes_referencia, valor_quota, vencimento, taxa_associacao)
  select f.id,
         f.condominio_id,
         v_mes,
         c.quota_padrao,
         v_mes + (c.dia_vencimento - 1),
         (select cp.taxa_associacao from public.config_plataforma cp limit 1)
  from public.flats f
  join public.condominios c on c.id = f.condominio_id
  where f.estado = 'activo' and c.estado = 'activo'
  on conflict (flat_id, mes_referencia) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

alter table public.flats drop column quota_mensal;

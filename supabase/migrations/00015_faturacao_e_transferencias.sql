-- Facturação mensal automática, atrasos, comprovativos no Storage e
-- confirmação/rejeição de transferências pelo gestor.

-- 1) Gerar as faturas do mês (idempotente: uma por flat+mês)
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
         coalesce(f.quota_mensal, c.quota_padrao),
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

-- 2) Marcar atrasos (faturas pendentes com vencimento passado)
create or replace function public.fn_marcar_atrasos()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_count integer := 0;
begin
  update public.faturas
  set estado = 'em_atraso'
  where estado = 'pendente' and vencimento < current_date;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.fn_gerar_faturas(date) from public, anon;
revoke execute on function public.fn_marcar_atrasos() from public, anon;
grant execute on function public.fn_gerar_faturas(date) to authenticated;
grant execute on function public.fn_marcar_atrasos() to authenticated;

-- 3) Agendamento automático (pg_cron): faturas no dia 1 às 06h, atrasos todos os dias às 05h
create extension if not exists pg_cron;
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'maputo_renova_gerar_faturas') then
    perform cron.schedule('maputo_renova_gerar_faturas', '0 6 1 * *',
      'select public.fn_gerar_faturas();');
  end if;
  if not exists (select 1 from cron.job where jobname = 'maputo_renova_marcar_atrasos') then
    perform cron.schedule('maputo_renova_marcar_atrasos', '0 5 * * *',
      'select public.fn_marcar_atrasos();');
  end if;
end $$;

-- 4) Storage: bucket privado para comprovativos (transferências e despesas)
insert into storage.buckets (id, name, public)
values ('comprovativos', 'comprovativos', false)
on conflict (id) do nothing;

create policy "comprovativos: dono envia"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'comprovativos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "comprovativos: dono, gestor e consola leem"
on storage.objects for select to authenticated
using (
  bucket_id = 'comprovativos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.fn_meu_papel() in ('gestor', 'super_admin')
  )
);

-- 5) Confirmar/rejeitar transferência (transaccional, só gestor do condomínio ou consola)
create or replace function public.fn_confirmar_transferencia(p_pagamento uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pag public.pagamentos%rowtype;
  v_fat public.faturas%rowtype;
begin
  select * into v_pag from public.pagamentos where id = p_pagamento for update;
  if not found or v_pag.estado <> 'a_confirmar' or v_pag.metodo <> 'transferencia' then
    raise exception 'Pagamento não está à espera de confirmação.';
  end if;
  select * into v_fat from public.faturas where id = v_pag.fatura_id for update;
  if public.fn_meu_papel() = 'gestor' then
    if v_fat.condominio_id is distinct from public.fn_meu_condominio() then
      raise exception 'Sem permissão para este condomínio.';
    end if;
  elsif public.fn_meu_papel() is distinct from 'super_admin' then
    raise exception 'Apenas o gestor ou a consola podem confirmar.';
  end if;

  update public.pagamentos
  set estado = 'confirmado', confirmado_por = auth.uid(), confirmado_em = now()
  where id = v_pag.id;

  update public.faturas set estado = 'paga' where id = v_fat.id;

  insert into public.movimentos (condominio_id, tipo, pagamento_id, valor)
  values (v_fat.condominio_id, 'credito_cobranca', v_pag.id, v_fat.valor_quota);
end;
$$;

create or replace function public.fn_rejeitar_transferencia(p_pagamento uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pag public.pagamentos%rowtype;
  v_fat public.faturas%rowtype;
begin
  select * into v_pag from public.pagamentos where id = p_pagamento for update;
  if not found or v_pag.estado <> 'a_confirmar' or v_pag.metodo <> 'transferencia' then
    raise exception 'Pagamento não está à espera de confirmação.';
  end if;
  select * into v_fat from public.faturas where id = v_pag.fatura_id;
  if public.fn_meu_papel() = 'gestor' then
    if v_fat.condominio_id is distinct from public.fn_meu_condominio() then
      raise exception 'Sem permissão para este condomínio.';
    end if;
  elsif public.fn_meu_papel() is distinct from 'super_admin' then
    raise exception 'Apenas o gestor ou a consola podem rejeitar.';
  end if;

  update public.pagamentos set estado = 'rejeitado', confirmado_por = auth.uid(), confirmado_em = now()
  where id = v_pag.id;
end;
$$;

revoke execute on function public.fn_confirmar_transferencia(uuid) from public, anon;
revoke execute on function public.fn_rejeitar_transferencia(uuid) from public, anon;
grant execute on function public.fn_confirmar_transferencia(uuid) to authenticated;
grant execute on function public.fn_rejeitar_transferencia(uuid) to authenticated;

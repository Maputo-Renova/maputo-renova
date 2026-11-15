-- Fase 5 — monitorização operacional + correcções dos advisors de performance.
--
-- 1) Correcção funcional: o morador precisa de saber que métodos digitais
--    estão activos para a UI de pagamento móvel — taxas_metodos só tinha
--    política para o super admin (a lista chegava vazia aos restantes papéis).
-- 2) Advisor auth_rls_initplan: auth.uid() embrulhado em (select ...) nas 4
--    políticas sinalizadas, para ser avaliado uma vez por consulta e não por
--    linha.
-- 3) Advisor unindexed_foreign_keys: índices nos FKs usados pelas consultas
--    da app (filtros por condomínio, joins de projecto/pagamento/fila).
--    FKs de auditoria/autoria (created_by, confirmado_por, …) ficam sem
--    índice de propósito: nunca são filtrados e penalizariam a escrita.
-- 4) Alerta operacional diário: emails falhados, fila presa e transacções
--    móveis por reconciliar → email aos super admins via a fila existente.

-- 1) morador/gestor leem que métodos digitais estão activos
create policy auth_sel_taxas_activas on public.taxas_metodos
  for select using (activo and (select auth.uid()) is not null);

-- 2) initplan: avaliar auth.uid() uma vez por consulta
alter policy perfil_proprio on public.perfis
  using (id = (select auth.uid()));
alter policy auth_sel_contas_activas on public.contas_plataforma
  using (activo and finalidade in ('recebimentos', 'ambos') and (select auth.uid()) is not null);
alter policy auth_sel_metodos_activos on public.metodos_manuais
  using (activo and (select auth.uid()) is not null);
alter policy prop_ins_tickets on public.tickets
  with check (
    flat_id in (select public.fn_meus_flats())
    and criado_por = (select auth.uid())
    and estado = 'novo'
  );

-- 3) índices nos FKs quentes (consultas da app e relatórios)
create index if not exists ix_avisos_condominio on public.avisos (condominio_id);
create index if not exists ix_convites_condominio on public.convites_acesso (condominio_id);
create index if not exists ix_despesas_condominio on public.despesas (condominio_id);
create index if not exists ix_despesas_projecto on public.despesas (projecto_id) where projecto_id is not null;
create index if not exists ix_envios_aviso on public.envios (aviso_id) where aviso_id is not null;
create index if not exists ix_envios_flat on public.envios (flat_id) where flat_id is not null;
create index if not exists ix_movimentos_pagamento on public.movimentos (pagamento_id) where pagamento_id is not null;
create index if not exists ix_movimentos_repasse on public.movimentos (repasse_id) where repasse_id is not null;
create index if not exists ix_perfis_condominio on public.perfis (condominio_id) where condominio_id is not null;
create index if not exists ix_projecto_updates_projecto on public.projecto_updates (projecto_id);
create index if not exists ix_projectos_condominio on public.projectos (condominio_id);
create index if not exists ix_repasses_condominio on public.repasses (condominio_id);
create index if not exists ix_tickets_flat on public.tickets (flat_id);

-- 4) alerta operacional diário aos super admins
create or replace function public.fn_alerta_operacional()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_falhados integer;
  v_presos integer;
  v_incertos integer;
  v_total integer;
  v_corpo text;
  r record;
begin
  -- emails que falharam nas últimas 24h (Resend/Edge Function)
  select count(*) into v_falhados from public.envios
  where estado = 'falhou' and created_at > now() - interval '24 hours';

  -- fila entupida: pendentes há mais de 2h (cron de envio parado?)
  select count(*) into v_presos from public.envios
  where estado = 'pendente' and created_at < now() - interval '2 hours';

  -- transacções móveis que precisam de atenção (reconciliação não resolveu)
  select count(*) into v_incertos from public.transaccoes_moveis
  where estado = 'UNKNOWN'
     or (estado in ('PENDING', 'PROCESSING') and created_at < now() - interval '30 minutes');

  v_total := v_falhados + v_presos + v_incertos;
  if v_total = 0 then
    return 0;
  end if;

  v_corpo := format(
    'A verificação diária do Maputo Renova encontrou pendências operacionais:<br><br>'
    '&bull; Emails falhados nas últimas 24h: <b>%s</b><br>'
    '&bull; Emails presos na fila há mais de 2h: <b>%s</b><br>'
    '&bull; Transacções móveis por reconciliar: <b>%s</b><br><br>'
    'Detalhes: <a href="https://maputo-renova.vercel.app/consola">consola</a> e, '
    'no Supabase, as tabelas <code>envios</code> e <code>transaccoes_moveis</code>.',
    v_falhados, v_presos, v_incertos);

  for r in
    select u.email
    from public.perfis p
    join auth.users u on u.id = p.id
    where p.papel = 'super_admin' and p.estado = 'activo' and u.email is not null
  loop
    perform public.fn_enfileirar_email(
      'alerta_operacional', r.email,
      format('Maputo Renova — %s pendência(s) operacional(is)', v_total),
      v_corpo);
  end loop;
  return v_total;
end;
$$;

revoke all on function public.fn_alerta_operacional() from public, anon, authenticated;

-- diário às 04:40 UTC (06:40 em Maputo), antes do processamento das 05h
select cron.schedule('maputo_renova_alerta_operacional', '40 4 * * *',
  'select public.fn_alerta_operacional();');

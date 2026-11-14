-- Fase 2: fila de emails (tabela envios), régua de cobrança automática e
-- gatilhos de notificação. O envio físico é feito pela Edge Function
-- `processar-envios` (Resend), chamada por pg_cron via pg_net.

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- envios passa a fila: pendente -> enviado | falhou
-- ---------------------------------------------------------------------------
alter table public.envios
  add column tipo text not null default 'manual',
  add column assunto text,
  add column corpo text,
  add column enviado_em timestamptz,
  add column erro text;

alter table public.envios alter column estado set default 'pendente';

-- dedupe da régua: uma etapa por fatura/canal
create unique index uq_envios_regua
  on public.envios (fatura_id, tipo, canal)
  where fatura_id is not null and tipo like 'regua_%';

-- ---------------------------------------------------------------------------
-- Helper: enfileirar um email (security definer para os triggers sob RLS)
-- ---------------------------------------------------------------------------
create or replace function public.fn_enfileirar_email(
  p_tipo text,
  p_destinatario text,
  p_assunto text,
  p_corpo text,
  p_fatura uuid default null,
  p_flat uuid default null,
  p_aviso uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_destinatario is null or position('@' in p_destinatario) = 0 then
    return;
  end if;
  insert into public.envios (tipo, canal, destinatario, assunto, corpo,
                             fatura_id, flat_id, aviso_id, estado)
  values (p_tipo, 'email', lower(trim(p_destinatario)), p_assunto, p_corpo,
          p_fatura, p_flat, p_aviso, 'pendente')
  on conflict do nothing;
end;
$$;

revoke execute on function public.fn_enfileirar_email(text, text, text, text, uuid, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Régua de cobrança: D-5, D0, D+3, D+7 (corre diariamente; dedupe por etapa)
-- ---------------------------------------------------------------------------
create or replace function public.fn_regua_cobranca()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_pct numeric;
  v_total numeric;
  v_etapa text;
  v_assunto text;
  v_corpo text;
  v_n integer := 0;
begin
  for r in
    select f.id as fatura_id, f.referencia, f.vencimento, f.valor_quota,
           f.taxa_associacao, f.estado,
           fl.id as flat_id, fl.numero, fl.proprietario_email, fl.proprietario_nome,
           c.nome as condominio, coalesce(c.taxa_servico_pct, cfg.taxa_servico_pct) as pct
    from public.faturas f
    join public.flats fl on fl.id = f.flat_id
    join public.condominios c on c.id = f.condominio_id
    cross join public.config_plataforma cfg
    where f.estado in ('pendente', 'em_atraso')
      and fl.proprietario_email is not null
      and current_date in (f.vencimento - 5, f.vencimento,
                           f.vencimento + 3, f.vencimento + 7)
  loop
    v_etapa := case current_date
      when r.vencimento - 5 then 'regua_d5'
      when r.vencimento then 'regua_d0'
      when r.vencimento + 3 then 'regua_d3'
      else 'regua_d7' end;
    v_total := r.valor_quota + round(r.valor_quota * r.pct / 100, 2) + r.taxa_associacao;
    v_assunto := case v_etapa
      when 'regua_d5' then format('A sua quota do %s vence a %s', r.condominio, to_char(r.vencimento, 'DD/MM'))
      when 'regua_d0' then format('A sua quota do %s vence hoje', r.condominio)
      else format('Quota em atraso — %s', r.condominio) end;
    v_corpo := format(
      'Olá %s,<br><br>A fatura <b>%s</b> da Flat %s (%s), no valor de <b>%s MT</b>, %s.<br><br>'
      'Pode pagar por transferência bancária na sua conta Maputo Renova e carregar o comprovativo.<br><br>'
      '<a href="https://maputo-renova.vercel.app/morador/faturas">Ver a fatura e pagar</a>',
      coalesce(r.proprietario_nome, 'proprietário'), r.referencia, r.numero, r.condominio,
      trim(to_char(v_total, 'FM999G999G990')),
      case v_etapa
        when 'regua_d5' then format('vence a %s', to_char(r.vencimento, 'DD/MM/YYYY'))
        when 'regua_d0' then 'vence hoje'
        else format('venceu a %s e encontra-se em atraso', to_char(r.vencimento, 'DD/MM/YYYY')) end);
    perform public.fn_enfileirar_email(v_etapa, r.proprietario_email, v_assunto, v_corpo,
                                       r.fatura_id, r.flat_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

revoke execute on function public.fn_regua_cobranca() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Gatilhos de notificação
-- ---------------------------------------------------------------------------

-- Aviso do gestor -> email a todos os proprietários com email
create or replace function public.fn_tg_aviso_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in
    select fl.id, fl.proprietario_email, fl.proprietario_nome, c.nome as condominio
    from public.flats fl join public.condominios c on c.id = fl.condominio_id
    where fl.condominio_id = new.condominio_id and fl.proprietario_email is not null
  loop
    perform public.fn_enfileirar_email('aviso', r.proprietario_email,
      format('%s — %s', r.condominio, new.titulo),
      format('Olá %s,<br><br>%s<br><br>— Administração do %s',
             coalesce(r.proprietario_nome, 'proprietário'), new.corpo, r.condominio),
      null, r.id, new.id);
  end loop;
  return new;
end;
$$;
create trigger trg_aviso_email after insert on public.avisos
  for each row execute function public.fn_tg_aviso_email();

-- Convite de acesso (gestor/colaborador/admin) -> email com o código
create or replace function public.fn_tg_convite_acesso_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.fn_enfileirar_email('convite_acesso', new.email,
    'O seu acesso ao Maputo Renova',
    format('Olá %s,<br><br>Foi criado o seu acesso de <b>%s</b> ao Maputo Renova.<br><br>'
           'Crie a sua conta em <a href="https://maputo-renova.vercel.app/convite">maputo-renova.vercel.app/convite</a> '
           'com o código de uso único:<br><br><b style="font-size:17px">%s</b><br><br>O código expira a %s.',
           new.nome,
           case new.papel when 'gestor' then 'gestor' when 'super_admin' then 'administrador' else 'agente' end,
           new.codigo, to_char(new.expira_em, 'DD/MM/YYYY')));
  return new;
end;
$$;
create trigger trg_convite_acesso_email after insert on public.convites_acesso
  for each row execute function public.fn_tg_convite_acesso_email();

-- Flat registada -> convite ao proprietário
create or replace function public.fn_tg_convite_flat_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.fn_enfileirar_email('convite_flat', new.proprietario_email,
    'A sua conta Maputo Renova está pronta a criar',
    format('Olá %s,<br><br>A sua flat %s foi registada no Maputo Renova com a referência <b>%s</b>.<br><br>'
           'Crie a sua conta em <a href="https://maputo-renova.vercel.app/convite">maputo-renova.vercel.app/convite</a> '
           'com o código de uso único:<br><br><b style="font-size:17px">%s</b><br><br>O código expira a %s.',
           new.proprietario_nome, new.numero, new.referencia, new.codigo_convite,
           to_char(new.convite_expira_em, 'DD/MM/YYYY')),
    null, new.id);
  return new;
end;
$$;
create trigger trg_convite_flat_email after insert on public.flats
  for each row execute function public.fn_tg_convite_flat_email();

-- Comprovativo submetido -> email ao gestor
create or replace function public.fn_tg_comprovativo_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  if new.estado <> 'a_confirmar' then return new; end if;
  select c.gestor_email, c.nome as condominio, fl.numero, f.referencia, f.id as fatura_id, fl.id as flat_id
    into v
  from public.faturas f
  join public.flats fl on fl.id = f.flat_id
  join public.condominios c on c.id = f.condominio_id
  where f.id = new.fatura_id;
  perform public.fn_enfileirar_email('comprovativo', v.gestor_email,
    format('Comprovativo para confirmar — Flat %s', v.numero),
    format('Entrou um comprovativo de transferência da Flat %s (fatura %s) no %s.<br><br>'
           '<a href="https://maputo-renova.vercel.app/gestor/pagamentos">Abrir a fila de confirmação</a>',
           v.numero, v.referencia, v.condominio),
    v.fatura_id, v.flat_id);
  return new;
end;
$$;
create trigger trg_comprovativo_email after insert on public.pagamentos
  for each row execute function public.fn_tg_comprovativo_email();

-- Pagamento confirmado -> recibo ao proprietário
create or replace function public.fn_tg_pagamento_confirmado_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  if new.estado <> 'confirmado' or old.estado = 'confirmado' then return new; end if;
  select fl.proprietario_email, fl.proprietario_nome, fl.numero, fl.id as flat_id,
         f.referencia, f.id as fatura_id, c.nome as condominio
    into v
  from public.faturas f
  join public.flats fl on fl.id = f.flat_id
  join public.condominios c on c.id = f.condominio_id
  where f.id = new.fatura_id;
  perform public.fn_enfileirar_email('pagamento_confirmado', v.proprietario_email,
    format('Pagamento confirmado — fatura %s', v.referencia),
    format('Olá %s,<br><br>O pagamento de <b>%s MT</b> da fatura %s (Flat %s, %s) foi confirmado. Obrigado!<br><br>'
           '<a href="https://maputo-renova.vercel.app/morador/faturas">Ver as suas faturas</a>',
           coalesce(v.proprietario_nome, 'proprietário'),
           trim(to_char(new.valor_bruto, 'FM999G999G990')), v.referencia, v.numero, v.condominio),
    v.fatura_id, v.flat_id);
  return new;
end;
$$;
create trigger trg_pagamento_confirmado_email after update on public.pagamentos
  for each row execute function public.fn_tg_pagamento_confirmado_email();

-- Ticket novo -> email ao gestor
create or replace function public.fn_tg_ticket_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  select c.gestor_email, c.nome as condominio, fl.numero
    into v
  from public.condominios c, public.flats fl
  where c.id = new.condominio_id and fl.id = new.flat_id;
  perform public.fn_enfileirar_email('ticket', v.gestor_email,
    format('%s — Flat %s: %s', new.categoria, v.numero, new.assunto),
    format('Novo pedido de suporte no %s.<br><br><b>%s</b><br>%s<br><br>'
           '<a href="https://maputo-renova.vercel.app/gestor/suporte">Responder no suporte</a>',
           v.condominio, new.assunto, new.mensagem),
    null, new.flat_id);
  return new;
end;
$$;
create trigger trg_ticket_email after insert on public.tickets
  for each row execute function public.fn_tg_ticket_email();

-- ---------------------------------------------------------------------------
-- Agendamentos
-- ---------------------------------------------------------------------------
select cron.schedule('maputo_renova_regua_cobranca', '40 5 * * *',
  $$select public.fn_regua_cobranca()$$);

-- processar a fila a cada 5 minutos (só dispara a Edge Function se houver
-- pendentes). O segredo partilhado vive no Vault ('envios_secret'), nunca
-- no repositório.
select cron.schedule('maputo_renova_processar_envios', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://phgoebpmijqdblllqpft.supabase.co/functions/v1/processar-envios',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-envios-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'envios_secret')),
    body := '{}'::jsonb)
  where exists (select 1 from public.envios
                where estado = 'pendente' and canal = 'email')
$$);

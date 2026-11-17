-- Fase 6.1 (Incremento A) — convite do proprietário por LINK, sem fricção.
--
-- Fluxo novo: o agente regista a flat com email → entra na fila um envio
-- 'convite_link' SEM corpo → a Edge Function processar-envios prepara-o:
--   · dono novo  → gera o link de convite (admin.generateLink) para
--     /auth/confirmar → /definir-password: a pessoa só define a password
--     (o código segue no email e pré-preenchido no link, editável — o mesmo
--     dono pode ter várias moradias e usar códigos de outras flats);
--   · dono já com conta (mesmo email) → a flat é associada automaticamente
--     e o email apenas avisa (multi-moradias sem passos extra).
-- O caminho manual por código (/convite e "Associar outra flat" no perfil)
-- mantém-se por inteiro — continua a usar fn_consumir_convite.

-- 1) O email do convite passa a ser preparado pela Edge Function
create or replace function public.fn_tg_convite_flat_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- corpo NULL de propósito: a processar-envios prepara o conteúdo
  -- (link de convite ou aviso de associação automática) antes de enviar
  perform public.fn_enfileirar_email('convite_link', new.proprietario_email,
    'A sua conta Maputo Renova está pronta', null, null, new.id);
  return new;
end;
$$;

-- 2) Helpers exclusivos do serviço (Edge Function com service role)
create or replace function public.fn_user_id_por_email(p_email text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select id from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.fn_user_id_por_email(text) from public, anon, authenticated;
grant execute on function public.fn_user_id_por_email(text) to service_role;

-- Associa a flat ao dono já existente com o MESMO email do cadastro
-- (mesma autoridade do convite: o email foi inserido pelo agente).
create or replace function public.fn_associar_flat_automatica(p_flat uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flat public.flats%rowtype;
  v_user uuid;
begin
  select * into v_flat from public.flats
  where id = p_flat and perfil_proprietario_id is null
  for update;
  if not found then
    return false;
  end if;

  v_user := public.fn_user_id_por_email(v_flat.proprietario_email);
  if v_user is null then
    return false;
  end if;
  -- só associa automaticamente a contas de proprietário (ou sem perfil);
  -- um email de gestor/consola/agente nunca ganha flats por coincidência
  if exists (select 1 from public.perfis
             where id = v_user and papel <> 'proprietario') then
    return false;
  end if;

  insert into public.perfis (id, nome, apelido, telefone, papel, estado,
                             nuit, doc_numero, data_nascimento, termos_aceites_em)
  values (v_user,
          coalesce(v_flat.proprietario_nome, 'Proprietário'),
          v_flat.proprietario_apelido,
          v_flat.proprietario_telefone,
          'proprietario', 'activo',
          v_flat.proprietario_nuit,
          v_flat.proprietario_documento,
          v_flat.proprietario_data_nascimento,
          now())
  on conflict (id) do update
    set termos_aceites_em = coalesce(public.perfis.termos_aceites_em, now());

  update public.flats
  set perfil_proprietario_id = v_user
  where id = v_flat.id;
  return true;
end;
$$;

revoke all on function public.fn_associar_flat_automatica(uuid) from public, anon, authenticated;
grant execute on function public.fn_associar_flat_automatica(uuid) to service_role;

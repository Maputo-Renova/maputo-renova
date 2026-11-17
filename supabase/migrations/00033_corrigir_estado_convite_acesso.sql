-- Correcção de bug latente exposto pelo E2E do acesso do gestor: no ramo 2
-- de fn_consumir_convite, o CASE do estado resolve para text e o Postgres
-- não faz cast implícito text→enum (estado_conta) — o consumo de QUALQUER
-- convite de acesso (gestor/agente/administrador) falhava com 42804. O erro
-- existia desde a 00016 e nunca tinha sido atingido (os perfis demo foram
-- criados por SQL directo). Cast explícito resolve.

create or replace function public.fn_consumir_convite(p_codigo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo uuid;
  v_flat public.flats%rowtype;
  v_conv public.convites_acesso%rowtype;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'É preciso iniciar sessão para usar o convite.';
  end if;

  begin
    v_codigo := trim(p_codigo)::uuid;
  exception when others then
    raise exception 'Código de convite inválido.';
  end;

  select email into v_email from auth.users where id = auth.uid();

  -- 1) Convite de flat (proprietário)
  select * into v_flat
  from public.flats
  where codigo_convite = v_codigo
    and perfil_proprietario_id is null
    and convite_expira_em > now()
  for update;

  if found then
    if v_flat.proprietario_email is not null
       and lower(v_flat.proprietario_email) is distinct from lower(v_email) then
      raise exception 'Este convite está reservado ao email indicado no cadastro da flat.';
    end if;

    insert into public.perfis (id, nome, apelido, telefone, papel, estado,
                               nuit, doc_numero, data_nascimento, termos_aceites_em)
    values (auth.uid(),
            coalesce(v_flat.proprietario_nome, 'Proprietário'),
            v_flat.proprietario_apelido,
            v_flat.proprietario_telefone,
            'proprietario', 'activo',
            v_flat.proprietario_nuit,
            v_flat.proprietario_documento,
            v_flat.proprietario_data_nascimento,
            now())
    on conflict (id) do update
      set papel = 'proprietario',
          termos_aceites_em = coalesce(public.perfis.termos_aceites_em, now());

    update public.flats
    set perfil_proprietario_id = auth.uid()
    where id = v_flat.id;
    return;
  end if;

  -- 2) Convite de acesso (gestor / colaborador / administrador)
  select * into v_conv
  from public.convites_acesso
  where codigo = v_codigo
    and usado_por is null
    and expira_em > now()
  for update;

  if not found then
    raise exception 'Convite inválido, expirado ou já utilizado.';
  end if;

  if v_conv.email is not null
     and lower(v_conv.email) is distinct from lower(v_email) then
    raise exception 'Este convite está reservado ao email indicado no cadastro.';
  end if;

  insert into public.perfis (id, nome, apelido, telefone, papel, estado,
                             condominio_id, termos_aceites_em)
  values (auth.uid(), v_conv.nome, v_conv.apelido, v_conv.telefone,
          v_conv.papel,
          (case when v_conv.papel = 'gestor' then 'pendente' else 'activo' end)::public.estado_conta,
          v_conv.condominio_id,
          now())
  on conflict (id) do update
    set papel = excluded.papel,
        estado = excluded.estado,
        condominio_id = excluded.condominio_id,
        termos_aceites_em = coalesce(public.perfis.termos_aceites_em, now());

  -- o gestor aceita os Termos no acesso à conta: fica registado no condomínio
  if v_conv.papel = 'gestor' and v_conv.condominio_id is not null then
    update public.condominios
    set termos_aceites_em = coalesce(termos_aceites_em, now()),
        termos_aceites_por = coalesce(termos_aceites_por, auth.uid())
    where id = v_conv.condominio_id;
  end if;

  update public.convites_acesso
  set usado_por = auth.uid(), usado_em = now()
  where id = v_conv.id;
end;
$$;

revoke execute on function public.fn_consumir_convite(text) from public, anon;
grant execute on function public.fn_consumir_convite(text) to authenticated;

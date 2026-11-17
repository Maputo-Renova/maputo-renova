-- Fase 6.1 — governação das moradias: só o AGENTE cria flats e as associa
-- a donos (2.ª moradia do mesmo dono: associação automática pelo email do
-- cadastro). O morador não adiciona flats por conta própria; o cartão
-- "Associar outra flat" saiu do perfil.
--
-- Reforço na base de dados: quando o agente indicou o email do proprietário
-- no cadastro, o código de convite da flat só pode ser consumido por uma
-- conta COM ESSE email — um código desviado deixa de ligar a flat a
-- terceiros. Flats sem email (código entregue em mão) mantêm o comportamento.

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

  -- 1) Convite de flat (proprietário)
  select * into v_flat
  from public.flats
  where codigo_convite = v_codigo
    and perfil_proprietario_id is null
    and convite_expira_em > now()
  for update;

  if found then
    if v_flat.proprietario_email is not null then
      select email into v_email from auth.users where id = auth.uid();
      if lower(v_flat.proprietario_email) is distinct from lower(v_email) then
        raise exception 'Este convite está reservado ao email indicado no cadastro da flat.';
      end if;
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

  insert into public.perfis (id, nome, apelido, telefone, papel, estado,
                             condominio_id, termos_aceites_em)
  values (auth.uid(), v_conv.nome, v_conv.apelido, v_conv.telefone,
          v_conv.papel,
          case when v_conv.papel = 'gestor' then 'pendente' else 'activo' end,
          v_conv.condominio_id,
          now())
  on conflict (id) do update
    set papel = excluded.papel,
        estado = excluded.estado,
        condominio_id = excluded.condominio_id,
        termos_aceites_em = coalesce(public.perfis.termos_aceites_em, now());

  update public.convites_acesso
  set usado_por = auth.uid(), usado_em = now()
  where id = v_conv.id;
end;
$$;

revoke execute on function public.fn_consumir_convite(text) from public, anon;
grant execute on function public.fn_consumir_convite(text) to authenticated;

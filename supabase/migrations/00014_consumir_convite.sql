-- Registo do proprietário por convite: liga a conta autenticada à flat
-- cujo código de convite (uso único, com validade) for apresentado.

create or replace function public.fn_consumir_convite(p_codigo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo uuid;
  v_flat public.flats%rowtype;
begin
  if auth.uid() is null then
    raise exception 'É preciso iniciar sessão para usar o convite.';
  end if;

  begin
    v_codigo := trim(p_codigo)::uuid;
  exception when others then
    raise exception 'Código de convite inválido.';
  end;

  select * into v_flat
  from public.flats
  where codigo_convite = v_codigo
    and perfil_proprietario_id is null
    and convite_expira_em > now()
  for update;

  if not found then
    raise exception 'Convite inválido, expirado ou já utilizado.';
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
end;
$$;

revoke execute on function public.fn_consumir_convite(text) from public, anon;
grant execute on function public.fn_consumir_convite(text) to authenticated;

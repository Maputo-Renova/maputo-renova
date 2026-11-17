-- Fidelidade ao protótipo — drawer da flat em Gestor → Pagamentos:
-- o gestor pode corrigir o email do proprietário e reenviar o convite de
-- acesso, enquanto a flat ainda não tem conta ligada. (Alterar o email de
-- uma conta JÁ activa é operação administrativa — fica na consola.)

create or replace function public.fn_reenviar_convite_flat(p_flat uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flat public.flats%rowtype;
  v_email text;
begin
  if public.fn_meu_papel() not in ('gestor', 'super_admin') then
    raise exception 'Apenas o gestor ou a consola podem reenviar convites.';
  end if;

  select * into v_flat from public.flats where id = p_flat for update;
  if not found then
    raise exception 'Flat não encontrada.';
  end if;
  if public.fn_meu_papel() = 'gestor'
     and v_flat.condominio_id is distinct from public.fn_meu_condominio() then
    raise exception 'Sem permissão para este condomínio.';
  end if;
  if v_flat.perfil_proprietario_id is not null then
    raise exception 'Esta flat já tem conta ligada — alterações de email são feitas pela consola.';
  end if;

  v_email := lower(trim(p_email));
  if v_email is null or position('@' in v_email) = 0 then
    raise exception 'Indique um email válido.';
  end if;

  update public.flats
  set proprietario_email = v_email,
      convite_expira_em = greatest(convite_expira_em, now() + interval '30 days')
  where id = v_flat.id;

  -- entra na fila; a Edge Function prepara o link (conta nova) ou a
  -- associação automática (email já com conta de proprietário)
  insert into public.envios (tipo, canal, destinatario, assunto, corpo, flat_id, estado)
  values ('convite_link', 'email', v_email,
          'A sua conta Maputo Renova está pronta', null, v_flat.id, 'pendente');
end;
$$;

revoke execute on function public.fn_reenviar_convite_flat(uuid, text) from public, anon;
grant execute on function public.fn_reenviar_convite_flat(uuid, text) to authenticated;

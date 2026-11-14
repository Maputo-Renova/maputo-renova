-- O próprio utilizador pode actualizar nome/apelido/telefone do seu perfil,
-- sem tocar em papel/estado/condominio (RLS não restringe colunas, daí a função).
create or replace function public.fn_actualizar_perfil(
  p_nome text,
  p_apelido text default null,
  p_telefone text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'É preciso iniciar sessão.';
  end if;
  if p_nome is null or length(trim(p_nome)) = 0 then
    raise exception 'O nome é obrigatório.';
  end if;
  update public.perfis
  set nome = trim(p_nome),
      apelido = nullif(trim(coalesce(p_apelido, '')), ''),
      telefone = coalesce(nullif(trim(coalesce(p_telefone, '')), ''), telefone)
  where id = auth.uid();
end;
$$;

revoke execute on function public.fn_actualizar_perfil(text, text, text) from public, anon;
grant execute on function public.fn_actualizar_perfil(text, text, text) to authenticated;

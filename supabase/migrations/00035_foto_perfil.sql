-- Foto de perfil (protótipo: "Carregar foto" / "Remover" em O meu perfil).
-- A imagem vive no bucket privado 'comprovativos', na pasta do próprio
-- (as políticas de Storage já impõem isso no upload); o perfil guarda só o
-- caminho e a app mostra-a por URL assinada de curta duração.

alter table public.perfis add column foto_path text;
comment on column public.perfis.foto_path is
  'Foto de perfil no Storage privado (pasta do próprio); null = iniciais.';

create or replace function public.fn_actualizar_foto(p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'É preciso iniciar sessão.';
  end if;
  -- só caminhos dentro da pasta do próprio utilizador (ou remover)
  if p_path is not null and p_path not like auth.uid()::text || '/%' then
    raise exception 'Caminho de foto inválido.';
  end if;
  update public.perfis set foto_path = p_path where id = auth.uid();
end;
$$;

revoke execute on function public.fn_actualizar_foto(text) from public, anon;
grant execute on function public.fn_actualizar_foto(text) to authenticated;

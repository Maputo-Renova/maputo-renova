-- Endurecimento: funções auxiliares de RLS não devem ser chamáveis por anon
-- via /rest/v1/rpc. O papel authenticated mantém EXECUTE nas fn_meu_* porque
-- as policies de RLS correm com os privilégios do utilizador autenticado.

revoke execute on function public.fn_meu_papel() from anon, public;
revoke execute on function public.fn_meu_condominio() from anon, public;
revoke execute on function public.fn_meus_flats() from anon, public;
revoke execute on function public.fn_norm(text) from anon, public;

-- Função utilitária pré-existente do projecto; ninguém precisa de a chamar via API.
-- Só existe na base de dados de produção (criada fora das migrações);
-- numa base nova (CI/local) o revoke é dispensável.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
  end if;
end $$;

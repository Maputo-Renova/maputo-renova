-- A Edge Function autentica os pedidos do pg_cron comparando o cabeçalho
-- x-envios-secret com o segredo guardado no Vault. Só o service_role lê.
create or replace function public.fn_envios_secret()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'envios_secret';
$$;

revoke execute on function public.fn_envios_secret() from public, anon, authenticated;

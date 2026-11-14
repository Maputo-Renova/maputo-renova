-- Descoberto pela suite de testes de RLS: um pedido anónimo às tabelas com
-- políticas que usam os helpers (fn_meu_papel, fn_meu_condominio,
-- fn_meus_flats, fn_aal_ok) falhava com "permission denied for function"
-- em vez de devolver zero linhas. Para o papel anon os helpers devolvem
-- null/true (auth.uid() é null), por isso o grant não expõe nada.
grant execute on function public.fn_meu_papel() to anon;
grant execute on function public.fn_meu_condominio() to anon;
grant execute on function public.fn_meus_flats() to anon;
grant execute on function public.fn_aal_ok() to anon;

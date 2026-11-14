-- Fase S (advisors): funções de trigger e funções de cron não devem ser
-- invocáveis pela API REST. Os helpers de RLS (fn_meu_papel, fn_meu_condominio,
-- fn_meus_flats, fn_aal_ok) TÊM de permanecer executáveis pelos papéis da API
-- porque as políticas de RLS os avaliam no contexto do papel do pedido; só
-- devolvem dados do próprio utilizador (risco aceite, documentado no plano).

do $$
declare f text;
begin
  foreach f in array array[
    'fn_tg_auditar_perfis','fn_tg_auditar_config','fn_tg_auditar_taxas_metodos',
    'fn_tg_auditar_contas','fn_tg_auditar_metodos','fn_tg_auditar_repasses',
    'fn_tg_auditar_pagamentos','fn_tg_auditar_convites','fn_tg_auditar_despesas',
    'fn_tg_aviso_email','fn_tg_convite_acesso_email','fn_tg_convite_flat_email',
    'fn_tg_comprovativo_email','fn_tg_pagamento_confirmado_email','fn_tg_ticket_email',
    'fn_touch','fn_touch_ticket'
  ] loop
    execute format('revoke execute on function public.%I() from public, anon, authenticated', f);
  end loop;
end $$;

-- Funções de cron: só o agendador (postgres) e o service_role
revoke execute on function public.fn_gerar_faturas(date) from public, anon, authenticated;
revoke execute on function public.fn_marcar_atrasos() from public, anon, authenticated;

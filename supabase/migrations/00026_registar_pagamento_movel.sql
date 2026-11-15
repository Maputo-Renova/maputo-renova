-- Fase 3 — registo automático de um pagamento móvel (M-Pesa/eMola) na app.
-- Chamada EXCLUSIVAMENTE pelo payment-worker (service role) depois de a
-- transacção em `transaccoes_moveis` ficar SUCCESS. Converte a transacção
-- num pagamento confirmado: fatura paga + movimento de tesouraria, com a
-- taxa do operador gravada no momento (taxas_metodos) — o mesmo caminho
-- contabilístico da confirmação manual de transferências.
--
-- Idempotente: a mesma transacção do operador só entra uma vez (índice único
-- uq_pagamentos_transacao_operador); repetir devolve o pagamento existente.

create or replace function public.fn_registar_pagamento_movel(p_trans_id text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx  public.transaccoes_moveis%rowtype;
  v_fat public.faturas%rowtype;
  v_existente uuid;
  v_pct_operador numeric(5,2);
  v_fixo_operador numeric(12,2);
  v_taxa_operador numeric(12,2);
  v_pct_servico numeric(5,2);
  v_servico numeric(12,2);
  v_op_id text;
  v_pag uuid;
begin
  select * into v_tx from public.transaccoes_moveis
  where trans_id = p_trans_id for update;
  if not found then
    raise exception 'Transacção móvel % não existe.', p_trans_id;
  end if;
  if v_tx.estado <> 'SUCCESS' or v_tx.tipo <> 'C2B' then
    raise exception 'Transacção % não é uma cobrança com sucesso.', p_trans_id;
  end if;
  if v_tx.fatura_id is null then
    raise exception 'Transacção % não tem fatura associada.', p_trans_id;
  end if;

  v_op_id := coalesce(v_tx.id_operador, v_tx.trans_id);

  -- idempotência: a transacção do operador só entra uma vez
  select id into v_existente from public.pagamentos
  where metodo = v_tx.provedor and transacao_operador_id = v_op_id;
  if found then
    return v_existente;
  end if;

  select * into v_fat from public.faturas where id = v_tx.fatura_id for update;

  -- taxa do operador NO MOMENTO da transacção (percentagem sobre o bruto + fixo)
  select percentagem, valor_fixo into v_pct_operador, v_fixo_operador
  from public.taxas_metodos where metodo = v_tx.provedor;
  v_taxa_operador := round(v_tx.valor * coalesce(v_pct_operador, 0) / 100
                           + coalesce(v_fixo_operador, 0), 2);

  -- decomposição igual à da app: serviço = % da quota; associação = a da fatura
  select coalesce(c.taxa_servico_pct, cfg.taxa_servico_pct)
    into v_pct_servico
  from public.condominios c cross join public.config_plataforma cfg
  where c.id = v_fat.condominio_id;
  v_servico := round(v_fat.valor_quota * coalesce(v_pct_servico, 15) / 100, 2);

  -- inserir como 'iniciado' e promover a 'confirmado' num update, para
  -- reutilizar os triggers existentes (recibo por email + auditoria), que
  -- disparam na transição para confirmado
  insert into public.pagamentos (fatura_id, metodo, valor_bruto, taxa_operador,
    valor_liquido, taxa_servico, valor_associacao, estado,
    transacao_operador_id, msisdn)
  values (v_fat.id, v_tx.provedor, v_tx.valor, v_taxa_operador,
    v_tx.valor - v_taxa_operador, v_servico, coalesce(v_fat.taxa_associacao, 0),
    'iniciado', v_op_id, v_tx.msisdn)
  returning id into v_pag;

  update public.pagamentos
  set estado = 'confirmado', confirmado_em = now()
  where id = v_pag;

  update public.faturas set estado = 'paga'
  where id = v_fat.id and estado <> 'paga';

  insert into public.movimentos (condominio_id, tipo, pagamento_id, valor)
  values (v_fat.condominio_id, 'credito_cobranca', v_pag, v_fat.valor_quota);

  return v_pag;
end;
$$;

-- só o worker (service role); nenhum papel da app pode invocar
revoke execute on function public.fn_registar_pagamento_movel(text)
  from public, anon, authenticated;
grant execute on function public.fn_registar_pagamento_movel(text) to service_role;

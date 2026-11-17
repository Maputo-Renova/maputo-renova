-- LIMPEZA DOS DADOS DEMO — IRREVERSÍVEL.
-- Correr UMA vez, na sessão de go-live, DEPOIS de o administrador real da
-- consola existir e ter entrado com sucesso (ver docs/GO-LIVE.md, secção 3).
--
-- Apaga: os 5 utilizadores demo (consola, gestor, gestor pendente,
-- morador e agente — padrão %demo@maputorenova.co.za), os condomínios JDA e TDI e tudo o que
-- lhes pertence (flats, faturas, pagamentos, movimentos, repasses,
-- despesas, avisos, tickets, projectos, envios, consolidações), a conta
-- bancária demo e os convites de teste. Não toca em mais nada.

do $$
declare
  v_users uuid[];
  v_condos uuid[];
  n_admins integer;
begin
  -- Trava de segurança: tem de existir pelo menos um super_admin real
  select count(*) into n_admins
  from public.perfis p
  join auth.users u on u.id = p.id
  where p.papel = 'super_admin' and p.estado = 'activo'
    and u.email not like '%demo@maputorenova.co.za';
  if n_admins = 0 then
    raise exception 'ABORTADO: crie e teste primeiro o administrador real da consola (não-demo).';
  end if;

  select coalesce(array_agg(id), '{}') into v_users
  from auth.users where email like '%demo@maputorenova.co.za';
  select coalesce(array_agg(id), '{}') into v_condos
  from public.condominios where codigo in ('JDA', 'TDI');

  -- Dependências dos condomínios demo, por ordem de FK
  delete from public.envios where flat_id in (select id from public.flats where condominio_id = any(v_condos))
     or fatura_id in (select id from public.faturas where condominio_id = any(v_condos))
     or aviso_id in (select id from public.avisos where condominio_id = any(v_condos));
  delete from public.votos_projecto where projecto_id in (select id from public.projectos where condominio_id = any(v_condos));
  delete from public.projecto_updates where projecto_id in (select id from public.projectos where condominio_id = any(v_condos));
  delete from public.despesas where condominio_id = any(v_condos);
  delete from public.projectos where condominio_id = any(v_condos);
  delete from public.tickets where condominio_id = any(v_condos);
  delete from public.avisos where condominio_id = any(v_condos);
  delete from public.movimentos where condominio_id = any(v_condos);
  delete from public.repasses where condominio_id = any(v_condos);
  delete from public.pagamentos where fatura_id in (select id from public.faturas where condominio_id = any(v_condos));
  delete from public.faturas where condominio_id = any(v_condos);
  delete from public.associacao_mensal where condominio_id = any(v_condos);
  delete from public.flats where condominio_id = any(v_condos);
  delete from public.convites_acesso where condominio_id = any(v_condos) or email like '%demo@maputorenova.co.za';
  delete from public.perfis where condominio_id = any(v_condos) or id = any(v_users);
  delete from public.condominios where id = any(v_condos);

  -- Conta bancária e convites/colaboradores de teste
  delete from public.contas_plataforma where numero_conta = '0012345678901' and titular = 'Maputo Renova, Lda.';
  delete from public.convites_acesso where email like 'stelio.demo@%';

  -- Ficheiros demo no Storage (comprovativos carregados pelas contas demo)
  delete from storage.objects where bucket_id = 'comprovativos'
    and (storage.foldername(name))[1] = any(select u::text from unnest(v_users) u);

  -- Auditoria: preserva-se o registo, anonimiza-se o actor demo
  update public.auditoria set actor_id = null where actor_id = any(v_users);

  -- Contas de autenticação demo
  delete from auth.mfa_factors where user_id = any(v_users);
  delete from auth.identities where user_id = any(v_users);
  delete from auth.users where id = any(v_users);

  raise notice 'Limpeza demo concluída: % utilizadores e % condomínios removidos.',
    coalesce(array_length(v_users, 1), 0), coalesce(array_length(v_condos, 1), 0);
end $$;

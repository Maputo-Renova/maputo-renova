-- Suite de testes de RLS do Maputo Renova.
-- Corre numa transacção com ROLLBACK: não altera nada.
-- Cada bloco simula um papel via request.jwt.claims e falha com EXCEPTION
-- se uma regra de isolamento estiver furada.
--
-- Uso (SQL editor / psql): executar o ficheiro inteiro; o resultado final
-- "RLS OK — todos os testes passaram" só aparece se tudo passar.

begin;

do $teste$
declare
  v_morador uuid;
  v_gestor uuid;
  v_pendente uuid;
  v_consola uuid;
  v_jda uuid;
  v_tdi uuid;
  n integer;
begin
  select id into v_morador from auth.users where email = 'morador.demo@maputorenova.co.za';
  select id into v_gestor from auth.users where email = 'gestor.demo@maputorenova.co.za';
  select id into v_pendente from auth.users where email = 'gestor.pendente.demo@maputorenova.co.za';
  select id into v_consola from auth.users where email = 'consola.demo@maputorenova.co.za';
  select id into v_jda from public.condominios where codigo = 'JDA';
  select id into v_tdi from public.condominios where codigo = 'TDI';

  ---------------------------------------------------------------------------
  -- ANÓNIMO: não vê nada
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  select count(*) into n from public.flats;
  assert n = 0, format('anon vê %s flats', n);
  select count(*) into n from public.faturas;
  assert n = 0, format('anon vê %s faturas', n);
  select count(*) into n from public.perfis;
  assert n = 0, format('anon vê %s perfis', n);
  reset role;

  ---------------------------------------------------------------------------
  -- MORADOR: só a sua flat e as suas faturas; nada de finanças da plataforma
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_morador, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.flats;
  assert n = 1, format('morador vê %s flats (devia ver 1)', n);
  select count(*) into n from public.faturas f
    where f.flat_id not in (select public.fn_meus_flats());
  assert n = 0, format('morador vê %s faturas de outras flats', n);
  select count(*) into n from public.movimentos;
  assert n = 0, format('morador vê %s movimentos', n);
  select count(*) into n from public.repasses;
  assert n = 0, format('morador vê %s repasses', n);
  select count(*) into n from public.convites_acesso;
  assert n = 0, format('morador vê %s convites de acesso', n);
  select count(*) into n from public.perfis where id <> v_morador;
  assert n = 0, format('morador vê %s perfis alheios', n);

  -- morador não altera o cadastro da flat
  update public.flats set proprietario_nome = 'Intruso';
  get diagnostics n = row_count;
  assert n = 0, format('morador conseguiu alterar %s flats', n);

  -- morador não confirma pagamentos (update restrito ao gestor)
  update public.pagamentos set estado = 'confirmado' where estado <> 'confirmado';
  get diagnostics n = row_count;
  assert n = 0, format('morador conseguiu confirmar %s pagamentos', n);
  reset role;

  ---------------------------------------------------------------------------
  -- GESTOR (JDA): só o seu condomínio; nunca configuração da plataforma
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.condominios where id = v_tdi;
  assert n = 0, 'gestor da JDA vê o condomínio TDI';
  select count(*) into n from public.flats where condominio_id = v_tdi;
  assert n = 0, 'gestor da JDA vê flats do TDI';
  select count(*) into n from public.faturas where condominio_id <> v_jda;
  assert n = 0, 'gestor da JDA vê faturas de outros condomínios';

  update public.config_plataforma set taxa_servico_pct = 99;
  get diagnostics n = row_count;
  assert n = 0, 'gestor conseguiu alterar as taxas da plataforma';

  update public.perfis set estado = 'activo' where id = v_pendente;
  get diagnostics n = row_count;
  assert n = 0, 'gestor conseguiu aprovar um gestor pendente';

  -- inserts barrados por RLS lançam excepção: capturá-la é o resultado esperado
  begin
    insert into public.repasses (condominio_id, valor) values (v_jda, 1);
    raise exception 'gestor conseguiu registar um repasse';
  exception
    when insufficient_privilege then null; -- esperado
  end;
  reset role;

  ---------------------------------------------------------------------------
  -- GESTOR PENDENTE (TDI): autentica mas não vê nada de gestão
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_pendente, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.condominios;
  assert n = 0, format('gestor pendente vê %s condomínios', n);
  select count(*) into n from public.flats;
  assert n = 0, format('gestor pendente vê %s flats', n);
  select count(*) into n from public.faturas;
  assert n = 0, format('gestor pendente vê %s faturas', n);
  -- vê o próprio perfil (e só esse)
  select count(*) into n from public.perfis;
  assert n = 1, format('gestor pendente vê %s perfis (devia ver só o seu)', n);
  reset role;

  ---------------------------------------------------------------------------
  -- CONSOLA: vê tudo (sanidade do acesso total)
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_consola, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.condominios;
  assert n >= 2, format('consola só vê %s condomínios', n);
  select count(*) into n from public.movimentos;
  assert n >= 1, 'consola não vê movimentos';
  reset role;

  ---------------------------------------------------------------------------
  -- FASE 4: elegibilidade e votação (tudo revertido no rollback)
  ---------------------------------------------------------------------------
  -- antes de 100% pago, o condomínio não está em dia
  assert not public.fn_condominio_em_dia(v_jda), 'JDA em dia antes de 100% pago';

  update public.faturas set estado = 'paga'
  where condominio_id = v_jda and estado <> 'paga';
  assert public.fn_condominio_em_dia(v_jda), 'JDA devia estar em dia a 100%';

  -- projecto do fundo da associação, já aprovado pela consola
  declare v_proj uuid;
  begin
    insert into public.projectos (condominio_id, nome, categoria, orcamento,
                                  data_prevista, financiamento, estado)
    values (v_jda, 'Teste votação', 'Melhoria', 50000,
            current_date + 90, 'associacao', 'aprovado')
    returning id into v_proj;

    -- a votação decorre em assembleia presencial: a via de voto individual
    -- está FECHADA — um proprietário não consegue invocar fn_votar_projecto
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_morador, 'role', 'authenticated')::text, true);
    set local role authenticated;
    begin
      perform public.fn_votar_projecto(v_proj, true);
      raise exception 'voto individual foi aceite (devia estar desactivado)';
    exception when insufficient_privilege then null; -- esperado
    end;
    reset role;

    -- a consola regista o resultado agregado da assembleia
    update public.projectos set votos_favor = 18, votos_contra = 4 where id = v_proj;
    select votos_favor into n from public.projectos where id = v_proj;
    assert n = 18, format('votos_favor = %s (devia ser 18)', n);
  end;

  raise notice 'RLS OK — todos os testes passaram';
end;
$teste$;

rollback;

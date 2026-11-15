-- Seed da base de dados LOCAL (CI e desenvolvimento): utilizadores demo,
-- condomínios JDA/TDI, flats, conta da plataforma e faturas do mês corrente.
-- NUNCA corre em produção (só via `supabase db reset` / `supabase start`).

-- Utilizador compatível com o GoTrue (colunas de token a '' — nunca NULL)
create or replace function pg_temp.criar_utilizador(p_email text, p_password text)
returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    p_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', '', '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, provider, identity_data,
                               last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text, 'email',
    jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
    now(), now(), now());
  return v_id;
end $$;

do $$
declare
  v_consola uuid;
  v_gestor uuid;
  v_morador uuid;
  v_pendente uuid;
  v_jda uuid;
  v_tdi uuid;
  v_flat101 uuid;
  v_flat302 uuid;
  v_fat101 uuid;
  v_pag uuid;
begin
  -- Segredo local do processador de envios (o cron lê do Vault)
  perform vault.create_secret('segredo-local-ci', 'envios_secret');

  v_consola  := pg_temp.criar_utilizador('consola.demo@maputorenova.co.za', 'DemoRenova2026!');
  v_gestor   := pg_temp.criar_utilizador('gestor.demo@maputorenova.co.za', 'DemoRenova2026!');
  v_morador  := pg_temp.criar_utilizador('morador.demo@maputorenova.co.za', 'DemoRenova2026!');
  v_pendente := pg_temp.criar_utilizador('gestor.pendente.demo@maputorenova.co.za', 'DemoRenova2026!');

  insert into public.perfis (id, nome, apelido, papel, estado)
  values (v_consola, 'Nádia', 'Cumbane', 'super_admin', 'activo');

  insert into public.condominios (nome, endereco, cidade, provincia, bairro, rua, numero_porta,
    quota_padrao, dia_vencimento, total_moradias,
    gestor_nome, gestor_apelido, gestor_email, gestor_telefone, gestor_nuit,
    gestor_doc_tipo, gestor_doc_numero, banco_nome, banco_conta)
  values ('Jardim das Acácias', 'Av. Kim Il Sung, 1247 · Sommerschield, Maputo',
    'Maputo', 'Maputo Cidade', 'Sommerschield', 'Av. Kim Il Sung', '1247',
    1500, 5, 24, 'Arlindo', 'Macuácua', 'gestor.demo@maputorenova.co.za',
    '+258 84 555 0101', '400111222', 'bi', '110100111222A', 'BIM', '143 228 4471')
  returning id into v_jda;

  insert into public.condominios (nome, endereco, cidade, provincia, bairro, rua, numero_porta,
    quota_padrao, dia_vencimento, total_moradias,
    gestor_nome, gestor_apelido, gestor_email, gestor_telefone, gestor_nuit,
    gestor_doc_tipo, gestor_doc_numero)
  values ('Torres do Índico', 'Av. Marginal, 1250', 'Maputo', 'Maputo Cidade',
    'Sommerschield', 'Av. Marginal', '1250', 2000, 5, 24,
    'Belmiro', 'Matsinhe', 'gestor.pendente.demo@maputorenova.co.za',
    '+258 84 555 0102', '401122334', 'bi', '110100334455B')
  returning id into v_tdi;

  insert into public.perfis (id, nome, apelido, papel, estado, condominio_id, telefone)
  values (v_gestor, 'Arlindo', 'Macuácua', 'gestor', 'activo', v_jda, '+258 84 555 0101'),
         (v_pendente, 'Belmiro', 'Matsinhe', 'gestor', 'pendente', v_tdi, '+258 84 555 0102');

  insert into public.flats (condominio_id, bloco, andar, numero,
    proprietario_nome, proprietario_apelido, proprietario_telefone, proprietario_email)
  values (v_jda, 'A', '1', '101', 'Hélder', 'Cossa', '+258 84 210 1101', null)
  returning id into v_flat101;
  insert into public.flats (condominio_id, bloco, andar, numero,
    proprietario_nome, proprietario_apelido, proprietario_telefone, proprietario_email)
  values (v_jda, 'A', '3', '302', 'Celeste', 'Mabjaia', '+258 84 210 1240',
          'morador.demo@maputorenova.co.za')
  returning id into v_flat302;
  insert into public.flats (condominio_id, bloco, andar, numero,
    proprietario_nome, proprietario_apelido, proprietario_telefone, proprietario_email)
  values (v_jda, 'B', '1', '102', 'Dina', 'Chissano', '+258 84 210 1102', null);

  -- Morador demo liga-se à flat 302
  insert into public.perfis (id, nome, apelido, papel, estado, telefone)
  values (v_morador, 'Celeste', 'Mabjaia', 'proprietario', 'activo', '+258 84 210 1240');
  update public.flats set perfil_proprietario_id = v_morador where id = v_flat302;

  -- Conta bancária da plataforma
  insert into public.contas_plataforma (banco, titular, numero_conta, nib, finalidade)
  values ('BCI', 'Maputo Renova, Lda.', '0012345678901', '000800000123456789012', 'ambos');

  -- Faturas do mês corrente
  perform public.fn_gerar_faturas(date_trunc('month', now())::date);

  -- Uma cobrança já confirmada (simula M-Pesa) para haver movimentos
  select id into v_fat101 from public.faturas
  where flat_id = v_flat101 and mes_referencia = date_trunc('month', now())::date;
  insert into public.pagamentos (fatura_id, metodo, valor_bruto, taxa_operador,
    valor_liquido, taxa_servico, valor_associacao, estado, transacao_operador_id, confirmado_em)
  values (v_fat101, 'mpesa', 2224, 0, 2224, 225, 499, 'confirmado', 'SEED-0001', now())
  returning id into v_pag;
  update public.faturas set estado = 'paga' where id = v_fat101;
  insert into public.movimentos (condominio_id, tipo, pagamento_id, valor)
  values (v_jda, 'credito_cobranca', v_pag, 1500);
end $$;

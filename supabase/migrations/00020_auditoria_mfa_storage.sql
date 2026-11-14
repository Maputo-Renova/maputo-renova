-- Fase S: auditoria automática das acções sensíveis, MFA imposto ao nível
-- da base de dados (quem tem factor verificado só opera com aal2) e
-- endurecimento do bucket de comprovativos.

-- ---------------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------------
create or replace function public.fn_auditar(
  p_acao text, p_entidade text, p_entidade_id text, p_detalhes jsonb default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.auditoria (actor_id, acao, entidade, entidade_id, detalhes)
  values (auth.uid(), p_acao, p_entidade, p_entidade_id, p_detalhes);
end;
$$;
revoke execute on function public.fn_auditar(text, text, text, jsonb) from public, anon, authenticated;

-- Perfis: aprovação/suspensão/reactivação e mudanças de papel
create or replace function public.fn_tg_auditar_perfis()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.estado is distinct from new.estado then
    perform public.fn_auditar(
      case new.estado when 'activo' then 'perfil.aprovar'
                      when 'suspenso' then 'perfil.suspender'
                      else 'perfil.' || new.estado end,
      'perfis', new.id::text,
      jsonb_build_object('nome', new.nome, 'papel', new.papel,
                         'de', old.estado, 'para', new.estado));
  end if;
  if old.papel is distinct from new.papel then
    perform public.fn_auditar('perfil.mudar_papel', 'perfis', new.id::text,
      jsonb_build_object('nome', new.nome, 'de', old.papel, 'para', new.papel));
  end if;
  return new;
end;
$$;
create trigger trg_auditar_perfis after update on public.perfis
  for each row execute function public.fn_tg_auditar_perfis();

-- Taxas da plataforma
create or replace function public.fn_tg_auditar_config()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.fn_auditar('config.taxas', 'config_plataforma', 'unica',
    jsonb_build_object('servico_de', old.taxa_servico_pct, 'servico_para', new.taxa_servico_pct,
                       'associacao_de', old.taxa_associacao, 'associacao_para', new.taxa_associacao));
  return new;
end;
$$;
create trigger trg_auditar_config after update on public.config_plataforma
  for each row execute function public.fn_tg_auditar_config();

create or replace function public.fn_tg_auditar_taxas_metodos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.fn_auditar('config.taxa_metodo', 'taxas_metodos', new.metodo::text,
    jsonb_build_object('pct_de', old.percentagem, 'pct_para', new.percentagem,
                       'activo_de', old.activo, 'activo_para', new.activo));
  return new;
end;
$$;
create trigger trg_auditar_taxas_metodos after update on public.taxas_metodos
  for each row execute function public.fn_tg_auditar_taxas_metodos();

-- Contas bancárias da plataforma
create or replace function public.fn_tg_auditar_contas()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.fn_auditar('conta.criar', 'contas_plataforma', new.id::text,
      jsonb_build_object('banco', new.banco, 'conta', new.numero_conta, 'finalidade', new.finalidade));
    return new;
  elsif tg_op = 'UPDATE' then
    perform public.fn_auditar('conta.alterar', 'contas_plataforma', new.id::text,
      jsonb_build_object('banco', new.banco, 'activo_de', old.activo, 'activo_para', new.activo));
    return new;
  else
    perform public.fn_auditar('conta.remover', 'contas_plataforma', old.id::text,
      jsonb_build_object('banco', old.banco, 'conta', old.numero_conta));
    return old;
  end if;
end;
$$;
create trigger trg_auditar_contas after insert or update or delete on public.contas_plataforma
  for each row execute function public.fn_tg_auditar_contas();

-- Métodos manuais
create or replace function public.fn_tg_auditar_metodos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.fn_auditar(
    case tg_op when 'INSERT' then 'metodo.criar' else 'metodo.alterar' end,
    'metodos_manuais', new.id::text,
    jsonb_build_object('nome', new.nome, 'activo', new.activo));
  return new;
end;
$$;
create trigger trg_auditar_metodos after insert or update on public.metodos_manuais
  for each row execute function public.fn_tg_auditar_metodos();

-- Repasses
create or replace function public.fn_tg_auditar_repasses()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.fn_auditar('repasse.registar', 'repasses', new.id::text,
    jsonb_build_object('condominio_id', new.condominio_id, 'valor', new.valor, 'data', new.data));
  return new;
end;
$$;
create trigger trg_auditar_repasses after insert on public.repasses
  for each row execute function public.fn_tg_auditar_repasses();

-- Pagamentos confirmados/rejeitados
create or replace function public.fn_tg_auditar_pagamentos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.estado in ('confirmado', 'rejeitado') and old.estado is distinct from new.estado then
    perform public.fn_auditar('pagamento.' || new.estado, 'pagamentos', new.id::text,
      jsonb_build_object('fatura_id', new.fatura_id, 'metodo', new.metodo, 'valor', new.valor_bruto));
  end if;
  return new;
end;
$$;
create trigger trg_auditar_pagamentos after update on public.pagamentos
  for each row execute function public.fn_tg_auditar_pagamentos();

-- Convites de acesso e despesas
create or replace function public.fn_tg_auditar_convites()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.fn_auditar('convite.criar', 'convites_acesso', new.id::text,
    jsonb_build_object('papel', new.papel, 'nome', new.nome));
  return new;
end;
$$;
create trigger trg_auditar_convites after insert on public.convites_acesso
  for each row execute function public.fn_tg_auditar_convites();

create or replace function public.fn_tg_auditar_despesas()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.fn_auditar('despesa.registar', 'despesas', new.id::text,
    jsonb_build_object('condominio_id', new.condominio_id, 'categoria', new.categoria, 'valor', new.valor));
  return new;
end;
$$;
create trigger trg_auditar_despesas after insert on public.despesas
  for each row execute function public.fn_tg_auditar_despesas();

-- ---------------------------------------------------------------------------
-- MFA imposto na base de dados: quem tem um factor TOTP verificado só pode
-- operar com sessão aal2 (padrão oficial Supabase, política RESTRICTIVE).
-- Quem não activou MFA não é afectado.
-- ---------------------------------------------------------------------------
create or replace function public.fn_aal_ok()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors
        where user_id = auth.uid() and status = 'verified'
      );
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'perfis','condominios','flats','faturas','pagamentos','repasses',
    'movimentos','despesas','avisos','tickets','config_plataforma',
    'taxas_metodos','contas_plataforma','metodos_manuais','convites_acesso','envios'
  ] loop
    execute format(
      'create policy mfa_aal2_%I on public.%I as restrictive for all using (public.fn_aal_ok())',
      t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: limites do bucket de comprovativos (10 MB; PDF e imagens)
-- ---------------------------------------------------------------------------
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp']
where id = 'comprovativos';

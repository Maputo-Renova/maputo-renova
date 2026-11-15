-- Fase 4: fatura consolidada da associação (preenchida automaticamente),
-- elegibilidade imposta na base de dados e votação em assembleia
-- (um voto por flat) para projectos financiados pelo fundo da associação.

-- ---------------------------------------------------------------------------
-- Consolidação mensal da associação por condomínio
-- ---------------------------------------------------------------------------
create or replace function public.fn_actualizar_associacao(p_condominio uuid, p_mes date)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.associacao_mensal (condominio_id, mes_referencia, valor_por_flat, flats_total, flats_pagas)
  select p_condominio, p_mes,
         (select taxa_associacao from public.config_plataforma limit 1),
         count(*), count(*) filter (where estado = 'paga')
  from public.faturas
  where condominio_id = p_condominio and mes_referencia = p_mes
  having count(*) > 0
  on conflict (condominio_id, mes_referencia) do update
    set flats_total = excluded.flats_total,
        flats_pagas = excluded.flats_pagas;
end $$;
revoke execute on function public.fn_actualizar_associacao(uuid, date) from public, anon, authenticated;

create or replace function public.fn_tg_assoc_fatura()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.fn_actualizar_associacao(new.condominio_id, new.mes_referencia);
  return new;
end $$;
revoke execute on function public.fn_tg_assoc_fatura() from public, anon, authenticated;
create trigger trg_assoc_fatura after insert or update of estado on public.faturas
  for each row execute function public.fn_tg_assoc_fatura();

-- Preencher os meses já existentes
do $$
declare r record;
begin
  for r in select distinct condominio_id, mes_referencia from public.faturas loop
    perform public.fn_actualizar_associacao(r.condominio_id, r.mes_referencia);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Elegibilidade: 100% das flats do mês corrente pagas
-- ---------------------------------------------------------------------------
create or replace function public.fn_condominio_em_dia(p_condominio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select flats_total > 0 and flats_pagas = flats_total
    from public.associacao_mensal
    where condominio_id = p_condominio
      and mes_referencia = date_trunc('month', now())::date
  ), false);
$$;
grant execute on function public.fn_condominio_em_dia(uuid) to authenticated;

-- Elegibilidade imposta no próprio INSERT: um projecto ao fundo da
-- associação só nasce se o condomínio estiver 100% em dia.
create or replace function public.fn_tg_projecto_elegivel()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.financiamento = 'associacao'
     and not public.fn_condominio_em_dia(new.condominio_id) then
    raise exception 'Para submeter ao fundo da associação, o condomínio precisa de estar 100%% em dia com a taxa da associação deste mês.';
  end if;
  return new;
end $$;
revoke execute on function public.fn_tg_projecto_elegivel() from public, anon, authenticated;
create trigger trg_projecto_elegivel before insert on public.projectos
  for each row execute function public.fn_tg_projecto_elegivel();

-- ---------------------------------------------------------------------------
-- Votação em assembleia: um voto por flat, só em projectos do fundo da
-- associação já validados pela consola, e só com o condomínio em dia.
-- ---------------------------------------------------------------------------
create table public.votos_projecto (
  id bigint generated always as identity primary key,
  projecto_id uuid not null references public.projectos (id) on delete cascade,
  flat_id uuid not null references public.flats (id),
  perfil_id uuid not null references public.perfis (id),
  favor boolean not null,
  created_at timestamptz not null default now(),
  constraint uq_voto_projecto_flat unique (projecto_id, flat_id)
);
alter table public.votos_projecto enable row level security;

create policy sa_all_votos on public.votos_projecto
  for all using (public.fn_meu_papel() = 'super_admin')
  with check (public.fn_meu_papel() = 'super_admin');
create policy gestor_sel_votos on public.votos_projecto
  for select using (
    projecto_id in (select id from public.projectos where condominio_id = public.fn_meu_condominio())
  );
create policy prop_sel_votos on public.votos_projecto
  for select using (flat_id in (select public.fn_meus_flats()));
-- o INSERT passa apenas pela função fn_votar_projecto (security definer)

create or replace function public.fn_votar_projecto(p_projecto uuid, p_favor boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_proj public.projectos%rowtype;
  v_flat uuid;
begin
  if public.fn_meu_papel() is distinct from 'proprietario' then
    raise exception 'Só proprietários votam na assembleia.';
  end if;

  select * into v_proj from public.projectos where id = p_projecto;
  if not found or v_proj.financiamento <> 'associacao' or v_proj.estado <> 'aprovado' then
    raise exception 'Este projecto não está em votação.';
  end if;

  select id into v_flat from public.flats
  where perfil_proprietario_id = auth.uid() and condominio_id = v_proj.condominio_id
  limit 1;
  if v_flat is null then
    raise exception 'A sua flat não pertence ao condomínio deste projecto.';
  end if;

  if not public.fn_condominio_em_dia(v_proj.condominio_id) then
    raise exception 'O condomínio precisa de estar 100%% em dia com a taxa da associação para votar.';
  end if;

  insert into public.votos_projecto (projecto_id, flat_id, perfil_id, favor)
  values (p_projecto, v_flat, auth.uid(), p_favor);

  update public.projectos
  set votos_favor = votos_favor + case when p_favor then 1 else 0 end,
      votos_contra = votos_contra + case when p_favor then 0 else 1 end
  where id = p_projecto;
exception
  when unique_violation then
    raise exception 'A sua flat já votou neste projecto.';
end $$;
revoke execute on function public.fn_votar_projecto(uuid, boolean) from public, anon;
grant execute on function public.fn_votar_projecto(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Auditoria e emails dos projectos
-- ---------------------------------------------------------------------------
create or replace function public.fn_tg_auditar_projectos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.fn_auditar('projecto.submeter', 'projectos', new.id::text,
      jsonb_build_object('nome', new.nome, 'financiamento', new.financiamento, 'orcamento', new.orcamento));
  elsif old.estado is distinct from new.estado then
    perform public.fn_auditar('projecto.' || new.estado, 'projectos', new.id::text,
      jsonb_build_object('nome', new.nome, 'de', old.estado, 'para', new.estado));
  end if;
  return new;
end $$;
revoke execute on function public.fn_tg_auditar_projectos() from public, anon, authenticated;
create trigger trg_auditar_projectos after insert or update on public.projectos
  for each row execute function public.fn_tg_auditar_projectos();

create or replace function public.fn_tg_projecto_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  if tg_op = 'UPDATE' and old.estado is distinct from new.estado
     and new.estado in ('aprovado', 'rejeitado') then
    select gestor_email, nome into v from public.condominios where id = new.condominio_id;
    perform public.fn_enfileirar_email('projecto_' || new.estado, v.gestor_email,
      format('Projecto %s — %s', case new.estado when 'aprovado' then 'aprovado' else 'rejeitado' end, new.nome),
      format('O projecto <b>%s</b> (%s) foi <b>%s</b> pela consola.%s<br><br>'
             '<a href="https://maputo-renova.vercel.app/gestor/projectos">Ver os projectos</a>',
             new.nome, v.nome,
             case new.estado when 'aprovado' then 'aprovado' else 'rejeitado' end,
             case when new.estado = 'aprovado' and new.financiamento = 'associacao'
                  then ' Segue agora para votação na assembleia.' else '' end));
  end if;
  return new;
end $$;
revoke execute on function public.fn_tg_projecto_email() from public, anon, authenticated;
create trigger trg_projecto_email after update on public.projectos
  for each row execute function public.fn_tg_projecto_email();

-- Políticas restritivas de MFA também nas tabelas novas desta fase
create policy mfa_aal2_projectos on public.projectos
  as restrictive for all using (public.fn_aal_ok());
create policy mfa_aal2_projecto_updates on public.projecto_updates
  as restrictive for all using (public.fn_aal_ok());
create policy mfa_aal2_votos_projecto on public.votos_projecto
  as restrictive for all using (public.fn_aal_ok());
create policy mfa_aal2_associacao_mensal on public.associacao_mensal
  as restrictive for all using (public.fn_aal_ok());

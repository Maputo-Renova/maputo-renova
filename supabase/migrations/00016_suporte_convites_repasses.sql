-- Suporte (tickets dos proprietários ao gestor), convites de acesso
-- (gestores e colaboradores) e registo de repasses pela consola.

-- ---------------------------------------------------------------------------
-- Tickets de suporte: proprietário -> gestor do condomínio
-- ---------------------------------------------------------------------------
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios (id),
  flat_id uuid not null references public.flats (id),
  criado_por uuid not null references auth.users (id),
  categoria text not null default 'Reclamação'
    check (categoria in ('Reclamação','Avaria','Pedido','Correcção de dados','Outro')),
  assunto text not null,
  mensagem text not null,
  estado text not null default 'novo' check (estado in ('novo','em_curso','resolvido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ix_tickets_condominio_estado on public.tickets (condominio_id, estado);

alter table public.tickets enable row level security;

create policy sa_all_tickets on public.tickets
  for all using (public.fn_meu_papel() = 'super_admin')
  with check (public.fn_meu_papel() = 'super_admin');

create policy prop_ins_tickets on public.tickets
  for insert with check (
    flat_id in (select public.fn_meus_flats())
    and criado_por = auth.uid()
    and estado = 'novo'
  );
create policy prop_sel_tickets on public.tickets
  for select using (flat_id in (select public.fn_meus_flats()));

create policy gestor_sel_tickets on public.tickets
  for select using (condominio_id = public.fn_meu_condominio());
create policy gestor_upd_tickets on public.tickets
  for update using (condominio_id = public.fn_meu_condominio())
  with check (condominio_id = public.fn_meu_condominio());

create or replace function public.fn_touch_ticket()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger trg_touch_ticket before update on public.tickets
  for each row execute function public.fn_touch_ticket();

-- ---------------------------------------------------------------------------
-- Convites de acesso: gestores (criados no cadastro do condomínio) e
-- colaboradores/administradores (criados pela consola). Uso único, com validade.
-- ---------------------------------------------------------------------------
create table public.convites_acesso (
  id uuid primary key default gen_random_uuid(),
  codigo uuid not null unique default gen_random_uuid(),
  papel public.papel not null check (papel in ('gestor','colaborador','super_admin')),
  condominio_id uuid references public.condominios (id),
  nome text not null,
  apelido text,
  email text,
  telefone text,
  criado_por uuid references auth.users (id),
  usado_por uuid references auth.users (id),
  usado_em timestamptz,
  expira_em timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now(),
  constraint chk_gestor_condominio check (papel <> 'gestor' or condominio_id is not null)
);

alter table public.convites_acesso enable row level security;

create policy sa_all_convites on public.convites_acesso
  for all using (public.fn_meu_papel() = 'super_admin')
  with check (public.fn_meu_papel() = 'super_admin');

-- O agente cria o convite do gestor ao cadastrar o condomínio
create policy colab_ins_convites_gestor on public.convites_acesso
  for insert with check (public.fn_meu_papel() = 'colaborador' and papel = 'gestor');
create policy colab_sel_convites_gestor on public.convites_acesso
  for select using (public.fn_meu_papel() = 'colaborador' and papel = 'gestor');

-- ---------------------------------------------------------------------------
-- fn_consumir_convite v2: flats (proprietário) OU convites_acesso
-- (gestor pendente / colaborador activo / administrador activo)
-- ---------------------------------------------------------------------------
create or replace function public.fn_consumir_convite(p_codigo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo uuid;
  v_flat public.flats%rowtype;
  v_conv public.convites_acesso%rowtype;
begin
  if auth.uid() is null then
    raise exception 'É preciso iniciar sessão para usar o convite.';
  end if;

  begin
    v_codigo := trim(p_codigo)::uuid;
  exception when others then
    raise exception 'Código de convite inválido.';
  end;

  -- 1) Convite de flat (proprietário)
  select * into v_flat
  from public.flats
  where codigo_convite = v_codigo
    and perfil_proprietario_id is null
    and convite_expira_em > now()
  for update;

  if found then
    insert into public.perfis (id, nome, apelido, telefone, papel, estado,
                               nuit, doc_numero, data_nascimento, termos_aceites_em)
    values (auth.uid(),
            coalesce(v_flat.proprietario_nome, 'Proprietário'),
            v_flat.proprietario_apelido,
            v_flat.proprietario_telefone,
            'proprietario', 'activo',
            v_flat.proprietario_nuit,
            v_flat.proprietario_documento,
            v_flat.proprietario_data_nascimento,
            now())
    on conflict (id) do update
      set papel = 'proprietario',
          termos_aceites_em = coalesce(public.perfis.termos_aceites_em, now());

    update public.flats
    set perfil_proprietario_id = auth.uid()
    where id = v_flat.id;
    return;
  end if;

  -- 2) Convite de acesso (gestor / colaborador / administrador)
  select * into v_conv
  from public.convites_acesso
  where codigo = v_codigo
    and usado_por is null
    and expira_em > now()
  for update;

  if not found then
    raise exception 'Convite inválido, expirado ou já utilizado.';
  end if;

  insert into public.perfis (id, nome, apelido, telefone, papel, estado,
                             condominio_id, termos_aceites_em)
  values (auth.uid(), v_conv.nome, v_conv.apelido, v_conv.telefone,
          v_conv.papel,
          case when v_conv.papel = 'gestor' then 'pendente' else 'activo' end,
          v_conv.condominio_id,
          now())
  on conflict (id) do update
    set papel = excluded.papel,
        estado = excluded.estado,
        condominio_id = excluded.condominio_id,
        termos_aceites_em = coalesce(public.perfis.termos_aceites_em, now());

  update public.convites_acesso
  set usado_por = auth.uid(), usado_em = now()
  where id = v_conv.id;
end;
$$;

revoke execute on function public.fn_consumir_convite(text) from public, anon;
grant execute on function public.fn_consumir_convite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Registar repasse (consola): repasse + movimento num só passo
-- ---------------------------------------------------------------------------
create or replace function public.fn_registar_repasse(
  p_condominio uuid,
  p_valor numeric,
  p_data date,
  p_comprovativo_path text default null,
  p_nota text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if public.fn_meu_papel() is distinct from 'super_admin' then
    raise exception 'Apenas a consola pode registar repasses.';
  end if;
  if p_valor is null or p_valor <= 0 then
    raise exception 'Valor do repasse inválido.';
  end if;

  insert into public.repasses (condominio_id, valor, data, comprovativo_path, nota, registado_por)
  values (p_condominio, p_valor, coalesce(p_data, current_date), p_comprovativo_path, p_nota, auth.uid())
  returning id into v_id;

  insert into public.movimentos (condominio_id, tipo, repasse_id, valor)
  values (p_condominio, 'repasse', v_id, -p_valor);

  return v_id;
end;
$$;

revoke execute on function public.fn_registar_repasse(uuid, numeric, date, text, text) from public, anon;
grant execute on function public.fn_registar_repasse(uuid, numeric, date, text, text) to authenticated;

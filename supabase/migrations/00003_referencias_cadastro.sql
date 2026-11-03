-- Referência única de cadastro por flat (letras e números, ex.: JDA-A302)
-- e código curto por condomínio (ex.: JDA), gerados automaticamente.

alter table public.condominios add column codigo text unique;
alter table public.flats add column referencia text unique;

-- Código do condomínio: iniciais do nome (sem acentos), com sufixo numérico em colisão.
create or replace function public.fn_condominio_codigo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  base text; cand text; n int := 1;
begin
  if new.codigo is not null then return new; end if;
  select upper(string_agg(substr(public.fn_norm(w),1,1), ''))
    into base
    from regexp_split_to_table(coalesce(new.nome,''), '\s+') w
    where public.fn_norm(w) <> '';
  base := left(regexp_replace(coalesce(base,''), '[^A-Z0-9]', '', 'g'), 4);
  if base = '' then base := 'CND'; end if;
  cand := base;
  while exists (select 1 from public.condominios where codigo = cand) loop
    n := n + 1;
    cand := base || n::text;
  end loop;
  new.codigo := cand;
  return new;
end;
$$;

create trigger trg_condominios_codigo
  before insert on public.condominios
  for each row execute function public.fn_condominio_codigo();

-- Referência da flat: código do condomínio + bloco + número, com sufixo em colisão.
create or replace function public.fn_flat_referencia()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_cod text; base text; cand text; n int := 1;
begin
  if new.referencia is not null then return new; end if;
  select codigo into v_cod from public.condominios where id = new.condominio_id;
  base := coalesce(v_cod, 'FLT') || '-' ||
          upper(regexp_replace(public.fn_norm(coalesce(new.bloco,'')) || public.fn_norm(new.numero), '[^a-z0-9]', '', 'g'));
  cand := base;
  while exists (select 1 from public.flats where referencia = cand) loop
    n := n + 1;
    cand := base || '-' || n::text;
  end loop;
  new.referencia := cand;
  return new;
end;
$$;

create trigger trg_flats_referencia
  before insert on public.flats
  for each row execute function public.fn_flat_referencia();

revoke execute on function public.fn_condominio_codigo() from anon, authenticated, public;
revoke execute on function public.fn_flat_referencia() from anon, authenticated, public;

-- Fase 6.1 — multi-moradias: o mesmo proprietário pode ter várias flats.
-- A restrição única em flats.perfil_proprietario_id (00001) contradizia o
-- requisito do negócio (um dono com várias moradias) e foi apanhada pela
-- suite de RLS ao testar a associação automática da 2.ª flat. As leituras
-- já eram plurais (fn_meus_flats, políticas de RLS); as páginas do morador
-- passam a agregar as moradias na app.

alter table public.flats drop constraint flats_perfil_proprietario_id_key;

create index if not exists ix_flats_perfil_proprietario
  on public.flats (perfil_proprietario_id)
  where perfil_proprietario_id is not null;

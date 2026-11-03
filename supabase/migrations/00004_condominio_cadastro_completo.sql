-- Cadastro completo do condomínio: localização detalhada, estrutura
-- e dados de contacto do gestor (usados antes de o gestor ter conta).

alter table public.condominios
  add column provincia text not null default 'Maputo Cidade',
  add column bairro text,
  add column rua text,
  add column numero_porta text,
  add column codigo_postal text,
  add column total_moradias integer check (total_moradias >= 0),
  add column gestor_nome text,
  add column gestor_email text,
  add column gestor_telefone text,
  add column gestor_telefone_alt text;

comment on column public.condominios.endereco is
  'Endereço composto (rua, número · bairro) — usado no cruzamento anti-duplicação das flats.';
comment on column public.condominios.total_moradias is
  'Número de moradias declarado no cadastro; as flats cadastradas podem ser menos.';

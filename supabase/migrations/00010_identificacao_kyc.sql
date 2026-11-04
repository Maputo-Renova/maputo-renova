-- Identificação completa de gestores e proprietários:
-- nome e apelido, data de nascimento, NUIT, BI ou Passaporte
-- (número + cópia anexada no Storage).

-- Proprietário (na flat, onde vive o cadastro feito pelo agente)
alter table public.flats
  add column proprietario_apelido text,
  add column proprietario_data_nascimento date,
  add column proprietario_nuit text,
  add column proprietario_doc_tipo text default 'bi' check (proprietario_doc_tipo in ('bi','passaporte')),
  add column proprietario_doc_path text;

comment on column public.flats.proprietario_documento is 'Número do BI ou passaporte do proprietário.';
comment on column public.flats.proprietario_doc_path is 'Cópia do documento (ficheiro ou foto) no Storage privado.';

-- Gestor (no cadastro do condomínio, antes de o gestor ter conta)
alter table public.condominios
  add column gestor_apelido text,
  add column gestor_data_nascimento date,
  add column gestor_nuit text,
  add column gestor_doc_tipo text default 'bi' check (gestor_doc_tipo in ('bi','passaporte')),
  add column gestor_doc_numero text,
  add column gestor_doc_path text;

-- Conta (perfis): os mesmos dados ficam no perfil quando a conta é criada
alter table public.perfis
  add column apelido text,
  add column data_nascimento date,
  add column nuit text,
  add column doc_tipo text check (doc_tipo in ('bi','passaporte')),
  add column doc_numero text,
  add column doc_path text;

comment on column public.perfis.doc_path is 'Cópia do BI/passaporte no Storage privado; substituível apenas pela administração.';

-- Comprovativo de endereço da residência (ex.: fatura de água)
alter table public.flats add column comprovativo_endereco_path text;
comment on column public.flats.comprovativo_endereco_path is
  'Comprovativo de endereço da residência (fatura de água/electricidade recente, últimos 3 meses) no Storage privado.';

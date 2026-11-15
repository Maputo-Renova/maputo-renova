-- Decisão de governação (Nov 2026): a votação dos projectos do fundo da
-- associação NÃO acontece no dashboard — decorre em assembleias presenciais
-- da associação de condomínios. O dashboard mostra aos administradores a
-- adimplência (elegibilidade) de cada edifício e a consola REGISTA o
-- resultado agregado da assembleia (votos a favor/contra e decisão).

-- A via de voto individual fica fechada (a função e a tabela permanecem,
-- documentadas, caso a governação volte a mudar).
revoke execute on function public.fn_votar_projecto(uuid, boolean) from authenticated;

comment on function public.fn_votar_projecto(uuid, boolean) is
  'DESACTIVADA: a votação decorre em assembleia presencial da associação; a consola regista o resultado agregado em projectos.votos_favor/votos_contra.';
comment on table public.votos_projecto is
  'Reservada (não usada): os votos individuais não se registam na plataforma; ver projectos.votos_favor/votos_contra para o resultado agregado da assembleia.';
comment on column public.projectos.votos_favor is
  'Resultado agregado da assembleia da associação, registado pela consola.';
comment on column public.projectos.votos_contra is
  'Resultado agregado da assembleia da associação, registado pela consola.';

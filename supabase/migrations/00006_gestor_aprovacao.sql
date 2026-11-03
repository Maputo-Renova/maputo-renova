-- Aprovação de gestores pela consola: um gestor recém-registado fica
-- 'pendente' — consegue autenticar-se, mas as políticas de RLS
-- (fn_meu_papel / fn_meu_condominio filtram estado = 'activo') não lhe
-- dão acesso a nenhum dado de gestão até o super admin aprovar.

alter type public.estado_conta add value if not exists 'pendente' before 'activo';

comment on column public.perfis.estado is
  'pendente: registado, à espera de aprovação da consola (login permitido, gestão bloqueada pelo RLS); activo: aprovado; suspenso: acesso retirado.';

-- Mitigação de cold starts: com pouco tráfego (fase demo/piloto), a função
-- da app na Vercel "adormece" e o primeiro clique de cada visita paga o
-- arranque do servidor (0,5–2 s) — provavelmente a maior fatia da lentidão
-- sentida, e o que distingue esta app de outras na mesma região com tráfego
-- constante. Um ping de 5 em 5 minutos mantém uma instância quente, usando
-- o pg_net que já existe. Custo ~9k pedidos/mês, muito dentro do plano.
-- Reversível: select cron.unschedule('maputo_renova_manter_quente');

select cron.schedule('maputo_renova_manter_quente', '*/5 * * * *', $$
  select net.http_get(url := 'https://maputo-renova.vercel.app/entrar')
$$);

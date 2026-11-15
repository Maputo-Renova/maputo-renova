# Rotina de release e monitorização

## Antes de cada release (checklist)

1. **CI e E2E verdes** no commit a publicar (GitHub → Actions). O deploy para
   a Vercel é automático no push ao `main` — não publicar com Actions vermelhas.
2. **Migrações**: qualquer alteração à base de dados existe nos dois sítios —
   aplicada no projecto Supabase de produção **e** commitada em
   `supabase/migrations/` (a CI reconstrói a base do zero e denuncia desvios).
3. **Advisors do Supabase** (dashboard → Advisors, ou MCP `get_advisors`):
   - `security`: zero itens novos. Itens conhecidos e aceites: helpers de RLS
     (`fn_meu_papel`, `fn_meus_flats`, …) executáveis pela API — só devolvem
     dados do próprio; `transaccoes_moveis` com RLS sem políticas — é
     intencional (só o payment-worker com service role acede).
   - `performance`: zero itens novos. Aceite à escala do piloto:
     `multiple_permissive_policies` (consolidar políticas é um refactor com
     risco de regressão desproporcional ao ganho com dezenas de utilizadores).
4. **Smoke test em produção** após o deploy: entrar, abrir o painel do papel
   em causa e a página alterada.
5. **Segredos**: nada de chaves no repositório; novas chaves só em variáveis
   de ambiente (Vercel/VPS) ou no Vault do Supabase.

## Monitorização contínua (já montada)

| O quê | Onde | Quando |
|---|---|---|
| App no ar + cabeçalhos de segurança + Auth/API do Supabase saudáveis (com RLS a negar o anónimo) | GitHub Actions → workflow **Saúde** (`saude.yml`) — falha fica vermelha e o GitHub notifica por email | a cada 30 min |
| Emails falhados, fila de envios presa, transacções móveis por reconciliar | `fn_alerta_operacional` (pg_cron) → email aos super admins pela fila `envios` | diário, 04:40 UTC |
| Erros de runtime e logs das funções | Vercel → projecto `maputo-renova` → Observability (Runtime Logs / Errors) | consulta na rotina de release e quando o Saúde acusar |
| Logs da base de dados e das Edge Functions | Supabase → Logs; fila `envios` (estado `falhou`, coluna `erro`) | idem |

Notas:
- As notificações de workflows agendados falhados vão para quem fez o último
  commit ao workflow; em GitHub → Settings → Notifications, manter "Actions"
  activo. Para mais destinatários, usar o Watch do repositório.
- O alerta operacional diário só envia email quando há pendências (silêncio
  = tudo limpo). Para forçar uma verificação: `select public.fn_alerta_operacional();`
  no SQL editor (devolve o nº de pendências).
- Quando o payment-worker entrar em produção (VPS), acrescentar o seu
  `/saude` ao workflow Saúde e apontar o uptime também ao domínio final.

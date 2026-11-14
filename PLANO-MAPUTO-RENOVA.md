# PLANO MAPUTO RENOVA

Plano mestre do desenvolvimento, da fundação à publicação final e entrega ao cliente.

**Disciplina de uso deste plano (obrigatória):**
1. Antes de iniciar qualquer trabalho, consultar este plano e identificar a etapa em curso.
2. Nenhuma etapa se marca `[x]` sem estar **testada de ponta a ponta** (browser real contra a base de dados real) e **com commit no `main`**.
3. Cada alteração de âmbito (pedido do cliente, decisão de negócio) é registada aqui no mesmo commit em que se implementa.
4. Nada se desenvolve fora do protótipo aprovado (`prototype/index.html`): o protótipo é o contrato de UI/UX. Divergências só com decisão explícita registada em "Decisões".
5. A segurança (secção S) não é uma fase ao fim — cada etapa nova cumpre os requisitos S antes de ser marcada concluída.
6. No fecho de cada etapa escreve-se uma entrada no **Diário de bordo** (fim deste documento): o que foi feito, o que ficou pendente, os desafios encontrados e como foram resolvidos.

**Legenda:** `[x]` concluído e verificado · `[>]` em curso · `[ ]` por fazer · `[!]` bloqueado (depende do cliente/terceiros)

---

## Resumo do estado

| Fase | Estado |
|---|---|
| 0 · Fundações e protótipo | ✅ Concluída |
| 1 · Núcleo em produção | ✅ Concluída (deploy final em curso) |
| 2 · Comunicações e cobrança automática | ⏳ Próxima |
| 3 · Pagamentos digitais (M-Pesa/eMola) | 🔒 Bloqueada por contratos |
| 4 · Associação e projectos | ⏳ Por fazer |
| 5 · Qualidade e CI | ⏳ Por fazer |
| S · Segurança e endurecimento | 🔁 Contínua (base feita) |
| 6 · Lançamento piloto | ⏳ Por fazer |
| 7 · Entrega ao cliente | ⏳ No fim |

**Produção:** https://maputo-renova.vercel.app · Supabase `phgoebpmijqdblllqpft` (eu-west-1) · funções Vercel em `dub1`
**Contas demo:** `consola.demo@` / `gestor.demo@` / `morador.demo@` / `gestor.pendente.demo@` …maputorenova.co.za (password única de demonstração)

---

## Fase 0 — Fundações e protótipo ✅

- [x] Organização GitHub `Maputo-Renova` + repositório `maputo-renova` (isolado da Nebula)
- [x] Projecto Supabase "Maputo Renova" (eu-west-1; migra para a organização do cliente na entrega)
- [x] Projecto Vercel na equipa Nebula (transfere na entrega)
- [x] Protótipo clicável completo (4 perfis, todos os fluxos) — **aprovado pelo cliente**
- [x] Sistema de design registado (DESIGN.md + tokens; verde, Manrope, cartões arredondados)
- [x] Modelo de negócio fechado: fatura com 3 linhas — taxa de condomínio (variável, repassada), **taxa da associação 499 MT** (fundo de projectos; elegibilidade a 100% das flats em dia; valores pagos transitam sempre), **taxa de serviço 15%** (receita; operadores/SMS deduzidos dela)
- [x] Ficha de produto em PDF (`docs/ficha-maputo-renova.pdf`)

## Fase 1 — Núcleo em produção ✅

**Base técnica**
- [x] Next.js 16 (App Router) + Tailwind 4 + @supabase/ssr; proxy de sessão com validação local do JWT (ES256/getClaims — sem ida à rede por navegação)
- [x] 17 migrações SQL versionadas em `supabase/migrations/` (fonte de verdade do esquema)
- [x] RLS por papel em todas as tabelas (super_admin tudo; colaborador cadastra sem finanças; gestor só o seu condomínio; proprietário só a sua flat) com helpers `security definer`
- [x] Latência: funções Vercel fixadas em `dub1`, coladas à base de dados (diagnóstico: 4–6 idas sequenciais × ~170 ms → ~2 ms)

**Fluxos (todos testados de ponta a ponta em browser real)**
- [x] Autenticação real: entrar, recuperar password, convite de registo único por flat (`fn_consumir_convite`), contas pendente/suspensa/sem-perfil
- [x] Agente: cadastro de condomínio (localização completa + gestor + termos) e flat (KYC do proprietário) com anti-duplicação em 2 camadas e mensagens amigáveis; gera convites (proprietário e gestor)
- [x] Faturação automática mensal: `fn_gerar_faturas` (dia 1, idempotente) + `fn_marcar_atrasos` (diário) via pg_cron
- [x] Morador: faturas decompostas (condomínio + associação + serviço), pagamento por transferência com comprovativo para Storage privado, estado "A confirmar"
- [x] Gestor: fila de confirmação de transferências com comprovativo (URL assinada), confirmar/rejeitar via RPC transaccional
- [x] Consola fiel ao protótipo: Visão geral (filtro mês, KPIs, **gestores por aprovar**, tabela de condomínios, **ranking de adimplência**, auditoria) · Condomínios (tabela + detalhe com visão do gestor + novo) · Colaboradores (filtros, convites de uso único, suspender/reactivar) · Repasses (saldo por condomínio, registar com comprovativo) · Configuração (métodos digitais, contas, métodos manuais, taxas)
- [x] Gestor fiel ao protótipo: Tesouraria (fatura consolidada da associação com barra de elegibilidade, movimentos, despesa com fatura obrigatória) · Suporte (tickets) · Avisos
- [x] Morador fiel ao protótipo: A minha flat (só leitura + pedir correcção) · Suporte · Avisos
- [x] O meu perfil em todos os papéis (nome; password com verificação da actual; email bloqueado por papel)
- [x] Dados demo: Jardim das Acácias (JDA, 3 flats) + Torres do Índico (TDI, gestor pendente para demonstrar aprovação)
- [x] Deploy de produção fiel ao protótipo, com o sistema de ícones SVG portado (navegação, KPIs, cartões, linhas, botões)
- [x] Deploy automático: repositório público ligado ao projecto Vercel — cada push ao `main` publica sozinho (funções em `dub1`)

## Fase 2 — Comunicações e cobrança automática

- [x] Fila de envios na base de dados (`envios`: pendente → enviado/falhou, com erro e dedupe por etapa)
- [x] Edge Function `processar-envios` (Resend) protegida por segredo no Vault; processada pelo pg_cron a cada 5 min
- [x] Régua de cobrança automática: D-5, vencimento, D+3 e D+7 (pg_cron diário, dedupe por fatura/etapa)
- [x] Convites por email: flat registada → proprietário; colaborador/gestor criado → convite de acesso
- [x] Notificações: comprovativo novo → gestor · pagamento confirmado → morador · ticket novo → gestor · aviso → todos os proprietários
- [x] Templates HTML com a marca (verde, cartão branco) gerados no servidor
- [x] Chave Resend configurada pelo cliente nos secrets das Edge Functions; teste de ponta a ponta **entregue** (fila → Edge Function → Resend, estado `delivered`)
- [!] Domínio `maputorenova.co.za` registado (cliente) → verificar no Resend e trocar o remetente de teste (`FROM_EMAIL`)
- [!] Gateway de SMS (fornecedor em Moçambique; contrato em nome do cliente) → régua também por SMS
- [x] Deploy automático a cada push (repositório público + ligação Git no plano gratuito)
- [!] Vercel Pro na entrega (cliente assume) → permite voltar a privar o repositório mantendo o deploy automático

## Fase 3 — Pagamentos digitais 🔒

- [!] Contrato M-Pesa Business (Vodacom, em nome do cliente)
- [ ] Integração M-Pesa C2B: iniciar pagamento + webhook de confirmação (Edge Function com service_role; idempotência por `transacao_operador_id` — índice único já existe)
- [ ] Conciliação automática: pagamento → fatura paga → movimentos (crédito, taxa serviço) sem intervenção
- [!] Contrato eMola (Movitel) → mesma integração
- [ ] Taxas dos operadores gravadas no momento da transacção (esquema pronto: `taxas_metodos`, `pagamentos.taxa_operador`)

## Fase 4 — Associação e projectos

- [ ] Fatura consolidada mensal da associação visível na consola (tabela `associacao_mensal` já existe e liquida-se pelos pagamentos)
- [ ] Reintroduzir Projectos (esquema `projectos`/`votos` já migrado; UI removida a pedido do cliente "por enquanto"): gestor submete → consola valida → assembleia vota → acompanhamento com actualizações
- [ ] Elegibilidade aplicada: só condomínios "em dia" (100%) submetem e votam; valores pagos transitam sempre
- [ ] Relatório mensal exportável na consola (o botão "Exportar relatório" do protótipo)

## Fase 5 — Qualidade e CI

- [ ] GitHub Actions: typecheck + lint + build em cada push/PR
- [ ] Testes E2E Playwright automatizados em CI (os guiões já usados manualmente: ciclo de pagamento, aprovação de gestor, tickets, despesas) contra uma base de dados de teste
- [ ] Ambiente de staging (branch do Supabase + preview da Vercel) para validar migrações antes de produção
- [ ] Monitorização: alertas de erro de runtime (Vercel), `get_advisors` do Supabase na rotina de release
- [ ] `docs/PRODUCT.md` actualizado como especificação viva a cada fase

## Fase S — Segurança e endurecimento 🔁 (contínua; requisito central)

**Feito**
- [x] RLS activo em todas as tabelas; escrita financeira sensível só por funções `security definer` com verificação de papel
- [x] Storage privado (`comprovativos`): upload só na pasta do próprio; leitura só dono/gestor/consola; acesso por URL assinada de curta duração
- [x] Segredos nunca no repositório (apenas chave publicável do Supabase, que é pública por desenho); `.env.local` fora do git
- [x] Gestor "pendente": autentica mas o RLS (estado='activo') nega qualquer dado de gestão até aprovação da consola
- [x] Convites de uso único com validade (flats e acessos); anti-duplicação de cadastro em 2 camadas
- [x] JWT assimétrico (ES256) com validação local; sessão renovada por cookies httpOnly
- [x] Alterar password exige a password actual; emails bloqueados (só gestor/consola alteram, conforme o papel)

**Por fazer (gate de lançamento — nenhuma vai a piloto sem isto)**
- [x] Auditoria automática por triggers: aprovações/suspensões de perfis, taxas, contas, métodos, repasses, pagamentos confirmados/rejeitados, convites e despesas → tabela `auditoria`
- [x] Suite de testes de RLS (`supabase/tests/rls_teste.sql`, transaccional com rollback): anónimo, morador, gestor, gestor pendente e consola — **a passar por inteiro**
- [x] `get_advisors` security corrido e tratado: funções de trigger e de cron deixaram de ser invocáveis pela API; helpers de RLS mantêm execução por serem avaliados nas políticas (só devolvem dados do próprio — risco aceite)
- [x] Verificação de ficheiros carregados: 10 MB, PDF/JPEG/PNG/WebP — imposta no bucket (Storage), nos server actions e no cliente
- [x] MFA (TOTP): activação no perfil com QR, código pedido no login e **imposto na base de dados** (política restritiva: sessão sem código vê zero dados) — testado de ponta a ponta
- [x] Cabeçalhos de segurança na app (CSP, HSTS, nosniff, frame-ancestors none, Referrer-Policy, Permissions-Policy) — verificados na resposta
- [x] Termos e Condições + Política de Privacidade publicados (/termos, /privacidade) — *versão de trabalho, sujeita a revisão jurídica*
- [x] Dependabot semanal no repositório (`.github/dependabot.yml`)
- [!] Protecção contra passwords vazadas (HaveIBeenPwned): toggle no dashboard do Supabase → Auth (cliente)
- [!] Backups/PITR: exige Supabase Pro — assumir no go-live (cliente)
- [ ] `npm audit` na CI (entra com a Fase 5)
- [ ] Remover contas demo e dados de teste antes do go-live

## Fase 6 — Lançamento piloto

- [ ] Checklist de go-live (Fase S completa + Fases 2 obrigatórias: emails e régua)
- [ ] Condomínio piloto real cadastrado com o cliente (dados reais, gestor real)
- [ ] Formação: guia do gestor e do morador (1 página cada) + sessão com o cliente
- [ ] Período de acompanhamento com correcções rápidas (1–2 semanas)

## Fase 7 — Entrega ao cliente

- [ ] Transferir organização/repositório GitHub para o cliente
- [ ] Transferir projecto Supabase para a organização do cliente
- [ ] Transferir projecto Vercel (equipa do cliente, plano Pro)
- [ ] **Rotação de todas as chaves e credenciais** após a transferência
- [ ] Contratos todos em nome do cliente (M-Pesa, eMola, SMS, Resend, domínio) — verificação final
- [ ] Documentação de operação: runbook (como aprovar, repassar, emitir, responder), arquitectura e acessos

---

## Decisões registadas

| Data | Decisão |
|---|---|
| Out 2026 | Flat registada em nome do **proprietário** (não inquilino); registo único por flat via convite de uso único |
| Out 2026 | Pagamentos directos sem agregadores — cobrança e repasse pela plataforma |
| Out 2026 | Taxa de manutenção renomeada **taxa de serviço** (15%, operadores/SMS deduzidos dela) |
| Out 2026 | Associação por **elegibilidade** (não tudo-ou-nada) + ranking de adimplência na consola |
| Out 2026 | Projectos **removidos da UI por enquanto** (esquema mantido; voltam na Fase 4) |
| Nov 2026 | Lembretes **automáticos** (sem botão); métodos de pagamento dentro de Configuração |
| Nov 2026 | O protótipo aprovado é o contrato de UI — a app segue-o à letra |
| Nov 2026 | Funções Vercel fixadas em `dub1` (latência); middleware valida JWT localmente |

---

## Diário de bordo

### 14 Nov 2026 · Fase 1 — Núcleo em produção
**Feito:** autenticação real, cadastro do agente com anti-duplicação, faturação automática (pg_cron), pagamento por transferência com comprovativo, fila de confirmação do gestor; ciclo completo testado em browser real.
**Pendente:** nada do âmbito; M-Pesa fica para a Fase 3 (contrato).
**Desafios e soluções:** (1) o proxy da sessão não alcançava o Supabase — criado ambiente cloud próprio com o host permitido; (2) o fetch do Node ignorava o proxy — resolvido com `instrumentation.ts` (undici); (3) avisos "unstable value" do Next 16 — resolvido com `cacheComponents: false` + `connection()`.

### 14 Nov 2026 · Fidelidade ao protótipo
**Feito:** consola reconstruída com a estrutura exacta do protótipo (Visão geral com mês/ranking/aprovações, Condomínios, Colaboradores, Repasses, Configuração), Tesouraria/Suporte/Avisos do gestor, A minha flat/Suporte/Avisos do morador, O meu perfil em todos os papéis; migrações de tickets e convites de acesso; tudo testado de ponta a ponta.
**Pendente:** nada.
**Desafios e soluções:** o cliente apontou (bem) que a app divergia do protótipo — a aba "Gestores" inventada foi removida e o protótipo passou a regra escrita deste plano; utilizadores demo criados por SQL falhavam no login ("Database error querying schema") — resolvido normalizando as colunas de token do GoTrue para `''`.

### 14 Nov 2026 · Latência, deploy automático e ícones
**Feito:** diagnóstico da lentidão (funções na Cidade do Cabo ↔ base de dados na Irlanda, 4–6 idas × ~170 ms) resolvido fixando as funções em `dub1` e validando o JWT localmente no middleware (ES256/getClaims); repositório tornado público e projecto Vercel ligado ao Git — deploy automático a cada push; sistema de 33 ícones SVG do protótipo portado para toda a app (skill impeccable; glifos Unicode eliminados).
**Pendente:** Vercel Pro na entrega para voltar a privar o repositório sem perder o deploy automático.
**Desafios e soluções:** o domínio `maputo-renova.vercel.app` ficou preso ao projecto antigo — o cliente apagou-o no dashboard e o domínio foi anexado ao novo; dois agentes antigos de deploy manual continuavam vivos a pedir confirmações — identificados e terminados.

### 14 Nov 2026 · Fase 2 — Emails e régua de cobrança
**Feito:** fila de envios na base de dados com dedupe; Edge Function `processar-envios` (Resend) protegida por segredo no Vault e verificada (403 sem segredo, 503 sem chave); régua D-5/D0/D+3/D+7 agendada; gatilhos de email para convites (flat e acesso), comprovativos, pagamentos confirmados, tickets e avisos; templates HTML com a marca; envio de teste em fila.
**Pendente:** domínio próprio no Resend quando `maputorenova.co.za` existir (trocar `FROM_EMAIL`); SMS com contrato do operador. A chave Resend foi configurada pelo cliente no dashboard e o teste chegou com estado `delivered`.
**Desafios e soluções:** a criação automática da chave Resend foi (correctamente) travada pelo classificador de permissões — a chave passa a ser criada pelo cliente no dashboard do Resend e colada só no Supabase; o segredo do processador ia parar ao repositório público na migração — movido para o Vault do Supabase com leitura via função restrita ao service_role.

### 14 Nov 2026 · Fase S — Segurança e endurecimento
**Feito:** auditoria automática por triggers em todas as acções sensíveis; suite de testes de RLS por papel (anónimo, morador, gestor, gestor pendente, consola) a passar com rollback; advisors de segurança tratados (funções de trigger/cron retiradas da API); MFA TOTP completo — activação com QR no perfil, código no login e política restritiva na base de dados (sessão sem segundo factor vê zero dados), testado com códigos TOTP reais; limites de upload no bucket, servidor e cliente; cabeçalhos CSP/HSTS/nosniff/frame-ancestors; Termos e Privacidade publicados; Dependabot.
**Pendente:** toggle de passwords vazadas no dashboard (cliente); backups PITR exigem Supabase Pro no go-live; npm audit entra com a CI (Fase 5); remover contas demo antes do lançamento.
**Desafios e soluções:** a suite de RLS encontrou um defeito real logo à primeira — pedidos anónimos rebentavam com "permission denied" nos helpers em vez de devolver vazio (corrigido com grant inofensivo, migração 00021); os advisors apanharam as funções novas expostas na API (revogadas na 00022); o teste de MFA parou a meio com o factor activo e a conta demo quase ficou trancada — factor removido por SQL e o teste refeito com o proxy corrigido, desta vez com limpeza garantida no fim.

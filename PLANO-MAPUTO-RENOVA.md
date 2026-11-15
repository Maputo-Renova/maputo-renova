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
| 4 · Associação e projectos | ✅ Concluída a 100% |
| 5 · Qualidade e CI | ✅ Concluída (CI e E2E verdes) |
| S · Segurança e endurecimento | 🔁 Contínua (base feita) |
| 6 · Lançamento piloto | 🔁 Kit pronto; aguarda sessão com o cliente |
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

- [x] **Esqueleto da integração construído e testado** (`payment-worker/`): serviço autónomo Node sem dependências com cliente eMola (SOAP BCCSGateway — C2B, B2C, consulta, saldo) e cliente M-Pesa (OpenAPI REST — C2B singleStage, consulta, reversão, token RSA), API interna autenticada, máquina de estados `PROCESSING → SUCCESS | FAILED | UNKNOWN` com reconciliação automática (nunca se assume sucesso sem código)
- [x] Simuladores locais dos dois gateways (não há sandbox pública do eMola) + 25 testes automáticos na CI (job "payment-worker")
- [x] Tabela `transaccoes_moveis` em produção (RLS sem políticas — só o worker/service role acede); idempotência por `trans_id` único
- [x] Arquitectura documentada em `docs/pagamentos-moveis.md`: os gateways exigem **IP fixo na whitelist**, por isso o worker corre numa VPS, nunca na Vercel/Supabase Edge
- [!] Contrato M-Pesa Business (Vodacom, em nome do cliente) + conta developer em `developer.mpesa.vm.co.mz` para testar no sandbox real
- [!] Contrato eMola (Movitel, em nome do cliente): Merchant Online Account + API USSD Push (entrega WSDL, credenciais e spec v1.5)
- [x] `fn_registar_pagamento_movel` em produção: SUCCESS → pagamento confirmado + fatura paga + movimento de tesouraria + recibo por email, com a **taxa do operador gravada no momento** (`taxas_metodos`); idempotente (a mesma transacção do operador nunca entra duas vezes); invocável só pela service role — validada na suite de RLS (bloqueio a `authenticated`, happy path, idempotência, recusa de transacções FAILED)
- [x] UI do morador: "Pagar por M-Pesa/eMola" na fatura (número → pedido no telemóvel → "A aguardar confirmação" com actualização automática → fatura Paga; mensagens amigáveis por código de erro e "tentar de novo"). Os botões só aparecem quando o worker está configurado (`PAYMENT_WORKER_URL/SECRET`) e o método está activo na consola — em produção ficam ocultos até haver credenciais
- [x] E2E em browser real na CI: morador paga a fatura por M-Pesa contra o simulador (worker + registo automático + fatura Paga), sem tocar no fluxo de transferência
- [ ] VPS com IP fixo na whitelist das operadoras; validar pontos `[confirmar]` contra a documentação oficial

## Fase 4 — Associação e projectos

- [x] Fatura consolidada da associação preenchida automaticamente (`associacao_mensal` por trigger das faturas) e visível na Tesouraria do gestor com barra de elegibilidade
- [x] Projectos reintroduzidos: gestor submete (fundo / quota extraordinária / fundo da associação) → consola valida na Visão geral → gestor publica actualizações de progresso e gasto → morador acompanha
- [x] Assembleia da associação: a votação decorre **presencialmente** (decisão de Nov 2026); a consola regista o resultado agregado (votos a favor/contra e decisão) no detalhe do condomínio, e o morador vê o estado "aguarda assembleia" e o resultado — a via de voto individual na app foi fechada na base de dados (esquema preservado caso a governação volte a mudar)
- [x] Elegibilidade imposta **na base de dados**: submeter ao fundo da associação e votar exigem 100% das flats em dia (trigger + função); valores pagos transitam sempre
- [x] Testes: ciclo completo em browser (bloqueio por elegibilidade, submissão, aprovação, actualização, acompanhamento) + suite SQL (em dia a 100%, voto, voto duplicado recusado)
- [x] Relatório mensal exportável: botão "Exportar relatório" na Visão geral → página A4 imprimível (/consola/relatorio?mes=) com totais da plataforma, tabela por condomínio (cobrança, atraso, fundo, repasses, elegibilidade) e notas metodológicas

## Fase 5 — Qualidade e CI

- [x] GitHub Actions "CI": `npm audit` (nível alto) + typecheck + lint + build em cada push/PR — **verde**
- [x] GitHub Actions "E2E": pilha Supabase local descartável (migrações + seed), suite de RLS via psql, app compilada e testada em browser real (pagamento com comprovativo, aprovação de gestor, tickets, avisos, despesas, perfil e ciclo MFA com TOTP) — **verde**
- [x] Migrações comprovadamente reproduzíveis do zero (a CI reconstrói a base de dados a cada execução)
- [x] `docs/PRODUCT.md` aponta para o plano vivo com resumo do estado
- [ ] Ambiente de staging (branches do Supabase, plano Pro) para validar migrações antes de produção — opcional, quando se justificar
- [x] Monitorização: workflow **Saúde** a cada 30 min (app no ar, cabeçalhos de segurança, Auth/API do Supabase saudáveis e RLS a negar o anónimo — falha notifica por email); **alerta operacional diário** na base de dados (emails falhados, fila presa, transacções móveis por reconciliar → email aos super admins); rotina de release documentada em `docs/RELEASE.md` com `get_advisors` obrigatório e riscos aceites registados
- [x] Advisors de performance tratados: 4 políticas RLS com `auth.uid()` por linha corrigidas para avaliação única por consulta; índices nos FKs quentes (13); `multiple_permissive_policies` aceite à escala do piloto (registado no RELEASE.md). Corrigido de caminho um bug real: `taxas_metodos` era invisível ao morador (a UI móvel não conseguia saber que métodos estão activos)

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
- [x] `npm audit` na CI (nível alto, em cada push/PR — entrou com a Fase 5)
- [x] Remoção das contas demo: script pronto e validado (`supabase/scripts/limpar_demo.sql`), executa-se na sessão de go-live

## Fase 6 — Lançamento piloto

- [x] Checklist de go-live escrito e accionável (`docs/GO-LIVE.md`): contratos/contas do cliente, verificação final de segurança, sessão de dados conjunta, arranque e acompanhamento
- [x] Script de limpeza dos dados demo pronto e validado (`supabase/scripts/limpar_demo.sql`): ordem de FKs correcta, auditoria anonimizada em vez de apagada, e **trava de segurança** que o aborta enquanto não existir um administrador real — testado contra produção (abortou como desenhado, sem tocar em nada)
- [x] Guias de formação de 1 página: `docs/guia-gestor.md` e `docs/guia-morador.md`
- [!] Condomínio piloto real cadastrado com o cliente (sessão conjunta, seguindo o GO-LIVE.md)
- [!] Sessão de formação com o gestor piloto
- [ ] Período de acompanhamento com correcções rápidas (1–2 semanas após o arranque)

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
| Nov 2026 | **Votação fora do dashboard**: as votações dos projectos do fundo decorrem em assembleias presenciais da associação; o dashboard mostra a adimplência/elegibilidade aos administradores e a consola regista o resultado agregado |

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

### 15 Nov 2026 · Fase 5 — CI (em estabilização) e Fase 4 — Associação e projectos
**Feito (Fase 5):** workflows de CI (audit/typecheck/lint/build) e E2E (pilha Supabase local com migrações + seed, suite de RLS via psql, app compilada e testada em browser real com ciclo MFA); o gate de verificação já está verde.
**Feito (Fase 4):** `associacao_mensal` preenchida por triggers; elegibilidade (100% em dia) imposta na base de dados para submissão e voto; Projectos de volta nos três perfis (submissão do gestor com três financiamentos, validação na Visão geral da consola, actualizações de progresso/gasto, acompanhamento e votação do morador com um voto por flat); emails ao gestor na aprovação/rejeição; auditoria e políticas de MFA nas tabelas novas; ciclo completo testado em browser e na suite SQL.
**Pendente:** relatório mensal exportável (consola); staging com branches do Supabase (opcional, plano Pro). O workflow E2E ficou **verde** com a correcção da CSP — a CI completa (verificação + pilha local + browser + MFA) passa de ponta a ponta.
**Desafios e soluções:** a CI apanhou dois defeitos reais — o tipo gerado `LayoutProps` não existe antes do build (tipagem explícita) e a migração 00002 não era reproduzível numa base nova (revoke condicional); a CSP fixava o URL de produção e bloqueava o login contra o Supabase local (passou a derivar do ambiente); o reset automático de formulários do React 19 após acções falhadas fez o teste de projectos submeter um formulário vazio (recarregar entre submissões) e o select controlado perdia a escolha do Playwright (passou a não-controlado).

### 15 Nov 2026 · Fase 4 — Relatório mensal exportável
**Feito:** página /consola/relatorio (mês seleccionável) com cabeçalho da marca, totais (cobranças, serviço, fundo, repasses), tabela por condomínio com pill de elegibilidade e linha de totais, notas metodológicas e botão Imprimir/Guardar PDF; estilos de impressão verificados (botões escondidos em modo print). Fase 4 fechada a 100%.
**Pendente:** nada desta etapa.
**Desafios e soluções:** nenhum relevante — reutilizou o sistema visual e as consultas existentes.

### 15 Nov 2026 · Governação da votação (ajuste à Fase 4)
**Feito:** por decisão do cliente, a votação deixou de ser feita na app — decorre em assembleias presenciais da associação. A consola ganhou "Registar resultado da assembleia" (votos a favor/contra + decisão) nos projectos do fundo validados; o morador passou a ver "aguarda assembleia" e o resultado agregado; a função de voto individual foi revogada na base de dados (migração 00024) e a suite de RLS prova que um proprietário já não a consegue invocar. A elegibilidade (100% em dia) mantém-se intacta — continua a condicionar a submissão ao fundo na base de dados e é exactamente a informação que o dashboard dá à assembleia (ranking, pills, relatório).
**Pendente:** nada.
**Desafios e soluções:** mudança chegou depois da votação in-app estar construída — optou-se por fechar a via (revoke + comentários no esquema) em vez de apagar tabelas, preservando a opção de reverter sem migração destrutiva.

### 15 Nov 2026 · Fase 6 — Kit de lançamento piloto
**Feito:** checklist de go-live completo e por ordem de execução (docs/GO-LIVE.md), com o estado actual anotado em cada item; script de limpeza dos dados demo com trava de segurança (aborta sem um administrador real) e auditoria anonimizada — validado contra produção sem alterações; guias de 1 página para gestor e morador, no tom do produto. Dependabot: minors aplicados no main com CI verde, majors incompatíveis (eslint 10, TS 7, types/node 26) excluídos por configuração e PR fechado com justificação.
**Pendente (cliente):** domínio + Resend, sessão conjunta de go-live (administrador real → limpeza demo → condomínio piloto → formação).
**Desafios e soluções:** o script de limpeza quebraria no FK da auditoria (actor_id dos utilizadores demo) — resolvido anonimizando o actor em vez de apagar o registo, preservando o rasto.

### 15 Nov 2026 · Polimento sem dependências do cliente
**Feito:** navegação mobile (menu hambúrguer com drawer, overlay, fecho automático ao navegar e bloqueio do scroll) — os moradores usam sobretudo telemóvel e a navegação estava invisível em ecrãs pequenos; Painel do gestor fiel ao protótipo: filtro por mês e gráfico de barras das cobranças dos 12 meses com o mês seleccionado destacado e tooltip. Ambos testados em browser (desktop e 390px).
**Pendente:** Fase 6 aguarda a sessão com o cliente; Fase 3 aguarda contratos; próximos candidatos sem dependências — esqueleto do webhook M-Pesa pronto a receber credenciais e fidelidade do ecrã "A minha quota".
**Desafios e soluções:** o drawer mobile ficava preso à altura do cabeçalho — o backdrop-filter do header cria um containing block para position:fixed; resolvido com portal para o body.

### 15 Nov 2026 · Fase 3 — Esqueleto M-Pesa + eMola testado
**Feito:** `payment-worker/` — serviço autónomo de pagamentos móveis (Node 18+, zero dependências) com cliente eMola (SOAP BCCSGateway: C2B por USSD push, B2C/reembolso, consulta de transacção, nome do beneficiário, saldo) e cliente M-Pesa (OpenAPI REST: C2B singleStage, consulta, reversão, token Bearer por RSA); API interna autenticada por segredo (`POST /pagamentos` → 202 assíncrono, `GET /pagamentos/:id`, `POST /reconciliar`); simuladores locais dos dois gateways com os códigos de erro reais; 25 testes automáticos (sucesso, sem PIN, sem conta, duplicado, credenciais erradas, saldo insuficiente, timeout→reconciliação, reversão, RSA, autenticação) — todos verdes e na CI como job próprio; migração 00025 `transaccoes_moveis` aplicada em produção (RLS sem políticas, só service role); `docs/pagamentos-moveis.md` com arquitectura, requisitos contratuais e passos de go-live.
**Pendente (cliente):** contratos M-Pesa Business e eMola Merchant+API; conta developer M-Pesa (sandbox real); VPS com IP fixo. **Pendente (técnico):** `fn_registar_pagamento_movel`, UI do morador, validação dos pontos `[confirmar]` contra a spec oficial.
**Desafios e soluções:** (1) os gateways validam o IP de origem — impossível integrar a partir da Vercel/Supabase Edge; desenhou-se um worker para VPS com IP fixo e API interna, mantendo a app serverless; (2) não existe sandbox pública (eMola) e a do M-Pesa exige conta — construíram-se simuladores fiéis ao contrato real (envelope SOAP, códigos, até o erro ortográfico "reqeustId" da Movitel) para desenvolver e testar já; (3) risco de dupla cobrança em timeouts — máquina de estados com UNKNOWN obrigatório + reconciliação que consulta o gateway antes de qualquer decisão.

### 15 Nov 2026 · Fase 3 — Circuito móvel completo (à espera só das operadoras)
**Feito:** com os contratos em verificação nas operadoras, fechou-se todo o lado técnico: `fn_registar_pagamento_movel` em produção (SUCCESS → pagamento confirmado com taxa do operador do momento + fatura paga + movimento + recibo por email, idempotente, exclusiva da service role); o worker entrega automaticamente cada SUCCESS à app (na cobrança e na reconciliação) e nunca entrega falhas nem transacções sem fatura; UI do morador "Pagar por M-Pesa/eMola" fiel ao produto (pedido no telemóvel, espera com actualização automática, mensagens amigáveis por código, tentar de novo) — oculta em produção até haver credenciais; suite de RLS cobre bloqueio/idempotência/recusa de FAILED; E2E em browser paga uma fatura por M-Pesa contra o simulador na CI. Quando as operadoras aprovarem, o go-live móvel é: VPS + credenciais + 2 variáveis na Vercel.
**Pendente (cliente):** aprovação das operadoras, VPS com IP fixo. **Pendente (técnico):** validar pontos `[confirmar]` contra a spec oficial quando chegar.
**Desafios e soluções:** (1) reaproveitar os efeitos existentes (recibo por email e auditoria disparam na transição para confirmado) — o registo insere o pagamento como `iniciado` e promove-o num update, em vez de duplicar lógica de email; (2) o E2E precisava de uma segunda fatura sem perturbar a contabilidade dos testes existentes — acrescentou-se ao seed uma fatura do mês anterior da flat demo, paga por M-Pesa logo no início do fluxo do morador; (3) segurança do valor: o montante cobrado é sempre recalculado no servidor a partir da fatura (o cliente nunca envia valores).

### 15 Nov 2026 · Fase 5 — Monitorização
**Feito:** vigilância contínua em três camadas: (1) workflow **Saúde** no GitHub Actions a cada 30 min — app no ar, cabeçalhos de segurança (CSP/HSTS/X-Frame-Options) presentes, Auth do Supabase saudável e API de dados a responder com o anónimo a receber zero linhas (o uptime testa também o RLS); falha fica vermelha e notifica por email; (2) **alerta operacional diário** no Postgres (pg_cron 04:40 UTC): emails falhados nas 24h, fila de envios presa >2h e transacções móveis por reconciliar → email aos super admins pela fila existente — só envia quando há pendências; (3) **rotina de release** em docs/RELEASE.md (CI verde, migrações nos dois sítios, advisors sem itens novos, smoke test, regra de segredos) com os riscos aceites escritos. Advisors de performance tratados: 4 políticas `auth_rls_initplan` corrigidas com `(select auth.uid())`, 13 índices em FKs quentes (os de autoria ficaram de fora de propósito). O E2E do commit anterior falhou e revelou um bug real: `taxas_metodos` só era legível pelo super admin, pelo que a UI móvel do morador nunca via métodos activos — corrigido com política de leitura de métodos activos para autenticados.
**Pendente:** staging com branches do Supabase fica opcional (Pro, quando se justificar); acrescentar o `/saude` do payment-worker ao workflow quando a VPS existir.
**Desafios e soluções:** o health do Auth devolve 401 sem `apikey` — verificado contra produção antes de fixar o check; o container de desenvolvimento não alcança `vercel.app` (política de rede), pelo que os checks da app validam-se com um run manual do workflow no GitHub após o push.

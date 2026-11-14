# PLANO MAPUTO RENOVA

Plano mestre do desenvolvimento, da fundação à publicação final e entrega ao cliente.

**Disciplina de uso deste plano (obrigatória):**
1. Antes de iniciar qualquer trabalho, consultar este plano e identificar a etapa em curso.
2. Nenhuma etapa se marca `[x]` sem estar **testada de ponta a ponta** (browser real contra a base de dados real) e **com commit no `main`**.
3. Cada alteração de âmbito (pedido do cliente, decisão de negócio) é registada aqui no mesmo commit em que se implementa.
4. Nada se desenvolve fora do protótipo aprovado (`prototype/index.html`): o protótipo é o contrato de UI/UX. Divergências só com decisão explícita registada em "Decisões".
5. A segurança (secção S) não é uma fase ao fim — cada etapa nova cumpre os requisitos S antes de ser marcada concluída.

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

- [ ] Resend: domínio de envio verificado + templates (convite de acesso, recuperação, fatura emitida, confirmação de pagamento, aviso do gestor)
- [ ] Régua de cobrança real: pg_cron → fila `envios` → email (D-5, vencimento, D+3, D+7), com custo registado por envio
- [ ] Envio dos convites por email (hoje o código é entregue manualmente pela consola/agente)
- [!] Gateway de SMS (fornecedor em Moçambique; contrato em nome do cliente) → régua também por SMS
- [!] Domínio `maputorenova.co.za` registado (cliente) → DNS na Vercel + emails `@maputorenova.co.za`
- [x] Deploy automático a cada push (repositório público + ligação Git no plano gratuito)
- [!] Vercel Pro na entrega (cliente assume) → permite voltar a privar o repositório mantendo o deploy automático
- [ ] Notificação ao gestor quando entra comprovativo/ticket novo

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
- [ ] Auditoria automática por triggers nas acções sensíveis (aprovações, taxas, contas, repasses, suspensões) → tabela `auditoria` (hoje existe mas não é alimentada)
- [ ] Revisão formal de RLS: suite de testes SQL que prova, papel a papel, o que cada um NÃO consegue ler/escrever
- [ ] `get_advisors` (security + performance) limpo antes de cada release
- [ ] Backups: confirmar PITR/retenção no Supabase e testar um restauro
- [ ] Protecção de abuso: rate limiting no Auth (Supabase) e verificação de ficheiros carregados (tipo/tamanho)
- [ ] MFA obrigatório para contas da consola (super_admin)
- [ ] Cabeçalhos de segurança na app (CSP, HSTS, nosniff, frame-deny) via `next.config.ts`
- [ ] Política de privacidade e termos finais (dados KYC: BI/NUIT/morada — minimização, retenção e acesso registado)
- [ ] Dependabot/renovate no repositório + `npm audit` na CI
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

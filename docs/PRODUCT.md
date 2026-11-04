# Maputo Renova — Produto

Sistema de gestão de condomínios para Maputo, Moçambique. Multi-condomínio (cada condomínio é um tenant isolado), moeda única MZN, mobile-first e leve em dados.

**Domínio:** maputorenova.co.za

## Ciclo central (o coração do produto)

> Emitir mensalidade → avisar o proprietário (SMS/email) → proprietário paga (M-Pesa, eMola ou transferência bancária) → sistema concilia → gestor vê quem pagou e quem deve → plataforma repassa ao condomínio.

## Modelo financeiro

- **Pagamentos directos** (sem agregador): M-Pesa e eMola entram na conta business da empresa operadora; a plataforma é um sistema de **cobrança e repasse**.
- **Taxa de manutenção de 15%** (configurável pelo super admin; override por condomínio): é a **única taxa que o morador vê** — paga quota + 15% em qualquer método. **Todas as outras taxas saem destes 15%**: taxas dos operadores (M-Pesa/eMola), custos de SMS, etc.; o remanescente é a receita da plataforma.
- **O condomínio recebe a quota por inteiro** no seu razão; a manutenção pertence à plataforma.
- **Repasses:** manuais no MVP (transferência bancária ao condomínio, com comprovativo); cada condomínio tem um livro-razão (créditos de cobranças − taxa da plataforma − repasses = saldo a repassar).
- Cada pagamento grava **valor bruto, taxa do operador e valor líquido no momento da transacção** (taxas mudam; nunca recalcular retroactivamente).

## Papéis (4 níveis de acesso)

1. **Super Administrador (consola):** visão global de todas as organizações e finanças (bruto, taxas, líquido, inadimplência); gere a **equipa da plataforma** com três funções — **Administrador** (consola total), **Agente** (cadastros) e **Gestor** (condomínio) — criar, suspender, reactivar, remover (**exclusivo dele**); configura métodos de pagamento, contas bancárias da plataforma, taxas e % da plataforma; regista repasses; auditoria.
2. **Agente (colaborador):** cadastro operacional — cria condomínios, regista flats, gera convites de registo. **Não vê dados financeiros.**
3. **Gestor do condomínio:** registo sujeito a **aprovação da consola** — depois do cadastro consegue fazer login, mas só pode gerir o condomínio quando o super admin o aprovar (perfil `pendente` → `activo`; o RLS nega acesso aos dados até lá). Depois de aprovado: apenas o seu condomínio — mapa de flats com estado de pagamento, devedores, confirmação de transferências bancárias (valida comprovativo), despesas, avisos, razão e repasses recebidos.
4. **Proprietário (morador):** a conta pertence ao **proprietário do apartamento, não ao inquilino** — registo único por flat via código de convite de uso único. Vê as suas **faturas por estado (pendentes, pagas, não pagas/em atraso)** e o **histórico de pagamentos** com recibos, paga via M-Pesa/eMola (incluindo faturas em atraso) ou submete comprovativo de transferência, recebe recibos e avisos.

## Regras de negócio críticas

### Anti-duplicação de flats (aplicada no banco, não só na interface)
1. **Identidade física:** índice único sobre (condomínio, bloco, andar, número) com normalização (minúsculas, sem acentos, espaços colapsados).
2. **Cruzamento proprietário + flat + endereço:** fingerprint único de (nome do proprietário + identificação da flat + endereço do condomínio) normalizados. Se os três coincidirem, o INSERT é negado pelo Postgres e a interface mostra o registo em conflito.

### Registo único por flat
Cada flat tem um código de convite de uso único ligado a ela; quem o usa fica vinculado àquela flat (consumido na criação da conta, não no clique). O vínculo só muda por acção administrativa (mudança de proprietário), com auditoria.

### Identificação (KYC)
O cadastro de **gestores e proprietários** inclui: nome e apelido, data de nascimento, **NUIT**, e **BI ou Passaporte** — número e cópia do documento (ficheiro anexado ou foto tirada na hora), guardada no Storage privado. A **residência exige comprovativo de endereço** (fatura de água ou electricidade recente, dos últimos 3 meses). As cópias só podem ser substituídas pela administração.

### Referência única de cadastro
Cada flat recebe uma **referência única alfanumérica** gerada automaticamente no banco: código do condomínio (iniciais, ex.: JDA) + bloco + número — ex.: **JDA-A302** — com sufixo numérico em caso de colisão. Cada condomínio recebe o seu código curto único. A referência identifica a flat em toda a comunicação e nos ecrãs de gestor, consola e proprietário.

### Faturas e conciliação
- Mensalidades geradas automaticamente por mês de referência (única por flat+mês), com **referência única** (ex.: MR-000123) usada na transferência bancária.
- M-Pesa/eMola: confirmação automática por webhook → fatura paga → recibo por SMS/email.
- Transferência: proprietário submete comprovativo → fila "a confirmar" do gestor → aprovação manual.

## Pagamentos (integração directa)

- **M-Pesa (Vodacom):** M-Pesa OpenAPI (developer.mpesa.vm.co.mz), fluxo C2B (push USSD + PIN). Requer contrato business com a Vodacom — iniciar cedo, é o maior prazo do projecto.
- **eMola (Movitel):** requer acordo comercial com a Movitel; entra quando o contrato sair (Fase 3).
- **Transferência bancária:** sempre disponível desde o MVP (não depende de contratos).
- Contratos (M-Pesa, eMola, SMS, Resend, domínio) **em nome da empresa do cliente desde o dia 1** — não se transferem como código.

## Projectos (obras do condomínio)

- O **gestor cria** o projecto: nome, categoria (Construção, Reparação, Melhoria, Segurança), descrição, **orçamento previsto**, **data prevista** e financiamento — **fundo do condomínio** (sem cobrança extra) ou **quota extraordinária** (orçamento dividido pelas flats e cobrado nas faturas normais, com os mesmos métodos, recibos e lembretes).
- A **consola aprova ou rejeita** (uma quota extraordinária cria cobranças novas; o gestor nunca se auto-aprova — garantido pelo RLS). Estados: pendente → aprovado/rejeitado → concluído.
- Os **proprietários acompanham** os projectos aprovados: progresso físico (% e actualizações datadas do gestor), progresso financeiro (angariado vs orçamento) e a sua quota extraordinária nas Faturas.
- As **despesas** do condomínio podem ser ligadas ao projecto (gasto real vs orçamento) — transparência total.

## Notificações

- **Email:** Resend. **SMS:** gateway local moçambicano (custo por SMS registado em cada envio).
- **Régua de cobrança:** emissão (D−5) → vencimento (D0) → lembretes (D+3, D+7) → recibo ao pagar. SMS curto com valor + link directo; email com detalhe.
- Avisos gerais do gestor (água, assembleia, etc.) para todos os flats.

## Stack

Next.js (App Router) + Vercel · Supabase (Postgres, Auth, RLS, Storage, Edge Functions) · Resend · gateway SMS local · M-Pesa OpenAPI. Interface 100% em português; estados por cor (verde=pago, amarelo=pendente, vermelho=atraso).

**Protótipo primeiro:** protótipo estático clicável das 4 áreas (skillui + impeccable, dados de exemplo em MZN) → aprovação do design → app de produção reutiliza tokens e componentes.

## Ambientes e entrega ao cliente

| Peça | Desenvolvimento | Entrega |
|---|---|---|
| GitHub | Org nova dedicada, repo privado | Transferir propriedade da org/repo ao cliente |
| Supabase | Org nova dedicada, projecto único | Convidar cliente como Owner; cartão dele no plano Pro |
| Vercel | Equipa Nebula Tecnologias | Transferir projecto para a equipa do cliente |
| Segredos | `.env` Vercel/Supabase | **Rotacionar todas as chaves** no dia da entrega |

## Roadmap

- **Fase 0 — Ambiente:** repo, projecto Supabase, schema + RLS + papéis + anti-duplicação. Em paralelo: contrato M-Pesa, registo do domínio.
- **Fase 0.5 — Protótipo** (skillui + impeccable): 4 áreas clicáveis; aprovação do design.
- **Fase 1 — MVP:** cadastro com anti-duplicação, mensalidades automáticas, painel do gestor, portal do proprietário, transferência com comprovativo, avisos por email, razão + repasses manuais.
- **Fase 2 — M-Pesa + SMS:** C2B com webhook, taxas, régua de cobrança por SMS.
- **Fase 3 — Consola completa + eMola:** finanças globais, relatórios exportáveis, eMola.

**Fora do MVP:** reserva de espaços comuns, chat, ocorrências/manutenção, votações, app nativa.

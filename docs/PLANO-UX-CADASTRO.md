# Plano — Correcção do fluxo de cadastro e acesso (UX móvel)

Origem: teste real em telemóvel (17 Nov 2026) pelo cliente. Quatro capturas
analisadas + código e protótipo revistos. Este documento é o diagnóstico e o
plano aprovável; a execução entra como incremento "Fase 6.1".

---

## Diagnóstico (por gravidade)

### P0 · O link de confirmação por email aponta para `localhost:3000` 🔴
O proprietário criou a conta, recebeu o email do Supabase Auth e o link abriu
`localhost:3000` → "Não é possível acessar o site". **Todos os emails do Auth
(confirmação, recuperação de password) estão quebrados em produção.**
Causa: o *Site URL* do projecto Supabase ainda é o valor de desenvolvimento.
Não é código — é configuração do dashboard.

### P1 · Fluxo de criação de conta com fricção a mais 🔴
Hoje o proprietário: recebe um código → abre /convite → cola o código →
escreve email → cria password → é mandado confirmar o email → o link falha
(P0) → teria de voltar a entrar. **Seis passos e uma repetição**, quando o
agente já inseriu todos os dados da pessoa.
Fluxo pretendido (correcto): o agente regista a flat → o proprietário recebe
**um link** → abre, **define apenas a password** → entra directo no painel.
Zero códigos colados, zero segundo login.

### P2 · Área do agente sem a estrutura do protótipo 🟠
1. **Sem abas**: "Registar condomínio" e "Registar flat" estão empilhados na
   mesma página; o protótipo separa-os (flat é o dia-a-dia, condomínio é raro).
2. **Faltam os anexos de documentos** que o protótipo define
   (`camposIdentidade` + comprovativo de endereço): botões "Anexar ficheiro"
   e "Tirar foto" para a cópia do BI/passaporte e para o comprovativo de
   endereço. O esquema da base de dados **já tem** as colunas
   (`proprietario_doc_path`, `comprovativo_endereco_path`) e o bucket privado
   existe — só a UI nunca foi ligada.

### P3 · Formulário ilegível no telemóvel 🟠
Capturas mostram campos em 2–3 colunas espremidos a 390 px: a data de
nascimento sobrepõe o NUIT, rótulos com quebras, alvos de toque pequenos.
O formulário é denso (17+ campos) e não tem agrupamento visual.

### P4 · Termos e Condições sem link 🟡
O checkbox "Li e aceito os Termos e Condições e a Política de Privacidade"
é texto morto — as páginas `/termos` e `/privacidade` existem mas não são
linkadas (nem no /convite nem na declaração do cadastro de condomínio).

---

## Plano de execução (Fase 6.1)

### Incremento A — Destravar o acesso (P0 + P1)

1. **Configuração Supabase (acção do cliente, 2 min, dashboard):**
   Authentication → URL Configuration →
   - Site URL: `https://maputo-renova.vercel.app`
   - Redirect URLs: `https://maputo-renova.vercel.app/**`
2. **Convite por link (sem código, sem segundo login):**
   - Edge Function `convidar-proprietario` (service role): quando o agente
     regista uma flat com email, gera o utilizador + link de convite
     (`admin.generateLink type=invite`) e envia pela fila `envios` com o
     remetente já corrigido. O convite fica **pré-ligado à flat** (o
     `fn_consumir_convite` corre no primeiro acesso, sem o utilizador ver
     código nenhum).
   - Nova página `/definir-password`: chega-se pelo link, só pede password
     (+ aceitar termos), e entra directo no painel do morador.
   - `/convite` com código mantém-se como **caminho alternativo** (proprietário
     sem email no cadastro) — com o link dos termos corrigido (P4).
3. **Critério de aceite (E2E):** agente regista flat com email → email na fila
   → abrir o link → definir password → painel do morador com a flat ligada,
   tudo num único fluxo.

### Incremento B — Área do agente fiel ao protótipo (P2)

1. **Abas** no `/agente`: "Registar flat" (predefinida) · "Registar condomínio"
   · lista "Condomínios cadastrados" (com flats e convites por usar, como no
   protótipo).
2. **Anexos no cadastro da flat**: "Cópia do documento" e "Comprovativo de
   endereço", cada um com *Anexar ficheiro* + *Tirar foto* (input
   `capture="environment"` no móvel), pré-visualização do nome, validação
   10 MB / PDF‑JPEG‑PNG‑WebP (regras já existentes), upload para o bucket
   privado e caminho gravado nas colunas KYC já criadas.
3. **Anexo no cadastro do condomínio**: cópia do documento do gestor
   (`gestor_doc_path`), mesmo padrão.

### Incremento C — Formulários móveis legíveis (P3)

1. **Uma coluna até 640 px** (sm): nada de grids de 2–3 colunas no telemóvel,
   excepto pares curtos comprovados (Bloco·Andar·Número pode ficar a 3 só
   acima de sm).
2. **Secções com título** no formulário da flat: *Localização da flat* →
   *Proprietário* → *Documentos* → *Contacto e quota*; no condomínio:
   *Identificação* → *Endereço* → *Quotas* → *Gestor*.
3. Inputs com altura ≥44 px, `inputmode`/`autocomplete` corretos, data de
   nascimento com largura total no móvel (o widget nativo do iOS precisa).
4. Verificação em browser real a 390 px (screenshots antes/depois) + E2E.

### Incremento D — Termos com link (P4)

- No `/convite`, `/definir-password` e na declaração do cadastro de
  condomínio: "Li e aceito os [Termos e Condições](/termos) e a
  [Política de Privacidade](/privacidade)" (abrem em nova aba).

### Ordem e dependências

A1 (cliente, 2 min) → A2–A3 → D → B → C. A é o único com dependência externa;
B, C e D são independentes entre si. Tudo passa pela CI (lint, build, RLS,
E2E) como sempre; o plano principal e o diário de bordo registam cada fecho.

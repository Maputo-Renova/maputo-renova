---
name: Maputo Renova
description: Dashboard financeiro canónico para gestão de condomínios em Maputo — clareza bancária, verde único, estados de pagamento à vista.
colors:
  canvas-quente: "#F4F4F1"
  cartao-branco: "#FFFFFF"
  tinta: "#171E1A"
  tinta-2: "#4F5953"
  tinta-3: "#5E6862"
  linha: "#E7E8E2"
  linha-suave: "#EFF0EA"
  verde-800: "#0A5C36"
  verde-700: "#0C7A46"
  verde-600: "#0E9F5B"
  verde-150: "#D7F0E2"
  verde-100: "#E4F5EC"
  verde-50: "#F1FAF5"
  ambar-700: "#935410"
  ambar-100: "#FBEFD9"
  vermelho-700: "#B3362B"
  vermelho-100: "#FAE7E4"
  azul-700: "#2155A3"
  azul-100: "#E6EEFA"
typography:
  display:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "38px"
    fontWeight: 800
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 800
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  ctl: "10px"
  item: "11px"
  card: "16px"
  modal: "20px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "18px"
  lg: "22px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.verde-600}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.verde-700}"
  button-ghost:
    backgroundColor: "{colors.cartao-branco}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  button-dark:
    backgroundColor: "{colors.tinta}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  card:
    backgroundColor: "{colors.cartao-branco}"
    rounded: "{rounded.card}"
    padding: "22px"
  pill-pago:
    backgroundColor: "{colors.verde-100}"
    textColor: "{colors.verde-800}"
    rounded: "{rounded.pill}"
    padding: "4px 11px"
  pill-pendente:
    backgroundColor: "{colors.ambar-100}"
    textColor: "{colors.ambar-700}"
    rounded: "{rounded.pill}"
    padding: "4px 11px"
  pill-atraso:
    backgroundColor: "{colors.vermelho-100}"
    textColor: "{colors.vermelho-700}"
    rounded: "{rounded.pill}"
    padding: "4px 11px"
  pill-confirmar:
    backgroundColor: "{colors.azul-100}"
    textColor: "{colors.azul-700}"
    rounded: "{rounded.pill}"
    padding: "4px 11px"
  chip:
    backgroundColor: "{colors.cartao-branco}"
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
  chip-on:
    backgroundColor: "{colors.tinta}"
    textColor: "#FFFFFF"
  input:
    backgroundColor: "{colors.cartao-branco}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.ctl}"
    padding: "11px 13px"
  nav-item-active:
    backgroundColor: "{colors.verde-100}"
    textColor: "{colors.verde-800}"
    rounded: "{rounded.item}"
    padding: "10px 12px"
---

# Design System: Maputo Renova

## Overview

**Creative North Star: "O Extracto Bancário Vivo"**

Maputo Renova fala a gramática visual que os seus utilizadores já conhecem das apps bancárias: um dashboard SaaS financeiro canónico, executado com precisão de referência. Tela quente levemente esverdeada, cartões brancos de cantos generosos com sombras suaves deslocadas, e um único verde de marca que faz todo o trabalho de acção e identidade. Não há ornamento nem ritual experimental; a diferenciação vive na clareza absoluta dos estados de pagamento — quatro pills de cor dizem em meio segundo quem pagou, quem deve, quem está em atraso e o que espera confirmação.

A interface é 100% em português (Moçambique, ortografia pré-AO), e os números mandam: Manrope com numerais tabulares, valores em MZN formatados "1 500 MT" com espaço como separador de milhares. A densidade é de ferramenta de trabalho — tabelas, KPIs, filas de confirmação — mas o espaço respira: raio 16px nos cartões, padding 22px, grelhas de 18px.

**Key Characteristics:**
- Um único verde de marca (#0E9F5B) com rampa própria; nenhuma segunda cor de acção.
- Estados de pagamento como vocabulário central: verde pago, âmbar pendente, vermelho atraso, azul a confirmar — sempre fundo claro + texto escuro do mesmo matiz + ponto de 6px.
- Cartões brancos flutuando sobre canvas quente; profundidade por sombra dupla suave, nunca por borda pesada.
- Ícones SVG inline de stroke 1.75, cantos e pontas arredondados; nenhuma icon font.
- Uma única transição de ecrã autorada (fade + subida de 8px); o resto do movimento é micro-feedback de estado.

## Colors

Um verde, uma tinta quase-preta esverdeada, e três cores funcionais que existem apenas como pares estado (fundo-100 + texto-700).

### Primary
- **Verde Renova** (#0E9F5B, `verde-600`): a única cor de marca. Botão primário, barra seleccionada do gráfico, badge de navegação, caret, focus-visible, marca da sidebar, barras de progresso saudáveis.
- **Verde Profundo** (#0C7A46, `verde-700`): hover do botão primário, texto de links, ícones activos da navegação, pontas do gradiente do pay-hero.
- **Verde Floresta** (#0A5C36, `verde-800`): texto sobre fundos verde-claros (pill "pago", item de navegação activo, ::selection).
- **Rampa clara** — `verde-150` (#D7F0E2) barras do gráfico em repouso e ::selection; `verde-100` (#E4F5EC) pastilha activa da navegação, pill pago, ícones de cartão, anel de foco dos inputs; `verde-50` (#F1FAF5) hover de linha de tabela.

### Neutral
- **Tinta** (#171E1A): texto principal, botão escuro, chips seleccionados, tooltip do gráfico, toast. Um quase-preto com temperatura verde.
- **Tinta 2** (#4F5953) e **Tinta 3** (#5E6862): texto secundário e terciário (subtítulos, hints, labels de eixo).
- **Canvas Quente** (#F4F4F1): fundo da aplicação; também fundo de caixas aninhadas (role-box, ref-box, note).
- **Cartão Branco** (#FFFFFF): superfície de todos os cartões, sidebar, controlos.
- **Linha** (#E7E8E2) e **Linha Suave** (#EFF0EA): bordas de 1px e divisores de linhas de tabela/lista. Linha suave também é fundo de hover neutro.

### Funcionais (estado)
- **Âmbar** (#935410 sobre #FBEFD9): pendente. Também ponto "dados de demonstração" e progresso de aviso.
- **Vermelho** (#B3362B sobre #FAE7E4): atraso, rejeição, alerta de duplicação, ponto de notificação, botão de perigo.
- **Azul** (#2155A3 sobre #E6EEFA): a confirmar — exclusivo da fila de transferências bancárias.

### Named Rules
**The Um Só Verde Rule.** O verde é a única cor de marca e de acção. Âmbar, vermelho e azul nunca aparecem como decoração ou acção primária; só existem como semântica de estado, sempre no par fundo-claro + texto-escuro do mesmo matiz.

**The Par de Estado Rule.** Um estado nunca é só cor de texto nem só fundo: é sempre pill (fundo 100 + texto 700/800 + ponto `currentColor` de 6px) ou ícone-em-caixa (`row-ico` com os mesmos pares). As únicas excepções de cor plena são os logótipos dos métodos de pagamento (M-Pesa #C41318, eMola #F28A00), que são identidade de terceiros, não estado.

## Typography

**Display/Body Font:** Manrope (com system-ui, -apple-system, 'Segoe UI', sans-serif)

**Character:** Uma só família a fazer tudo, diferenciada por peso: 400 para corpo, 600–700 para quase tudo o que é interactivo ou rotulado, 800 para títulos e números grandes. Tracking negativo nos tamanhos grandes (-0.02em), tracking largo e maiúsculas nos micro-rótulos. Geometria limpa que lê bem em ecrãs de telemóvel modestos.

### Hierarchy
- **Display** (800, 38px, -0.02em): o valor da quota no pay-hero do proprietário. Números apenas.
- **Headline** (800, 26px → 22px em mobile, -0.02em): h1 de cada ecrã ("Bom dia, Arlindo").
- **KPI** (800, 29px → 25px em mobile, -0.02em, tabular): valores dos cartões KPI, com unidade "MT" em small 15px/700 tinta-3.
- **Title** (800, 16–17px, -0.01em): cabeçalhos de cartão, drawer e modal.
- **Body** (400–700, 13.5–15px, 1.5): texto corrente 15px; células de tabela 14px; metadados e subtítulos 12.5–13.5px em tinta-3.
- **Label** (700, 12px, +0.07–0.08em, MAIÚSCULAS): cabeçalhos de tabela, rótulos de secção da navegação, rótulo do role-box. O único uso de maiúsculas no sistema.

### Named Rules
**The Numerais Tabulares Rule.** Todo o valor monetário, telefone, referência ou número alinhável leva `font-variant-numeric: tabular-nums` (classe `.num`). Moeda formata-se "1 500 MT" — espaço como separador de milhares, "MT" depois do valor.

**The Peso Faz a Hierarquia Rule.** A hierarquia constrói-se com peso (400→700→800) e cor (tinta→tinta-2→tinta-3) antes de tamanho. Não existem itálicos, serifas, nem segunda família.

## Layout

Grelha de aplicação em duas colunas: sidebar branca fixa de 260px (sticky, altura total) + coluna principal. O conteúdo vive num contentor `max-width: 1240px` centrado, com padding horizontal de 32px (18px em mobile). A topbar é sticky com fundo translúcido do canvas (`rgba(244,244,241,.85)` + blur 8px) e ganha borda inferior apenas ao rolar.

Ritmo de espaçamento: 18px entre cartões da grelha (`gap:18px`, `.mt`), 22px de padding interno de cartão, 16px entre cabeçalho de cartão e conteúdo. Grelhas nomeadas: KPIs em 3 colunas (`g-kpi`), composições 2/3+1/3 (`g-23`), metades (`g-12`), 1/3+2/3 (`g-13`).

**Breakpoints (2):**
- **≤1060px:** KPIs passam a 2 colunas; todas as grelhas compostas colapsam para 1 coluna.
- **≤860px (mobile):** sidebar vira drawer off-canvas (min(300px, 86vw), botão de menu aparece, pesquisa da topbar esconde-se); **tabelas viram listas empilhadas** — thead escondido, cada tr vira grelha `1fr auto` com descrição à esquerda e valores/pills à direita; gráfico condensa para os últimos 6 meses; KPIs em 1 coluna; nome do avatar esconde-se.

## Elevation & Depth

Sistema de sombras suaves em dois níveis, sempre na cor da tinta (23,30,26) a baixíssima opacidade — a profundidade é ambiente, nunca estrutural. Cartões não têm borda; a sidebar e os divisores usam linhas de 1px em vez de sombra. Overlays escurecem com `rgba(23,30,26,.38)`.

### Shadow Vocabulary
- **Repouso** (`box-shadow: 0 1px 2px rgba(23,30,26,.05), 0 10px 28px rgba(23,30,26,.07)`, `--shadow`): todos os cartões; também o hover dos botões de método.
- **Elevado** (`box-shadow: 0 2px 4px rgba(23,30,26,.06), 0 16px 40px rgba(23,30,26,.12)`, `--shadow-lift`): drawer, modal, toast, sidebar mobile aberta.
- **Botão primário** (`0 1px 2px rgba(23,30,26,.1), 0 6px 16px rgba(23,30,26,.14)`): a única sombra num controlo em repouso.
- **Pay-hero** (`0 2px 4px rgba(23,30,26,.08), 0 18px 40px rgba(23,30,26,.18)`): a sombra mais funda do sistema, sob o único cartão em gradiente.

### Named Rules
**The Sombra Dupla Rule.** Toda a sombra é um par: um contacto curto (1–2px) + um halo largo e difuso (16–40px), ambos tinta a ≤.18 de opacidade. Nunca sombras duras, nunca offset lateral, nunca preto puro.

## Shapes

Cantos generosos e consistentes por escala de elemento: controlos 10px (`--r-ctl`), itens de navegação e ícones-caixa 11–12px, caixas aninhadas 12–14px, cartões 16px (`--r-card`), modal 20px, e **pílula total (999px)** para tudo o que é botão, pill, chip, pesquisa, month-picker, toast, badge e barra de progresso. Círculos perfeitos para icon-buttons de 40px e avatares. As barras do gráfico têm topo mais redondo que a base (8px 8px 4px 4px). Borda tracejada (1px dashed #C9CCC2) é exclusiva da ref-box de referências copiáveis. Sem cantos vivos em lado nenhum.

## Components

### Buttons
- **Shape:** pílula total (999px), peso 700, 13.5px; variante `sm` 7px 13px / 12.5px.
- **Primary** (verde-600, texto branco, sombra própria): uma por ecrã, a acção principal ("Enviar lembretes", "Confirmar"). Hover: verde-700 + `translateY(-1px)`.
- **Ghost** (branco, borda linha, texto tinta): acções secundárias. Hover: borda e texto verdes.
- **Dark** (tinta, texto branco): acções de ênfase não-financeira. Hover: preto + lift.
- **Danger** (branco, texto vermelho-700): rejeitar/remover. Hover: borda vermelha + fundo vermelho-100. Nunca vermelho sólido.
- **Disabled:** opacity .45, sem transform.

### Pills (estado)
- **Style:** fundo 100 + texto 700/800 + ponto `currentColor` 6px via `::before`; 12px/700, padding 4px 11px.
- **Vocabulário:** `pago` verde · `pendente` âmbar · `atraso` vermelho · `confirmar` azul · `neutro` cinza (meses futuros) · `activo`/`suspenso` reutilizam verde/vermelho.

### Chips (filtros)
- **Style:** pílula branca com borda linha, 12.5px/700 tinta-2.
- **State:** hover borda+texto verdes; **seleccionado = tinta sólida com texto branco** (não verde — o verde fica reservado a acção e estado pago).

### Cards / Containers
- **Corner Style:** 16px; modal 20px.
- **Background:** branco sobre canvas; caixas aninhadas voltam ao canvas (#F4F4F1) com borda linha.
- **Shadow Strategy:** `--shadow` em repouso, sem borda, sem hover-lift nos cartões.
- **Internal Padding:** 22px (modal 26px, pay-hero 26px).
- **Card-head:** título 16px/800 + `card-ico` opcional (36px, raio 10px, verde-100/verde-700) + acções à direita via spacer.

### KPI Card
Rótulo 13.5px/700 tinta-2 com card-ico; valor 29px/800 tabular com unidade em small; linha de comparação 12.5px/700 com setas `up` (verde-700) / `down` (vermelho-700).

### Chart (barras 12 meses)
Barras CSS puras em grelha de 12 colunas (altura 190px, 150px/6 meses em mobile); repouso verde-150, hover e mês seleccionado verde-600; tooltip do valor só na barra seleccionada (caixa tinta, texto branco, via `::after` + `data-v`); rótulos de mês 12px/700 tinta-3; legenda com quadrados de 10px. **Sem animação de entrada das barras.**

### Tables
Cabeçalho MAIÚSCULAS 12px/700 tinta-3 com borda linha; células 14px com divisores linha-suave; hover de linha verde-50; células compostas `cell-main` (700) + `cell-sub` (12.5px tinta-3); valores à direita com `.num .b`; wrapper com scroll horizontal que sangra o padding do cartão (margin -22px). Em ≤860px colapsam para listas empilhadas (ver Layout).

### Inputs / Fields
- **Style:** borda linha 1px, raio 10px, padding 11px 13px, 14px, fundo branco; label 13px/700 tinta-2 acima; hint 12px tinta-3.
- **Hover:** borda #CFD2C8. **Focus:** borda verde-600 + anel `0 0 0 3px` verde-100 (sem outline).
- **Readonly:** mesmo aspecto, usado nos drawers de detalhe.

### Navigation (sidebar)
Branca, 260px, borda direita linha; marca com quadrado verde-600 de 38px (raio 11px, skyline branca stroke 2); itens 14px/600 tinta-2, raio 11px; hover linha-suave; **activo = pastilha verde-100 com texto verde-800 e ícone verde-700** (`aria-current="page"`); badge numérico verde-600 em pílula; rodapé com role-box (alternador de papel da demonstração) sobre canvas. Em mobile: drawer off-canvas com shadow-lift.

### Drawer / Modal / Toast
- **Drawer:** direita, min(440px, 100%), branco, shadow-lift, desliza `.3s var(--ease)`; head/foot com bordas linha, foot com acções à direita.
- **Modal:** cartão min(430px, 100%) raio 20px, entra com fade do wrapper + `translateY(10px)→0`.
- **Overlay:** `rgba(23,30,26,.38)`, fade .22s, partilhado; Escape e clique fecham.
- **Toast:** pílula tinta com texto branco 13.5px/700, ícone check verde-600, fundo-centro, sobe 16px ao aparecer, auto-esconde ~2.6s.

### Pay-hero (assinatura — portal do proprietário)
O único cartão não-branco: gradiente `linear-gradient(135deg, verde-700, verde-600)`, texto branco, raio 16px, a sombra mais funda do sistema. Valor da quota a 38px/800; divisores internos `rgba(255,255,255,.22)`. Reservado ao momento "quanto devo e pago já".

### Method buttons (pagamento)
Linhas-botão de largura total: borda linha, raio 14px, logótipo quadrado de 42px (raio 12px, cor da marca do operador: M-Pesa #C41318, eMola #F28A00, banco tinta), nome 14.5px/700 + sub 12.5px tinta-3, chevron à direita. Hover: borda verde + `--shadow`.

### Empty states
Centrados: ícone em caixa 52px (raio 16px, verde-100/verde-700), título 15px bold, parágrafo 13.5px tinta-3 com max-width 300px. Sempre com tom positivo ("Fila limpa… Bom trabalho.").

### Motion
Uma única transição de ecrã autorada: `screen-in` (fade + `translateY(8px)→0`, .32s `cubic-bezier(.16,1,.3,1)`). Todo o resto é micro-feedback: transições de estado .12–.16s, drawer/modal/toast .22–.3s, tudo com `--ease`. Spinner funcional (anel verde, .8s linear) só durante o pagamento simulado. `prefers-reduced-motion` anula tudo.

### Browser surfaces
`::selection` verde-150/verde-800; `caret-color` verde-600; `:focus-visible` outline 2px verde-600 offset 2px raio 6px; scrollbars webkit de 10px com polegar #D4D6CE arredondado e borda de 2px do canvas.

## Do's and Don'ts

### Do:
- **Do** usar verde-600 (#0E9F5B) como única cor de acção; hover sempre verde-700 e, nos botões primário/dark, `translateY(-1px)`.
- **Do** marcar todo o estado de pagamento com a pill canónica (fundo 100 + texto 700/800 + ponto 6px) e todo o número com `.num` tabular, moeda "1 500 MT".
- **Do** desenhar ícones como SVG inline 24×24, stroke 1.75 (`stroke-linecap/linejoin: round`), fill none — 20px por defeito, 16px em `sm`.
- **Do** manter cartões brancos raio 16px com `--shadow` e padding 22px sobre o canvas #F4F4F1; caixas aninhadas voltam ao canvas com borda linha.
- **Do** colapsar tabelas em listas empilhadas (descrição à esquerda, valores/pills à direita) abaixo de 860px.
- **Do** escrever toda a interface em português de Moçambique (pré-AO: "activo", "acção", "Outubro corrente") e manter dados de demonstração rotulados.

### Don't:
- **Don't** introduzir uma segunda cor de marca, gradientes fora do pay-hero, ou âmbar/vermelho/azul como decoração — são exclusivamente semântica de estado.
- **Don't** usar sombras duras, offsets laterais ou bordas em cartões; profundidade é sempre o par sombra-curta + halo difuso em tinta.
- **Don't** animar a entrada das barras do gráfico nem adicionar transições de ecrã além do `screen-in` único; nada de ornamento em movimento.
- **Don't** usar icon fonts, emojis, segunda família tipográfica, itálicos ou cantos vivos; Manrope por peso faz toda a hierarquia.
- **Don't** usar vermelho sólido em botões — o perigo é sempre ghost com texto vermelho que só ganha fundo vermelho-100 no hover.

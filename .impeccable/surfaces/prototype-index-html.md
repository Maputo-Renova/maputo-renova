---
version: 1
slug: "prototype-index-html"
primary_target: "prototype/index.html"
related_targets: []
---

# Protótipo Maputo Renova — 4 áreas (prototype/index.html)

Modo: Operate. Alcance: protótipo estático clicável das 4 áreas (gestor, proprietário, super admin, colaborador) com dados de exemplo em MZN, pt (Moçambique), alternador de papel para demonstração. Público: gestores de condomínio, proprietários de flats, equipa da plataforma em Maputo; telemóvel primeiro para o proprietário, desktop para gestor/consola. Tarefas: ver estado de cobrança do mês, confirmar transferências, pagar quota, fiscalizar finanças globais, cadastrar sem duplicar. Restrições: 100% português, MZN, dados sintéticos rotulados, sem dependências de rede além de fontes.

## Direction contract

THESIS: Um dashboard financeiro canónico, executado com a precisão da referência pinada (Oripio) — o utilizador encontra a gramática que já conhece das apps bancárias. Recusa ornamento, ritual experimental e ruído decorativo; a diferenciação vive na clareza absoluta dos estados de pagamento.

OWN-WORLD: Tela quente #F6F6F3; cartões brancos raio 16px com sombra suave deslocada; verde #0E9F5B como única cor de marca (tons claro/escuro), pills de estado — verde pago, âmbar pendente, vermelho atraso, azul a confirmar; Manrope com numerais tabulares; ícones SVG stroke 1.75 consistente; sidebar branca, item activo em pastilha verde-clara.

STORY: O gestor entra e sabe em segundos quanto do mês entrou e quem falta; confirma transferências na fila; o proprietário vê a sua quota e paga em dois toques; o super admin lê o negócio inteiro; o colaborador cadastra e a duplicação é negada com o registo em conflito à vista.

FIRST VIEWPORT: Sidebar esquerda (marca + navegação do papel). Topo: saudação com condomínio, selector de mês, acção primária verde "Enviar lembretes". Faixa de 3 KPIs (cobrado no mês, por cobrar, flats em atraso). Abaixo: gráfico de barras 12 meses (esq., 2/3) e fila "Transferências a confirmar" (dir., 1/3). Tabela de flats com estados fecha a página.

FORM: Dashboard SaaS canónico — saída permanente escolhida pelo utilizador em pergunta estruturada (direcção atribuída "Caderneta de cobrança" e alternativa "Mapa do prédio" recusadas); candidato de topo próprio era "Extracto". Seed: 0925044f. Caminho: code-led (sem geração de imagens na sessão).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

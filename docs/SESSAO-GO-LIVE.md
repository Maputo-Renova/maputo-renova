# Sessão de go-live — guião (Fase 6)

Sessão conjunta Nebula + cliente, **~2h30**, por videochamada com partilha de
ecrã (ou presencial). Segue o `docs/GO-LIVE.md` por ordem; este guião é o
roteiro da reunião. A Nebula conduz com uma sessão Claude aberta para os
passos técnicos (limpeza, verificações, SQL).

## Antes da sessão

**Cliente traz (sem isto a sessão não arranca):**

- [ ] Email do **administrador real** da consola (pessoa + caixa de correio acessível na hora)
- [ ] Dados do **condomínio piloto**: nome, endereço completo (bairro, rua, nº), quota mensal, dia de vencimento, total de moradias
- [ ] Dados do **gestor real**: nome completo, BI/NUIT, email, telefone (KYC)
- [ ] **Lista de flats**: bloco, andar, número + nome, telefone e email de cada proprietário (uma folha simples chega)
- [ ] **Conta bancária real** da plataforma: banco, titular, nº de conta, NIB
- [ ] Telemóvel do administrador e do gestor na sala (MFA e teste real)

**Nebula verifica na véspera (automático + manual):**

- [ ] Workflows Saúde, CI e E2E verdes; zero erros de runtime na Vercel
- [ ] `get_advisors` (security + performance) sem itens novos
- [ ] Backups diários visíveis no dashboard do Supabase (plano Pro)
- [ ] `limpar_demo.sql` revisto; convite de colaborador pronto a emitir
- [ ] Estado do domínio/Resend: se ainda não verificado, os códigos de
      convite partilham-se manualmente (são visíveis na consola) — não bloqueia

## Agenda da sessão

| # | Tempo | Passo | Quem |
|---|---|---|---|
| 1 | 10 min | Verificação inicial: app no ar, Saúde verde, tour de 5 min pela consola demo (última vez que se vêem os dados demo) | Nebula |
| 2 | 15 min | **Administrador real**: convite em Colaboradores → registo → **MFA activado de imediato** → entra na consola | Cliente + Nebula |
| 3 | 10 min | **Limpeza demo**: correr `supabase/scripts/limpar_demo.sql` (a trava confirma que o admin real existe); conferir consola vazia | Nebula |
| 4 | 25 min | **Condomínio piloto**: cadastro completo (localização, KYC do gestor, termos), conta bancária real em Configuração, conferir taxas (serviço 15% · associação 499 MT) | Cliente dita, Nebula regista |
| 5 | 20 min | **Gestor real**: convite → registo → aprovação na consola → MFA recomendado | Cliente + Nebula |
| 6 | 30 min | **Flats**: cadastro da lista + envio dos convites aos proprietários (email, ou código partilhado manualmente) | Gestor + Nebula |
| 7 | 15 min | **Faturas e teste real**: gerar faturas do mês (`fn_gerar_faturas`) e ciclo completo com UMA flat — morador entra, paga por transferência com comprovativo, gestor confirma, fatura Paga | Todos |
| 8 | 20 min | **Formação do gestor** com o `guia-gestor.md` (pagamentos, avisos, suporte, tesouraria, despesas); entregar `guia-morador.md` para distribuição | Nebula → gestor |
| 9 | 5 min | **Fecho**: acordar canal directo para as 2 semanas de acompanhamento, relembrar a monitorização automática (Saúde + alerta diário), marcar a retrospectiva (D+14) | Todos |

## Imediatamente depois

- [ ] `get_advisors` de novo (dados reais no ar)
- [ ] Confirmar o primeiro dia da régua de cobrança na tabela `envios`
- [ ] Registar no PLANO (diário de bordo): data do arranque, condomínio, nº de flats
- [ ] Agendar a retrospectiva das 2 semanas → decisão de abrir a mais condomínios

## Regras da sessão

1. A limpeza demo é **irreversível** — só corre depois do administrador real
   entrar com MFA activo (a trava do script impõe isto, mas confirma-se a olho).
2. Nenhuma password é dita em voz alta nem escrita no chat; cada um escreve a
   sua no próprio teclado.
3. Se algo falhar, não se improvisa em produção: anota-se, termina-se o que dá,
   e a correcção sai pela CI como sempre.

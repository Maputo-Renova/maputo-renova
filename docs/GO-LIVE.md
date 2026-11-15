# Checklist de go-live — Maputo Renova

Nada entra em piloto sem todas as caixas desta lista. Executar por ordem,
numa sessão conjunta Nebula + cliente. (Estado em 15 Nov 2026 entre parênteses.)

## 1. Contratos e contas (cliente)

- [ ] Domínio `maputorenova.co.za` registado em nome do cliente
- [ ] Domínio verificado no Resend (DNS: SPF/DKIM) e `FROM_EMAIL` trocado
      nos secrets das Edge Functions para `cobranca@maputorenova.co.za`
      *(hoje: remetente de teste do Resend — só entrega a endereços de teste)*
- [ ] Supabase Pro activo e **backups diários confirmados** no dashboard;
      decidir se PITR (add-on) entra já *(plano Pro já activo)*
- [ ] Vercel: decidir Pro + repositório privado, ou manter público
      *(hoje: repo público + deploy automático no plano gratuito)*
- [ ] M-Pesa/eMola/SMS: não bloqueiam o piloto (transferência bancária
      funciona); contratos seguem em paralelo para a Fase 3

## 2. Segurança (Nebula, verificação final)

- [x] RLS completo + suite de testes a passar na CI em cada push
- [x] MFA disponível e imposto na base de dados; protecção de passwords
      vazadas activa; cabeçalhos de segurança no ar
- [ ] **MFA activado nas contas reais da consola** (obrigatório antes de
      haver dados reais — é um toggle em "O meu perfil")
- [ ] `get_advisors` (security + performance) corrido na véspera, limpo
- [ ] Termos e Política de Privacidade revistos por um jurista
      *(hoje: versão de trabalho publicada em /termos e /privacidade)*

## 3. Dados (sessão conjunta)

- [ ] Criar o administrador real da consola (convite via Colaboradores;
      o código segue por email) e **activar MFA de imediato**
- [ ] **Executar `supabase/scripts/limpar_demo.sql`** (apaga TODOS os
      dados e contas demo — irreversível; correr só depois do
      administrador real existir e entrar)
- [ ] Cadastrar o condomínio piloto real (agente ou consola): localização
      completa, dados KYC do gestor, termos aceites
- [ ] Gestor real regista-se com o convite (email) e é aprovado na consola
- [ ] Flats reais cadastradas; convites chegam por email aos proprietários
- [ ] Conta bancária real da plataforma em Configuração (a BCI demo sai
      com a limpeza)
- [ ] Conferir taxas em Configuração (serviço 15% · associação 499 MT)

## 4. Arranque

- [ ] Faturas do mês: geradas automaticamente no dia 1, ou manualmente na
      sessão (`select public.fn_gerar_faturas(date_trunc('month', now())::date);`)
- [ ] Teste real de ponta a ponta com UMA flat: morador entra, paga por
      transferência, carrega comprovativo, gestor confirma, recibo chega
      por email
- [ ] Régua de cobrança observada no primeiro ciclo (D-5 → D+7) na tabela
      `envios` e no painel do Resend
- [ ] Formação: sessão com gestor (guia-gestor.md) e material aos
      moradores (guia-morador.md)

## 5. Acompanhamento (primeiras 2 semanas)

- [x] Verificação diária **automática** (Fase 5): workflow Saúde a cada
      30 min + alerta operacional diário por email aos super admins
      (emails falhados, fila presa, transacções móveis por reconciliar);
      ver `docs/RELEASE.md`
- [ ] Canal directo com o gestor piloto para correcções rápidas
- [ ] Retrospectiva no fim das 2 semanas → decisão de abrir a mais
      condomínios

> Entrega final ao cliente (Fase 7 do plano): transferir GitHub, Supabase
> e Vercel, e **rotacionar todas as chaves** — só depois do piloto estável.

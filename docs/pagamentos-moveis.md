# Pagamentos móveis — M-Pesa e eMola (Fase 3)

Estado: **esqueleto construído e testado contra simuladores locais**
(`payment-worker/`). Falta o lado contratual (cliente) e a ligação final à
app. Este documento resume a arquitectura e o caminho até produção; a
referência técnica detalhada do eMola está no guia da API compilado pela
Kingdom (manual de operação + guia de implementação, entregues à parte).

## 1. Arquitectura

Os dois gateways **validam o IP de origem** (whitelist contratual), por isso
as chamadas não podem sair da Vercel nem das Edge Functions do Supabase
(IP dinâmico). A integração vive num serviço próprio:

```
[Morador na app] → [App Next.js (Vercel)] --HTTPS + segredo--> [payment-worker (VPS, IP fixo)]
                                                                  │  SOAP → eMola (BCCSGateway/gwOperation)
                                                                  │  REST → M-Pesa OpenAPI (ipg/v1x)
                                                                  └→ transaccoes_moveis (Supabase, service role)
[Morador vê o estado] ← polling/Realtime ← faturas/pagamentos ← worker regista quando SUCCESS
```

- **eMola (Movitel)**: SOAP 1.1, operação única `gwOperation`; `wscode`
  escolhe a operação (`pushUssdMessage` C2B, `pushUssdDisbursementB2C`,
  `pushUssdQueryTrans`, `queryBeneficiaryName`, `queryAccountBalance`).
  Sem sandbox pública — testa-se com o simulador local e depois UAT/piloto
  com a Movitel.
- **M-Pesa (Vodacom)**: REST/JSON (OpenAPI), token Bearer = API Key cifrada
  com a Public Key (RSA). Sandbox pública em `developer.mpesa.vm.co.mz`
  (exige conta de developer gratuita).

### Regras de segurança do dinheiro

1. `trans_id` único por tentativa, **nunca reutilizado** (idempotência).
2. Timeout, erro de rede ou resposta sem código ⇒ estado **UNKNOWN**, nunca
   sucesso nem falha às cegas; a reconciliação consulta o gateway
   (`pushUssdQueryTrans` / `queryTransactionStatus`) antes de decidir.
3. Um C2B só se repete com **novo** `trans_id` e depois de confirmar que o
   anterior falhou.
4. Segredos só em variáveis de ambiente da VPS; logs mascaram credenciais e
   parte do número; TLS com CA fixado, nunca desligado.
5. `transaccoes_moveis` tem RLS sem políticas: só o worker (service role)
   acede; a app vê o resultado via `pagamentos`.

## 2. O que o cliente precisa de contratar (bloqueador)

| | eMola | M-Pesa |
|---|---|---|
| Conta | Merchant Online Account no portal e-Mola Empresas (`emola.movitel.co.mz`) | M-Pesa Business (Vodacom) |
| Contrato API | USSD Push API com a Movitel (entrega WSDL, username, password, key, partnerCode, spec v1.5) | OpenAPI: API Key, Public Key, ServiceProviderCode |
| Requisito técnico | **IP fixo da VPS na whitelist** | idem (confirmar no contrato) |
| Teste | Pedir ambiente UAT; se não houver, piloto em produção com 1–10 MT | Sandbox pública com conta de developer |
| Contactos Movitel | 867 383 838 (registo) · 861 861 861 (plataforma) | — |

Alternativa para arrancar mais cedo: agregador (e2Payments, PaySuite,
pawaPay — licenciado PSP em Moçambique) — REST simples, sem IP fixo, com
comissão por transacção. O worker foi desenhado com interface de provedor
para acrescentar um agregador sem mexer no resto.

> Nota regulatória: receber dinheiro em nome dos condomínios pode configurar
> serviço de pagamentos sujeito a licenciamento no Banco de Moçambique.
> Confirmar o enquadramento com um jurista antes de operar com volume.

## 3. Próximos passos técnicos (quando houver credenciais)

1. Provisionar VPS com IP fixo (ex.: Hetzner/DO), colocar o IP na whitelist.
2. `payment-worker` com as variáveis reais; validar o envelope eMola contra
   o WSDL e os campos M-Pesa contra o portal (pontos marcados `[confirmar]`).
3. Testes no sandbox M-Pesa real e UAT/piloto eMola (1–10 MT, reembolso B2C).
4. Função `fn_registar_pagamento_movel` (SUCCESS → `pagamentos` + fatura
   paga + movimento de tesouraria, como já acontece na transferência).
5. UI do morador: escolher M-Pesa/eMola, introduzir número, ecrã "confirme
   no seu telemóvel" com contador e "tentar de novo" após falha 11.
6. Reconciliação diária contra os extractos das plataformas das operadoras.

# payment-worker — pagamentos móveis (M-Pesa e eMola)

Serviço autónomo do Maputo Renova que fala com os gateways de pagamento
móvel. Ver `docs/pagamentos-moveis.md` na raiz do repositório para a
arquitectura completa, onboarding com as operadoras e checklist de go-live.

## Porquê um serviço à parte

Os gateways **validam o IP de origem** (whitelist contratual). Funções
serverless (Vercel, Supabase Edge) têm IP dinâmico, por isso **não podem**
chamar os gateways. Este worker corre numa **VPS com IP fixo** e expõe uma
API interna autenticada por segredo partilhado:

```
[App (Vercel/Supabase)] --HTTPS + x-worker-secret--> [payment-worker (VPS, IP fixo)]
                                                        │ SOAP  → gateway eMola (BCCSGateway)
                                                        │ REST  → M-Pesa OpenAPI
                                                        └ escreve em transaccoes_moveis (service role)
```

## API interna

| Rota | Descrição |
|---|---|
| `GET /saude` | healthcheck (público) |
| `POST /pagamentos` | `{provedor: "mpesa"\|"emola", msisdn, valor, referencia, fatura_id?}` → `202 {trans_id, estado: "PROCESSING"}`; a cobrança corre assíncrona (o cliente confirma o PIN no telemóvel) |
| `GET /pagamentos/:transId` | estado actual (`PROCESSING`, `SUCCESS`, `FAILED`, `UNKNOWN`) |
| `POST /reconciliar` | consulta no gateway todas as transacções `UNKNOWN`/`PROCESSING` (também corre sozinho a cada `RECONCILIAR_SEGUNDOS`) |

Todas as rotas excepto `/saude` exigem o cabeçalho `x-worker-secret`.

Regra central: **resposta sem código, timeout ou erro de rede nunca é
decidido às cegas** — fica `UNKNOWN` e é a reconciliação que pergunta ao
gateway o que realmente aconteceu. Um C2B repetido às cegas cobra o cliente
duas vezes.

## Correr os testes

```bash
npm test
```

Sem dependências (Node 18+). Os testes levantam os dois simuladores locais
em portas efémeras e cobrem: sucesso, PIN não introduzido (11), sem conta
(12), `transId` duplicado (14), credenciais erradas (GW-6003), timeout com
reconciliação, saldo insuficiente (INS-2006), duplicado (INS-10), reversão,
token RSA do M-Pesa e autenticação da API interna.

## Simuladores locais

Não existe sandbox pública do eMola; o sandbox do M-Pesa exige conta de
developer. Para desenvolvimento:

```bash
npm run mock:emola   # POST http://localhost:8089/BCCSGateway/BCCSGateway
npm run mock:mpesa   # http://localhost:8090/ipg/v1x/...
```

Números de teste (últimos 4 dígitos controlam o desfecho):

| eMola (86/87…) | | M-Pesa (84/85…) | |
|---|---|---|---|
| `…0000` | sucesso | `…0000` | INS-0 sucesso |
| `…1111` | 11 sem PIN | `…2006` | saldo insuficiente |
| `…1212` | 12 sem conta | `…0009` | timeout → reconciliar |
| `…0303` | 03 falhou | `…0006` | INS-6 falhou |
| `…2222` | GW-2007 timeout → reconciliar | `…2051` | MSISDN inválido |

## Variáveis de ambiente (produção)

```
PORT=8080
WORKER_SECRET=<segredo partilhado com a app, ≥16 chars>
RECONCILIAR_SEGUNDOS=120

SUPABASE_URL=https://<projecto>.supabase.co
SUPABASE_SERVICE_KEY=<service role — NUNCA no frontend nem no Git>

EMOLA_ENDPOINT=https://<ip>:<porta>/BCCSGateway/BCCSGateway
EMOLA_USERNAME=…  EMOLA_PASSWORD=…  EMOLA_KEY=…
EMOLA_PARTNER_CODE=00204          # string — preservar zeros à esquerda
EMOLA_CA_PATH=/etc/ssl/emola-ca.pem   # fixar o CA; nunca desligar TLS

MPESA_HOST=api.sandbox.vm.co.mz   # produção: api.vm.co.mz
MPESA_API_KEY=…  MPESA_PUBLIC_KEY=…   # developer.mpesa.vm.co.mz
MPESA_SERVICE_PROVIDER_CODE=171717
MPESA_INITIATOR=…  MPESA_SECURITY_CREDENTIAL=…   # só para reversões
```

Sem `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` o worker usa armazém em memória
(apenas para desenvolvimento).

## O que ainda falta para produção (Fase 3)

- Contratos: conta Merchant eMola + contrato API Movitel (WSDL, credenciais,
  whitelist do IP da VPS); conta M-Pesa Business + credenciais de produção.
- Validar os pontos `[confirmar]`/`[SDK]` contra a spec oficial v1.5 (eMola)
  e o portal de developer (M-Pesa) quando os contratos chegarem.
- Registar o pagamento em `pagamentos`/`faturas` quando `SUCCESS` (função a
  chamar pelo worker) e UI de pagamento móvel na app do morador.
- Reconciliação diária contra os extractos das plataformas das operadoras.

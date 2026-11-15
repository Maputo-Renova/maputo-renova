// Testes de ponta a ponta do worker: API interna + ambos os provedores (mocks).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { criarWorker } from "../src/servidor.mjs";
import { armazemMemoria } from "../src/armazem.mjs";
import { ClienteEmola } from "../src/emola/cliente.mjs";
import { ClienteMpesa } from "../src/mpesa/cliente.mjs";
import { criarMockEmola, CREDS_TESTE } from "../mock/emola-mock.mjs";
import { criarMockMpesa } from "../mock/mpesa-mock.mjs";

const SEGREDO = "segredo-de-teste-suficientemente-longo";
let mockE, mockM, worker, base;
const armazem = armazemMemoria();

const { publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });

async function esperarEstadoFinal(transId, tentativas = 50) {
  for (let i = 0; i < tentativas; i++) {
    const res = await fetch(`${base}/pagamentos/${transId}`, { headers: { "x-worker-secret": SEGREDO } });
    const t = await res.json();
    if (t.estado !== "PROCESSING") return t;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("ficou em PROCESSING");
}

before(async () => {
  mockE = criarMockEmola({ delayMs: 0 });
  mockM = criarMockMpesa({ delayMs: 0 });
  await new Promise((r) => mockE.listen(0, r));
  await new Promise((r) => mockM.listen(0, r));
  worker = criarWorker({
    armazem,
    segredo: SEGREDO,
    emola: new ClienteEmola({
      endpoint: `http://127.0.0.1:${mockE.address().port}/BCCSGateway/BCCSGateway`,
      ...CREDS_TESTE,
      timeoutMs: 5000,
    }),
    mpesa: new ClienteMpesa({
      baseUrl: `http://127.0.0.1:${mockM.address().port}`,
      apiKey: "chave",
      publicKey: publicKey.export({ type: "spki", format: "pem" }),
      serviceProviderCode: "171717",
      timeoutMs: 5000,
    }),
  });
  await new Promise((r) => worker.listen(0, r));
  base = `http://127.0.0.1:${worker.address().port}`;
});
after(() => {
  worker.close();
  mockE.close();
  mockM.close();
});

test("sem segredo → 401; /saude é público", async () => {
  const r1 = await fetch(`${base}/pagamentos`, { method: "POST", body: "{}" });
  assert.equal(r1.status, 401);
  const r2 = await fetch(`${base}/saude`);
  assert.equal(r2.status, 200);
});

test("validação de entrada: provedor, msisdn e valor", async () => {
  const pedir = (corpo) =>
    fetch(`${base}/pagamentos`, {
      method: "POST",
      headers: { "x-worker-secret": SEGREDO, "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
  assert.equal((await pedir({ provedor: "paypal", msisdn: "848880000", valor: 10, referencia: "F" })).status, 400);
  assert.equal((await pedir({ provedor: "mpesa", valor: 10, referencia: "F" })).status, 400);
  assert.equal((await pedir({ provedor: "mpesa", msisdn: "848880000", valor: -5, referencia: "F" })).status, 400);
});

test("pagamento M-Pesa com sucesso: 202 → SUCCESS, id do operador e registo na app", async () => {
  const res = await fetch(`${base}/pagamentos`, {
    method: "POST",
    headers: { "x-worker-secret": SEGREDO, "Content-Type": "application/json" },
    body: JSON.stringify({
      provedor: "mpesa",
      msisdn: "848880000",
      valor: 2500,
      referencia: "FAT-2026-01",
      fatura_id: "11111111-1111-1111-1111-111111111111",
    }),
  });
  assert.equal(res.status, 202);
  const { trans_id } = await res.json();
  const fim = await esperarEstadoFinal(trans_id);
  assert.equal(fim.estado, "SUCCESS");
  assert.equal(fim.codigo, "INS-0");
  assert.ok(fim.id_operador);
  assert.ok(armazem.registados.includes(trans_id), "SUCCESS com fatura foi entregue à app");
});

test("falha não é entregue à app; sucesso sem fatura também não", async () => {
  const antes = armazem.registados.length;
  const r1 = await fetch(`${base}/pagamentos`, {
    method: "POST",
    headers: { "x-worker-secret": SEGREDO, "Content-Type": "application/json" },
    body: JSON.stringify({
      provedor: "mpesa",
      msisdn: "848882006", // saldo insuficiente
      valor: 100,
      referencia: "FAT-2026-05",
      fatura_id: "22222222-2222-2222-2222-222222222222",
    }),
  });
  const t1 = await r1.json();
  await esperarEstadoFinal(t1.trans_id);
  const r2 = await fetch(`${base}/pagamentos`, {
    method: "POST",
    headers: { "x-worker-secret": SEGREDO, "Content-Type": "application/json" },
    body: JSON.stringify({ provedor: "mpesa", msisdn: "848880000", valor: 100, referencia: "AVULSO-01" }),
  });
  const t2 = await r2.json();
  await esperarEstadoFinal(t2.trans_id);
  assert.equal(armazem.registados.length, antes, "nada entregue à app");
});

test("pagamento eMola sem PIN: termina FAILED EMOLA-11 (pode tentar de novo)", async () => {
  const res = await fetch(`${base}/pagamentos`, {
    method: "POST",
    headers: { "x-worker-secret": SEGREDO, "Content-Type": "application/json" },
    body: JSON.stringify({ provedor: "emola", msisdn: "871231111", valor: 2500, referencia: "FAT-2026-02" }),
  });
  const { trans_id } = await res.json();
  const fim = await esperarEstadoFinal(trans_id);
  assert.equal(fim.estado, "FAILED");
  assert.equal(fim.codigo, "EMOLA-11");
});

test("eMola gateway timeout → UNKNOWN; /reconciliar resolve para SUCCESS", async () => {
  const res = await fetch(`${base}/pagamentos`, {
    method: "POST",
    headers: { "x-worker-secret": SEGREDO, "Content-Type": "application/json" },
    body: JSON.stringify({
      provedor: "emola",
      msisdn: "871232222",
      valor: 1800,
      referencia: "FAT-2026-03",
      fatura_id: "33333333-3333-3333-3333-333333333333",
    }),
  });
  const { trans_id } = await res.json();
  const incerto = await esperarEstadoFinal(trans_id);
  assert.equal(incerto.estado, "UNKNOWN", "timeout nunca é decidido às cegas");
  assert.ok(!armazem.registados.includes(trans_id), "UNKNOWN não é entregue à app");

  const rec = await fetch(`${base}/reconciliar`, {
    method: "POST",
    headers: { "x-worker-secret": SEGREDO },
  });
  assert.equal(rec.status, 200);
  const depois = await fetch(`${base}/pagamentos/${trans_id}`, { headers: { "x-worker-secret": SEGREDO } });
  const t = await depois.json();
  assert.equal(t.estado, "SUCCESS", "a reconciliação confirmou a transacção no gateway");
  assert.ok(armazem.registados.includes(trans_id), "reconciliada com sucesso foi entregue à app");
});

test("transacção desconhecida → 404", async () => {
  const res = await fetch(`${base}/pagamentos/NAOEXISTE`, { headers: { "x-worker-secret": SEGREDO } });
  assert.equal(res.status, 404);
});

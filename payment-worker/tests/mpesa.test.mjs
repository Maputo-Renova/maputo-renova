// Testes do cliente M-Pesa contra o simulador local.
// O sandbox real (api.sandbox.vm.co.mz) usa o mesmo contrato — basta trocar
// baseUrl/host e usar a API Key + Public Key de developer.mpesa.vm.co.mz.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  ClienteMpesa,
  gerarToken,
  normalizarMsisdnMpesa,
} from "../src/mpesa/cliente.mjs";
import { criarMockMpesa } from "../mock/mpesa-mock.mjs";
import { novoTransId } from "../src/emola/cliente.mjs";

let mock, cliente;
// par RSA real para validar a geração do token Bearer
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const API_KEY = "chave-de-teste-123";

before(async () => {
  mock = criarMockMpesa({ delayMs: 0 });
  await new Promise((r) => mock.listen(0, r));
  cliente = new ClienteMpesa({
    baseUrl: `http://127.0.0.1:${mock.address().port}`,
    apiKey: API_KEY,
    publicKey: publicKey.export({ type: "spki", format: "pem" }),
    serviceProviderCode: "171717",
    timeoutMs: 5000,
  });
});
after(() => mock.close());

test("normalizarMsisdnMpesa aceita 84/85 com e sem indicativo", () => {
  assert.equal(normalizarMsisdnMpesa("84 123 4567"), "258841234567");
  assert.equal(normalizarMsisdnMpesa("258851234567"), "258851234567");
  assert.throws(() => normalizarMsisdnMpesa("871234567")); // Movitel, não Vodacom
});

test("token Bearer é a API Key cifrada com a Public Key (RSA PKCS#1 v1.5)", () => {
  const token = gerarToken(API_KEY, publicKey.export({ type: "spki", format: "pem" }));
  const decifrado = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(token, "base64"),
  );
  assert.equal(decifrado.toString("utf8"), API_KEY);
});

test("C2B com sucesso → INS-0 com TransactionID", async () => {
  const r = await cliente.c2b({ msisdn: "848880000", valor: 150, referencia: "FAT-001", refTerceiro: novoTransId() });
  assert.equal(r.status, "SUCCESS");
  assert.equal(r.code, "INS-0");
  assert.ok(r.transactionId);
});

test("saldo insuficiente → INS-2006 FAILED", async () => {
  const r = await cliente.c2b({ msisdn: "848882006", valor: 500, referencia: "FAT-002", refTerceiro: novoTransId() });
  assert.equal(r.status, "FAILED");
  assert.equal(r.code, "INS-2006");
});

test("ThirdPartyReference duplicada → INS-10", async () => {
  const ref3 = novoTransId();
  await cliente.c2b({ msisdn: "848880000", valor: 10, referencia: "FAT-003", refTerceiro: ref3 });
  const r = await cliente.c2b({ msisdn: "848880000", valor: 10, referencia: "FAT-003", refTerceiro: ref3 });
  assert.equal(r.code, "INS-10");
});

test("timeout do gateway (INS-9) → UNKNOWN; a consulta resolve para SUCCESS", async () => {
  const ref3 = novoTransId();
  const r = await cliente.c2b({ msisdn: "848880009", valor: 80, referencia: "FAT-004", refTerceiro: ref3 });
  assert.equal(r.status, "UNKNOWN", "nunca decidir um timeout às cegas");
  const q = await cliente.consultar({ queryReference: ref3, refTerceiro: ref3 });
  assert.equal(q.status, "SUCCESS");
  assert.ok(q.raw.output_TransactionID);
});

test("consulta de referência desconhecida → UNKNOWN (N/A)", async () => {
  const ref3 = novoTransId();
  const q = await cliente.consultar({ queryReference: ref3, refTerceiro: ref3 });
  assert.equal(q.status, "UNKNOWN");
});

test("reversão de transacção existente → INS-0", async () => {
  const ref3 = novoTransId();
  const r = await cliente.c2b({ msisdn: "848880000", valor: 30, referencia: "FAT-005", refTerceiro: ref3 });
  const rev = await cliente.reverter({ transactionId: r.transactionId, valor: 30, refTerceiro: novoTransId() });
  assert.equal(rev.status, "SUCCESS");
});

test("sem Bearer válido → INS-26 não autorizado", async () => {
  const res = await fetch(`http://127.0.0.1:${mock.address().port}/ipg/v1x/c2bPayment/singleStage/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(res.status, 401);
  const corpo = await res.json();
  assert.equal(corpo.output_ResponseCode, "INS-26");
});

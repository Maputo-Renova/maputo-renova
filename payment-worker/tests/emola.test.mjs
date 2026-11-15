// Testes do cliente eMola contra o simulador local (não existe sandbox pública).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { ClienteEmola, novoTransId, normalizarMsisdnEmola } from "../src/emola/cliente.mjs";
import { criarMockEmola, CREDS_TESTE } from "../mock/emola-mock.mjs";

let mock, cliente, endpoint;

before(async () => {
  mock = criarMockEmola({ delayMs: 0 });
  await new Promise((r) => mock.listen(0, r));
  endpoint = `http://127.0.0.1:${mock.address().port}/BCCSGateway/BCCSGateway`;
  cliente = new ClienteEmola({ endpoint, ...CREDS_TESTE, timeoutMs: 5000 });
});
after(() => mock.close());

test("normalizarMsisdnEmola aceita 86/87 e rejeita o resto", () => {
  assert.equal(normalizarMsisdnEmola("+258 87 123 4567"), "871234567");
  assert.equal(normalizarMsisdnEmola("258861230000"), "861230000");
  assert.throws(() => normalizarMsisdnEmola("841234567")); // Vodacom, não Movitel
});

test("C2B com sucesso devolve SUCCESS e guarda ids de reconciliação", async () => {
  const r = await cliente.c2b({
    msisdn: "871230000",
    valor: 150,
    transId: novoTransId(),
    refNo: "FAT-001",
    texto: "Quota FAT-001",
  });
  assert.equal(r.status, "SUCCESS");
  assert.equal(r.code, "EMOLA-0");
  assert.ok(r.gateway.gwtransid, "gwtransid presente");
  assert.ok(r.original.requestId, "requestId presente (tag reqeustId)");
});

test("cliente não introduziu o PIN → EMOLA-11", async () => {
  const r = await cliente.c2b({ msisdn: "871231111", valor: 100, transId: novoTransId(), refNo: "FAT-002", texto: "x" });
  assert.equal(r.status, "FAILED");
  assert.equal(r.code, "EMOLA-11");
});

test("número sem conta eMola → EMOLA-12", async () => {
  const r = await cliente.c2b({ msisdn: "871231212", valor: 100, transId: novoTransId(), refNo: "FAT-003", texto: "x" });
  assert.equal(r.code, "EMOLA-12");
});

test("transId duplicado → EMOLA-14 (nunca reutilizar ids)", async () => {
  const transId = novoTransId();
  const base = { msisdn: "871230000", valor: 50, transId, refNo: "FAT-004", texto: "x" };
  await cliente.c2b(base);
  const r = await cliente.c2b(base);
  assert.equal(r.code, "EMOLA-14");
});

test("credenciais erradas → falha de gateway 6003, nunca repetir", async () => {
  const mau = new ClienteEmola({ endpoint, ...CREDS_TESTE, password: "errada", timeoutMs: 5000 });
  const r = await mau.c2b({ msisdn: "871230000", valor: 10, transId: novoTransId(), refNo: "F", texto: "x" });
  assert.equal(r.status, "FAILED");
  assert.equal(r.code, "EMOLA-GW-6003");
});

test("consulta: transacção com sucesso → orgResponseCode 01", async () => {
  const transId = novoTransId();
  await cliente.c2b({ msisdn: "871230000", valor: 75, transId, refNo: "FAT-005", texto: "x" });
  const r = await cliente.consultarTransaccao({ transId });
  assert.equal(r.status, "SUCCESS");
  assert.equal(r.original.orgResponseCode, "01");
});

test("consulta de transacção inexistente → EMOLA-13", async () => {
  const r = await cliente.consultarTransaccao({ transId: novoTransId() });
  assert.equal(r.code, "EMOLA-13");
});

test("B2C (reembolso) e saldo da empresa", async () => {
  const r = await cliente.b2c({ msisdn: "871230000", valor: 20, transId: novoTransId(), texto: "Reembolso" });
  assert.equal(r.status, "SUCCESS");
  const s = await cliente.consultarSaldo();
  assert.equal(s.status, "SUCCESS");
  assert.ok(Number(s.original.balance) > 0);
});

test("gateway timeout (2007) com transacção feita → FAILED no nível do parser (o worker trata como UNKNOWN)", async () => {
  const r = await cliente.c2b({ msisdn: "871232222", valor: 60, transId: novoTransId(), refNo: "FAT-006", texto: "x" });
  assert.equal(r.code, "EMOLA-GW-2007");
});

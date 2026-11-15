// payment-worker do Maputo Renova — API interna de pagamentos móveis.
//
// Porquê um serviço à parte: os gateways M-Pesa e eMola validam o IP de
// origem (whitelist), por isso estas chamadas não podem sair da Vercel nem
// das Edge Functions do Supabase (IP dinâmico). Este worker corre numa VPS
// com IP fixo e expõe uma API interna autenticada por segredo partilhado.
//
//   [App (Vercel/Supabase)] --HTTPS + x-worker-secret--> [payment-worker] --SOAP/REST--> [eMola/M-Pesa]
//
// Fluxo C2B: POST /pagamentos grava PROCESSING e responde 202; a cobrança
// corre assíncrona (o cliente confirma o PIN no telemóvel) e o estado final
// fica no armazém. O frontend acompanha por polling/Realtime na app.
// UNKNOWN nunca é decidido às cegas: POST /reconciliar consulta o gateway.
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import { ClienteEmola, novoTransId } from "./emola/cliente.mjs";
import { ClienteMpesa } from "./mpesa/cliente.mjs";
import { armazemMemoria, armazemSupabase } from "./armazem.mjs";

// códigos que exigem consulta antes de dar a transacção por perdida
const EMOLA_INCERTOS = new Set(["EMOLA-GW-2007", "EMOLA-22", "EMOLA-99", "EMOLA-NO-ERRORCODE"]);

function mapearEmola(r) {
  let estado = r.status;
  if (estado === "FAILED" && EMOLA_INCERTOS.has(r.code)) estado = "UNKNOWN";
  return {
    estado,
    codigo: r.code,
    mensagem: r.original?.message ?? r.gateway?.description ?? null,
    id_operador: r.gateway?.gwtransid ?? null,
    request_id: r.original?.requestId ?? null,
  };
}

function mapearMpesa(r) {
  return {
    estado: r.status,
    codigo: r.code,
    mensagem: r.description ?? null,
    id_operador: r.transactionId ?? null,
    request_id: r.conversationId ?? null,
  };
}

export function criarWorker({ armazem, emola, mpesa, segredo, textoLoja = "Maputo Renova" }) {
  if (!segredo || segredo.length < 16) throw new Error("WORKER_SECRET em falta ou demasiado curto");

  // SUCCESS com fatura associada → regista o pagamento na app (fatura paga +
  // movimentos). A função no Postgres é idempotente; se a entrega falhar, a
  // transacção fica SUCCESS no armazém e a reconciliação diária apanha-a.
  async function entregarAApp(linha) {
    if (linha?.estado !== "SUCCESS" || !linha?.fatura_id || !armazem.registarPagamento) return;
    try {
      await armazem.registarPagamento(linha.trans_id);
    } catch (e) {
      console.error(`registo na app falhou (${linha.trans_id}):`, e.message);
      await armazem
        .actualizar(linha.trans_id, { mensagem: `SUCCESS; registo na app pendente: ${e.message}`.slice(0, 500) })
        .catch(() => {});
    }
  }

  async function cobrar(linha) {
    const { trans_id, provedor, msisdn, valor, referencia } = linha;
    try {
      let actualizada;
      if (provedor === "emola") {
        const r = await emola.c2b({
          msisdn,
          valor,
          transId: trans_id,
          refNo: referencia,
          texto: `Quota ${referencia} - ${textoLoja}`,
        });
        actualizada = await armazem.actualizar(trans_id, {
          ...mapearEmola(r),
          resposta_bruta: r.raw?.slice(0, 4000),
        });
      } else {
        const r = await mpesa.c2b({ msisdn, valor, referencia, refTerceiro: trans_id });
        actualizada = await armazem.actualizar(trans_id, {
          ...mapearMpesa(r),
          resposta_bruta: JSON.stringify(r.raw ?? null).slice(0, 4000),
        });
      }
      await entregarAApp(actualizada);
    } catch (e) {
      // erro de rede/timeout: estado desconhecido — o job de reconciliação resolve
      await armazem.actualizar(trans_id, { estado: "UNKNOWN", codigo: "ERRO-REDE", mensagem: e.message });
    }
  }

  async function reconciliar() {
    const pendentes = await armazem.porReconciliar();
    const resultados = [];
    for (const t of pendentes) {
      try {
        let novo;
        if (t.provedor === "emola") {
          const r = await emola.consultarTransaccao({ transId: t.trans_id, transType: "C2B" });
          if (r.status === "SUCCESS" && r.original.orgResponseCode === "01")
            novo = { estado: "SUCCESS", codigo: "EMOLA-0", mensagem: r.original.orgResponseMessage ?? null };
          else if (r.code === "EMOLA-13")
            novo = { estado: "FAILED", codigo: "EMOLA-13", mensagem: "Pedido original não encontrado" };
          else if (r.status === "SUCCESS")
            novo = { estado: "FAILED", codigo: `EMOLA-ORG-${r.original.orgResponseCode}`, mensagem: r.original.orgResponseMessage ?? null };
        } else {
          const r = await mpesa.consultar({ queryReference: t.trans_id, refTerceiro: t.trans_id });
          if (r.status === "SUCCESS")
            novo = { estado: "SUCCESS", codigo: "INS-0", id_operador: r.raw?.output_TransactionID ?? t.id_operador };
          else if (r.status === "FAILED") novo = { estado: "FAILED", codigo: r.code };
        }
        if (novo) {
          const linha = await armazem.actualizar(t.trans_id, {
            ...novo,
            tentativas: (t.tentativas ?? 0) + 1,
            consultado_em: new Date().toISOString(),
          });
          await entregarAApp(linha);
          resultados.push({ trans_id: t.trans_id, estado: linha.estado });
        } else {
          await armazem.actualizar(t.trans_id, {
            tentativas: (t.tentativas ?? 0) + 1,
            consultado_em: new Date().toISOString(),
          });
          resultados.push({ trans_id: t.trans_id, estado: t.estado });
        }
      } catch (e) {
        resultados.push({ trans_id: t.trans_id, estado: t.estado, erro: e.message });
      }
    }
    return resultados;
  }

  const servidor = http.createServer((req, res) => {
    const json = (status, corpo) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(corpo));
    };
    const url = new URL(req.url, "http://localhost");

    if (req.method === "GET" && url.pathname === "/saude") return json(200, { ok: true });

    const dado = req.headers["x-worker-secret"] ?? "";
    const ok =
      dado.length === segredo.length &&
      crypto.timingSafeEqual(Buffer.from(dado), Buffer.from(segredo));
    if (!ok) return json(401, { erro: "não autorizado" });

    if (req.method === "POST" && url.pathname === "/pagamentos") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        let p;
        try {
          p = JSON.parse(body);
        } catch {
          return json(400, { erro: "JSON inválido" });
        }
        const { provedor, msisdn, valor, referencia, fatura_id } = p ?? {};
        if (!["mpesa", "emola"].includes(provedor)) return json(400, { erro: "provedor deve ser mpesa ou emola" });
        if (!msisdn || !referencia) return json(400, { erro: "msisdn e referencia são obrigatórios" });
        const v = Number(valor);
        if (!(v > 0) || !Number.isFinite(v)) return json(400, { erro: "valor inválido" });

        const trans_id = novoTransId();
        try {
          await armazem.criar({
            trans_id,
            provedor,
            tipo: "C2B",
            msisdn: String(msisdn),
            valor: v,
            referencia: String(referencia),
            fatura_id: fatura_id ?? null,
            estado: "PROCESSING",
          });
        } catch (e) {
          return json(500, { erro: `armazém: ${e.message}` });
        }
        json(202, { trans_id, estado: "PROCESSING" });
        // cobrança assíncrona: a resposta 202 já saiu, o estado final fica no armazém
        cobrar({ trans_id, provedor, msisdn, valor: v, referencia }).catch(() => {});
      });
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/pagamentos/")) {
      const transId = decodeURIComponent(url.pathname.slice("/pagamentos/".length));
      armazem
        .obter(transId)
        .then((t) =>
          t
            ? json(200, {
                trans_id: t.trans_id,
                provedor: t.provedor,
                estado: t.estado,
                codigo: t.codigo ?? null,
                mensagem: t.mensagem ?? null,
                id_operador: t.id_operador ?? null,
              })
            : json(404, { erro: "não encontrada" }),
        )
        .catch((e) => json(500, { erro: e.message }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/reconciliar") {
      reconciliar()
        .then((r) => json(200, { reconciliadas: r }))
        .catch((e) => json(500, { erro: e.message }));
      return;
    }

    return json(404, { erro: "rota desconhecida" });
  });

  servidor.reconciliar = reconciliar; // exposto para testes e para um cron local
  return servidor;
}

// arranque directo em linha de comando (produção: VPS com IP fixo)
if (import.meta.url === `file://${process.argv[1]}`) {
  const env = process.env;
  const armazem =
    env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY
      ? armazemSupabase({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_KEY })
      : armazemMemoria();
  const worker = criarWorker({
    armazem,
    segredo: env.WORKER_SECRET,
    emola: new ClienteEmola({
      endpoint: env.EMOLA_ENDPOINT, // https://<ip>:<porta>/BCCSGateway/BCCSGateway
      username: env.EMOLA_USERNAME,
      password: env.EMOLA_PASSWORD,
      key: env.EMOLA_KEY,
      partnerCode: env.EMOLA_PARTNER_CODE, // string — preservar zeros à esquerda
      ca: env.EMOLA_CA_PATH ? fs.readFileSync(env.EMOLA_CA_PATH) : undefined,
    }),
    mpesa: new ClienteMpesa({
      host: env.MPESA_HOST, // api.sandbox.vm.co.mz ou api.vm.co.mz
      baseUrl: env.MPESA_BASE_URL, // só para mocks/testes
      apiKey: env.MPESA_API_KEY,
      publicKey: env.MPESA_PUBLIC_KEY,
      serviceProviderCode: env.MPESA_SERVICE_PROVIDER_CODE,
      initiatorIdentifier: env.MPESA_INITIATOR,
      securityCredential: env.MPESA_SECURITY_CREDENTIAL,
    }),
  });
  const porta = Number(env.PORT || 8080);
  worker.listen(porta, () => console.log(`payment-worker a escutar em :${porta}`));
  // reconciliação periódica: resolve UNKNOWN/PROCESSING antigos
  const intervalo = Number(env.RECONCILIAR_SEGUNDOS || 120) * 1000;
  setInterval(() => worker.reconciliar().catch((e) => console.error("reconciliar:", e.message)), intervalo);
}

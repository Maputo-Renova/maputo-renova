// Simulador local da M-Pesa OpenAPI (Vodacom Moçambique).
// O sandbox real é público mas exige conta em developer.mpesa.vm.co.mz
// (API Key + Public Key). Este mock reproduz o contrato REST para
// desenvolvimento e CI; serve todas as operações numa única porta
// (o gateway real usa uma porta por operação — ver src/mpesa/cliente.mjs).
//
// Uso directo: node mock/mpesa-mock.mjs   (porta 8090; PORT=xxxx para mudar)
// Autorização aceite: qualquer Bearer não vazio (o mock não valida RSA).
//
// Comportamento pelos 4 últimos dígitos do msisdn:
//   ...0000 → INS-0 sucesso            ...2006 → INS-2006 saldo insuficiente
//   ...0009 → INS-9 timeout (mas a transacção fica Completed → reconciliar)
//   ...0006 → INS-6 transacção falhou   ...2051 → INS-2051 MSISDN inválido
//   outro   → INS-0 sucesso
// ThirdPartyReference repetida → INS-10 duplicado.
import http from "node:http";
import crypto from "node:crypto";

const RESPOSTAS = {
  "INS-0": "Request processed successfully",
  "INS-6": "Transaction failed",
  "INS-9": "Request timeout",
  "INS-10": "Duplicate transaction",
  "INS-2006": "Insufficient balance",
  "INS-2051": "MSISDN invalid",
};
const desfecho = (msisdn = "") =>
  ({ "0000": "INS-0", 2006: "INS-2006", "0009": "INS-9", "0006": "INS-6", 2051: "INS-2051" })[
    msisdn.slice(-4)
  ] ?? "INS-0";

export function criarMockMpesa({ delayMs = Number(process.env.DELAY_MS ?? 0) } = {}) {
  const txs = new Map(); // thirdPartyReference → { transactionId, codigo, estado }

  const json = (res, status, corpo) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(corpo));
  };

  return http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      const auth = req.headers.authorization ?? "";
      if (!auth.startsWith("Bearer ") || auth.length < 10)
        return json(res, 401, { output_ResponseCode: "INS-26", output_ResponseDesc: "Not authorized" });

      const url = new URL(req.url, "http://localhost");

      if (req.method === "POST" && url.pathname === "/ipg/v1x/c2bPayment/singleStage/") {
        let p;
        try {
          p = JSON.parse(body);
        } catch {
          return json(res, 400, { output_ResponseCode: "INS-20", output_ResponseDesc: "Missing parameters" });
        }
        const msisdn = p.input_CustomerMSISDN ?? "";
        const ref3 = p.input_ThirdPartyReference ?? "";
        if (!/^2588[45]\d{7}$/.test(msisdn))
          return json(res, 400, { output_ResponseCode: "INS-2051", output_ResponseDesc: RESPOSTAS["INS-2051"] });
        if (!(Number(p.input_Amount) > 0) || !ref3 || !p.input_ServiceProviderCode)
          return json(res, 400, { output_ResponseCode: "INS-21", output_ResponseDesc: "Parameter validation failed" });
        if (txs.has(ref3))
          return json(res, 409, { output_ResponseCode: "INS-10", output_ResponseDesc: RESPOSTAS["INS-10"] });

        const codigo = desfecho(msisdn);
        const transactionId = crypto.randomBytes(6).toString("hex");
        // INS-9: o gateway responde timeout mas a transacção completa-se —
        // o cliente tem de consultar antes de decidir
        const estadoFinal = codigo === "INS-0" || codigo === "INS-9" ? "Completed" : "Cancelled";
        txs.set(ref3, { transactionId, codigo, estado: estadoFinal });
        if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
        const corpo = {
          output_ResponseCode: codigo,
          output_ResponseDesc: RESPOSTAS[codigo] ?? "Error",
          output_TransactionID: codigo === "INS-0" ? transactionId : undefined,
          output_ConversationID: crypto.randomUUID(),
          output_ThirdPartyReference: ref3,
        };
        return json(res, codigo === "INS-0" ? 201 : codigo === "INS-9" ? 500 : 422, corpo);
      }

      if (req.method === "GET" && url.pathname === "/ipg/v1x/queryTransactionStatus/") {
        const ref3 = url.searchParams.get("input_ThirdPartyReference") ?? "";
        const t = txs.get(ref3);
        if (!t)
          return json(res, 200, {
            output_ResponseCode: "INS-0",
            output_ResponseDesc: RESPOSTAS["INS-0"],
            output_ResponseTransactionStatus: "N/A",
          });
        return json(res, 200, {
          output_ResponseCode: "INS-0",
          output_ResponseDesc: RESPOSTAS["INS-0"],
          output_ResponseTransactionStatus: t.estado,
          output_TransactionID: t.transactionId,
        });
      }

      if (req.method === "PUT" && url.pathname === "/ipg/v1x/reversal/") {
        let p;
        try {
          p = JSON.parse(body);
        } catch {
          return json(res, 400, { output_ResponseCode: "INS-20", output_ResponseDesc: "Missing parameters" });
        }
        const existe = [...txs.values()].some((t) => t.transactionId === p.input_TransactionID);
        if (!existe)
          return json(res, 422, { output_ResponseCode: "INS-18", output_ResponseDesc: "Invalid transaction id" });
        return json(res, 200, {
          output_ResponseCode: "INS-0",
          output_ResponseDesc: RESPOSTAS["INS-0"],
          output_TransactionID: p.input_TransactionID,
        });
      }

      return json(res, 404, { output_ResponseCode: "INS-22", output_ResponseDesc: "Invalid operation type" });
    });
  });
}

// arranque directo em linha de comando
if (import.meta.url === `file://${process.argv[1]}`) {
  const porta = Number(process.env.PORT || 8090);
  criarMockMpesa({ delayMs: Number(process.env.DELAY_MS ?? 1500) }).listen(porta, () =>
    console.log(`Mock M-Pesa a correr em http://localhost:${porta}/ipg/v1x/...`),
  );
}

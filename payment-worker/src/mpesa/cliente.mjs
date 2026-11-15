// Cliente M-Pesa Moçambique (Vodacom OpenAPI — REST/JSON).
// Sem dependências: Node 18+.
//
// A Vodacom tem sandbox pública: cria-se a conta de developer em
// developer.mpesa.vm.co.mz, que entrega a API Key e a Public Key do sandbox.
// O token de autorização é a API Key cifrada com a Public Key (RSA PKCS#1
// v1.5) em base64. Portas por operação no ambiente real/sandbox:
//   C2B singleStage  POST :18352/ipg/v1x/c2bPayment/singleStage/
//   B2C              POST :18345/ipg/v1x/b2cPayment/
//   Query status     GET  :18353/ipg/v1x/queryTransactionStatus/
//   Reversal         PUT  :18354/ipg/v1x/reversal/
// [confirmar na documentação do portal: portas, nomes exactos dos campos]
//
// Tal como no eMola: timeout/erro de rede num C2B nunca é falha definitiva —
// é UNKNOWN e resolve-se com queryTransactionStatus antes de repetir.
import crypto from "node:crypto";

export const PORTAS_MPESA = { c2b: 18352, b2c: 18345, query: 18353, reversao: 18354 };

export function normalizarMsisdnMpesa(input) {
  let d = String(input).replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 9) d = `258${d}`;
  // Vodacom: prefixos 84/85, formato com indicativo 258 (12 dígitos)
  if (!/^2588[45]\d{7}$/.test(d)) throw new Error(`MSISDN inválido para M-Pesa: ${input}`);
  return d;
}

/** Token Bearer = base64( RSA_PKCS1(apiKey, publicKey) ) */
export function gerarToken(apiKey, publicKeyPem) {
  const cifrado = crypto.publicEncrypt(
    { key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(apiKey, "utf8"),
  );
  return cifrado.toString("base64");
}

/** Normaliza a resposta da OpenAPI para o contrato comum do worker. */
export function analisarRespostaMpesa(httpStatus, corpo) {
  const codigo = corpo?.output_ResponseCode ?? (httpStatus >= 500 ? "INS-9" : undefined);
  let status;
  if (codigo === "INS-0") status = "SUCCESS";
  else if (codigo === undefined || codigo === "INS-9" || codigo === "INS-16") {
    // sem código, timeout do gateway ou indisponibilidade → consultar antes de decidir
    status = "UNKNOWN";
  } else status = "FAILED";
  return {
    status,
    code: codigo ?? "MPESA-SEM-CODIGO",
    transactionId: corpo?.output_TransactionID,
    conversationId: corpo?.output_ConversationID,
    description: corpo?.output_ResponseDesc,
    raw: corpo,
  };
}

export class ClienteMpesa {
  /** @param {{host:string, apiKey:string, publicKey:string, serviceProviderCode:string,
   *           origem?:string, timeoutMs?:number, portas?:object,
   *           baseUrl?:string, // para testes: um só endpoint (mock) para todas as operações
   *           initiatorIdentifier?:string, securityCredential?:string}} cfg */
  constructor(cfg) {
    this.cfg = { origem: "developer.mpesa.vm.co.mz", timeoutMs: 120_000, portas: PORTAS_MPESA, ...cfg };
  }

  url(operacao, caminho) {
    if (this.cfg.baseUrl) return `${this.cfg.baseUrl.replace(/\/$/, "")}${caminho}`;
    return `https://${this.cfg.host}:${this.cfg.portas[operacao]}${caminho}`;
  }

  cabecalhos() {
    // sem publicKey (mocks/agregadores) envia a API key em claro; o gateway
    // real exige o token cifrado com a Public Key do portal de developer
    const token = this.cfg.publicKey ? gerarToken(this.cfg.apiKey, this.cfg.publicKey) : this.cfg.apiKey;
    return {
      "Content-Type": "application/json",
      Origin: this.cfg.origem,
      Authorization: `Bearer ${token}`,
    };
  }

  async pedir(metodo, url, corpo) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(new Error("MPESA-TIMEOUT")), this.cfg.timeoutMs);
    try {
      const res = await fetch(url, {
        method: metodo,
        headers: this.cabecalhos(),
        body: corpo ? JSON.stringify(corpo) : undefined,
        signal: ctl.signal,
      });
      let json = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      return analisarRespostaMpesa(res.status, json);
    } finally {
      clearTimeout(t);
    }
  }

  /** C2B single stage: o cliente recebe o pedido no telemóvel e confirma com o PIN */
  c2b({ msisdn, valor, referencia, refTerceiro }) {
    return this.pedir("POST", this.url("c2b", "/ipg/v1x/c2bPayment/singleStage/"), {
      input_TransactionReference: referencia,
      input_CustomerMSISDN: normalizarMsisdnMpesa(msisdn),
      input_Amount: String(valor),
      input_ThirdPartyReference: refTerceiro,
      input_ServiceProviderCode: this.cfg.serviceProviderCode,
    });
  }

  /** B2C: desembolso/reembolso para o cliente */
  b2c({ msisdn, valor, referencia, refTerceiro }) {
    return this.pedir("POST", this.url("b2c", "/ipg/v1x/b2cPayment/"), {
      input_TransactionReference: referencia,
      input_CustomerMSISDN: normalizarMsisdnMpesa(msisdn),
      input_Amount: String(valor),
      input_ThirdPartyReference: refTerceiro,
      input_ServiceProviderCode: this.cfg.serviceProviderCode,
    });
  }

  /** Consulta o estado por queryReference (TransactionID ou ThirdPartyReference original) */
  async consultar({ queryReference, refTerceiro }) {
    const q = new URLSearchParams({
      input_QueryReference: queryReference,
      input_ServiceProviderCode: this.cfg.serviceProviderCode,
      input_ThirdPartyReference: refTerceiro,
    });
    const r = await this.pedir("GET", `${this.url("query", "/ipg/v1x/queryTransactionStatus/")}?${q}`);
    // a consulta devolve também output_ResponseTransactionStatus: Completed | ...
    const estadoTx = r.raw?.output_ResponseTransactionStatus;
    if (r.code === "INS-0" && estadoTx) {
      r.status = estadoTx === "Completed" ? "SUCCESS" : estadoTx === "N/A" ? "UNKNOWN" : "FAILED";
    }
    return r;
  }

  /** Reversão (precisa de initiatorIdentifier e securityCredential do contrato) */
  reverter({ transactionId, valor, refTerceiro }) {
    return this.pedir("PUT", this.url("reversao", "/ipg/v1x/reversal/"), {
      input_TransactionID: transactionId,
      input_ReversalAmount: String(valor),
      input_ThirdPartyReference: refTerceiro,
      input_ServiceProviderCode: this.cfg.serviceProviderCode,
      input_InitiatorIdentifier: this.cfg.initiatorIdentifier,
      input_SecurityCredential: this.cfg.securityCredential,
    });
  }
}

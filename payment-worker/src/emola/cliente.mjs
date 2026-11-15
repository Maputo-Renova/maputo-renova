// Cliente e-Mola (Movitel) — gateway BCCS (SOAP 1.1, operação única gwOperation).
// Sem dependências: Node 18+. Baseado na especificação compilada em
// docs/pagamentos-moveis.md; os pontos [SDK]/[Inferido] devem ser validados
// contra a spec v1.5 e o WSDL entregues pela Movitel no onboarding.
//
// Regra de ouro: resposta sem errorCode NUNCA é sucesso — é UNKNOWN e vai
// para reconciliação com pushUssdQueryTrans.
import http from "node:http";
import https from "node:https";
import crypto from "node:crypto";

const GW_NS = "http://webservice.bccsgw.viettel.com/"; // confirmar no WSDL da Movitel

const esc = (v) =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
const unesc = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${name}>([\\s\\S]*?)</(?:\\w+:)?${name}>`));
  return m ? m[1].trim() : undefined;
};

export const novoTransId = () => crypto.randomBytes(8).toString("hex").toUpperCase(); // 16 chars

export function normalizarMsisdnEmola(input) {
  let d = String(input).replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("258")) d = d.slice(3);
  if (d.length === 10 && d.startsWith("0")) d = d.slice(1);
  if (!/^8[67]\d{7}$/.test(d)) throw new Error(`MSISDN inválido para eMola: ${input}`);
  return d;
}

export function construirEnvelope({ username, password, wscode, params }) {
  const p = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `<param name="${esc(k)}" value="${esc(v)}"/>`)
    .join("");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="${GW_NS}">` +
    "<soapenv:Header/><soapenv:Body><web:gwOperation><Input>" +
    `<username>${esc(username)}</username><password>${esc(password)}</password>` +
    `<wscode>${esc(wscode)}</wscode>${p}<rawData>?</rawData>` +
    "</Input></web:gwOperation></soapenv:Body></soapenv:Envelope>"
  );
}

export function analisarResposta(xml) {
  const result = tag(xml, "Result") ?? xml;
  let original = tag(result, "original") ?? "";
  // remove o bloco original antes de ler o nível do gateway, para não
  // confundir tags internas com as exteriores
  const exterior = result.replace(/<(?:\w+:)?original>[\s\S]*?<\/(?:\w+:)?original>/, "");
  original = original.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
  if (original.includes("&lt;")) original = unesc(original);

  const gw = {
    error: tag(exterior, "error"),
    description: tag(exterior, "description"),
    gwtransid: tag(exterior, "gwtransid"),
  };
  const negocio = {
    errorCode: tag(original, "errorCode"),
    message: tag(original, "message"),
    // a Movitel escreve "reqeustId" (erro de ortografia da própria spec)
    requestId: tag(original, "reqeustId") ?? tag(original, "requestId"),
    orgResponseCode: tag(original, "orgResponseCode"),
    orgResponseMessage: tag(original, "orgResponseMessage"),
    balance: tag(original, "balance"),
  };

  let status, code;
  if (gw.error && gw.error !== "0") {
    status = "FAILED";
    code = `EMOLA-GW-${gw.error}`;
  } else if (negocio.errorCode === undefined) {
    status = "UNKNOWN"; // nunca assumir sucesso
    code = "EMOLA-NO-ERRORCODE";
  } else if (negocio.errorCode === "0") {
    status = "SUCCESS";
    code = "EMOLA-0";
  } else {
    status = "FAILED";
    code = `EMOLA-${negocio.errorCode.padStart(2, "0")}`;
  }
  return { status, code, gateway: gw, original: negocio, raw: xml };
}

export class ClienteEmola {
  /** @param {{endpoint:string, username:string, password:string, key:string, partnerCode:string,
   *           language?:'pt'|'en', timeoutMs?:number, ca?:string|Buffer}} cfg */
  constructor(cfg) {
    this.cfg = { language: "pt", timeoutMs: 90_000, ...cfg };
  }

  chamar(wscode, params) {
    const { endpoint, username, password, timeoutMs, ca } = this.cfg;
    const body = construirEnvelope({ username, password, wscode, params });
    const url = new URL(endpoint.replace(/\?wsdl$/i, ""));
    const lib = url.protocol === "https:" ? https : http;
    return new Promise((resolve, reject) => {
      const req = lib.request(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            SOAPAction: '""',
            "Content-Length": Buffer.byteLength(body),
          },
          // fixar o CA do gateway em vez de desligar a verificação TLS
          ...(ca ? { ca } : {}),
        },
        (res) => {
          let data = "";
          res.setEncoding("utf8");
          res.on("data", (c) => (data += c));
          res.on("end", () =>
            res.statusCode >= 500 && !data.includes("Result")
              ? reject(new Error(`HTTP ${res.statusCode}`))
              : resolve(analisarResposta(data)),
          );
        },
      );
      req.setTimeout(timeoutMs, () => req.destroy(new Error("EMOLA-TIMEOUT")));
      req.on("error", reject);
      req.end(body);
    });
  }

  base(extra) {
    return { partnerCode: this.cfg.partnerCode, ...extra, key: this.cfg.key };
  }

  /** C2B: envia USSD push para o cliente confirmar com o PIN */
  c2b({ msisdn, valor, transId, refNo, texto }) {
    return this.chamar("pushUssdMessage", this.base({
      msisdn: normalizarMsisdnEmola(msisdn),
      smsContent: String(texto).slice(0, 150),
      transAmount: valor,
      transId,
      language: this.cfg.language,
      refNo,
    }));
  }

  /** B2C: desembolso da conta da empresa para o cliente (reembolsos) */
  b2c({ msisdn, valor, transId, texto }) {
    return this.chamar("pushUssdDisbursementB2C", this.base({
      msisdn: normalizarMsisdnEmola(msisdn),
      smsContent: String(texto).slice(0, 150),
      transAmount: valor,
      transId,
    }));
  }

  /** Consulta o estado de uma transacção anterior (pelo transId ORIGINAL) */
  consultarTransaccao({ transId, transType = "C2B" }) {
    return this.chamar("pushUssdQueryTrans", this.base({ transId, transType }));
  }

  consultarNomeBeneficiario({ msisdn }) {
    return this.chamar("queryBeneficiaryName", this.base({
      transId: novoTransId(),
      msisdn: normalizarMsisdnEmola(msisdn),
    }));
  }

  consultarSaldo() {
    return this.chamar("queryAccountBalance", this.base({ transId: novoTransId() }));
  }
}

// Simulador local do gateway eMola (BCCSGateway / gwOperation).
// A Movitel não tem sandbox pública — este mock reproduz o envelope e os
// códigos reais para desenvolvimento, testes automáticos e CI.
//
// Uso directo: node mock/emola-mock.mjs   (porta 8089; PORT=xxxx para mudar)
// Endpoint:    POST http://localhost:8089/BCCSGateway/BCCSGateway
// Credenciais aceites: username=test / password=test / key=testkey / partnerCode=00000
//
// Comportamento pelos 4 últimos dígitos do msisdn:
//   ...0000 → sucesso (0)        ...1111 → 11 cliente não introduziu o PIN
//   ...1212 → 12 sem conta eMola  ...0707 → 07 MSISDN inválido
//   ...2020 → 20 noutro processo  ...0303 → 03 transacção falhou
//   ...2222 → gateway 2007 (timeout) MAS a transacção fica feita → reconciliar
//   outro   → sucesso
import http from "node:http";

export const CREDS_TESTE = { username: "test", password: "test", key: "testkey", partnerCode: "00000" };

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pick = (xml, name) =>
  (xml.match(new RegExp(`<(?:\\w+:)?${name}>([\\s\\S]*?)</(?:\\w+:)?${name}>`)) || [])[1];
const params = (xml) =>
  Object.fromEntries(
    [...xml.matchAll(/<param\s+name="([^"]*)"\s+value="([^"]*)"\s*\/>/g)].map((m) => [m[1], m[2]]),
  );
const gwId = () =>
  new Date().toISOString().replace(/\D/g, "").slice(0, 14) +
  String(Math.floor(Math.random() * 1e6)).padStart(6, "0");

function envelope({ error = "0", description = "success", original = "", gwtransid = "" }) {
  return (
    `<?xml version="1.0" encoding="UTF-8"?><S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/"><S:Body>` +
    `<ns2:gwOperationResponse xmlns:ns2="http://webservice.bccsgw.viettel.com/"><Result>` +
    `<error>${error}</error><description>${esc(description)}</description>` +
    `<gwtransid>${gwtransid}</gwtransid><original>${esc(original)}</original>` +
    `</Result></ns2:gwOperationResponse></S:Body></S:Envelope>`
  );
}
function original(wscode, fields) {
  const inner = Object.entries(fields)
    .map(([k, v]) => `<${k}>${esc(v)}</${k}>`)
    .join("");
  return (
    `<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/"><S:Body>` +
    `<ns2:${wscode}Response xmlns:ns2="http://services.wsfw.vas.viettel.com/"><return>${inner}</return>` +
    `</ns2:${wscode}Response></S:Body></S:Envelope>`
  );
}

const MSG = {
  0: "Successfully",
  "03": "Transaction failed",
  "05": "Invalid partner code",
  "06": "Invalid amount",
  "07": "Invalid msisdn",
  "09": "Invalid transId",
  11: "Customer did not enter PIN",
  12: "Msisdn has no e-Mola account",
  13: "Original request not found",
  14: "Duplicate transId",
  20: "Msisdn is in another process",
  24: "Function not supported",
};
const desfecho = (msisdn = "") =>
  ({ "0000": "0", 1111: "11", 1212: "12", "0707": "07", 2020: "20", "0303": "03", 2222: "0" })[
    msisdn.slice(-4)
  ] ?? "0";

export function criarMockEmola({ delayMs = Number(process.env.DELAY_MS ?? 0) } = {}) {
  const txs = new Map(); // transId → { wscode, msisdn, amount, errorCode }
  let saldo = 250000;

  return http.createServer((req, res) => {
    if (req.method !== "POST" || !req.url.startsWith("/BCCSGateway/BCCSGateway")) {
      res.writeHead(404);
      return res.end("not found");
    }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      const reply = (xml) => {
        res.writeHead(200, { "Content-Type": "text/xml; charset=utf-8" });
        res.end(xml);
      };
      const username = pick(body, "username");
      const password = pick(body, "password");
      const wscode = pick(body, "wscode");
      const p = params(body);
      if (!wscode) return reply(envelope({ error: "4000", description: "Bad request format" }));
      if (username !== CREDS_TESTE.username || password !== CREDS_TESTE.password)
        return reply(
          envelope({
            error: "6003",
            description: "Login failed. Please check username, password and your IP Address",
          }),
        );
      const gwtransid = gwId();
      const reqId = `${CREDS_TESTE.partnerCode}${gwtransid}`;
      const biz = (code, extra = {}) =>
        reply(
          envelope({
            gwtransid,
            original: original(wscode, {
              errorCode: code,
              message: MSG[code] ?? "Error",
              reqeustId: reqId, // ortografia da própria Movitel
              ...extra,
            }),
          }),
        );

      if (p.partnerCode !== CREDS_TESTE.partnerCode) return biz("05");
      if (p.key !== CREDS_TESTE.key) return biz("98");
      switch (wscode) {
        case "pushUssdMessage":
        case "pushUssdDisbursementB2C": {
          if (!/^8[67]\d{7}$/.test(p.msisdn || "")) return biz("07");
          if (!(Number(p.transAmount) > 0)) return biz("06");
          if (!p.transId) return biz("09");
          if (txs.has(p.transId)) return biz("14");
          const code =
            wscode === "pushUssdDisbursementB2C" && desfecho(p.msisdn) === "11"
              ? "0"
              : desfecho(p.msisdn);
          txs.set(p.transId, { wscode, msisdn: p.msisdn, amount: Number(p.transAmount), errorCode: code });
          if (wscode === "pushUssdMessage" && delayMs)
            await new Promise((r) => setTimeout(r, delayMs)); // tempo do cliente a digitar o PIN
          if (code === "0") saldo += (wscode === "pushUssdMessage" ? 1 : -1) * Number(p.transAmount);
          // ...2222: a transacção foi processada, mas o gateway responde timeout —
          // o cliente tem de reconciliar com pushUssdQueryTrans
          if (p.msisdn.endsWith("2222") && wscode === "pushUssdMessage")
            return reply(envelope({ error: "2007", description: "API timeout" }));
          return biz(code);
        }
        case "pushUssdQueryTrans": {
          const t = txs.get(p.transId);
          if (!t) return biz("13");
          return biz("0", {
            orgResponseCode: t.errorCode === "0" ? "01" : "02",
            orgResponseMessage: MSG[t.errorCode] ?? "Failed",
          });
        }
        case "queryBeneficiaryName":
          if (desfecho(p.msisdn) === "12") return biz("12");
          return biz("0", { message: "J**o M*****o" });
        case "queryAccountBalance":
          return biz("0", { balance: String(saldo) });
        default:
          return reply(envelope({ error: "2000", description: "Invalid wscode" }));
      }
    });
  });
}

// arranque directo em linha de comando
if (import.meta.url === `file://${process.argv[1]}`) {
  const porta = Number(process.env.PORT || 8089);
  criarMockEmola({ delayMs: Number(process.env.DELAY_MS ?? 1500) }).listen(porta, () =>
    console.log(`Mock eMola a correr em http://localhost:${porta}/BCCSGateway/BCCSGateway`),
  );
}

// Suite E2E do Maputo Renova — corre em browser real contra a pilha local
// (supabase start + next start). Usada na CI; pode correr localmente com:
//   BASE=http://localhost:3000 SUPABASE_URL=... SUPABASE_ANON_KEY=... node tests/e2e.mjs
import { chromium } from "playwright";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3000";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.SUPABASE_ANON_KEY;
const PASS = "DemoRenova2026!";

if (!ANON) {
  console.error("SUPABASE_ANON_KEY em falta");
  process.exit(1);
}

let falhas = 0;
const ok = (nome) => console.log(`✓ ${nome}`);
const falha = (nome, extra) => {
  falhas++;
  console.error(`✗ ${nome}${extra ? ` — ${extra}` : ""}`);
};

function totp(secretB32) {
  const alf = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secretB32.replace(/=+$/, "").toUpperCase()) {
    const v = alf.indexOf(c);
    if (v >= 0) bits += v.toString(2).padStart(5, "0");
  }
  const bytes = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = crypto.createHmac("sha1", bytes).update(counter).digest();
  const off = h[h.length - 1] & 0xf;
  return ((h.readUInt32BE(off) & 0x7fffffff) % 1e6).toString().padStart(6, "0");
}

async function login(browser, email) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/entrar`);
  await page.fill("#email", email);
  await page.fill("#password", PASS);
  await page.click("button:has-text('Entrar')");
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30000 });
  return page;
}

const browser = await chromium.launch();
try {
  // ── Anónimo é redireccionado ────────────────────────────────────────────
  {
    const p = await (await browser.newContext()).newPage();
    await p.goto(`${BASE}/consola`);
    if (p.url().includes("/entrar")) ok("anónimo → /entrar");
    else falha("anónimo → /entrar", p.url());
    await p.context().close();
  }

  // ── Consola: visão geral, aprovação do gestor pendente, configuração ────
  const c = await login(browser, "consola.demo@maputorenova.co.za");
  await c.waitForSelector("text=Ranking de adimplência");
  await c.waitForSelector("text=Belmiro");
  ok("consola: visão geral com gestor por aprovar");
  await c.click("button:has-text('Aprovar')");
  await c.waitForSelector("text=Gestores por aprovar", { state: "detached", timeout: 30000 });
  ok("consola: gestor aprovado (cartão desapareceu)");
  await c.goto(`${BASE}/consola/configuracao`);
  await c.waitForSelector("text=Métodos digitais");
  await c.waitForSelector("text=BCI");
  ok("consola: configuração com conta BCI");

  // ── Agente: cadastro de flats + convite do proprietário por LINK ────────
  const SERVICE = process.env.SUPABASE_SERVICE_KEY;
  {
    const a = await login(browser, "agente.demo@maputorenova.co.za");
    await a.waitForURL((u) => u.pathname.startsWith("/agente"), { timeout: 30000 });
    await a.waitForSelector("text=Cadastro de condomínios");
    ok("agente: área de cadastro acessível");

    // Cadastrar: Novo condomínio (predefinido) · Nova flat;
    // Meus Cadastros no menu lateral, com as flats dentro de cada condomínio
    await a.waitForSelector("#c-nome");
    await a.click("[role='tab']:has-text('Nova flat')");
    await a.waitForSelector("#condominio_id");
    await a.goto(`${BASE}/agente/cadastros`);
    await a.waitForSelector("text=o seu histórico de cadastros");
    await a.click("a:has-text('Jardim das Acácias')");
    await a.waitForSelector("text=Celeste");
    await a.waitForSelector("text=Convite por usar");
    await a.click("a:has-text('Celeste')");
    await a.waitForSelector("text=Proprietário(a)");
    await a.waitForSelector("input[value='Mabjaia']");
    ok("agente: Meus Cadastros → condomínio → detalhe da flat");

    if (SERVICE) {
      const EMAIL_DONO = "convite.e2e@exemplo.co.mz";
      const pdfAgente = path.join(os.tmpdir(), "kyc-e2e.pdf");
      fs.writeFileSync(pdfAgente, "%PDF-1.4 documento de teste");
      const processar = () =>
        fetch(`${SUPABASE_URL}/functions/v1/processar-envios`, {
          method: "POST",
          headers: { "x-envios-secret": "segredo-local-ci" },
        }).then((r) => r.json());
      const rest = (caminho) =>
        fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
          headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
        }).then((r) => r.json());
      const registarFlat = async (numero, email, anexos = false) => {
        await a.goto(`${BASE}/agente`);
        await a.click("[role='tab']:has-text('Nova flat')");
        await a.selectOption("#condominio_id", { label: "Jardim das Acácias" });
        await a.fill("#bloco", "B2");
        await a.fill("#andar", "3");
        await a.fill("#numero", numero);
        await a.fill("#nome", "Shelton");
        await a.fill("#apelido", "Douglas");
        await a.fill("#telefone", "84 777 0001");
        if (email) await a.fill("#email", email);
        if (anexos) {
          await a.setInputFiles("input[name='doc']", pdfAgente);
          await a.setInputFiles("input[name='endereco']", pdfAgente);
          await a.waitForSelector("text=kyc-e2e.pdf");
        }
        await a.click("form button:has-text('Registar flat')");
        await a.waitForSelector("text=Flat registada", { timeout: 30000 });
      };

      // 1) Flat nova com email e documentos anexados → link preparado
      await registarFlat("75", EMAIL_DONO, true);
      const [f75] = await rest(
        "flats?numero=eq.75&select=proprietario_doc_path,comprovativo_endereco_path",
      );
      if (f75?.proprietario_doc_path && f75?.comprovativo_endereco_path) {
        ok("agente: documento e comprovativo de endereço anexados no cadastro");
      } else {
        falha("agente: anexos do cadastro", JSON.stringify(f75));
      }
      const r1 = await processar();
      if (r1.preparados >= 1) ok("convite: link preparado pela função");
      else falha("convite: link preparado pela função", JSON.stringify(r1));

      const [envio] = await rest(
        `envios?tipo=eq.convite_link&destinatario=eq.${EMAIL_DONO}&order=id.asc&limit=1`,
      );
      const m2 = (envio?.corpo ?? "").match(/token_hash=([^&]+)&type=invite&next=([^"]+)/);
      if (!m2) {
        falha("convite: corpo com link", (envio?.corpo ?? "sem corpo").slice(0, 160));
      } else {
        // 2) Dono abre o link → só define a password → painel do morador
        const s = await (await browser.newContext()).newPage();
        await s.goto(
          `${BASE}/auth/confirmar?token_hash=${m2[1]}&type=invite&next=${m2[2]}`,
        );
        await s.waitForURL((u) => u.pathname.startsWith("/definir-password"), { timeout: 30000 });
        await s.fill("#password", PASS);
        await s.fill("#password2", PASS);
        await s.check("input[name='termos']");
        await s.click("button:has-text('Concluir e entrar')");
        await s.waitForSelector("text=Olá, Shelton", { timeout: 30000 });
        ok("convite: link → password → painel do morador num único fluxo");

        // 3) Segunda flat com o MESMO email → associada automaticamente
        await registarFlat("76", EMAIL_DONO);
        const r3 = await processar();
        const [f76] = await rest("flats?numero=eq.76&select=perfil_proprietario_id");
        if (r3.preparados >= 1 && f76?.perfil_proprietario_id) {
          ok("convite: segunda moradia associada automaticamente ao mesmo dono");
        } else {
          falha("convite: associação automática", JSON.stringify({ r3, f76 }));
        }

        await s.context().close();

        // 4) Caminho manual preservado: outra dona cria conta em /convite
        //    com o código (reservado ao email indicado no cadastro)
        await a.goto(`${BASE}/agente`);
        await a.click("[role='tab']:has-text('Nova flat')");
        await a.selectOption("#condominio_id", { label: "Jardim das Acácias" });
        await a.fill("#bloco", "B2");
        await a.fill("#andar", "4");
        await a.fill("#numero", "81");
        await a.fill("#nome", "Belmira");
        await a.fill("#apelido", "Costa");
        await a.fill("#telefone", "84 777 0002");
        await a.fill("#email", "belmira.e2e@exemplo.co.mz");
        await a.click("form button:has-text('Registar flat')");
        await a.waitForSelector("text=Código de convite do proprietário", { timeout: 30000 });
        const texto = await a.locator("text=Código de convite do proprietário").innerText();
        const codigo = texto.split(":").pop().trim().replace(/\.$/, "");

        const b = await (await browser.newContext()).newPage();
        await b.goto(`${BASE}/convite`);
        await b.fill("#codigo", codigo);
        await b.fill("#email", "belmira.e2e@exemplo.co.mz");
        await b.fill("#password", PASS);
        await b.fill("#password2", PASS);
        await b.check("input[name='termos']");
        await b.click("button:has-text('Criar conta e entrar')");
        await b.waitForSelector("text=Olá, Belmira", { timeout: 30000 });
        ok("convite: caminho manual por código (reservado ao email do cadastro)");
        await b.context().close();

        // 5) Gestor com o MESMO fluxo do morador: condomínio registado com o
        //    email do gestor → link → password + termos → conta pendente,
        //    com os Termos registados no condomínio
        const EMAIL_GESTOR = "gestor.e2e@exemplo.co.mz";
        await a.goto(`${BASE}/agente`);
        await a.fill("#c-nome", "Residencial E2E");
        await a.fill("#c-bairro", "Malhangalene");
        await a.fill("#c-rua", "Av. de Angola");
        await a.fill("#g-nome", "Ercília");
        await a.fill("#g-apelido", "Tembe");
        await a.fill("#g-email", EMAIL_GESTOR);
        await a.click("form button:has-text('Criar condomínio')");
        await a.waitForSelector("text=criado", { timeout: 30000 });
        await processar();
        const [envioG] = await rest(
          `envios?tipo=eq.convite_acesso_link&destinatario=eq.${EMAIL_GESTOR}&order=id.asc&limit=1`,
        );
        const mg = (envioG?.corpo ?? "").match(/token_hash=([^&]+)&type=invite&next=([^"]+)/);
        if (!mg) {
          falha("gestor: corpo do convite com link", (envioG?.corpo ?? "sem corpo").slice(0, 160));
        } else {
          const g2 = await (await browser.newContext()).newPage();
          await g2.goto(`${BASE}/auth/confirmar?token_hash=${mg[1]}&type=invite&next=${mg[2]}`);
          await g2.waitForURL((u) => u.pathname.startsWith("/definir-password"), { timeout: 30000 });
          await g2.fill("#password", PASS);
          await g2.fill("#password2", PASS);
          await g2.check("input[name='termos']");
          await g2.click("button:has-text('Concluir e entrar')");
          await g2.waitForSelector("text=Conta a aguardar aprovação", { timeout: 30000 });
          const [condoE2e] = await rest(
            "condominios?nome=eq.Residencial%20E2E&select=termos_aceites_em,termos_aceites_por",
          );
          if (condoE2e?.termos_aceites_em && condoE2e?.termos_aceites_por) {
            ok("gestor: link → password → pendente, com Termos registados no condomínio");
          } else {
            falha("gestor: termos no condomínio", JSON.stringify(condoE2e));
          }
          await g2.context().close();
        }
      }
    }
    await a.context().close();
  }

  // ── Morador: fatura pendente → pagar por transferência ──────────────────
  const m = await login(browser, "morador.demo@maputorenova.co.za");
  await m.goto(`${BASE}/morador/faturas`);
  await m.waitForSelector("button:text-is('Transferência')");
  ok("morador: fatura pendente com botão de pagamento");

  // ── Morador: pagar por M-Pesa (payment-worker + simulador do gateway) ────
  if (process.env.PAYMENT_WORKER_URL) {
    await m.waitForSelector("button:text-is('M-Pesa')");
    await m.click("button:text-is('M-Pesa')");
    // número de teste do simulador: termina em 0000 → sucesso após o "PIN"
    await m.fill("input[name='msisdn']", "84 888 0000");
    await m.click("button:has-text('Enviar pedido ao telemóvel')");
    await m.waitForSelector("text=A aguardar confirmação", { timeout: 30000 });
    // o worker cobra no gateway simulado, regista na app e a página refresca
    await m.waitForSelector(".pill:has-text('Paga')", { timeout: 90000 });
    ok("morador: fatura paga por M-Pesa (cobrança, registo e fatura Paga)");
  } else {
    console.log("· pagamento móvel saltado (PAYMENT_WORKER_URL não definido)");
  }
  const pdf = path.join(os.tmpdir(), "comprovativo-e2e.pdf");
  fs.writeFileSync(pdf, "%PDF-1.4 comprovativo de teste");
  await m.click("button:text-is('Transferência')");
  await m.setInputFiles("input[name='comprovativo']", pdf);
  await m.click("button:has-text('Enviar comprovativo')");
  await m.waitForSelector("text=aguarda a confirmação", { timeout: 30000 });
  ok("morador: comprovativo enviado (A confirmar)");

  // ── Gestor: confirmar a transferência ───────────────────────────────────
  const g = await login(browser, "gestor.demo@maputorenova.co.za");
  await g.goto(`${BASE}/gestor/pagamentos`);
  await g.waitForSelector("button:has-text('Confirmar')");
  await g.click("button:has-text('Confirmar')");
  await g.waitForSelector("button:has-text('Confirmar')", { state: "detached", timeout: 30000 });
  ok("gestor: transferência confirmada");
  await m.goto(`${BASE}/morador/faturas`);
  await m.waitForSelector(".pill:has-text('Paga')", { timeout: 30000 });
  await m.waitForSelector(".pill:has-text('Pendente'), .pill:has-text('Em atraso'), .pill:has-text('A confirmar')", {
    state: "detached",
    timeout: 30000,
  });
  ok("morador: todas as faturas marcadas Paga");

  // ── Gestor: tesouraria com movimentos + nova despesa ────────────────────
  await g.goto(`${BASE}/gestor/tesouraria`);
  await g.waitForSelector("text=Cobrança confirmada");
  await g.fill("input[name='descricao']", "Reparação do portão");
  await g.fill("input[name='valor']", "3500");
  await g.setInputFiles("input[name='comprovativo']", pdf);
  await g.click("button:has-text('Registar despesa')");
  await g.waitForSelector("text=Despesa registada", { timeout: 30000 });
  ok("gestor: despesa registada com fatura");

  // ── Suporte: morador abre ticket, gestor resolve ────────────────────────
  await m.goto(`${BASE}/morador/suporte`);
  await m.fill("#tk-assunto", "Fuga de água na garagem");
  await m.fill("#tk-msg", "Há uma fuga perto do lugar 12.");
  await m.click("button:has-text('Enviar ao gestor')");
  await m.waitForSelector("text=Enviado ao gestor", { timeout: 30000 });
  await g.goto(`${BASE}/gestor/suporte`);
  await g.waitForSelector("text=Fuga de água na garagem");
  await g.click("button:has-text('Resolver')");
  await g.waitForSelector("h2:has-text('Resolvidos')", { timeout: 30000 });
  ok("suporte: ticket criado e resolvido");

  // ── Avisos: gestor publica, morador vê ──────────────────────────────────
  await g.goto(`${BASE}/gestor/avisos`);
  await g.fill("#av-t", "Corte de energia na sexta");
  await g.fill("#av-c", "Manutenção da EDM das 9h às 12h.");
  await g.click("button:has-text('Enviar a')");
  await g.waitForSelector("text=Aviso publicado", { timeout: 30000 });
  await m.goto(`${BASE}/morador/avisos`);
  await m.waitForSelector("text=Corte de energia na sexta");
  ok("avisos: publicado pelo gestor e visível ao morador");

  // ── Perfil: guardar nome ────────────────────────────────────────────────
  await m.goto(`${BASE}/perfil`);
  await m.click("button:has-text('Guardar alterações')");
  await m.waitForSelector("text=Alterações guardadas", { timeout: 30000 });
  ok("perfil: guardar alterações");

  // ── MFA: inscrever, desafiar no login, aal1 bloqueado, desactivar ───────
  await c.goto(`${BASE}/perfil`);
  await c.click("button:has-text('Activar verificação')");
  await c.waitForSelector("text=Introduza manualmente", { timeout: 30000 });
  const segredo = (await c.locator("text=Introduza manualmente").innerText()).split(":").pop().trim();
  await c.fill("#mfa-codigo", totp(segredo));
  await c.click("button:has-text('Confirmar')");
  await c.waitForSelector(".pill:has-text('Activa')", { timeout: 30000 });
  ok("mfa: inscrito e verificado");

  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "consola.demo@maputorenova.co.za", password: PASS }),
  });
  const sess = await resp.json();
  const q = await fetch(`${SUPABASE_URL}/rest/v1/condominios?select=id`, {
    headers: { apikey: ANON, Authorization: `Bearer ${sess.access_token}` },
  });
  const linhas = await q.json();
  if (Array.isArray(linhas) && linhas.length === 0) {
    ok("mfa: sessão aal1 (sem código) vê zero dados");
  } else {
    falha("mfa: sessão aal1 devia ver zero dados", JSON.stringify(linhas).slice(0, 120));
  }

  await c.click("button:has-text('Terminar sessão')");
  await c.waitForURL((u) => u.pathname.startsWith("/entrar"), { timeout: 30000 });
  await c.fill("#email", "consola.demo@maputorenova.co.za");
  await c.fill("#password", PASS);
  await c.click("button:has-text('Entrar')");
  await c.waitForSelector("text=Verificação em dois passos", { timeout: 30000 });
  await c.fill("#codigo", totp(segredo));
  await c.click("button:has-text('Verificar')");
  await c.waitForURL((u) => u.pathname.startsWith("/consola"), { timeout: 30000 });
  await c.waitForSelector("text=Ranking de adimplência");
  ok("mfa: desafio no login e sessão aal2 com dados");

  await c.goto(`${BASE}/perfil`);
  await c.waitForSelector(".pill:has-text('Activa')");
  await c.click("button:has-text('Desactivar')");
  await c.waitForSelector("button:has-text('Activar verificação')", { timeout: 30000 });
  ok("mfa: desactivado");
} catch (e) {
  falha("excepção", e.message);
} finally {
  await browser.close();
}

if (falhas > 0) {
  console.error(`\nE2E: ${falhas} falha(s)`);
  process.exit(1);
}
console.log("\nE2E: tudo passou");

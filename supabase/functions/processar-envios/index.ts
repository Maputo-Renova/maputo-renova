// Processador da fila de envios (tabela public.envios, canal 'email').
// Chamado pelo pg_cron a cada 5 minutos com o cabeçalho x-envios-secret
// (segredo no Vault). Envia via Resend e marca enviado/falhou.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("FROM_EMAIL") ?? "Maputo Renova <onboarding@resend.dev>";

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function html(corpo: string): string {
  return `<!doctype html><html lang="pt"><body style="margin:0;background:#F4F4F1;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#171E1A">
  <div style="max-width:560px;margin:0 auto;padding:28px 16px">
    <div style="font-weight:800;font-size:18px;color:#0A5C36;margin-bottom:14px">Maputo Renova</div>
    <div style="background:#fff;border-radius:16px;padding:24px;font-size:15px;line-height:1.6">${corpo}</div>
    <div style="font-size:12px;color:#5E6862;margin-top:14px">Gestão de condomínios · Maputo · mensagem automática, não responda a este email.</div>
  </div></body></html>`;
}

Deno.serve(async (req: Request) => {
  const { data: segredo } = await supabase.rpc("fn_envios_secret");
  if (!segredo || req.headers.get("x-envios-secret") !== segredo) {
    return json({ erro: "não autorizado" }, 403);
  }
  if (!RESEND_KEY) {
    return json({ erro: "RESEND_API_KEY não configurada — envios ficam pendentes" }, 503);
  }

  const { data: pendentes, error } = await supabase
    .from("envios")
    .select("id, destinatario, assunto, corpo")
    .eq("estado", "pendente")
    .eq("canal", "email")
    .order("id")
    .limit(40);
  if (error) return json({ erro: error.message }, 500);

  let enviados = 0;
  let falhados = 0;
  for (const e of pendentes ?? []) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [e.destinatario],
          subject: e.assunto ?? "Maputo Renova",
          html: html(e.corpo ?? ""),
        }),
      });
      if (resp.ok) {
        await supabase
          .from("envios")
          .update({ estado: "enviado", enviado_em: new Date().toISOString(), erro: null })
          .eq("id", e.id);
        enviados++;
      } else {
        const texto = (await resp.text()).slice(0, 400);
        await supabase
          .from("envios")
          .update({ estado: "falhou", erro: `${resp.status}: ${texto}` })
          .eq("id", e.id);
        falhados++;
      }
    } catch (err) {
      await supabase
        .from("envios")
        .update({ estado: "falhou", erro: String(err).slice(0, 400) })
        .eq("id", e.id);
      falhados++;
    }
    // Resend: limite de 2 pedidos/segundo
    await new Promise((r) => setTimeout(r, 600));
  }

  return json({ processados: (pendentes ?? []).length, enviados, falhados });
});

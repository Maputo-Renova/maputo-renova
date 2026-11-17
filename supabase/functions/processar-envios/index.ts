// Processador da fila de envios (tabela public.envios, canal 'email').
// Chamado pelo pg_cron a cada 5 minutos com o cabeçalho x-envios-secret
// (segredo no Vault). Duas fases:
//   1) PREPARAR: envios 'convite_link' sem corpo — gera o link de convite
//      (conta nova) ou associa a flat automaticamente (dono já com conta,
//      multi-moradias) e grava o corpo do email;
//   2) ENVIAR: via Resend. Sem RESEND_API_KEY, a fase 1 corre na mesma e
//      os envios ficam pendentes (útil em CI/desenvolvimento).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
// Remetente: definir FROM_EMAIL quando o domínio do cliente estiver verificado
// no Resend (go-live: cobranca@maputorenova.co.za). Até lá, domínio verificado
// da Nebula — o remetente de teste do Resend só entrega ao dono da conta.
const FROM = Deno.env.get("FROM_EMAIL") ?? "Maputo Renova <maputo-renova@kingdomcompany.co.za>";
const APP = (Deno.env.get("APP_URL") ?? "https://maputo-renova.vercel.app").replace(/\/$/, "");

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

type Envio = {
  id: number;
  destinatario: string;
  assunto: string | null;
  corpo: string | null;
  tipo: string;
  flat_id: string | null;
  convite_acesso_id: string | null;
};

const ROTULO_PAPEL: Record<string, string> = {
  gestor: "gestor",
  super_admin: "administrador",
  colaborador: "agente",
};

/** Fase 1: prepara um 'convite_link' — devolve o corpo pronto, ou null se falhou. */
async function prepararConvite(e: Envio): Promise<string | null> {
  const marcarFalha = (erro: string) =>
    supabase.from("envios").update({ estado: "falhou", erro: erro.slice(0, 400) }).eq("id", e.id);

  const { data: flat } = await supabase
    .from("flats")
    .select("id, numero, bloco, referencia, codigo_convite, convite_expira_em, proprietario_nome, proprietario_email, perfil_proprietario_id")
    .eq("id", e.flat_id!)
    .maybeSingle();
  if (!flat) {
    await marcarFalha("flat do convite não encontrada");
    return null;
  }
  const nome = flat.proprietario_nome ?? "proprietário";
  const expira = flat.convite_expira_em
    ? new Date(flat.convite_expira_em).toLocaleDateString("pt-PT")
    : "";

  if (flat.perfil_proprietario_id) {
    return `Olá ${nome},<br><br>A sua flat <b>${flat.numero}</b> (referência <b>${flat.referencia}</b>) já está associada à sua conta Maputo Renova.<br><br><a href="${APP}/entrar" style="display:inline-block;background:#0E9F5B;color:#fff;font-weight:700;padding:11px 20px;border-radius:12px;text-decoration:none">Entrar na minha conta</a>`;
  }

  // dono já com conta (mesmo email)? associa já — multi-moradias sem passos
  const { data: uid } = await supabase.rpc("fn_user_id_por_email", {
    p_email: flat.proprietario_email,
  });
  if (uid) {
    const { data: ok } = await supabase.rpc("fn_associar_flat_automatica", { p_flat: flat.id });
    if (ok) {
      return `Olá ${nome},<br><br>A sua nova flat <b>${flat.numero}</b> (referência <b>${flat.referencia}</b>) foi associada à sua conta Maputo Renova — não precisa de fazer mais nada.<br><br><a href="${APP}/entrar" style="display:inline-block;background:#0E9F5B;color:#fff;font-weight:700;padding:11px 20px;border-radius:12px;text-decoration:none">Ver as minhas flats</a>`;
    }
    await marcarFalha("o email pertence a uma conta que não é de proprietário — associar manualmente pelo código");
    return null;
  }

  // conta nova: link de convite → /definir-password (só a password falta)
  const { data: link, error } = await supabase.auth.admin.generateLink({
    type: "invite",
    email: flat.proprietario_email,
  });
  const token = link?.properties?.hashed_token;
  if (error || !token) {
    await marcarFalha(`generateLink: ${error?.message ?? "sem token"}`);
    return null;
  }
  const destino = `${APP}/auth/confirmar?token_hash=${token}&type=invite&next=${encodeURIComponent(`/definir-password?codigo=${flat.codigo_convite}`)}`;
  return `Olá ${nome},<br><br>A sua flat <b>${flat.numero}</b> foi registada no Maputo Renova com a referência <b>${flat.referencia}</b>. Os seus dados já estão preenchidos — só falta definir a sua password.<br><br><a href="${destino}" style="display:inline-block;background:#0E9F5B;color:#fff;font-weight:700;padding:11px 20px;border-radius:12px;text-decoration:none">Criar a minha conta</a><br><br>Se preferir, entre em ${APP}/convite e use o código de uso único da flat:<br><b style="font-size:17px">${flat.codigo_convite}</b><br><br>O convite expira a ${expira}.`;
}

/** Fase 1: prepara um 'convite_acesso_link' (gestor/agente/administrador) —
    mesmo fluxo do morador: link → /definir-password, só falta a password. */
async function prepararConviteAcesso(e: Envio): Promise<string | null> {
  const marcarFalha = (erro: string) =>
    supabase.from("envios").update({ estado: "falhou", erro: erro.slice(0, 400) }).eq("id", e.id);

  const { data: conv } = await supabase
    .from("convites_acesso")
    .select("id, codigo, nome, papel, email, expira_em, usado_por")
    .eq("id", e.convite_acesso_id!)
    .maybeSingle();
  if (!conv) {
    await marcarFalha("convite de acesso não encontrado");
    return null;
  }
  const rotulo = ROTULO_PAPEL[conv.papel] ?? conv.papel;
  const nome = conv.nome ?? rotulo;
  const expira = conv.expira_em ? new Date(conv.expira_em).toLocaleDateString("pt-PT") : "";

  if (conv.usado_por) {
    return `Olá ${nome},<br><br>O seu acesso de <b>${rotulo}</b> ao Maputo Renova já está activo.<br><br><a href="${APP}/entrar" style="display:inline-block;background:#0E9F5B;color:#fff;font-weight:700;padding:11px 20px;border-radius:12px;text-decoration:none">Entrar na minha conta</a>`;
  }

  const { data: uid } = await supabase.rpc("fn_user_id_por_email", { p_email: conv.email });
  if (uid) {
    await marcarFalha("o email já tem conta — tratar manualmente pelo código de convite");
    return null;
  }

  const { data: link, error } = await supabase.auth.admin.generateLink({
    type: "invite",
    email: conv.email,
  });
  const token = link?.properties?.hashed_token;
  if (error || !token) {
    await marcarFalha(`generateLink: ${error?.message ?? "sem token"}`);
    return null;
  }
  const destino = `${APP}/auth/confirmar?token_hash=${token}&type=invite&next=${encodeURIComponent(`/definir-password?codigo=${conv.codigo}`)}`;
  return `Olá ${nome},<br><br>Foi criado o seu acesso de <b>${rotulo}</b> ao Maputo Renova. Os seus dados já estão preenchidos — só falta definir a sua password e aceitar os Termos e Condições.<br><br><a href="${destino}" style="display:inline-block;background:#0E9F5B;color:#fff;font-weight:700;padding:11px 20px;border-radius:12px;text-decoration:none">Criar a minha conta</a><br><br>Se preferir, entre em ${APP}/convite e use o código de uso único:<br><b style="font-size:17px">${conv.codigo}</b><br><br>O convite expira a ${expira}.`;
}

Deno.serve(async (req: Request) => {
  const { data: segredo } = await supabase.rpc("fn_envios_secret");
  if (!segredo || req.headers.get("x-envios-secret") !== segredo) {
    return json({ erro: "não autorizado" }, 403);
  }

  const { data: pendentes, error } = await supabase
    .from("envios")
    .select("id, destinatario, assunto, corpo, tipo, flat_id, convite_acesso_id")
    .eq("estado", "pendente")
    .eq("canal", "email")
    .order("id")
    .limit(40);
  if (error) return json({ erro: error.message }, 500);

  // Fase 1: preparar convites sem corpo (independente do Resend)
  let preparados = 0;
  const prontos: Envio[] = [];
  for (const e of (pendentes ?? []) as Envio[]) {
    if (!e.corpo && (e.tipo === "convite_link" || e.tipo === "convite_acesso_link")) {
      const corpo =
        e.tipo === "convite_link" ? await prepararConvite(e) : await prepararConviteAcesso(e);
      if (corpo === null) continue; // marcado falhou
      await supabase.from("envios").update({ corpo }).eq("id", e.id);
      e.corpo = corpo;
      preparados++;
    }
    prontos.push(e);
  }

  if (!RESEND_KEY) {
    return json({ preparados, enviados: 0, aviso: "RESEND_API_KEY não configurada — envios ficam pendentes" });
  }

  // Fase 2: enviar
  let enviados = 0;
  let falhados = 0;
  for (const e of prontos) {
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

  return json({ processados: prontos.length, preparados, enviados, falhados });
});

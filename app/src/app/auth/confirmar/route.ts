import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Destino dos links de email gerados pelo serviço (convite do proprietário):
// verifica o token no servidor, cria a sessão em cookies httpOnly e segue
// para `next` (ex.: /definir-password?codigo=…). Sem depender do Site URL
// do GoTrue — o link é construído pela Edge Function com token_hash.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";
  const destinoSeguro = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${destinoSeguro}`);
    }
  }
  return NextResponse.redirect(`${origin}/entrar?erro=link-invalido`);
}

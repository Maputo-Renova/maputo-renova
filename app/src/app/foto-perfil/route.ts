import { createClient } from "@/lib/supabase/server";

// Serve a foto de perfil do próprio utilizador com cache no browser.
// Porquê: um URL assinado do Storage muda a cada render (token novo), o que
// impede qualquer cache — cada refresh voltava a descarregar a imagem.
// Este endpoint tem URL estável por versão da foto (?v=<caminho>, que muda a
// cada upload por levar timestamp), por isso o browser guarda-a uma semana e
// os refreshes ficam instantâneos. O acesso continua privado: exige sessão
// e lê apenas a foto do próprio perfil.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 401 });

  const { data: perfil } = await supabase
    .from("perfis")
    .select("foto_path")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil?.foto_path) return new Response(null, { status: 404 });

  const { data: ficheiro } = await supabase.storage
    .from("comprovativos")
    .download(perfil.foto_path);
  if (!ficheiro) return new Response(null, { status: 404 });

  const ext = perfil.foto_path.split(".").pop()?.toLowerCase();
  const tipo =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  return new Response(ficheiro, {
    headers: {
      "Content-Type": tipo,
      // privado (por utilizador) e imutável: o URL muda quando a foto muda
      "Cache-Control": "private, max-age=604800, immutable",
    },
  });
}

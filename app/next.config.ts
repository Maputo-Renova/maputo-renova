import type { NextConfig } from "next";

const SUPABASE =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://phgoebpmijqdblllqpft.supabase.co";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // Supabase: fotos de perfil e comprovativos por URL assinada (Storage)
  `img-src 'self' data: blob: ${SUPABASE}`,
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE} ${SUPABASE.replace(/^http/, "ws")}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: false,
  partialPrefetching: false,
  experimental: {
    // cache do router no browser: voltar a uma página visitada há <30 s é
    // instantâneo — essencial com o servidor longe (Dublin) dos utilizadores
    // em Maputo; dados financeiros continuam a refrescar ao fim de 30 s
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

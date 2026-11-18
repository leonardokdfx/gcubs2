import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.dirname(fileURLToPath(import.meta.url));
const producao = process.env.NODE_ENV === "production";

// Cabeçalhos de segurança HTTP aplicados a todas as respostas (risco R-10 da documentação).
// - CSP: só a própria origem carrega scripts, estilos, fontes e chamadas de API.
//   'unsafe-inline' em scripts é exigido pela hidratação do Next.js sem nonce;
//   'unsafe-eval' só no desenvolvimento (recarga rápida do Next.js).
// - Imagens https: a foto de perfil pode vir de um endereço https informado pelo usuário.
// - frame-ancestors 'none' + X-Frame-Options: o sistema não pode ser embutido em outro site.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${producao ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(producao ? ["upgrade-insecure-requests"] : []),
].join("; ");

const cabecalhosSeguranca = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(producao ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Gera um servidor Node autocontido (.next/standalone), para hospedar em
  // infraestrutura própria, como o CeTIC-DF, sem depender da Vercel.
  output: "standalone",
  serverExternalPackages: ["mongoose"],
  turbopack: { root: raiz },
  async headers() {
    return [
      { source: "/:path*", headers: cabecalhosSeguranca },
      // Respostas da API com dados pessoais não ficam em cache de navegador nem de proxy.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;

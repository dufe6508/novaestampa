import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // Existe um package-lock.json solto em C:\Users\Cliente\ que faz o Next inferir
  // a raiz errada. Fixa aqui.
  outputFileTracingRoot: import.meta.dirname,

  // Permite isolar o preview local de outros builds que usam `.next`.
  // Sem a variável, produção e Vercel continuam no diretório padrão.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // A geração paralela é instável neste checkout no Windows e pode deixar
  // o .next sem arquivos de rota. Um worker torna o build determinístico.
  experimental: { cpus: 1 },

  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;

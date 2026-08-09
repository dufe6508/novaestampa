import { createClient } from "@supabase/supabase-js";

// Reexportado por compatibilidade: a formatação vive em lib/formato.
export { reais } from "./formato";

/**
 * Dois clientes, dois níveis de acesso.
 *
 * As tabelas têm RLS ligada sem nenhuma policy: pela chave pública não se lê nada.
 * O que o aluno enxerga passa por views (`vw_turma_publica`, `vw_produto_publico`,
 * `vw_kit_publico`) que rodam como dono e expõem só as colunas necessárias. Telefone
 * de contato, dado financeiro e pedido de terceiro não estão nelas.
 *
 * Por isso o catálogo e a entrada do aluno funcionam sem nenhum segredo.
 * A service role só vira necessária quando o painel da empresa precisar ler
 * pedido e pagamento, e até lá a auth definitiva pode mudar essa conta toda.
 */

function url() {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!u) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL no .env.local");
  return u;
}

const semSessao = { auth: { persistSession: false, autoRefreshToken: false } };

/** Leitura do catálogo público. Só enxerga as views. */
export function publico() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error("Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env.local");
  return createClient(url(), key, semSessao);
}

/**
 * Acesso total, ignorando RLS. Só em Server Component ou Server Action.
 * NUNCA importar de um componente com "use client": a chave iria para o navegador.
 */
export function db() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY no .env.local. " +
        "Necessária só para o painel da empresa. " +
        "Pegue em Supabase, Project Settings, API Keys, service_role.",
    );
  }
  return createClient(url(), key, semSessao);
}

/** Caminho no bucket `produtos` para URL pública da imagem. */
export function imagemUrl(caminho: string) {
  return `${url()}/storage/v1/object/public/produtos/${caminho}`;
}


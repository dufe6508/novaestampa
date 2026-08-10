import { createClient } from "@supabase/supabase-js";

// Reexportado por compatibilidade: a formatação vive em lib/formato.
export { reais } from "./formato";

/**
 * Dois clientes, dois níveis de acesso.
 *
 * O aluno lê por views (`vw_turma_publica`, `vw_produto_publico`, `vw_kit_publico`)
 * e escreve pelas funções `aluno_*`, que validam o dono do pedido antes de gravar.
 * Esse desenho continua valendo e é o que a auth definitiva vai aproveitar.
 *
 * A RLS foi DESLIGADA em todas as tabelas por decisão do usuário (protótipo, fora
 * do ar, auth definitiva só depois da reunião). Consequência prática: a chave
 * pública hoje alcança as tabelas inteiras. Religar é
 * `alter table ... enable row level security` nas mesmas tabelas, e nada do código
 * muda, porque o painel já pede o acesso total por `db()`.
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
 * Acesso total ao banco. Só em Server Component ou Server Action.
 * NUNCA importar de um componente com "use client": a chave iria para o navegador.
 *
 * Usa a service role quando ela existe. Sem ela, cai na chave pública, que hoje
 * alcança tudo porque a RLS está desligada. O fallback existe para o painel
 * rodar em máquina que ainda não tem o segredo configurado; quando a RLS voltar,
 * a service role passa a ser obrigatória de novo e a linha de baixo é o lugar
 * de transformar isso em erro outra vez.
 */
export function db() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env.local.",
    );
  }
  return createClient(url(), key, semSessao);
}

/** Caminho no bucket `produtos` para URL pública da imagem. */
export function imagemUrl(caminho: string) {
  return `${url()}/storage/v1/object/public/produtos/${caminho}`;
}

/**
 * Erro do banco virando frase para o aluno.
 *
 * Só o que as nossas funções levantam com `raise exception` chega em português
 * e escrito para quem lê ("O prazo de pedidos terminou em 12/08"). Esse é o
 * código `P0001`. Todo o resto vem do Postgres ou da rede, em inglês e falando
 * de tabela e constraint ("duplicate key value violates unique constraint"),
 * que não ajuda o aluno e ainda conta como o banco é por dentro.
 *
 * Então: `P0001` passa, o resto vira uma frase única e vai para o log do
 * servidor, onde é útil.
 */
export function mensagem(erro: { message?: string; code?: string } | null): string {
  const m = erro?.message?.trim();
  if (erro?.code === "P0001" && m) return m;
  if (m) console.error("[banco]", erro?.code, m);
  return "Não consegui completar agora. Tente de novo em alguns segundos.";
}

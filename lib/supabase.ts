import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

/**
 * Um cliente por chave, criado uma vez só.
 *
 * `createClient` monta um objeto grande (auth, realtime, storage, postgrest) e
 * nada disso guarda estado de usuário aqui: `persistSession` está desligado e a
 * chave é a mesma o tempo todo. Criar um por consulta era desperdício puro, e
 * uma tela do painel faz meia dúzia de consultas. Guardar a instância também
 * deixa o `fetch` do Node reaproveitar a conexão, que é o que de fato custa
 * quando o banco está em outra máquina.
 *
 * Módulo é por processo, então o cache morre junto com o servidor. Não há
 * vazamento de dado entre requisições porque não há sessão para vazar.
 */
const clientes = new Map<string, SupabaseClient>();

function cliente(key: string) {
  const guardado = clientes.get(key);
  if (guardado) return guardado;

  const novo = createClient(url(), key, semSessao);
  clientes.set(key, novo);
  return novo;
}

/** Leitura do catálogo público. Só enxerga as views. */
export function publico() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error("Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env.local");
  return cliente(key);
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
  return cliente(key);
}

/** Caminho no bucket `produtos` para URL pública da imagem. */
export function imagemUrl(caminho: string) {
  return `${url()}/storage/v1/object/public/produtos/${caminho}`;
}


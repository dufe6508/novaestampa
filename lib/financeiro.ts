import { emCache } from "./painel";
import { db } from "./supabase";
import type { ContaReceber, MovimentoDia, Recebimento } from "./contas";

/**
 * Leitura do Financeiro. Só consulta: toda conta vive em `contas.ts`, que é puro
 * e testado. Nada aqui calcula dinheiro.
 *
 * As três views resolvem no banco o caminho parcela → turma → campanha → cliente,
 * e a tela recebe a linha inteira. Sem isso, cada página juntaria as tabelas de um
 * jeito ligeiramente diferente e os números divergiriam entre telas.
 */

export * from "./contas";

/** Onde a tela está olhando. Vazio quer dizer a empresa inteira. */
export type Escopo = { cliente?: string; campanha?: string; turma?: string };

/**
 * O escopo mais estreito ganha: turma manda em campanha, campanha manda em
 * cliente. Filtrar pelos três ao mesmo tempo seria redundante, a view já carrega
 * a hierarquia inteira em cada linha.
 *
 * Devolve o par coluna e valor, em vez de receber a consulta: encadear `.eq()`
 * dentro de uma função genérica faz o tipo do cliente Supabase explodir em
 * "type instantiation is excessively deep".
 */
function colunaDoEscopo(
  cliente?: string,
  campanha?: string,
  turma?: string,
): [string, string] | null {
  if (turma) return ["grupo_id", turma];
  if (campanha) return ["campanha_id", campanha];
  if (cliente) return ["cliente_id", cliente];
  return null;
}

/**
 * Todas as parcelas do escopo, quitadas inclusive.
 *
 * Quitada entra porque a previsão compara previsto com recebido por semana, e sem
 * ela a semana passada apareceria como se ninguém tivesse pagado. Quem quer só o
 * que está em aberto filtra por `saldo_centavos`, e quem quer o que venceu usa
 * `foraDoPrazo`.
 *
 * ponytail: traz o escopo inteiro e agrega em memória. São ~1.200 parcelas na
 * empresa toda. Quando passar de algumas dezenas de milhares, os cartões viram
 * uma view de agregado e esta função fica só para a tabela.
 */
export const listarContasReceber = emCache(
  "contas-receber",
  async (cliente?: string, campanha?: string, turma?: string): Promise<ContaReceber[]> => {
    let q = db().from("vw_conta_receber").select("*");
    const escopo = colunaDoEscopo(cliente, campanha, turma);
    if (escopo) q = q.eq(escopo[0], escopo[1]);

    const { data } = await q.returns<ContaReceber[]>();
    return data ?? [];
  },
);

/** A série por dia. Vendido pela data do pedido, recebido pela data da baixa. */
export const listarMovimento = emCache(
  "movimento-dia",
  async (cliente?: string, campanha?: string, turma?: string): Promise<MovimentoDia[]> => {
    let q = db().from("vw_movimento_dia").select("*").order("dia");
    const escopo = colunaDoEscopo(cliente, campanha, turma);
    if (escopo) q = q.eq(escopo[0], escopo[1]);

    const { data } = await q.returns<MovimentoDia[]>();
    return data ?? [];
  },
);

/** As últimas baixas. O cartão diz o total, o feed diz de quem veio. */
export const listarUltimasEntradas = emCache(
  "ultimas-entradas",
  async (cliente?: string, campanha?: string, turma?: string): Promise<Recebimento[]> => {
    let q = db()
      .from("vw_recebimento")
      .select("*")
      .order("pago_em", { ascending: false })
      .limit(12);
    const escopo = colunaDoEscopo(cliente, campanha, turma);
    if (escopo) q = q.eq(escopo[0], escopo[1]);

    const { data } = await q.returns<Recebimento[]>();
    return data ?? [];
  },
);

/**
 * Todos os recebimentos do escopo, para o percentual que entrou direto e para a
 * conferência de caixa. Separado do feed porque o feed tem limite de doze.
 */
export const listarRecebimentos = emCache(
  "recebimentos",
  async (cliente?: string, campanha?: string, turma?: string): Promise<Recebimento[]> => {
    let q = db().from("vw_recebimento").select("*").order("pago_em", { ascending: false });
    const escopo = colunaDoEscopo(cliente, campanha, turma);
    if (escopo) q = q.eq(escopo[0], escopo[1]);

    const { data } = await q.returns<Recebimento[]>();
    return data ?? [];
  },
);

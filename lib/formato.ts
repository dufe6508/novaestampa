/**
 * Formatação de texto e número. Sem dependência de banco de propósito: estes
 * helpers são usados também em componente de cliente, e importá-los junto do
 * cliente Supabase arrastaria a biblioteca inteira para o navegador.
 */

/** Centavos para "R$ 60,00". Dinheiro é inteiro em centavos no banco inteiro. */
export function reais(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * "BL M" vira "M baby look".
 *
 * A grade vem numa lista só do banco, com as modelagens femininas prefixadas.
 * O prefixo serve para agrupar na hora de escolher; em texto corrido ele é
 * sigla, e sigla o aluno não decifra.
 */
export const PREFIXO_BABY_LOOK = "BL ";

export function tamanhoLegivel(t: string) {
  return t.startsWith(PREFIXO_BABY_LOOK)
    ? `${t.slice(PREFIXO_BABY_LOOK.length)} baby look`
    : t;
}

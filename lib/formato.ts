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

/**
 * Telefone.
 *
 * Formato único no projeto: "(31) 999848388". Sem hífen de propósito, para
 * existir uma forma só, digitada, guardada e exibida igual. Aceita fixo com
 * 10 dígitos e celular com 11; qualquer coisa fora disso não é telefone.
 */
export function mascaraTelefone(valor: string) {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  return `(${d.slice(0, 2)}) ${d.slice(2)}`;
}

export function telefoneValido(valor: string) {
  const d = valor.replace(/\D/g, "");
  return d.length === 10 || d.length === 11;
}

/** Formato aceito pelo `pattern` do input, espelhando `mascaraTelefone`. */
export const PADRAO_TELEFONE = "\\(\\d{2}\\) \\d{8,9}";

/**
 * Nome e sobrenome, obrigatórios.
 *
 * O nome vai bordado na peça, então "Maria" sozinho não identifica ninguém
 * numa turma de trinta. Duas palavras de duas letras é o mínimo que separa
 * nome de rabisco, sem barrar sobrenome curto ("Sá", "Yu").
 */
export function nomeCompletoValido(valor: string) {
  return valor.trim().split(/\s+/).filter((p) => p.length >= 2).length >= 2;
}

export const PADRAO_NOME_COMPLETO = "\\s*\\S{2,}(\\s+\\S+)*\\s+\\S{2,}\\s*";

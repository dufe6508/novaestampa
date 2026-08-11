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

/**
 * Nome próprio com inicial maiúscula.
 *
 * Quem digita no celular digita "joão fernandes", e o nome aparece assim na
 * lista da produção, na peça e no painel. Subir a inicial arruma isso sem
 * mexer no resto do que a pessoa escreveu: `trim`, colapso de espaço duplo e
 * primeira letra de cada palavra.
 *
 * O resto das letras fica como veio, de propósito. Baixar tudo estragaria
 * "MacHado" e "LG"; subir tudo entregaria "FERNANDES", peça diferente da que
 * o aluno viu na tela, que é a decisão registrada no CLAUDE.md §3.5.
 *
 * Partícula de ligação continua minúscula, porque em nome brasileiro é assim
 * que se escreve: "Ana de Sá", não "Ana De Sá".
 */
const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e", "di", "du", "van", "von"]);

export function capitalizarNome(valor: string) {
  return valor
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((p, i) =>
      i > 0 && PARTICULAS.has(p.toLowerCase()) ? p.toLowerCase() : maiusculaInicial(p),
    )
    .join(" ");
}

/**
 * A mesma ideia, mas para aplicar enquanto a pessoa digita.
 *
 * Diferença para `capitalizarNome`: não faz `trim` nem colapsa espaço, senão o
 * espaço que a pessoa acabou de teclar sumiria antes de ela escrever a próxima
 * palavra. E não baixa partícula, porque "de" só vira minúscula depois de virar
 * palavra do meio, e no meio da digitação ainda não dá para saber.
 *
 * Sobe a primeira letra e a que vem depois de cada espaço. O resto fica como
 * veio, pelo mesmo motivo de sempre: não estragar "MacHado".
 *
 * A normalização de verdade continua no envio, no servidor.
 */
export function capitalizarDigitando(valor: string) {
  return valor.replace(/(^|\s)(\S)/g, (_, antes: string, letra: string) => antes + letra.toUpperCase());
}

/** Frase livre, como o motivo de uma liberação. Só a primeira letra. */
export function capitalizarFrase(valor: string) {
  return maiusculaInicial(valor.trim().replace(/\s+/g, " "));
}

function maiusculaInicial(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

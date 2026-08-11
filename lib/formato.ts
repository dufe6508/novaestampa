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
    ? `${t.slice(PREFIXO_BABY_LOOK.length)} Baby Look`
    : t;
}

/**
 * Dinheiro, com máscara enquanto digita: "15990" vira "R$ 159,90".
 *
 * Só dígitos entram, e o último par sempre são os centavos. É o teclado
 * numérico do celular funcionando sozinho: quem digita não precisa achar a
 * vírgula, nem decidir se escreve ponto ou vírgula, e o campo nunca aceita
 * "159.90,5". O valor sai daqui já pronto para virar inteiro em centavos.
 */
export function mascaraDinheiro(valor: string) {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  return `R$ ${(Number(d) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * O caminho de volta: "R$ 159,90" vira 15990.
 *
 * Lê só os dígitos, pela mesma razão da máscara. Aceita o que vier de um campo
 * mascarado, de um colado à mão ("159,90") e do que sobrar quando o JavaScript
 * não roda ("15990").
 */
export function centavosDe(valor: string) {
  const d = valor.replace(/\D/g, "");
  return d ? Number(d) : NaN;
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
 * primeira letra de cada palavra, inclusive quando ela vem logo depois de um
 * número, como em "3a série".
 *
 * O resto das letras fica como veio, de propósito. Baixar tudo estragaria
 * "MacHado" e "LG"; subir tudo entregaria "FERNANDES", peça diferente da que
 * o aluno viu na tela, que é a decisão registrada no CLAUDE.md §3.5.
 *
 * A interface usa iniciais maiúsculas em todas as palavras para manter a
 * leitura uniforme entre nomes, turmas, campanhas e produtos.
 */
export function capitalizarNome(valor: string) {
  return valor
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^|[\s\d])(\p{L})/gu, (_, antes: string, letra: string) =>
      antes + letra.toLocaleUpperCase("pt-BR"),
    );
}

/**
 * A mesma ideia, mas para aplicar enquanto a pessoa digita.
 *
 * Diferença para `capitalizarNome`: não faz `trim` nem colapsa espaço, senão o
 * espaço que a pessoa acabou de teclar sumiria antes de ela escrever a próxima
 * palavra. E não baixa partícula, porque "de" só vira minúscula depois de virar
 * palavra do meio, e no meio da digitação ainda não dá para saber.
 *
 * Sobe a primeira letra, a que vem depois de cada espaço e a que vem depois de
 * um número. O resto fica como veio, pelo mesmo motivo de sempre: não estragar
 * "MacHado".
 *
 * A normalização de verdade continua no envio, no servidor.
 */
export function capitalizarDigitando(valor: string) {
  return valor.replace(/(^|[\s\d])(\p{L})/gu, (_, antes: string, letra: string) =>
    antes + letra.toLocaleUpperCase("pt-BR"),
  );
}

/** Frase livre, como o motivo de uma liberação. Só a primeira letra. */
export function capitalizarFrase(valor: string) {
  return maiusculaInicial(valor.trim().replace(/\s+/g, " "));
}

function maiusculaInicial(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

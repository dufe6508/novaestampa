import assert from "node:assert/strict";
// `formato.ts` mora num projeto sem `"type": "module"`, então o Node o lê como
// CommonJS e recusa o `export`. Em vez de mudar o projeto por causa do teste,
// compila o arquivo para uma pasta temporária e importa de lá.
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const saida = mkdtempSync(join(tmpdir(), "formato-"));
execFileSync(
  "npx",
  ["tsc", "lib/formato.ts", "--outDir", saida, "--module", "esnext", "--target", "es2022", "--moduleResolution", "bundler"],
  { shell: true, stdio: "inherit" },
);

const {
  PADRAO_NOME_COMPLETO,
  PADRAO_TELEFONE,
  capitalizarDigitando,
  capitalizarFrase,
  capitalizarNome,
  centavosDe,
  mascaraDinheiro,
  mascaraTelefone,
  nomeCompletoValido,
  telefoneValido,
}: typeof import("./formato.ts") = await import(
  pathToFileURL(join(saida, "formato.js")).href
);

/**
 * Checagem das regras de telefone e nome. Roda com:
 *   node lib/formato.test.mts
 *
 * Existe porque as duas regras aparecem em dois lugares cada uma, no navegador
 * como `pattern` e no servidor como função, e as duas versões precisam
 * concordar. Se elas divergirem, o aluno passa por uma e trava na outra.
 */

const casa = (padrao: string, valor: string) => new RegExp(`^(?:${padrao})$`).test(valor);

// Máscara: descarta o que não é dígito e corta em 11.
assert.equal(mascaraTelefone("31999848388ddssfd2d"), "(31) 999848388");
assert.equal(mascaraTelefone("(31) 99984-8388"), "(31) 999848388");
assert.equal(mascaraTelefone("3133334444"), "(31) 33334444");
assert.equal(mascaraTelefone("3"), "(3");
assert.equal(mascaraTelefone(""), "");
assert.equal(mascaraTelefone("319998483889999"), "(31) 999848388");

// Fixo com 10 e celular com 11 passam; o resto não é telefone.
assert.ok(telefoneValido("(31) 999848388"));
assert.ok(telefoneValido("(31) 33334444"));
assert.ok(!telefoneValido("(31) 9998"));
assert.ok(!telefoneValido("31"));

// O que a máscara produz precisa passar no pattern do input.
for (const bruto of ["31999848388", "3133334444"]) {
  assert.ok(casa(PADRAO_TELEFONE, mascaraTelefone(bruto)), bruto);
}
assert.ok(!casa(PADRAO_TELEFONE, "(31) 9998"));

// Nome: duas palavras de verdade.
assert.ok(nomeCompletoValido("Maria Fernandes"));
assert.ok(nomeCompletoValido("  Ana de Sá  "));
assert.ok(!nomeCompletoValido("Maria"));
assert.ok(!nomeCompletoValido("Maria F"));
assert.ok(!nomeCompletoValido(""));

// Pattern e função concordam, que é o ponto deste arquivo.
for (const nome of ["Maria Fernandes", "Ana de Sá", "  Maria Fernandes  "]) {
  assert.equal(casa(PADRAO_NOME_COMPLETO, nome), nomeCompletoValido(nome), nome);
}
for (const nome of ["Maria", "Maria F", "M"]) {
  assert.equal(casa(PADRAO_NOME_COMPLETO, nome), nomeCompletoValido(nome), nome);
}

// Inicial maiúscula, sem estragar o resto do que a pessoa escreveu.
assert.equal(capitalizarNome("joão fernandes"), "João Fernandes");
assert.equal(capitalizarNome("  maria   das  dores "), "Maria Das Dores");
assert.equal(capitalizarNome("ana de sá"), "Ana De Sá");
assert.equal(capitalizarNome("3a série"), "3A Série");
assert.equal(capitalizarNome("MacHado"), "MacHado");
assert.equal(capitalizarNome("FERNANDES"), "FERNANDES");
assert.equal(capitalizarNome("de souza"), "De Souza");
assert.equal(capitalizarNome(""), "");
assert.equal(capitalizarDigitando("3a série"), "3A Série");

assert.equal(
  capitalizarFrase("  acordo com   a comissão "),
  "Acordo com a comissão",
);
assert.equal(capitalizarFrase(""), "");

// Capitalizar não pode transformar nome válido em inválido, nem o contrário.
for (const nome of ["joão fernandes", "ana de sá", "maria"]) {
  assert.equal(nomeCompletoValido(capitalizarNome(nome)), nomeCompletoValido(nome), nome);
}

/**
 * Dinheiro. A máscara e o leitor precisam ser um o inverso do outro: o campo
 * mostra o que a máscara produz, e o servidor grava o que o leitor entende. Se
 * discordarem, o produto entra no banco por dez vezes o preço.
 */
assert.equal(mascaraDinheiro("15990"), "R$ 159,90");
assert.equal(mascaraDinheiro("6"), "R$ 0,06");
assert.equal(mascaraDinheiro("R$ 159,90"), "R$ 159,90");
assert.equal(mascaraDinheiro(""), "");
assert.equal(mascaraDinheiro("abc"), "");

assert.equal(centavosDe("R$ 159,90"), 15990);
assert.equal(centavosDe("159,90"), 15990);
assert.equal(centavosDe("15990"), 15990);
assert.ok(Number.isNaN(centavosDe("")));

for (const centavos of [1, 600, 15990, 2199000]) {
  assert.equal(centavosDe(mascaraDinheiro(String(centavos))), centavos, String(centavos));
}

console.log("formato: ok");

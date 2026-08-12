import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// `contas.ts` importa `data.ts`, e o projeto escreve import sem extensão. Em
// ESM o Node exigiria o `.js` no especificador, então a saída sai em CommonJS,
// onde a resolução sem extensão funciona. O `import()` continua trazendo os
// nomes exportados.
const saida = mkdtempSync(join(tmpdir(), "contas-"));
execFileSync(
  "npx",
  ["tsc", "lib/contas.ts", "--outDir", saida, "--module", "commonjs", "--target", "es2022"],
  { shell: true, stdio: "inherit" },
);

const contas: typeof import("./contas.ts") = await import(
  pathToFileURL(join(saida, "contas.js")).href
);

const {
  janela,
  posicao,
  filas,
  porFaixa,
  ranking,
  aVencer,
  previsaoSemanal,
  serie,
  somarMovimento,
  variacao,
  entrouDireto,
  foraDoPrazo,
} = contas;

const HOJE = "2026-08-11"; // uma terça-feira

// ------------------------------------------------------------
// Janela do período
// ------------------------------------------------------------

const j30 = janela("30", HOJE);
assert.equal(j30.de, "2026-07-13");
assert.equal(j30.ate, HOJE);
// A janela anterior tem a mesma duração e termina no dia antes do início.
assert.equal(j30.anterior.ate, "2026-07-12");
assert.equal(j30.anterior.de, "2026-06-13");

// "Hoje" é um dia só, não zero dias.
assert.deepEqual(janela("hoje", HOJE).de, HOJE);

// Tudo não tem período anterior: comparar com o nada não informa.
assert.equal(contas.ehTudo(janela("tudo", HOJE)), true);
assert.equal(contas.ehTudo(j30), false);

// ------------------------------------------------------------
// Fábrica de linhas
// ------------------------------------------------------------

type Conta = import("./contas.ts").ContaReceber;

let seq = 0;
function conta(p: Partial<Conta> & { pedido?: string }): Conta {
  seq += 1;
  const valor = p.valor_centavos ?? 10000;
  const pago = p.pago_centavos ?? 0;

  return {
    parcela_id: `pa-${seq}`,
    pedido_id: p.pedido ?? `pe-${seq}`,
    numero: 1,
    eh_entrada: true,
    valor_centavos: valor,
    pago_centavos: pago,
    saldo_centavos: valor - pago,
    status: pago >= valor ? "pago" : pago > 0 ? "parcial" : "pendente",
    vencimento: null,
    dias_atraso: null,
    faixa_atraso: null,
    grupo_cobranca: "em_dia",
    aluno_nome: "Ana Souza",
    aluno_telefone: null,
    produto: "Camiseta",
    status_pagamento: "pendente",
    entrada_paga: false,
    pode_produzir: false,
    status_producao: "aguardando",
    origem: "aluno",
    pedido_valor_centavos: valor,
    pedido_saldo_centavos: valor - pago,
    grupo_id: "g1",
    grupo_nome: "3A",
    campanha_id: "c1",
    campanha_nome: "Formatura 2026",
    cliente_id: "cl1",
    cliente_nome: "Cláudio Brandão",
    ...p,
  } as Conta;
}

// ------------------------------------------------------------
// Fora do prazo e os três grupos
// ------------------------------------------------------------

const carteira: Conta[] = [
  // Atrasado: pagou a entrada, a segunda venceu, peça na oficina.
  conta({
    pedido: "pe-atr",
    valor_centavos: 4000,
    dias_atraso: 20,
    faixa_atraso: "16a30",
    grupo_cobranca: "atrasado",
    pode_produzir: true,
    entrada_paga: true,
  }),
  // Atrasado tambem: pagou parte e venceu. Entrou dinheiro, entao e atrasado, e
  // nao ha peca na oficina porque a entrada nao fechou.
  conta({
    pedido: "pe-parcial",
    valor_centavos: 4000,
    pago_centavos: 1000,
    dias_atraso: 5,
    faixa_atraso: "1a7",
    grupo_cobranca: "atrasado",
  }),
  // Vencido: nunca pagou nada.
  conta({
    pedido: "pe-sem",
    valor_centavos: 5000,
    dias_atraso: 70,
    faixa_atraso: "mais60",
    grupo_cobranca: "sem_pagamento",
  }),
  // Em dia: vence adiante, não conta em lugar nenhum de cobrança.
  conta({ pedido: "pe-dia", valor_centavos: 9000, vencimento: "2026-08-20" }),
  // Quitada: entra na carteira lida, sai de tudo que é atraso.
  conta({ pedido: "pe-pago", valor_centavos: 8000, pago_centavos: 8000, vencimento: "2026-07-01" }),
];

// Parcela quitada e parcela a vencer não são "fora do prazo".
assert.equal(foraDoPrazo(carteira).length, 3);

const [atrasado, vencido] = filas(carteira);

// Duas filas e só: pagou algo, ou não pagou nada.
assert.equal(filas(carteira).length, 2);

assert.equal(atrasado.grupo, "atrasado");
assert.equal(atrasado.valor, 4000 + 3000); // o saldo inteiro mais os 3000 que faltam
assert.equal(atrasado.pedidos, 2);
assert.equal(atrasado.maiorAtraso, 20);
// Só a peça liberada conta como exposta: é tecido cortado contra dinheiro vencido.
assert.equal(atrasado.naOficina, 4000);

assert.equal(vencido.valor, 5000);
assert.equal(vencido.maiorAtraso, 70);
assert.equal(vencido.naOficina, 0);

// As duas filas não se somam duas vezes: cada parcela vencida cai em uma só.
assert.equal(
  atrasado.valor + vencido.valor,
  foraDoPrazo(carteira).reduce((t, c) => t + c.saldo_centavos, 0),
);

// ------------------------------------------------------------
// Faixas de atraso
// ------------------------------------------------------------

const faixas = porFaixa(carteira);
assert.equal(faixas.length, 5);
assert.equal(faixas.find((f) => f.valor === "1a7")!.valor_centavos, 3000);
assert.equal(faixas.find((f) => f.valor === "16a30")!.valor_centavos, 4000);
assert.equal(faixas.find((f) => f.valor === "mais60")!.valor_centavos, 5000);
// Faixa vazia continua na lista, com zero: a régua é a mesma em toda tela.
assert.equal(faixas.find((f) => f.valor === "31a60")!.parcelas, 0);
// A soma das faixas é o total fora do prazo.
assert.equal(
  faixas.reduce((t, f) => t + f.valor_centavos, 0),
  12000,
);

// ------------------------------------------------------------
// Ranking · conta pedido distinto, não parcela
// ------------------------------------------------------------

const duasParcelasDoMesmoPedido = [
  conta({ pedido: "pe-x", valor_centavos: 1000, dias_atraso: 3, faixa_atraso: "1a7", grupo_cobranca: "sem_pagamento" }),
  conta({ pedido: "pe-x", valor_centavos: 2000, dias_atraso: 3, faixa_atraso: "1a7", grupo_cobranca: "sem_pagamento" }),
];
const [turma] = ranking(duasParcelasDoMesmoPedido, "turma");
assert.equal(turma.valor_centavos, 3000);
assert.equal(turma.pedidos, 1);

// ------------------------------------------------------------
// Previsão
// ------------------------------------------------------------

// Vence hoje entra nos próximos 7 dias; o oitavo dia fica fora.
const paraVencer = [
  conta({ valor_centavos: 1000, vencimento: HOJE }),
  conta({ valor_centavos: 2000, vencimento: "2026-08-18" }),
  conta({ valor_centavos: 4000, vencimento: "2026-08-19" }),
];
assert.deepEqual(aVencer(paraVencer, 7, HOJE), { valor_centavos: 3000, parcelas: 2 });

// Quitada não é previsão de nada.
assert.equal(
  aVencer([conta({ valor_centavos: 5000, pago_centavos: 5000, vencimento: HOJE })], 7, HOJE)
    .valor_centavos,
  0,
);

const semanas = previsaoSemanal(
  [
    // Semana desta terça: a segunda é 10/08.
    conta({ valor_centavos: 1000, pago_centavos: 400, vencimento: HOJE }),
    // Semana anterior.
    conta({ valor_centavos: 2000, vencimento: "2026-08-05" }),
  ],
  HOJE,
  4,
);
assert.equal(semanas.length, 8);
const atual = semanas.find((s) => s.inicio === "2026-08-10")!;
assert.equal(atual.previsto_centavos, 1000);
assert.equal(atual.recebido_centavos, 400);
assert.equal(atual.passada, false);
assert.equal(semanas.find((s) => s.inicio === "2026-08-03")!.passada, true);

// ------------------------------------------------------------
// Movimento, série e posição
// ------------------------------------------------------------

type Mov = import("./contas.ts").MovimentoDia;
const mov = (dia: string, vendido: number, recebido: number, pedidos = 0): Mov => ({
  dia,
  cliente_id: "cl1",
  campanha_id: "c1",
  grupo_id: "g1",
  vendido_centavos: vendido,
  recebido_centavos: recebido,
  pedidos,
});

const movimento = [
  mov("2026-06-01", 5000, 1000, 1),
  mov("2026-07-20", 3000, 2000, 1),
  mov("2026-08-11", 1000, 500, 1),
];

// Posição ignora período de propósito: é a foto de hoje, não fluxo.
const p = posicao(movimento, carteira);
assert.equal(p.vendido, 9000);
assert.equal(p.recebido, 3500);
assert.equal(p.pedidos, 3);
assert.equal(p.arrecadado, 39);
// A receber vem do saldo das parcelas, não da subtração: parcela quitada tem
// saldo zero e a soma tem que fechar com a carteira.
assert.equal(p.aReceber, 4000 + 3000 + 5000 + 9000);

// Soma de intervalo é fechada nas duas pontas.
assert.deepEqual(somarMovimento(movimento, "2026-07-20", "2026-08-11"), {
  vendido: 4000,
  recebido: 2500,
  pedidos: 2,
});

// Série acumulada: cada ponto carrega tudo o que veio antes dele.
const pontos = serie(movimento, janela("30", HOJE));
// 01/06 fica fora da janela de 30 dias; 20/07 e 11/08 entram, um ponto cada,
// porque até 60 dias o agrupamento é por dia.
assert.equal(pontos.length, 2);
assert.equal(pontos[0].vendido, 3000);
assert.equal(pontos[1].vendido, 4000); // acumulado, não o valor do dia
assert.equal(pontos[1].recebido, 2500);

const pontosTudo = serie(movimento, janela("tudo", HOJE));
assert.equal(pontosTudo.at(-1)!.vendido, 9000);
assert.equal(pontosTudo.at(-1)!.recebido, 3500);
// Janela longa agrupa por mês, então três dias em três meses viram três pontos.
assert.deepEqual(
  pontosTudo.map((x) => x.dia),
  ["2026-06-01", "2026-07-01", "2026-08-01"],
);

// ------------------------------------------------------------
// Variação e dinheiro que entrou direto
// ------------------------------------------------------------

assert.equal(variacao(120, 100), 20);
assert.equal(variacao(80, 100), -20);
// Sem base não existe percentual: a tela mostra o valor sem delta.
assert.equal(variacao(500, 0), null);

assert.deepEqual(
  entrouDireto([
    { valor_centavos: 700, direto: true },
    { valor_centavos: 300, direto: false },
  ]),
  { total: 1000, direto: 700, pct: 70 },
);
assert.equal(entrouDireto([]).pct, 0);

console.log("contas: ok");

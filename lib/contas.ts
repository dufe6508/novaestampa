import { diasEntre, hojeNoFuso, segundaDe, somarDias } from "./data";

/**
 * As contas do Financeiro. Puro de propósito: nenhuma consulta, nenhum import de
 * banco, nada de `next/cache`. É o que permite testar dinheiro e data em
 * `contas.test.mts` sem subir a aplicação, e é onde toda régua do módulo vive.
 *
 * A leitura fica em `financeiro.ts`, que traz as linhas das views e passa por
 * aqui. Duas réguas mandam em tudo, as duas escritas no FINANCEIRO.md:
 *
 * 1. **Atrasado é quem pagou algo, Vencido é quem não pagou nada.** São só esses
 *    dois, o banco devolve pronto em `grupo_cobranca` e nenhuma tela recalcula.
 * 2. **Posição não tem período.** Vendido e recebido são fluxo, têm data. A
 *    receber, atrasado e vencido são a foto de hoje, então o filtro de data toca
 *    movimento e gráfico, nunca a carteira.
 */

// ------------------------------------------------------------
// Tipos
// ------------------------------------------------------------

export type StatusPagamento = "pago" | "parcial" | "atrasado" | "pendente";

export type StatusProducao =
  | "aguardando"
  | "liberado"
  | "em_producao"
  | "pronto"
  | "entregue";

/** Os dois grupos de cobrança, mais quem está em dia. Vem da view. */
export type GrupoCobranca = "em_dia" | "atrasado" | "sem_pagamento";

export type Faixa = "1a7" | "8a15" | "16a30" | "31a60" | "mais60";

/** Uma linha de `vw_conta_receber`. A unidade é a parcela, não o pedido. */
export type ContaReceber = {
  parcela_id: string;
  pedido_id: string;
  numero: number;
  eh_entrada: boolean;
  valor_centavos: number;
  pago_centavos: number;
  saldo_centavos: number;
  status: StatusPagamento;
  vencimento: string | null;
  /** Nulo quando a parcela está quitada ou ainda não venceu. */
  dias_atraso: number | null;
  faixa_atraso: Faixa | null;
  grupo_cobranca: GrupoCobranca;
  aluno_nome: string;
  aluno_telefone: string | null;
  produto: string;
  status_pagamento: StatusPagamento;
  entrada_paga: boolean;
  pode_produzir: boolean;
  status_producao: StatusProducao;
  origem: "aluno" | "admin";
  pedido_valor_centavos: number;
  pedido_saldo_centavos: number;
  grupo_id: string;
  grupo_nome: string;
  campanha_id: string;
  campanha_nome: string;
  cliente_id: string;
  cliente_nome: string;
};

/** Uma linha de `vw_recebimento`. A unidade é o pagamento. */
export type Recebimento = {
  pagamento_id: string;
  pedido_id: string;
  parcela_numero: number;
  eh_entrada: boolean;
  valor_centavos: number;
  metodo: "pix" | "cartao" | "dinheiro" | "transferencia" | "outro";
  provider: string;
  /** Entrou pelo sistema, sem passar pela mão do representante. */
  direto: boolean;
  pago_em: string;
  dia: string;
  registrado_por_nome: string | null;
  aluno_nome: string;
  produto: string;
  grupo_id: string;
  grupo_nome: string;
  campanha_id: string;
  campanha_nome: string;
  cliente_id: string;
  cliente_nome: string;
};

/** Uma linha de `vw_movimento_dia`. */
export type MovimentoDia = {
  dia: string;
  cliente_id: string;
  campanha_id: string;
  grupo_id: string;
  vendido_centavos: number;
  recebido_centavos: number;
  pedidos: number;
};

// ------------------------------------------------------------
// Período
// ------------------------------------------------------------

export const PERIODOS = {
  hoje: { texto: "Hoje", dias: 1 },
  "7": { texto: "7 dias", dias: 7 },
  "30": { texto: "30 dias", dias: 30 },
  "90": { texto: "90 dias", dias: 90 },
  tudo: { texto: "Tudo", dias: 0 },
} as const;

export type Periodo = keyof typeof PERIODOS;

/** 30 dias cobre o ciclo de uma cobrança sem virar histórico. */
export const PERIODO_PADRAO: Periodo = "30";

export function ehPeriodo(v: string | undefined): v is Periodo {
  return !!v && v in PERIODOS;
}

export type Janela = { de: string; ate: string; anterior: { de: string; ate: string } };

/** Começo dos tempos, para o período "Tudo". Antes de qualquer pedido. */
const SEMPRE = "0001-01-01";

/**
 * A janela do período e a janela anterior de igual duração, que é contra o que o
 * delta compara. Em "Tudo" a anterior é vazia e a tela some com a comparação:
 * não existe período anterior a tudo.
 */
export function janela(periodo: Periodo, hoje = hojeNoFuso()): Janela {
  const dias = PERIODOS[periodo].dias;
  if (dias === 0) {
    return { de: SEMPRE, ate: hoje, anterior: { de: SEMPRE, ate: SEMPRE } };
  }

  const de = somarDias(hoje, -(dias - 1));
  return {
    de,
    ate: hoje,
    anterior: { de: somarDias(de, -dias), ate: somarDias(de, -1) },
  };
}

export function ehTudo(j: Janela) {
  return j.de === SEMPRE;
}

/** Data no formato do banco e do `input type="date"`. */
export function ehData(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/**
 * A janela de um intervalo escolhido à mão, que é o que o filtro do Financeiro
 * pergunta hoje: data inicial e data final, em vez de uma lista de "há quanto
 * tempo". A janela anterior tem a mesma duração e termina na véspera, para o
 * delta continuar comparando períodos comparáveis.
 *
 * Datas invertidas são trocadas em vez de recusadas: quem digitou ao contrário
 * quis o intervalo entre as duas.
 */
export function janelaEntre(de: string, ate: string): Janela {
  const [inicio, fim] = de <= ate ? [de, ate] : [ate, de];
  const dias = diasEntre(inicio, fim) + 1;

  return {
    de: inicio,
    ate: fim,
    anterior: { de: somarDias(inicio, -dias), ate: somarDias(inicio, -1) },
  };
}

// ------------------------------------------------------------
// Posição · a foto de hoje, sem período
// ------------------------------------------------------------

export type Posicao = {
  vendido: number;
  recebido: number;
  aReceber: number;
  pedidos: number;
  /** Recebido sobre vendido. Percentual pendente não existe: é o complemento. */
  arrecadado: number;
};

export function posicao(movimento: MovimentoDia[], contas: ContaReceber[]): Posicao {
  let vendido = 0;
  let recebido = 0;
  let pedidos = 0;
  for (const m of movimento) {
    vendido += m.vendido_centavos;
    recebido += m.recebido_centavos;
    pedidos += m.pedidos;
  }

  return {
    vendido,
    recebido,
    aReceber: contas.reduce((t, c) => t + c.saldo_centavos, 0),
    pedidos,
    arrecadado: vendido ? Math.round((recebido / vendido) * 100) : 0,
  };
}

// ------------------------------------------------------------
// Cobrança · dois grupos, e só
// ------------------------------------------------------------

export const COBRANCA: Record<
  Exclude<GrupoCobranca, "em_dia">,
  { titulo: string; explica: string }
> = {
  atrasado: {
    titulo: "Atrasado",
    explica: "Pagaram a entrada e deixaram vencer o restante.",
  },
  sem_pagamento: {
    titulo: "Vencido",
    explica: "Fizeram o pedido, não pagaram nada e a entrada venceu.",
  },
};

export const GRUPOS_COBRANCA = ["atrasado", "sem_pagamento"] as const;

export function ehGrupoCobranca(v: string | undefined): v is (typeof GRUPOS_COBRANCA)[number] {
  return !!v && (GRUPOS_COBRANCA as readonly string[]).includes(v);
}

export type Fila = {
  grupo: (typeof GRUPOS_COBRANCA)[number];
  valor: number;
  pedidos: number;
  /** Dias do atraso mais antigo da fila. */
  maiorAtraso: number;
  /** Saldo vencido de peça que já está na oficina. Só pesa em `atrasado`. */
  naOficina: number;
};

/** Só parcela vencida em aberto conta. O resto da carteira está no prazo. */
export function foraDoPrazo(contas: ContaReceber[]) {
  return contas.filter((c) => c.dias_atraso !== null);
}

export function filas(contas: ContaReceber[]): Fila[] {
  const vencidas = foraDoPrazo(contas);

  return GRUPOS_COBRANCA.map((grupo) => {
    const linhas = vencidas.filter((c) => c.grupo_cobranca === grupo);
    return {
      grupo,
      valor: linhas.reduce((t, c) => t + c.saldo_centavos, 0),
      pedidos: new Set(linhas.map((c) => c.pedido_id)).size,
      maiorAtraso: linhas.reduce((n, c) => Math.max(n, c.dias_atraso ?? 0), 0),
      naOficina: linhas.filter((c) => c.pode_produzir).reduce((t, c) => t + c.saldo_centavos, 0),
    };
  });
}

export const FAIXAS: { valor: Faixa; texto: string; curto: string }[] = [
  { valor: "1a7", texto: "1 a 7 dias", curto: "1 a 7 d" },
  { valor: "8a15", texto: "8 a 15 dias", curto: "8 a 15 d" },
  { valor: "16a30", texto: "16 a 30 dias", curto: "16 a 30 d" },
  { valor: "31a60", texto: "31 a 60 dias", curto: "31 a 60 d" },
  { valor: "mais60", texto: "mais de 60 dias", curto: "+60 d" },
];

export function ehFaixa(v: string | undefined): v is Faixa {
  return !!v && FAIXAS.some((f) => f.valor === v);
}

export function porFaixa(contas: ContaReceber[]) {
  const vencidas = foraDoPrazo(contas);

  return FAIXAS.map((f) => {
    const linhas = vencidas.filter((c) => c.faixa_atraso === f.valor);
    return {
      ...f,
      valor_centavos: linhas.reduce((t, c) => t + c.saldo_centavos, 0),
      parcelas: linhas.length,
    };
  });
}

export type LinhaRanking = {
  id: string;
  nome: string;
  valor_centavos: number;
  pedidos: number;
};

/**
 * Onde o problema está concentrado. Ordenado por valor, não por percentual:
 * cobra-se reais, e 100% de atraso numa turma de dois pedidos não é prioridade
 * de ninguém.
 */
export function ranking(
  contas: ContaReceber[],
  nivel: "cliente" | "campanha" | "turma",
  limite = 5,
): LinhaRanking[] {
  const campos = {
    cliente: ["cliente_id", "cliente_nome"],
    campanha: ["campanha_id", "campanha_nome"],
    turma: ["grupo_id", "grupo_nome"],
  } as const;
  const [idDe, nomeDe] = campos[nivel];

  const mapa = new Map<string, LinhaRanking & { ids: Set<string> }>();
  for (const c of foraDoPrazo(contas)) {
    const id = c[idDe];
    const linha =
      mapa.get(id) ?? { id, nome: c[nomeDe], valor_centavos: 0, pedidos: 0, ids: new Set<string>() };
    linha.valor_centavos += c.saldo_centavos;
    linha.ids.add(c.pedido_id);
    mapa.set(id, linha);
  }

  return [...mapa.values()]
    .map(({ ids, ...linha }) => ({ ...linha, pedidos: ids.size }))
    .sort((a, b) => b.valor_centavos - a.valor_centavos)
    .slice(0, limite);
}

// ------------------------------------------------------------
// Previsão · o que vence adiante
//
// Não é fluxo de caixa: o sistema não conhece nenhuma saída. A segunda parcela
// vence na entrega da campanha, então o desenho tem pico, não fluxo contínuo, e
// é por isso que agrupa por semana e não por mês.
// ------------------------------------------------------------

export function aVencer(contas: ContaReceber[], dias: number, hoje = hojeNoFuso()) {
  const limite = somarDias(hoje, dias);
  const linhas = contas.filter(
    (c) =>
      c.saldo_centavos > 0 &&
      c.vencimento !== null &&
      c.vencimento >= hoje &&
      c.vencimento <= limite,
  );

  return {
    valor_centavos: linhas.reduce((t, c) => t + c.saldo_centavos, 0),
    parcelas: linhas.length,
  };
}

export type SemanaPrevista = {
  /** Segunda-feira da semana. */
  inicio: string;
  previsto_centavos: number;
  recebido_centavos: number;
  parcelas: number;
  passada: boolean;
};

/**
 * Previsto contra realizado, por semana de vencimento. As semanas passadas
 * mostram o buraco, as futuras mostram o que vem.
 */
export function previsaoSemanal(
  contas: ContaReceber[],
  hoje = hojeNoFuso(),
  semanas = 4,
): SemanaPrevista[] {
  const estaSemana = segundaDe(hoje);
  const de = somarDias(estaSemana, -7 * semanas);
  const ate = somarDias(estaSemana, 7 * semanas - 1);

  const mapa = new Map<string, SemanaPrevista>();
  for (let i = -semanas; i < semanas; i++) {
    const inicio = somarDias(estaSemana, 7 * i);
    mapa.set(inicio, {
      inicio,
      previsto_centavos: 0,
      recebido_centavos: 0,
      parcelas: 0,
      passada: i < 0,
    });
  }

  for (const c of contas) {
    if (!c.vencimento || c.vencimento < de || c.vencimento > ate) continue;
    const semana = mapa.get(segundaDe(c.vencimento));
    if (!semana) continue;
    semana.previsto_centavos += c.valor_centavos;
    semana.recebido_centavos += c.pago_centavos;
    semana.parcelas += 1;
  }

  return [...mapa.values()].sort((a, b) => a.inicio.localeCompare(b.inicio));
}

// ------------------------------------------------------------
// Movimento e série
// ------------------------------------------------------------

/** Soma o movimento de um intervalo fechado. Fora dele, ignora. */
export function somarMovimento(movimento: MovimentoDia[], de: string, ate: string) {
  let vendido = 0;
  let recebido = 0;
  let pedidos = 0;

  for (const m of movimento) {
    if (m.dia < de || m.dia > ate) continue;
    vendido += m.vendido_centavos;
    recebido += m.recebido_centavos;
    pedidos += m.pedidos;
  }

  return { vendido, recebido, pedidos };
}

export type Ponto = { dia: string; vendido: number; recebido: number };

/**
 * A série acumulada do período. Acumulada, e não barra por dia, porque o que
 * interessa é a distância entre as duas curvas: ela é a carteira crescendo.
 *
 * O agrupamento vem do tamanho da janela, sem controle na tela: dia até 60,
 * semana até 180, mês acima. Ninguém quer escolher isso.
 */
export function serie(movimento: MovimentoDia[], j: Janela): Ponto[] {
  const dias = ehTudo(j) ? Infinity : diasEntre(j.de, j.ate) + 1;
  const chave = (dia: string) =>
    dias <= 60 ? dia : dias <= 180 ? segundaDe(dia) : `${dia.slice(0, 7)}-01`;

  const mapa = new Map<string, Ponto>();
  for (const m of movimento) {
    if (m.dia < j.de || m.dia > j.ate) continue;
    const k = chave(m.dia);
    const p = mapa.get(k) ?? { dia: k, vendido: 0, recebido: 0 };
    p.vendido += m.vendido_centavos;
    p.recebido += m.recebido_centavos;
    mapa.set(k, p);
  }

  let vendido = 0;
  let recebido = 0;
  return [...mapa.values()]
    .sort((a, b) => a.dia.localeCompare(b.dia))
    .map((p) => {
      vendido += p.vendido;
      recebido += p.recebido;
      return { dia: p.dia, vendido, recebido };
    });
}

/**
 * Variação contra o período anterior, em percentual inteiro.
 *
 * Nulo quando não há base: crescer a partir de zero é divisão por zero, e
 * "+∞%" não informa nada. A tela mostra o valor sem delta nesse caso.
 */
export function variacao(agora: number, antes: number): number | null {
  if (antes === 0) return null;
  return Math.round(((agora - antes) / antes) * 100);
}

/**
 * Quanto do recebido entrou pelo sistema, sem passar pela mão do representante.
 * É a medida do objetivo número um do projeto, e por isso vive na tela.
 */
export function entrouDireto(entradas: Pick<Recebimento, "valor_centavos" | "direto">[]) {
  const total = entradas.reduce((t, r) => t + r.valor_centavos, 0);
  const direto = entradas.filter((r) => r.direto).reduce((t, r) => t + r.valor_centavos, 0);

  return { total, direto, pct: total ? Math.round((direto / total) * 100) : 0 };
}

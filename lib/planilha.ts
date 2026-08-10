/**
 * Tipos e derivações da planilha de gestão.
 *
 * Sem nenhuma dependência de banco, pelo mesmo motivo de `lib/formato`: filtro,
 * busca e contagem rodam no navegador agora, e importar isto de um componente
 * de cliente não pode arrastar o cliente Supabase (nem a chave de serviço) para
 * o bundle.
 *
 * `lib/painel` reexporta tudo daqui, então quem já importava de lá continua
 * funcionando.
 */

export type StatusPagamento = "pago" | "parcial" | "atrasado" | "pendente";

export type StatusProducao =
  | "aguardando"
  | "liberado"
  | "em_producao"
  | "pronto"
  | "entregue";

export type ClienteResumo = {
  id: string;
  nome: string;
  tipo: "escola" | "faculdade" | "empresa" | "outro";
  cidade: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  arquivado_em: string | null;
  campanhas: number;
  campanhas_abertas: number;
  pedidos: number;
  vendido_centavos: number;
  recebido_centavos: number;
  a_receber_centavos: number;
  atrasado_centavos: number;
};

export type CampanhaResumo = {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  nome: string;
  status: "rascunho" | "aberta" | "encerrada" | "concluida";
  label_grupo: string;
  label_grupo_plural: string;
  prazo_pedidos: string | null;
  prazo_alteracoes: string | null;
  entrega_prevista: string | null;
  percentual_entrada: number;
  grupos: number;
  pedidos: number;
  alunos_com_pedido: number;
  alunos_esperados: number;
  vendido_centavos: number;
  recebido_centavos: number;
  a_receber_centavos: number;
  atrasado_centavos: number;
  pedidos_atrasados: number;
  pedidos_parciais: number;
  pedidos_sem_pagamento: number;
  pedidos_pagos: number;
  pedidos_liberados: number;
};

export type GrupoResumo = {
  id: string;
  campanha_id: string;
  nome: string;
  codigo: string;
  alunos_esperados: number | null;
  pedidos: number;
  alunos_com_pedido: number;
  vendido_centavos: number;
  recebido_centavos: number;
  a_receber_centavos: number;
  atrasado_centavos: number;
  pedidos_atrasados: number;
  pedidos_parciais: number;
  pedidos_sem_pagamento: number;
  pedidos_pagos: number;
  pedidos_liberados: number;
};

export type ItemPainel = {
  id: string;
  pedido_id: string;
  produto_nome_snapshot: string;
  tamanho: string;
  nome_estampa: string;
  quantidade: number;
  observacoes: string | null;
};

export type PedidoPainel = {
  id: string;
  grupo_id: string;
  perfil_id: string | null;
  aluno_nome: string;
  aluno_telefone: string | null;
  produto_nome_snapshot: string;
  valor_centavos: number;
  pago_centavos: number;
  saldo_centavos: number;
  status: "ativo" | "cancelado";
  status_pagamento: StatusPagamento;
  status_producao: StatusProducao;
  producao_forcada: boolean;
  entrada_paga: boolean;
  pode_produzir: boolean;
  origem: "aluno" | "admin";
  observacoes: string | null;
  criado_em: string;
  itens: ItemPainel[];
};

export type PagamentoPainel = {
  id: string;
  parcela_id: string;
  valor_centavos: number;
  metodo: "pix" | "cartao" | "dinheiro" | "transferencia" | "outro";
  provider: string;
  pago_em: string;
};

export type ParcelaPainel = {
  id: string;
  pedido_id: string;
  numero: number;
  valor_centavos: number;
  pago_centavos: number;
  saldo_centavos: number;
  vencimento: string | null;
  eh_entrada: boolean;
  status: StatusPagamento;
  pagamentos: PagamentoPainel[];
};

/**
 * Pedido com tudo que o painel lateral precisa junto.
 *
 * É o que `carregarTurma` devolve, e é o que permite abrir o detalhe sem ir ao
 * servidor de novo.
 */
export type PedidoCompleto = PedidoPainel & { parcelas: ParcelaPainel[] };

export type TurmaPainel = {
  grupo: GrupoResumo;
  campanha: CampanhaResumo;
};

/** Uma linha da lista de cobrança da campanha. Só o que a linha mostra. */
export type PedidoCobranca = {
  id: string;
  grupo_id: string;
  grupo_nome: string;
  aluno_nome: string;
  produto_nome_snapshot: string;
  saldo_centavos: number;
  status_pagamento: StatusPagamento;
};

// ------------------------------------------------------------
// Filtros da planilha · aplicados em memória
//
// Uma turma tem dezenas de pedidos, não milhares. A lista inteira já veio do
// servidor no primeiro desenho, então filtrar aqui é instantâneo e não custa
// nenhuma ida ao banco.
// ------------------------------------------------------------

export const FILTROS = {
  todos: { texto: "Todos", vale: () => true },
  atrasado: {
    texto: "Em atraso",
    vale: (p: PedidoPainel) => p.status_pagamento === "atrasado",
  },
  falta: {
    texto: "Falta pagar",
    vale: (p: PedidoPainel) => p.saldo_centavos > 0,
  },
  sem_pagamento: {
    texto: "Não pagou nada",
    vale: (p: PedidoPainel) => p.pago_centavos === 0,
  },
  quitado: {
    texto: "Quitado",
    vale: (p: PedidoPainel) => p.status_pagamento === "pago",
  },
} as const;

export type Filtro = keyof typeof FILTROS;

export function ehFiltro(v: string | undefined | null): v is Filtro {
  return !!v && v in FILTROS;
}

/** Busca por nome do aluno, e só. Quem procura na lista procura uma pessoa. */
export function filtrar<T extends PedidoPainel>(
  pedidos: T[],
  filtro: Filtro,
  busca?: string,
): T[] {
  const termo = busca?.trim().toLowerCase();
  return pedidos.filter((p) => {
    if (!FILTROS[filtro].vale(p)) return false;
    if (!termo) return true;
    return p.aluno_nome.toLowerCase().includes(termo);
  });
}

/**
 * A lista da oficina, uma linha por peça física.
 *
 * Pedido não serve de unidade aqui: kit vira duas peças, e quem pede duas
 * camisetas gera duas linhas de corte. É por isso que a aba Produção é
 * construída a partir dos itens, não dos pedidos.
 */
export type PecaProducao = {
  item_id: string;
  pedido_id: string;
  aluno_nome: string;
  produto: string;
  tamanho: string;
  nome_estampa: string;
  quantidade: number;
  status_producao: StatusProducao;
};

export function pecasParaProduzir(pedidos: PedidoPainel[]): PecaProducao[] {
  return pedidos
    .filter((p) => p.pode_produzir)
    .flatMap((p) =>
      p.itens.map((i) => ({
        item_id: i.id,
        pedido_id: p.id,
        aluno_nome: p.aluno_nome,
        produto: i.produto_nome_snapshot,
        tamanho: i.tamanho,
        nome_estampa: i.nome_estampa,
        quantidade: i.quantidade,
        status_producao: p.status_producao,
      })),
    )
    .sort(
      (a, b) =>
        a.aluno_nome.localeCompare(b.aluno_nome, "pt-BR") ||
        a.produto.localeCompare(b.produto, "pt-BR"),
    );
}

export function somar(pedidos: PedidoPainel[]) {
  return pedidos.reduce(
    (t, p) => ({
      vendido: t.vendido + p.valor_centavos,
      recebido: t.recebido + p.pago_centavos,
      aReceber: t.aReceber + p.saldo_centavos,
    }),
    { vendido: 0, recebido: 0, aReceber: 0 },
  );
}

// ------------------------------------------------------------
// Formatação de data. `dia` do aluno é por extenso; aqui é curto,
// porque numa tabela densa "23 de setembro" empurra a coluna do dinheiro.
// ------------------------------------------------------------

export function data(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d.length <= 10 ? `${d}T12:00:00` : d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function dataHora(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Percentual inteiro, sem casa decimal. 0 quando não há base. */
export function pct(parte: number, total: number) {
  if (!total) return 0;
  return Math.round((parte / total) * 100);
}

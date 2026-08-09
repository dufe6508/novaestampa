import { cache } from "react";
import { db } from "./supabase";

export { reais, tamanhoLegivel } from "./formato";

/**
 * Leitura da área de gestão.
 *
 * Tudo passa por `db()` (service role). A RLS foi desligada em todas as tabelas
 * por decisão do usuário: o protótipo não está em produção e a auth definitiva
 * só é decidida depois da reunião. Religar é um `enable row level security` nas
 * mesmas tabelas, e aí este arquivo continua funcionando igual, porque service
 * role ignora RLS de qualquer jeito.
 *
 * Nenhum status é calculado aqui. Pago, saldo, atraso e adesão vêm das views
 * `vw_*`, que são a fonte da verdade. Se um número precisar mudar, muda lá.
 */

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
};

export type StatusPagamento = "pago" | "parcial" | "atrasado" | "pendente";
export type StatusProducao =
  | "aguardando"
  | "liberado"
  | "em_producao"
  | "pronto"
  | "entregue";

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

export type PagamentoPainel = {
  id: string;
  parcela_id: string;
  valor_centavos: number;
  metodo: "pix" | "cartao" | "dinheiro" | "transferencia" | "outro";
  provider: string;
  pago_em: string;
};

export type TurmaPainel = {
  grupo: GrupoResumo;
  campanha: CampanhaResumo;
};

// ------------------------------------------------------------
// Clientes · home do painel
// ------------------------------------------------------------

export async function listarClientes(busca?: string): Promise<ClienteResumo[]> {
  let q = db().from("vw_cliente_resumo").select("*").order("nome");
  if (busca?.trim()) q = q.ilike("nome", `%${busca.trim()}%`);
  const { data } = await q.returns<ClienteResumo[]>();
  return data ?? [];
}

export const buscarCliente = cache(async (id: string): Promise<ClienteResumo | null> => {
  const { data } = await db()
    .from("vw_cliente_resumo")
    .select("*")
    .eq("id", id)
    .maybeSingle<ClienteResumo>();
  return data ?? null;
});

// ------------------------------------------------------------
// Campanhas
// ------------------------------------------------------------

export async function listarCampanhas(clienteId: string): Promise<CampanhaResumo[]> {
  const { data } = await db()
    .from("vw_campanha_resumo")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("nome")
    .returns<CampanhaResumo[]>();
  return data ?? [];
}

export const buscarCampanha = cache(async (id: string): Promise<CampanhaResumo | null> => {
  const { data } = await db()
    .from("vw_campanha_resumo")
    .select("*")
    .eq("id", id)
    .maybeSingle<CampanhaResumo>();
  return data ?? null;
});

export async function listarGrupos(campanhaId: string): Promise<GrupoResumo[]> {
  const { data } = await db()
    .from("vw_grupo_resumo")
    .select("*")
    .eq("campanha_id", campanhaId)
    .order("nome")
    .returns<GrupoResumo[]>();
  return data ?? [];
}

/**
 * Turma (grupo) com a campanha junto. As duas coisas aparecem no cabeçalho da
 * planilha, e separar em duas chamadas na página deixava o `notFound` em dois
 * lugares diferentes.
 */
export const buscarTurmaPainel = cache(async (id: string): Promise<TurmaPainel | null> => {
  const { data: grupo } = await db()
    .from("vw_grupo_resumo")
    .select("*")
    .eq("id", id)
    .maybeSingle<GrupoResumo>();
  if (!grupo) return null;

  const campanha = await buscarCampanha(grupo.campanha_id);
  if (!campanha) return null;

  return { grupo, campanha };
});

// ------------------------------------------------------------
// Pedidos · a planilha
// ------------------------------------------------------------

const COLUNAS_ITEM =
  "id,pedido_id,produto_nome_snapshot,tamanho,nome_estampa,quantidade,observacoes";

async function comItens(pedidos: PedidoPainel[]): Promise<PedidoPainel[]> {
  if (pedidos.length === 0) return [];

  const { data } = await db()
    .from("pedido_item")
    .select(COLUNAS_ITEM)
    .in(
      "pedido_id",
      pedidos.map((p) => p.id),
    )
    .order("criado_em")
    .returns<ItemPainel[]>();

  const porPedido = new Map<string, ItemPainel[]>();
  for (const item of data ?? []) {
    const lista = porPedido.get(item.pedido_id) ?? [];
    lista.push(item);
    porPedido.set(item.pedido_id, lista);
  }

  return pedidos.map((p) => ({ ...p, itens: porPedido.get(p.id) ?? [] }));
}

/**
 * Todos os pedidos ativos da turma, em ordem alfabética.
 *
 * Inclui quem não pagou nada: essa é a lista da turma, não a da produção.
 * Quem não pagou é justamente quem precisa aparecer, é dele que se cobra.
 * A aba Produção filtra por `pode_produzir` na própria página.
 */
export const listarPedidosDaTurma = cache(
  async (grupoId: string): Promise<PedidoPainel[]> => {
    const { data } = await db()
      .from("vw_pedido")
      .select("*")
      .eq("grupo_id", grupoId)
      .eq("status", "ativo")
      .order("aluno_nome")
      .returns<PedidoPainel[]>();

    return comItens(data ?? []);
  },
);

export const buscarPedido = cache(async (id: string): Promise<PedidoPainel | null> => {
  const { data } = await db()
    .from("vw_pedido")
    .select("*")
    .eq("id", id)
    .maybeSingle<PedidoPainel>();
  if (!data) return null;

  const [pedido] = await comItens([data]);
  return pedido;
});

/** Parcelas do pedido com as baixas dentro. Alimenta o detalhe. */
export const listarParcelas = cache(async (pedidoId: string): Promise<ParcelaPainel[]> => {
  const { data: parcelas } = await db()
    .from("vw_parcela")
    .select("*")
    .eq("pedido_id", pedidoId)
    .order("numero")
    .returns<ParcelaPainel[]>();

  if (!parcelas?.length) return [];

  const { data: pagamentos } = await db()
    .from("pagamento")
    .select("id,parcela_id,valor_centavos,metodo,provider,pago_em")
    .in(
      "parcela_id",
      parcelas.map((p) => p.id),
    )
    .order("pago_em")
    .returns<PagamentoPainel[]>();

  return parcelas.map((p) => ({
    ...p,
    pagamentos: (pagamentos ?? []).filter((g) => g.parcela_id === p.id),
  }));
});

// ------------------------------------------------------------
// Filtros da planilha · aplicados em memória
//
// Uma turma tem dezenas de pedidos, não milhares. Filtrar no cliente Supabase
// custaria uma ida ao banco por troca de filtro, e o ganho seria zero.
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

export function ehFiltro(v: string | undefined): v is Filtro {
  return !!v && v in FILTROS;
}

/** Busca por nome do aluno e por nome da estampa, que nem sempre são iguais. */
export function filtrar(pedidos: PedidoPainel[], filtro: Filtro, busca?: string) {
  const termo = busca?.trim().toLowerCase();
  return pedidos.filter((p) => {
    if (!FILTROS[filtro].vale(p)) return false;
    if (!termo) return true;
    return (
      p.aluno_nome.toLowerCase().includes(termo) ||
      p.produto_nome_snapshot.toLowerCase().includes(termo) ||
      p.itens.some((i) => i.nome_estampa.toLowerCase().includes(termo))
    );
  });
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

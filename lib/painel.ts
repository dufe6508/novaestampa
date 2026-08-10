import { cache } from "react";
import { db } from "./supabase";
import type {
  CampanhaResumo,
  ClienteResumo,
  GrupoResumo,
  ItemPainel,
  PagamentoPainel,
  ParcelaPainel,
  PedidoCobranca,
  PedidoCompleto,
  PedidoPainel,
  TurmaPainel,
} from "./planilha";

export { PREFIXO_BABY_LOOK, reais, tamanhoLegivel } from "./formato";

/**
 * Tipos, filtros e formatação vivem em `lib/planilha`, que não conhece banco e
 * por isso pode ser importado do navegador. Reexportados aqui para que as telas
 * continuem pedindo tudo num lugar só.
 */
export * from "./planilha";

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

/**
 * A mesma turma, achada pelo código em vez do id.
 *
 * É por aqui que o representante entra: ele não navega por cliente nem por
 * campanha, ele já está dentro de uma turma e o código é o que ele tem na mão.
 */
export const buscarTurmaPorCodigo = cache(
  async (codigo: string): Promise<TurmaPainel | null> => {
    const { data } = await db()
      .from("grupo")
      .select("id")
      .eq("codigo", codigo.toUpperCase())
      .maybeSingle<{ id: string }>();

    return data ? buscarTurmaPainel(data.id) : null;
  },
);

// ------------------------------------------------------------
// Pedidos · a planilha
// ------------------------------------------------------------

const COLUNAS_ITEM =
  "id,pedido_id,produto_nome_snapshot,tamanho,nome_estampa,quantidade,observacoes";

/**
 * Colunas do pedido, uma a uma em vez de `*`.
 *
 * `vw_pedido` carrega coluna que tela nenhuma lê (`produto_id`, por exemplo), e
 * cada uma delas atravessa a rede em toda consulta. Listar aqui também deixa
 * explícito o que quebra se a view mudar.
 */
const COLUNAS_PEDIDO =
  "id,grupo_id,perfil_id,aluno_nome,aluno_telefone,produto_nome_snapshot," +
  "valor_centavos,pago_centavos,saldo_centavos,status,status_pagamento," +
  "status_producao,producao_forcada,entrada_paga,pode_produzir,origem," +
  "observacoes,criado_em";

const COLUNAS_PARCELA =
  "id,pedido_id,numero,valor_centavos,pago_centavos,saldo_centavos," +
  "vencimento,eh_entrada,status";

const COLUNAS_PAGAMENTO = "id,parcela_id,valor_centavos,metodo,provider,pago_em";

/** Agrupa uma lista plana pela chave estrangeira, num passo só. */
function agrupar<T>(linhas: T[] | null, chave: (linha: T) => string) {
  const mapa = new Map<string, T[]>();
  for (const linha of linhas ?? []) {
    const k = chave(linha);
    const lista = mapa.get(k);
    if (lista) lista.push(linha);
    else mapa.set(k, [linha]);
  }
  return mapa;
}

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

  const porPedido = agrupar(data, (i) => i.pedido_id);
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
      .select(COLUNAS_PEDIDO)
      .eq("grupo_id", grupoId)
      .eq("status", "ativo")
      .order("aluno_nome")
      .returns<PedidoPainel[]>();

    return comItens(data ?? []);
  },
);

/**
 * A turma inteira numa carga só: pedidos, peças, parcelas e baixas.
 *
 * O motivo é a latência, não o volume. Antes, abrir o detalhe de um pedido
 * disparava três consultas novas (pedido, parcelas, pagamentos) e o painel
 * lateral só aparecia quando a última voltasse. Como filtro, aba e detalhe
 * passaram a ser resolvidos no navegador, a tela precisa ter tudo em mãos desde
 * o primeiro desenho, e aí abrir um pedido não custa nada.
 *
 * O volume não é problema: a maior turma tem algumas dezenas de pedidos, e o
 * que se carrega a mais são duas parcelas e um punhado de baixas por pedido.
 *
 * São três idas ao banco em vez de seis, e as duas do meio saem juntas. O
 * encadeamento sobrou onde é inevitável: parcela depende do id do pedido, e
 * pagamento depende do id da parcela.
 */
export const carregarTurma = cache(
  async (grupoId: string): Promise<PedidoCompleto[]> => {
    const { data: pedidos } = await db()
      .from("vw_pedido")
      .select(COLUNAS_PEDIDO)
      .eq("grupo_id", grupoId)
      .eq("status", "ativo")
      .order("aluno_nome")
      .returns<PedidoPainel[]>();

    if (!pedidos?.length) return [];
    const ids = pedidos.map((p) => p.id);

    const [{ data: itens }, { data: parcelas }] = await Promise.all([
      db()
        .from("pedido_item")
        .select(COLUNAS_ITEM)
        .in("pedido_id", ids)
        .order("criado_em")
        .returns<ItemPainel[]>(),
      db()
        .from("vw_parcela")
        .select(COLUNAS_PARCELA)
        .in("pedido_id", ids)
        .order("numero")
        .returns<Omit<ParcelaPainel, "pagamentos">[]>(),
    ]);

    const { data: pagamentos } = parcelas?.length
      ? await db()
          .from("pagamento")
          .select(COLUNAS_PAGAMENTO)
          .in(
            "parcela_id",
            parcelas.map((p) => p.id),
          )
          .order("pago_em")
          .returns<PagamentoPainel[]>()
      : { data: [] as PagamentoPainel[] };

    const porPedidoItens = agrupar(itens, (i) => i.pedido_id);
    const porPedidoParcelas = agrupar(parcelas, (p) => p.pedido_id);
    const porParcela = agrupar(pagamentos, (g) => g.parcela_id);

    return pedidos.map((p) => ({
      ...p,
      itens: porPedidoItens.get(p.id) ?? [],
      parcelas: (porPedidoParcelas.get(p.id) ?? []).map((parcela) => ({
        ...parcela,
        pagamentos: porParcela.get(parcela.id) ?? [],
      })),
    }));
  },
);

/**
 * Quem precisa ser cobrado nesta campanha, já em ordem de quem deve mais.
 *
 * Antes esta função trazia os ~600 pedidos da campanha inteira e, para cada um,
 * as peças, numa consulta cujo filtro levava 600 identificadores na própria
 * URL. As peças não eram usadas em lugar nenhum desta tela, e dos 600 pedidos a
 * página mostra 18: as três listas exibem 6 cada.
 *
 * Agora o banco faz o recorte. Só volta pedido com saldo, e só as colunas que a
 * linha desenha. A ordenação por saldo também desceu para o banco, que já
 * precisava ordenar de qualquer jeito.
 *
 * O nome da turma vem junto porque, sem ele, um telefone na tela não diz com
 * quem falar. Vem por junção do PostgREST, não por uma segunda consulta.
 */
export const listarCobrancaDaCampanha = cache(
  async (campanhaId: string): Promise<PedidoCobranca[]> => {
    const { data: grupos } = await db()
      .from("grupo")
      .select("id,nome")
      .eq("campanha_id", campanhaId)
      .returns<{ id: string; nome: string }[]>();

    if (!grupos?.length) return [];

    const { data } = await db()
      .from("vw_pedido")
      .select(
        "id,grupo_id,aluno_nome,produto_nome_snapshot,saldo_centavos,status_pagamento",
      )
      .in(
        "grupo_id",
        grupos.map((g) => g.id),
      )
      .eq("status", "ativo")
      .gt("saldo_centavos", 0)
      .order("saldo_centavos", { ascending: false })
      .returns<Omit<PedidoCobranca, "grupo_nome">[]>();

    const nome = new Map(grupos.map((g) => [g.id, g.nome]));
    return (data ?? []).map((p) => ({ ...p, grupo_nome: nome.get(p.grupo_id) ?? "" }));
  },
);

export type LinhaCorte = {
  grupo_id: string;
  grupo_nome: string;
  campanha_id: string;
  produto: string;
  tamanho: string;
  total: number;
};

/**
 * Resumo de corte. É o que a oficina consome de verdade: não interessa quem
 * pediu, interessa quantas peças de cada tamanho precisam ser cortadas.
 * Conta só peça liberada, porque peça não paga não vira corte.
 */
export async function resumoDeCorte(
  campo: "campanha_id" | "grupo_id",
  id: string,
): Promise<LinhaCorte[]> {
  const { data } = await db()
    .from("vw_resumo_corte")
    .select("*")
    .eq(campo, id)
    .order("produto")
    .returns<LinhaCorte[]>();
  return data ?? [];
}

/*
 * `buscarPedido` e `listarParcelas` moravam aqui e saíram: eram o que o detalhe
 * do pedido usava para se montar, uma consulta de cada vez, a cada clique.
 * `carregarTurma` já traz pedido, peças, parcelas e baixas de toda a turma numa
 * carga só, e o detalhe abre a partir dela. Ficaram sem nenhum chamador.
 */

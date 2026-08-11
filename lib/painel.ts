import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "./supabase";

import { PREFIXO_BABY_LOOK } from "./formato";

export { PREFIXO_BABY_LOOK };
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

/**
 * Cache das leituras da gestão.
 *
 * O banco responde em cerca de 1 ms; o que custa é a viagem até ele, uns 300 ms
 * por chamada, e a planilha da turma faz cinco em sequência. Trocar de filtro
 * pagava esse pedágio inteiro de novo para aplicar um `.filter()` em memória,
 * já que filtro e busca nunca foram ao banco (ver o bloco de FILTROS).
 *
 * `unstable_cache` guarda o resultado entre requisições, com chave por
 * argumento. Como a lista é a mesma para qualquer filtro, o primeiro acesso
 * paga e os cliques seguintes respondem de memória.
 *
 * Ficar velho é o risco, e é por isso que existe a tag: toda escrita chama
 * `invalidarPainel()` e derruba tudo de uma vez. O `revalidate` é só a rede de
 * segurança para uma escrita feita fora do sistema, direto no banco.
 */
const TAG_PAINEL = "painel";

/**
 * Derruba o cache da gestão. Chamada por toda escrita, do painel e do aluno:
 * pedido novo e pagamento precisam aparecer no mesmo segundo, e é isso que a
 * demonstração mostra.
 */
export function invalidarPainel() {
  revalidateTag(TAG_PAINEL);
}

export function emCache<A extends (string | undefined)[], R>(
  chave: string,
  consulta: (...args: A) => Promise<R>,
) {
  return cache((...args: A) =>
    unstable_cache(() => consulta(...args), [chave, ...args.map((a) => a ?? "")], {
      tags: [TAG_PAINEL],
      revalidate: 120,
    })(),
  );
}

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
  status: "aberta" | "encerrada" | "concluida";
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

/**
 * A lista da home. Mostra só os ativos, e os arquivados quando pedido.
 *
 * Sem esse filtro, arquivar não faria nada visível, que é a única coisa que
 * arquivar promete.
 */
export const listarClientes = emCache(
  "clientes",
  async (busca?: string, arquivados?: string): Promise<ClienteResumo[]> => {
    let q = db().from("vw_cliente_resumo").select("*").order("nome");
    q = arquivados === "1" ? q.not("arquivado_em", "is", null) : q.is("arquivado_em", null);
    if (busca?.trim()) q = q.ilike("nome", `%${busca.trim()}%`);
    const { data } = await q.returns<ClienteResumo[]>();
    return data ?? [];
  },
);

export const buscarCliente = emCache("cliente", async (id: string): Promise<ClienteResumo | null> => {
  const { data } = await db()
    .from("vw_cliente_resumo")
    .select("*")
    .eq("id", id)
    .maybeSingle<ClienteResumo>();
  return data ?? null;
});

export type ClienteCadastro = {
  id: string;
  nome: string;
  tipo: ClienteResumo["tipo"];
  cidade: string | null;
  endereco: string | null;
  contato_nome: string | null;
  contato_cargo: string | null;
  contato_telefone: string | null;
  contato_email: string | null;
  observacoes: string | null;
};

/**
 * A linha crua do cliente, para o formulário de edição.
 *
 * `vw_cliente_resumo` não serve aqui: ela existe para a lista e não carrega
 * endereço nem observações. Em vez de inchar a view com coluna que a lista não
 * mostra, o formulário lê a tabela.
 */
export const buscarClienteCadastro = emCache(
  "cliente-cadastro",
  async (id: string): Promise<ClienteCadastro | null> => {
    const { data } = await db()
      .from("cliente")
      .select(
        "id,nome,tipo,cidade,endereco,contato_nome,contato_cargo," +
          "contato_telefone,contato_email,observacoes",
      )
      .eq("id", id)
      .maybeSingle<ClienteCadastro>();
    return data ?? null;
  },
);

// ------------------------------------------------------------
// Campanhas
// ------------------------------------------------------------

export const listarCampanhas = emCache("campanhas", async (clienteId: string): Promise<CampanhaResumo[]> => {
  const { data } = await db()
    .from("vw_campanha_resumo")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("nome")
    .returns<CampanhaResumo[]>();
  return data ?? [];
});

/**
 * Todas as campanhas de todos os clientes, numa consulta só.
 *
 * A home mostra em cada card a campanha que está rolando, e `vw_cliente_resumo`
 * não carrega isso: ela soma tudo e devolve só a contagem. Buscar campanha por
 * cliente seria uma viagem ao banco por card.
 *
 * Devolve lista, e não `Map` agrupado, porque `unstable_cache` serializa o
 * retorno: `Map` volta como objeto vazio na segunda leitura, e a tela quebrava
 * só depois do primeiro acesso. Estrutura que passa por JSON, sempre.
 *
 * ponytail: traz a tabela inteira e filtra em memória. São dezenas de linhas,
 * não milhares. Quando passar de algumas centenas, vira uma view com
 * `distinct on (cliente_id)`.
 */
export const listarTodasCampanhas = emCache(
  "campanhas-todas",
  async (): Promise<CampanhaResumo[]> => {
    const { data } = await db()
      .from("vw_campanha_resumo")
      .select("*")
      .order("nome")
      .returns<CampanhaResumo[]>();
    return data ?? [];
  },
);

/** Ordem de interesse. Aberta na frente; concluída é a que ninguém procura. */
const PESO_STATUS: Record<CampanhaResumo["status"], number> = {
  aberta: 0,
  encerrada: 1,
  concluida: 2,
};

/**
 * A campanha que o cliente abre.
 *
 * Aberta ganha de qualquer outra; entre duas abertas, ganha a de prazo mais
 * próximo, que é a que corre risco. Sem prazo vai para o fim, porque campanha
 * sem data não tem urgência nenhuma.
 */
export function campanhaEmDestaque(campanhas: CampanhaResumo[], clienteId: string) {
  return (
    campanhas
      .filter((c) => c.cliente_id === clienteId)
      .sort(
        (a, b) =>
          PESO_STATUS[a.status] - PESO_STATUS[b.status] ||
          (a.prazo_pedidos ?? "9999").localeCompare(b.prazo_pedidos ?? "9999"),
      )[0] ?? null
  );
}

export const buscarCampanha = emCache("campanha", async (id: string): Promise<CampanhaResumo | null> => {
  const { data } = await db()
    .from("vw_campanha_resumo")
    .select("*")
    .eq("id", id)
    .maybeSingle<CampanhaResumo>();
  return data ?? null;
});

export const listarGrupos = emCache("grupos", async (campanhaId: string): Promise<GrupoResumo[]> => {
  const { data } = await db()
    .from("vw_grupo_resumo")
    .select("*")
    .eq("campanha_id", campanhaId)
    .order("nome")
    .returns<GrupoResumo[]>();
  return data ?? [];
});

/**
 * Turma (grupo) com a campanha junto. As duas coisas aparecem no cabeçalho da
 * planilha, e separar em duas chamadas na página deixava o `notFound` em dois
 * lugares diferentes.
 */
export const buscarTurmaPainel = emCache("turma", async (id: string): Promise<TurmaPainel | null> => {
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
export const buscarTurmaPorCodigo = emCache(
  "turma-codigo",
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
export const listarPedidosDaTurma = emCache(
  "pedidos-turma",
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

/**
 * Pedidos de todas as turmas da campanha, com o nome da turma junto.
 *
 * Serve o bloco "precisa de atenção" da E3, que é uma lista de cobrança: sem o
 * nome da turma, o número de telefone não ajuda ninguém a saber com quem falar.
 */
export const listarPedidosDaCampanha = emCache(
  "pedidos-campanha",
  async (campanhaId: string): Promise<(PedidoPainel & { grupo_nome: string })[]> => {
    const { data: grupos } = await db()
      .from("grupo")
      .select("id,nome")
      .eq("campanha_id", campanhaId)
      .returns<{ id: string; nome: string }[]>();

    if (!grupos?.length) return [];

    const { data } = await db()
      .from("vw_pedido")
      .select("*")
      .in(
        "grupo_id",
        grupos.map((g) => g.id),
      )
      .eq("status", "ativo")
      .order("aluno_nome")
      .returns<PedidoPainel[]>();

    const nome = new Map(grupos.map((g) => [g.id, g.nome]));
    const comPecas = await comItens(data ?? []);
    return comPecas.map((p) => ({ ...p, grupo_nome: nome.get(p.grupo_id) ?? "" }));
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

export const buscarPedido = emCache("pedido", async (id: string): Promise<PedidoPainel | null> => {
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
export const listarParcelas = emCache("parcelas", async (pedidoId: string): Promise<ParcelaPainel[]> => {
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

/**
 * As três filas de cobrança da campanha.
 *
 * São exclusivas entre si de propósito: a mesma pessoa aparecendo em duas listas
 * faria a soma das listas mentir. Cada uma é uma tela própria em
 * `/painel/campanha/[id]/cobranca?s=`, com filtro por turma.
 *
 * Os títulos descrevem a pessoa, não a régua. "Falta a segunda parcela" obrigava
 * quem lê a converter aquilo em "então essa pagou a entrada"; "Pagou só a
 * entrada" já entrega o estado, e é assim que a cobrança é falada no telefone.
 */
export const SITUACOES = {
  atrasado: {
    titulo: "Em atraso",
    explica: "Pagaram a entrada e deixaram vencer o restante.",
    vale: (p: PedidoPainel) => p.status_pagamento === "atrasado",
  },
  parcial: {
    titulo: "Entrada recebida",
    explica: "Pedidos com entrada confirmada e saldo previsto para a entrega.",
    vale: (p: PedidoPainel) => p.status_pagamento === "parcial",
  },
  pendente: {
    titulo: "Não pagaram nada",
    explica: "Fizeram o pedido e não pagaram nenhuma parcela, vencida ou não.",
    vale: (p: PedidoPainel) => p.status_pagamento === "pendente",
  },
} as const;

export type Situacao = keyof typeof SITUACOES;

export function ehSituacao(v: string | undefined): v is Situacao {
  return !!v && v in SITUACOES;
}

export type ResumoProduto = {
  produto: string;
  pedidos: number;
  pecas: number;
  pagos: number;
  faltando: number;
  atrasados: number;
  vendido_centavos: number;
  recebido_centavos: number;
  a_receber_centavos: number;
};

/**
 * Quanto de cada produto foi pedido e quanto disso está pago.
 *
 * `pedidos` e `pecas` são contagens diferentes e as duas importam: kit e
 * quantidade maior que um descolam as duas, o dinheiro se conta por pedido e o
 * tecido se compra por peça.
 */
export function resumoPorProduto(pedidos: PedidoPainel[]): ResumoProduto[] {
  const mapa = new Map<string, ResumoProduto>();

  for (const p of pedidos) {
    const chave = p.produto_nome_snapshot;
    const linha =
      mapa.get(chave) ??
      {
        produto: chave,
        pedidos: 0,
        pecas: 0,
        pagos: 0,
        faltando: 0,
        atrasados: 0,
        vendido_centavos: 0,
        recebido_centavos: 0,
        a_receber_centavos: 0,
      };

    linha.pedidos += 1;
    linha.pecas += p.itens.reduce((n, i) => n + i.quantidade, 0);
    if (p.status_pagamento === "pago") linha.pagos += 1;
    else linha.faltando += 1;
    if (p.status_pagamento === "atrasado") linha.atrasados += 1;
    linha.vendido_centavos += p.valor_centavos;
    linha.recebido_centavos += p.pago_centavos;
    linha.a_receber_centavos += p.saldo_centavos;

    mapa.set(chave, linha);
  }

  return [...mapa.values()].sort((a, b) => b.pedidos - a.pedidos);
}

/**
 * O corte agrupado por produto, com os tamanhos na ordem da grade.
 *
 * A view devolve uma linha por (grupo, produto, tamanho), e é a tela que precisa
 * somar os grupos: a oficina corta a campanha inteira de uma vez, não turma por
 * turma. Ordem alfabética de tamanho colocaria G antes de M, que não é ordem
 * nenhuma para quem separa tecido.
 */
const ORDEM_TAMANHO = ["PP", "P", "M", "G", "GG", "XG", "XGG", "EG"];

export function posicaoDoTamanho(tamanho: string) {
  const bl = tamanho.startsWith(PREFIXO_BABY_LOOK);
  const base = bl ? tamanho.slice(PREFIXO_BABY_LOOK.length) : tamanho;
  const i = ORDEM_TAMANHO.indexOf(base.toUpperCase());
  // Baby look depois da grade tradicional inteira, na mesma ordem interna.
  return (bl ? 100 : 0) + (i === -1 ? 50 : i);
}

export function agruparCorte(linhas: LinhaCorte[]) {
  const mapa = new Map<string, Map<string, number>>();

  for (const l of linhas) {
    const porTamanho = mapa.get(l.produto) ?? new Map<string, number>();
    porTamanho.set(l.tamanho, (porTamanho.get(l.tamanho) ?? 0) + l.total);
    mapa.set(l.produto, porTamanho);
  }

  return [...mapa.entries()]
    .map(([produto, porTamanho]) => {
      const tamanhos = [...porTamanho.entries()]
        .map(([tamanho, total]) => ({ tamanho, total }))
        .sort((a, b) => posicaoDoTamanho(a.tamanho) - posicaoDoTamanho(b.tamanho));
      return {
        produto,
        tamanhos,
        total: tamanhos.reduce((n, t) => n + t.total, 0),
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function ehFiltro(v: string | undefined): v is Filtro {
  return !!v && v in FILTROS;
}

/** Busca por nome do aluno, e só. Quem procura na lista procura uma pessoa. */
export function filtrar(pedidos: PedidoPainel[], filtro: Filtro, busca?: string) {
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

// ------------------------------------------------------------
// Produtos · leitura entre campanhas
// ------------------------------------------------------------

/** Situação comercial do produto. `ativo` no banco é derivado de `a_venda`. */
export type SituacaoProduto = "a_venda" | "pausado" | "oculto";
export type ClasseProduto = "camisa" | "moletom" | "polo" | "outro";

export const CLASSES: { valor: ClasseProduto; texto: string }[] = [
  { valor: "camisa", texto: "Camisa" },
  { valor: "moletom", texto: "Moletom" },
  { valor: "polo", texto: "Polo" },
  { valor: "outro", texto: "Outro" },
];

export const SITUACOES_PRODUTO: Record<
  SituacaoProduto,
  { titulo: string; explicacao: string }
> = {
  a_venda: { titulo: "À venda", explicacao: "Aparece na loja e aceita pedidos." },
  pausado: {
    titulo: "Venda pausada",
    explicacao: "Continua na loja, sem botão de pedir.",
  },
  oculto: { titulo: "Oculto", explicacao: "Some da loja. Os pedidos feitos continuam." },
};

/**
 * Produto como o cadastro o conhece. É o que a gaveta preenche e o que a aba
 * de produtos da campanha lista, então tem tudo, inclusive o que só o admin vê.
 */
export type ProdutoCadastro = {
  id: string;
  campanha_id: string;
  nome: string;
  descricao: string | null;
  tipo: "simples" | "kit";
  classe: ClasseProduto;
  preco_centavos: number;
  tamanhos: string[];
  imagens: string[];
  situacao: SituacaoProduto;
  exige_nome: boolean;
  max_parcelas: number;
  max_caracteres_nome: number;
  prazo_pedidos: string | null;
  prazo_alteracoes: string | null;
  ordem: number;
  /** Pedidos ativos feitos neste produto. Zero é o que permite excluir. */
  pedidos: number;
};

const COLUNAS_PRODUTO =
  "id,campanha_id,nome,descricao,tipo,classe,preco_centavos,tamanhos,imagens," +
  "situacao,exige_nome,max_parcelas,max_caracteres_nome,prazo_pedidos,prazo_alteracoes,ordem";

/**
 * Produtos da campanha, com a contagem de pedidos de cada um.
 *
 * A contagem é uma segunda viagem ao banco e vale a pena: é ela que decide se
 * o menu oferece excluir ou manda ocultar, e descobrir isso pelo erro de chave
 * estrangeira depois do clique seria pior.
 */
export const listarProdutosDaCampanha = emCache(
  "produtos-da-campanha",
  async (campanhaId: string): Promise<ProdutoCadastro[]> => {
    const { data } = await db()
      .from("produto")
      .select(COLUNAS_PRODUTO)
      .eq("campanha_id", campanhaId)
      .order("ordem")
      .order("nome")
      .returns<Omit<ProdutoCadastro, "pedidos">[]>();

    const produtos = data ?? [];
    if (produtos.length === 0) return [];

    const { data: pedidos } = await db()
      .from("pedido")
      .select("produto_id")
      .eq("status", "ativo")
      .in("produto_id", produtos.map((p) => p.id))
      .returns<{ produto_id: string }[]>();

    const contagem: Record<string, number> = {};
    for (const p of pedidos ?? []) contagem[p.produto_id] = (contagem[p.produto_id] ?? 0) + 1;

    return produtos.map((p) => ({
      ...p,
      tamanhos: p.tamanhos ?? [],
      imagens: p.imagens ?? [],
      pedidos: contagem[p.id] ?? 0,
    }));
  },
);

export type ProdutoPainel = {
  id: string;
  nome: string;
  tipo: "simples" | "kit";
  preco_centavos: number;
  tamanhos: string[];
  ativo: boolean;
  situacao: SituacaoProduto;
  classe: ClasseProduto;
  campanha_id: string;
  campanha_nome: string;
  campanha_status: CampanhaResumo["status"];
  cliente_id: string;
  cliente_nome: string;
};

type LinhaProduto = Omit<
  ProdutoPainel,
  "campanha_id" | "campanha_nome" | "campanha_status" | "cliente_id" | "cliente_nome"
> & {
  campanha: {
    id: string;
    nome: string;
    status: CampanhaResumo["status"];
    cliente: { id: string; nome: string } | null;
  } | null;
};

/**
 * Todos os produtos de todas as campanhas.
 *
 * Não é catálogo: produto continua pertencendo à campanha (§3.2.1) e o cadastro
 * continua lá. Isto aqui responde a pergunta que hoje obriga abrir campanha por
 * campanha, "o que a gente já vendeu, e por quanto".
 *
 * ponytail: traz tudo e agrupa em memória. São dezenas de linhas por campanha.
 */
export const listarTodosProdutos = emCache(
  "produtos-todos",
  async (busca?: string): Promise<ProdutoPainel[]> => {
    let q = db()
      .from("produto")
      .select(
        "id,nome,tipo,preco_centavos,tamanhos,ativo,situacao,classe," +
          "campanha:campanha_id(id,nome,status,cliente:cliente_id(id,nome))",
      )
      .order("nome");
    if (busca?.trim()) q = q.ilike("nome", `%${busca.trim()}%`);

    const { data } = await q.returns<LinhaProduto[]>();

    return (data ?? [])
      .filter((p) => p.campanha?.cliente)
      .map((p) => ({
        id: p.id,
        nome: p.nome,
        tipo: p.tipo,
        preco_centavos: p.preco_centavos,
        tamanhos: p.tamanhos ?? [],
        ativo: p.ativo,
        situacao: p.situacao,
        classe: p.classe,
        campanha_id: p.campanha!.id,
        campanha_nome: p.campanha!.nome,
        campanha_status: p.campanha!.status,
        cliente_id: p.campanha!.cliente!.id,
        cliente_nome: p.campanha!.cliente!.nome,
      }));
  },
);

// ------------------------------------------------------------
// Configurações · quem tem acesso à área da empresa
// ------------------------------------------------------------

export type AcessoEmpresa = {
  perfil_id: string;
  nome: string;
  email: string | null;
  concedido_em: string;
};

type LinhaAcesso = {
  perfil_id: string;
  concedido_em: string;
  perfil: { nome: string; email: string | null } | null;
};

/**
 * Quem entrou com o código da empresa, e quando.
 *
 * É o que dá sentido a trocar o código (§3.3): a dona vê sete contas, reconhece
 * cinco, e as outras duas são o motivo da troca. Sem esta lista, rotacionar é um
 * ato às cegas e ninguém faz.
 */
export const listarAcessos = emCache("acessos", async (): Promise<AcessoEmpresa[]> => {
  const { data } = await db()
    .from("acesso_empresa")
    .select("perfil_id,concedido_em,perfil:perfil_id(nome,email)")
    .is("revogado_em", null)
    .order("concedido_em", { ascending: false })
    .returns<LinhaAcesso[]>();

  return (data ?? []).map((a) => ({
    perfil_id: a.perfil_id,
    nome: a.perfil?.nome ?? "Conta sem nome",
    email: a.perfil?.email ?? null,
    concedido_em: a.concedido_em,
  }));
});

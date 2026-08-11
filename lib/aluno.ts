import { cache } from "react";
import { mensagem, publico } from "./supabase";
import { emCache, invalidarPainel } from "./painel";
import { diasAteNoFuso } from "./data";

export { reais, tamanhoLegivel } from "./formato";

/**
 * Leitura e escrita da área do aluno.
 *
 * Nada aqui usa service role. Catálogo vem das views públicas; escrita vem das
 * funções `aluno_*`, que rodam como dono e validam o dono do pedido antes de
 * gravar. Ver migration `area_do_aluno`.
 */

export type Turma = {
  codigo: string;
  grupo_nome: string;
  campanha_id: string;
  campanha_nome: string;
  campanha_status: string;
  label_grupo: string;
  prazo_pedidos: string | null;
  prazo_alteracoes: string | null;
  entrega_prevista: string | null;
  percentual_entrada: number;
  cliente_nome: string;
  cliente_cidade: string | null;
};

export type Produto = {
  id: string;
  campanha_id: string;
  nome: string;
  descricao: string | null;
  tipo: "simples" | "kit";
  preco_centavos: number;
  tamanhos: string[];
  max_caracteres_nome: number;
  imagens: string[];
  ordem: number;
  classe: "camisa" | "moletom" | "polo" | "outro";
  /** Falso é o moletom: sai sem bordado, e a tela de nome some do fluxo. */
  exige_nome: boolean;
  /** Teto de vezes que o aluno pode escolher no fechamento. */
  max_parcelas: number;
  /** `pausado` continua na vitrine, sem botão. `oculto` nem chega aqui. */
  situacao: "a_venda" | "pausado";
  /** Quando existem, mandam mais que os prazos da campanha. */
  prazo_pedidos: string | null;
  prazo_alteracoes: string | null;
};

export type Peca = {
  componente_id: string;
  componente_nome: string;
  componente_tamanhos: string[];
  quantidade: number;
  ordem: number;
};

export type Item = {
  id: string;
  produto: string;
  tamanho: string;
  nome_estampa: string;
  tamanhos: string[];
  max_caracteres: number;
  exige_nome: boolean;
};

export type Parcela = {
  id: string;
  numero: number;
  valor: number;
  pago: number;
  saldo: number;
  vencimento: string | null;
  eh_entrada: boolean;
  status: "pago" | "parcial" | "atrasado" | "pendente";
};

export type Pedido = {
  id: string;
  produto: string;
  capa: string | null;
  valor: number;
  pago: number;
  saldo: number;
  status_pagamento: "pago" | "parcial" | "atrasado" | "pendente";
  status_producao: "aguardando" | "liberado" | "em_producao" | "pronto" | "entregue";
  criado_em: string;
  /** Já resolvido entre produto e campanha: o produto manda quando tem data. */
  prazo_alteracoes: string | null;
  itens: Item[];
  parcelas: Parcela[];
};

/**
 * Catálogo em cache, não só deduplicado no request.
 *
 * Turma, produtos e peças são iguais para a turma inteira e mudam quando o
 * admin mexe, não a cada visita. Sem isso, cada tela do aluno pagava de novo os
 * cerca de 300 ms de viagem até o banco para reler a mesma coisa. Quem escreve
 * chama `invalidarPainel`, que derruba isto junto.
 *
 * O que é de cada aluno (`meusPedidos`, perfil) fica de fora de propósito: ali
 * o dado é por pessoa e muda no segundo em que ele paga.
 */
export const buscarTurma = emCache("turma-publica", async (codigo: string): Promise<Turma | null> => {
  const { data } = await publico()
    .from("vw_turma_publica")
    .select("*")
    .eq("codigo", codigo.toUpperCase())
    .maybeSingle<Turma>();
  return data ?? null;
});

export const listarProdutos = emCache("produtos", async (campanhaId: string): Promise<Produto[]> => {
  const { data } = await publico()
    .from("vw_produto_publico")
    .select("*")
    .eq("campanha_id", campanhaId)
    .order("ordem")
    .returns<Produto[]>();
  return data ?? [];
});

export const buscarProduto = emCache("produto", async (campanhaId: string, id: string): Promise<Produto | null> => {
  const { data } = await publico()
    .from("vw_produto_publico")
    .select("*")
    .eq("campanha_id", campanhaId)
    .eq("id", id)
    .maybeSingle<Produto>();
  return data ?? null;
});

/** Peças de um kit, na ordem de exibição. Produto simples devolve lista vazia. */
export const listarPecas = emCache("kit", async (kitId: string): Promise<Peca[]> => {
  const { data } = await publico()
    .from("vw_kit_publico")
    .select("*")
    .eq("kit_id", kitId)
    .order("ordem")
    .returns<Peca[]>();
  return data ?? [];
});

export const meusPedidos = cache(
  async (perfilId: string, codigo: string): Promise<Pedido[]> => {
    const { data } = await publico().rpc("aluno_meus_pedidos", {
      p_perfil_id: perfilId,
      p_codigo: codigo,
    });
    return (data as Pedido[]) ?? [];
  },
);

/** Soma do que o aluno ainda deve na turma. Alimenta o badge da Carteira. */
export function totalEmAberto(pedidos: Pedido[]) {
  return pedidos.reduce((s, p) => s + p.saldo, 0);
}

export async function entrar(nome: string, email: string, telefone: string | null) {
  const { data, error } = await publico().rpc("aluno_entrar", {
    p_nome: nome,
    p_email: email,
    p_telefone: telefone,
  });
  if (error) return { erro: mensagem(error) };
  return { perfilId: data as string };
}

export type Perfil = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
};

export const buscarPerfil = cache(async (perfilId: string): Promise<Perfil | null> => {
  const { data } = await publico().rpc("aluno_perfil", { p_perfil_id: perfilId });
  return (data as Perfil) ?? null;
});

export async function atualizarTelefone(perfilId: string, telefone: string) {
  const { error } = await publico().rpc("aluno_atualizar_telefone", {
    p_perfil_id: perfilId,
    p_telefone: telefone,
  });
  if (error) return { erro: mensagem(error) };
  invalidarPainel();
  return {};
}

export async function criarPedido(
  perfilId: string,
  codigo: string,
  produtoId: string,
  itens: { produto_id: string; tamanho: string; nome_estampa: string }[],
  parcelas?: number,
) {
  const { data, error } = await publico().rpc("aluno_criar_pedido", {
    p_perfil_id: perfilId,
    p_codigo: codigo,
    p_produto_id: produtoId,
    p_itens: itens,
    p_parcelas: parcelas ?? null,
  });
  if (error) return { erro: mensagem(error) };
  invalidarPainel();
  return { pedidoId: data as string };
}

export async function pagar(perfilId: string, parcelaId: string, metodo: string) {
  const { error } = await publico().rpc("aluno_pagar", {
    p_perfil_id: perfilId,
    p_parcela_id: parcelaId,
    p_metodo: metodo,
  });
  if (error) return { erro: mensagem(error) };
  invalidarPainel();
  return {};
}

/** Quita todas as parcelas em aberto do pedido de uma vez. */
export async function pagarPedido(perfilId: string, pedidoId: string, metodo: string) {
  const { error } = await publico().rpc("aluno_pagar_pedido", {
    p_perfil_id: perfilId,
    p_pedido_id: pedidoId,
    p_metodo: metodo,
  });
  if (error) return { erro: mensagem(error) };
  invalidarPainel();
  return {};
}

export async function editarItem(
  perfilId: string,
  itemId: string,
  tamanho: string,
  nome: string,
) {
  const { error } = await publico().rpc("aluno_editar_item", {
    p_perfil_id: perfilId,
    p_item_id: itemId,
    p_tamanho: tamanho,
    p_nome: nome,
  });
  if (error) return { erro: mensagem(error) };
  invalidarPainel();
  return {};
}

/** "23 de setembro". Data do Postgres vem como 'YYYY-MM-DD', sem fuso. */
export function dia(d: string | null | undefined) {
  if (!d) return null;
  return new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });
}

export function diaCurto(d: string | null | undefined) {
  if (!d) return null;
  return new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** Dias que faltam para uma data. Negativo já passou. */
export function diasAte(d: string | null | undefined) {
  return diasAteNoFuso(d);
}

/**
 * Editável = a peça ainda não existe fisicamente E o prazo não passou.
 *
 * `aguardando` e `liberado` são estados de fila. `liberado` quer dizer liberado
 * para produzir, não sendo produzido: a oficina só começa depois do prazo de
 * alterações. Tratar `liberado` como travado fazia a tela dizer "já entrou na
 * produção" no mesmo segundo em que o aluno pagava a entrada.
 *
 * Regra espelhada em `aluno_editar_item`, que é quem de fato decide.
 */
const EM_FILA = ["aguardando", "liberado"];

export function podeEditar(pedido: Pedido, turma: Turma) {
  if (!EM_FILA.includes(pedido.status_producao)) return false;
  const restam = diasAte(pedido.prazo_alteracoes ?? turma.prazo_alteracoes);
  return restam === null || restam >= 0;
}

/**
 * Quando a oficina começa. Não existe campo próprio: a produção começa quando
 * as alterações fecham, senão produziria peça que ainda pode mudar.
 */
export function inicioProducao(turma: Turma, pedido?: Pedido) {
  return pedido?.prazo_alteracoes ?? turma.prazo_alteracoes;
}

/**
 * Prazo que vale para um produto. O da campanha é o padrão; o do produto
 * sobrescreve, e é o que permite fechar a camisa antes do moletom sem
 * encerrar a campanha inteira.
 */
export function prazoDoProduto(
  turma: Turma,
  produto: Pick<Produto, "prazo_pedidos" | "prazo_alteracoes">,
) {
  return {
    pedidos: produto.prazo_pedidos ?? turma.prazo_pedidos,
    alteracoes: produto.prazo_alteracoes ?? turma.prazo_alteracoes,
  };
}

/**
 * Dá para comprar agora? Junta as três travas que fecham a porta: a campanha,
 * a situação do produto e o prazo que vale para ele.
 */
export function podeComprar(turma: Turma, produto: Produto) {
  if (turma.campanha_status !== "aberta") return false;
  if (produto.situacao !== "a_venda") return false;
  const restam = diasAte(prazoDoProduto(turma, produto).pedidos);
  return restam === null || restam >= 0;
}

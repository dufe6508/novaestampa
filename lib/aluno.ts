import { cache } from "react";
import { publico } from "./supabase";

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
  itens: Item[];
  parcelas: Parcela[];
};

/**
 * `cache` deduplica dentro do mesmo request: o layout e a página pedem a mesma
 * coisa e o banco responde uma vez só.
 */
export const buscarTurma = cache(async (codigo: string): Promise<Turma | null> => {
  const { data } = await publico()
    .from("vw_turma_publica")
    .select("*")
    .eq("codigo", codigo.toUpperCase())
    .maybeSingle<Turma>();
  return data ?? null;
});

export async function listarProdutos(campanhaId: string): Promise<Produto[]> {
  const { data } = await publico()
    .from("vw_produto_publico")
    .select("*")
    .eq("campanha_id", campanhaId)
    .order("ordem")
    .returns<Produto[]>();
  return data ?? [];
}

export async function buscarProduto(campanhaId: string, id: string): Promise<Produto | null> {
  const { data } = await publico()
    .from("vw_produto_publico")
    .select("*")
    .eq("campanha_id", campanhaId)
    .eq("id", id)
    .maybeSingle<Produto>();
  return data ?? null;
}

/** Peças de um kit, na ordem de exibição. Produto simples devolve lista vazia. */
export async function listarPecas(kitId: string): Promise<Peca[]> {
  const { data } = await publico()
    .from("vw_kit_publico")
    .select("*")
    .eq("kit_id", kitId)
    .order("ordem")
    .returns<Peca[]>();
  return data ?? [];
}

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

/**
 * O erro do Postgres é escrito para o aluno ler ("O prazo de pedidos terminou
 * em 23/09/2026"), então ele sobe direto para a tela em vez de virar
 * "erro inesperado". Só o que não tem mensagem vira texto genérico.
 */
function mensagem(erro: { message?: string } | null): string {
  const m = erro?.message?.trim();
  if (!m) return "Não consegui completar agora. Tente de novo em alguns segundos.";
  return m;
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
  return error ? { erro: mensagem(error) } : {};
}

export async function criarPedido(
  perfilId: string,
  codigo: string,
  produtoId: string,
  itens: { produto_id: string; tamanho: string; nome_estampa: string }[],
) {
  const { data, error } = await publico().rpc("aluno_criar_pedido", {
    p_perfil_id: perfilId,
    p_codigo: codigo,
    p_produto_id: produtoId,
    p_itens: itens,
  });
  if (error) return { erro: mensagem(error) };
  return { pedidoId: data as string };
}

export async function pagar(perfilId: string, parcelaId: string, metodo: string) {
  const { error } = await publico().rpc("aluno_pagar", {
    p_perfil_id: perfilId,
    p_parcela_id: parcelaId,
    p_metodo: metodo,
  });
  return error ? { erro: mensagem(error) } : {};
}

/** Quita todas as parcelas em aberto do pedido de uma vez. */
export async function pagarPedido(perfilId: string, pedidoId: string, metodo: string) {
  const { error } = await publico().rpc("aluno_pagar_pedido", {
    p_perfil_id: perfilId,
    p_pedido_id: pedidoId,
    p_metodo: metodo,
  });
  return error ? { erro: mensagem(error) } : {};
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
  return error ? { erro: mensagem(error) } : {};
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
  if (!d) return null;
  const alvo = new Date(`${d}T12:00:00`).getTime();
  const hoje = new Date().setHours(12, 0, 0, 0);
  return Math.round((alvo - hoje) / 86400000);
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
  const restam = diasAte(turma.prazo_alteracoes);
  return restam === null || restam >= 0;
}

/**
 * Quando a oficina começa. Não existe campo próprio: a produção começa quando
 * as alterações fecham, senão produziria peça que ainda pode mudar.
 */
export function inicioProducao(turma: Turma) {
  return turma.prazo_alteracoes;
}

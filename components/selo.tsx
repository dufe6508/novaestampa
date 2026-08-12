import type { Pedido } from "@/lib/aluno";

/**
 * Status, sem pílula.
 *
 * O chip de fundo tom sobre tom caiu. Numa lista de duzentas linhas ele produzia
 * uma coluna de retângulos coloridos que competia com o nome e com o dinheiro,
 * que são os dois dados pelos quais alguém abre a tela. Área de cor pesa muito
 * para o que é qualificação, não medida.
 *
 * O que ficou: um ponto de 5px e a palavra, na altura da linha. O ponto dá a
 * leitura periférica ("tem vermelho nesta lista"), a palavra dá a informação, e
 * nenhum dos dois adiciona caixa, borda ou fundo.
 *
 * Cor nunca informa sozinha: quem não distingue verde de vermelho lê "Em atraso"
 * do mesmo jeito. E só o estado que exige ação hoje tinge o texto; o resto fica
 * em `ink-2`, para o vermelho continuar valendo alguma coisa.
 */

const TONS = {
  neutro: { ponto: "bg-faint", texto: "text-muted" },
  ok: { ponto: "bg-success", texto: "text-ink-2" },
  atencao: { ponto: "bg-warning", texto: "text-ink-2" },
  ruim: { ponto: "bg-danger", texto: "text-danger" },
} as const;

type Tom = keyof typeof TONS;

function Base({ tom, children }: { tom: Tom; children: React.ReactNode }) {
  const { ponto, texto } = TONS[tom];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-caption
        font-medium leading-[1.5] ${texto}`}
    >
      <span aria-hidden="true" className={`size-[5px] shrink-0 rounded-full ${ponto}`} />
      {children}
    </span>
  );
}

const PAGAMENTO: Record<Pedido["status_pagamento"], { texto: string; tom: Tom }> = {
  pago: { texto: "Quitado", tom: "ok" },
  parcial: { texto: "Falta pagar", tom: "atencao" },
  atrasado: { texto: "Em atraso", tom: "ruim" },
  pendente: { texto: "Não pago", tom: "neutro" },
};

/**
 * `liberado` quer dizer liberado para produzir, não sendo produzido. Chamar isso
 * de "em produção" trava a edição na cabeça do aluno no mesmo segundo em que
 * ele paga, e é mentira: a oficina só começa depois do prazo de alterações.
 */
const PRODUCAO: Record<Pedido["status_producao"], { texto: string; tom: Tom }> = {
  aguardando: { texto: "Aguardando pagamento", tom: "neutro" },
  liberado: { texto: "Confirmado", tom: "ok" },
  em_producao: { texto: "Em produção", tom: "atencao" },
  pronto: { texto: "Pronto", tom: "ok" },
  entregue: { texto: "Entregue", tom: "neutro" },
};

const CAMPANHA: Record<string, { texto: string; tom: Tom }> = {
  aberta: { texto: "Aberta", tom: "ok" },
  encerrada: { texto: "Encerrada", tom: "neutro" },
  concluida: { texto: "Concluída", tom: "neutro" },
};

/**
 * Situação do produto. `a_venda` não tem selo de propósito: estar à venda é o
 * normal, e selar o normal faz a lista inteira piscar sem informar nada. Só a
 * exceção recebe marca (mesma regra do cartão de lista, CLAUDE.md §5.1.1).
 */
const PRODUTO: Record<string, { texto: string; tom: Tom }> = {
  pausado: { texto: "Venda pausada", tom: "atencao" },
  oculto: { texto: "Oculto", tom: "neutro" },
};

export function SeloProduto({ situacao }: { situacao: string }) {
  const s = PRODUTO[situacao];
  if (!s) return null;
  return <Base tom={s.tom}>{s.texto}</Base>;
}

export function SeloCampanha({ status }: { status: string }) {
  const s = CAMPANHA[status];
  if (!s) return null;
  return <Base tom={s.tom}>{s.texto}</Base>;
}

export function SeloPagamento({ status }: { status: Pedido["status_pagamento"] }) {
  const s = PAGAMENTO[status];
  return <Base tom={s.tom}>{s.texto}</Base>;
}

export function SeloProducao({ status }: { status: Pedido["status_producao"] }) {
  const s = PRODUCAO[status];
  return <Base tom={s.tom}>{s.texto}</Base>;
}

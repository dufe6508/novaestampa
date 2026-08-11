import type { Pedido } from "@/lib/aluno";

/**
 * Selo de status.
 *
 * Chip de fundo tom sobre tom, sem bolinha. A versão com ponto colorido caiu:
 * numa tabela densa o ponto vira uma coluna de confete que não se lê de relance,
 * e o texto ao lado dele ficava do mesmo peso do resto da linha.
 *
 * O que informa aqui é a área de cor, não um pixel. O fundo é a versão `soft` do
 * token de estado, que é clara o bastante para não competir com o dinheiro
 * vencido em vermelho cheio, e o texto vai na cor forte do mesmo par, o que
 * garante o contraste.
 *
 * Cor nunca informa sozinha: quem não distingue verde de vermelho lê "Em atraso"
 * do mesmo jeito.
 */

const TONS = {
  neutro: "bg-surface-2 text-ink-2",
  ok: "bg-success-soft text-success",
  atencao: "bg-warning-soft text-warning",
  ruim: "bg-danger-soft text-danger",
} as const;

type Tom = keyof typeof TONS;

function Base({ tom, children }: { tom: Tom; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-sm px-1.5 py-0.5
        text-[11.5px] font-semibold leading-[1.4] ${TONS[tom]}`}
    >
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

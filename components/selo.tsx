import type { Pedido } from "@/lib/aluno";

/**
 * Selo de status.
 *
 * Sem pílula e sem fundo colorido. A versão anterior tinha os dois e o
 * resultado era um confete de retângulos coloridos: numa lista de sessenta
 * linhas, o que devia chamar atenção passava a ser ruído.
 *
 * O que sobrou é o mínimo que ainda informa: um ponto na cor do estado e o
 * texto. Cor nunca informa sozinha, quem não distingue verde de vermelho lê
 * "Em atraso" do mesmo jeito.
 *
 * O texto fica em `ink-2` nos estados calmos e assume a cor só quando algo
 * exige ação. Assim o vermelho de "Em atraso" volta a ser o único vermelho da
 * tela, que é o que faz ele funcionar.
 */

const TONS = {
  neutro: { ponto: "bg-faint", texto: "text-muted" },
  ok: { ponto: "bg-success", texto: "text-ink-2" },
  atencao: { ponto: "bg-warning", texto: "text-ink-2" },
  ruim: { ponto: "bg-danger", texto: "text-danger" },
} as const;

type Tom = keyof typeof TONS;

function Base({ tom, children }: { tom: Tom; children: React.ReactNode }) {
  const t = TONS[tom];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-caption
        font-medium leading-none ${t.texto}`}
    >
      <span aria-hidden className={`size-[5px] shrink-0 rounded-full ${t.ponto}`} />
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

export function SeloPagamento({ status }: { status: Pedido["status_pagamento"] }) {
  const s = PAGAMENTO[status];
  return <Base tom={s.tom}>{s.texto}</Base>;
}

export function SeloProducao({ status }: { status: Pedido["status_producao"] }) {
  const s = PRODUCAO[status];
  return <Base tom={s.tom}>{s.texto}</Base>;
}

/** Só o ponto, para quando o texto já está na coluna do lado. */
export function Ponto({ status }: { status: Pedido["status_pagamento"] }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-[5px] shrink-0 rounded-full ${TONS[PAGAMENTO[status].tom].ponto}`}
    />
  );
}

export const textoPagamento = (s: Pedido["status_pagamento"]) => PAGAMENTO[s].texto;

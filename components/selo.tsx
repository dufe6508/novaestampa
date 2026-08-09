import type { Pedido } from "@/lib/aluno";

/**
 * Selo de status.
 *
 * Cor nunca informa sozinha: todo selo carrega o texto. Quem não distingue
 * verde de vermelho lê "Em atraso" do mesmo jeito.
 *
 * Rótulos curtos e `whitespace-nowrap` de propósito: selo que quebra em duas
 * linhas dentro de um card estreito parece defeito.
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
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm px-2
        py-1 text-caption font-semibold ${TONS[tom]}`}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current opacity-70" />
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
  entregue: { texto: "Entregue", tom: "ok" },
};

export function SeloPagamento({ status }: { status: Pedido["status_pagamento"] }) {
  const s = PAGAMENTO[status];
  return <Base tom={s.tom}>{s.texto}</Base>;
}

export function SeloProducao({ status }: { status: Pedido["status_producao"] }) {
  const s = PRODUCAO[status];
  return <Base tom={s.tom}>{s.texto}</Base>;
}

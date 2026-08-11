"use client";

import { useActionState } from "react";

/**
 * Item do menu de três pontos que executa uma ação, em vez de navegar.
 *
 * Existe porque pausar venda e ocultar produto se desfazem num clique. Mandar
 * essas duas para uma tela de confirmação ensinaria a pessoa a confirmar sem
 * ler, que é justamente o que estraga a confirmação de excluir, essa sim
 * definitiva.
 *
 * Cliente por causa do `useActionState`, que é o que dá o estado de pendência e
 * a mensagem quando a ação recusa. O resto do menu continua no servidor.
 */

export function ItemMenuAcao({
  acao,
  ocultos,
  icone,
  tom = "normal",
  children,
}: {
  acao: (estado: string | null, dados: FormData) => Promise<string | undefined>;
  ocultos: Record<string, string>;
  icone: React.ReactNode;
  tom?: "normal" | "perigo";
  children: React.ReactNode;
}) {
  const [erro, enviar, pendente] = useActionState(
    async (_anterior: string | null, dados: FormData) => (await acao(null, dados)) ?? null,
    null,
  );

  return (
    <form action={enviar}>
      {Object.entries(ocultos).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      <button
        type="submit"
        disabled={pendente}
        className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body-sm
          font-medium transition-colors duration-fast ease-soft focus-visible:outline
          focus-visible:outline-2 focus-visible:outline-offset-[-2px]
          focus-visible:outline-brand-deep disabled:opacity-50
          ${
            tom === "perigo"
              ? "text-danger hover:bg-danger-soft"
              : "text-ink-2 hover:bg-surface-2 hover:text-ink"
          }`}
      >
        <span className="shrink-0 text-muted">{icone}</span>
        {pendente ? "Salvando…" : children}
      </button>

      {erro && (
        <p role="alert" className="px-2.5 pb-1 text-caption text-danger">
          {erro}
        </p>
      )}
    </form>
  );
}

"use client";

import { useActionState } from "react";

/**
 * Escolha de estado sem `select`.
 *
 * O `select` do navegador abre uma lista desenhada pelo sistema operacional,
 * que ignora todo o resto da interface: fonte errada, azul do Windows, cantos
 * quadrados. Dentro de um painel discreto ele vira a coisa mais chamativa da
 * tela, e não dá para estilizar por CSS.
 *
 * A troca é um botão por opção, dentro de um formulário só. O truque que faz
 * isso funcionar sem estado nenhum é nativo: `<button name value>` manda o
 * próprio valor no envio, então cinco botões e um `<form>` substituem o
 * `select` inteiro.
 *
 * O estado atual fica marcado e desabilitado: clicar nele não faria nada, e
 * botão que não faz nada não deve parecer clicável.
 */

export function Escolha({
  acao,
  campo,
  atual,
  opcoes,
  ocultos,
  children,
}: {
  acao: (estado: string | null, dados: FormData) => Promise<string | undefined>;
  /** Nome do campo enviado. O valor sai do botão clicado. */
  campo: string;
  atual: string;
  opcoes: { valor: string; texto: string }[];
  ocultos?: Record<string, string>;
  /** Campos extras enviados junto, tipo o valor de uma baixa parcial. */
  children?: React.ReactNode;
}) {
  const [erro, enviar, pendente] = useActionState(
    async (estado: string | null, dados: FormData) => (await acao(estado, dados)) ?? null,
    null,
  );

  return (
    <form action={enviar} className="flex flex-col gap-1.5">
      {Object.entries(ocultos ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      {children}

      <div className="flex flex-wrap gap-1">
        {opcoes.map((o) => {
          const ativo = o.valor === atual;
          return (
            <button
              key={o.valor}
              type="submit"
              name={campo}
              value={o.valor}
              disabled={ativo || pendente}
              aria-current={ativo ? "true" : undefined}
              className={`h-7 rounded-md border px-2 text-[11px] font-medium transition-colors
                duration-fast ease-soft disabled:cursor-default
                ${
                  ativo
                    ? "border-ink bg-ink text-white"
                    : `border-line bg-surface text-ink-2 hover:border-line-strong
                       hover:bg-surface-2 disabled:opacity-40`
                }`}
            >
              {o.texto}
            </button>
          );
        })}
      </div>

      {erro && (
        <p role="alert" className="text-[11px] text-danger">
          {erro}
        </p>
      )}
    </form>
  );
}

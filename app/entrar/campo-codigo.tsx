"use client";

import { useActionState, useState } from "react";

/**
 * Campo do código da turma.
 *
 * Aceita letra e número, e joga para maiúscula enquanto digita. Isso mata o erro mais
 * comum sem precisar explicar regra nenhuma na tela: digitar em minúsculo, ou colar com
 * espaço no fim.
 *
 * O filtro já descartou 0 e 1 um dia, quando o código era sempre gerado pelo sistema. Caiu
 * quando o admin passou a escolher o código na mão: uma turma que quer "1234" ficava sem
 * conseguir digitar o próprio código.
 */

const INVALIDOS = /[^A-Z0-9]/g;
const MIN = 4;
const MAX = 10;

export function CampoCodigo({
  acao,
}: {
  acao: (estado: string | null, formData: FormData) => Promise<string | undefined>;
}) {
  const [erro, formAction, pendente] = useActionState(
    async (estado: string | null, formData: FormData) => (await acao(estado, formData)) ?? null,
    null,
  );
  const [codigo, setCodigo] = useState("");

  const curto = codigo.length < MIN;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="codigo" className="text-caption font-semibold text-ink-2">
          Código da turma
        </label>

        <input
          id="codigo"
          name="codigo"
          value={codigo}
          onChange={(e) =>
            setCodigo(e.target.value.toUpperCase().replace(INVALIDOS, "").slice(0, MAX))
          }
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="go"
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? "codigo-erro" : undefined}
          placeholder="1234"
          className={`h-12 w-full rounded-lg border bg-surface text-center font-mono text-xl
            font-semibold tracking-[0.2em] text-ink outline-none
            transition-[border-color,box-shadow] duration-base ease-soft
            placeholder:font-normal placeholder:tracking-[0.2em] placeholder:text-faint
            ${
              erro
                ? "border-danger"
                : "border-line focus:border-brand-deep focus:shadow-[0_0_0_3px_rgb(15_168_188_/_0.16)]"
            }`}
        />

        {/* Reserva a altura de uma linha para o layout não pular quando o erro aparece. */}
        <p
          id="codigo-erro"
          role={erro ? "alert" : undefined}
          className="min-h-[18px] text-caption leading-snug text-danger"
        >
          {erro}
        </p>
      </div>

      <button
        type="submit"
        disabled={pendente || curto}
        className="h-11 rounded-lg bg-ink px-4 text-body-sm font-semibold text-white
          transition-opacity duration-fast ease-soft
          hover:opacity-90 active:opacity-80
          disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:opacity-30"
      >
        {pendente ? "Procurando…" : "Continuar"}
      </button>
    </form>
  );
}

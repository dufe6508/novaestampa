import Link from "next/link";
import { Funil } from "./icones";
import { Gaveta } from "./gaveta";

/**
 * Filtros do Financeiro: o intervalo de datas, e nada mais.
 *
 * Escola, campanha e turma saíram daqui quando cada cliente virou aba da própria
 * tela. Filtro que repete a navegação faz a mesma escolha existir em dois
 * lugares, e a pessoa nunca sabe qual dos dois está valendo.
 *
 * A lista de "há quanto tempo" também saiu. Ela decidia por quem estava olhando:
 * quem fecha o mês precisa de 1 a 31 de julho, não de "últimos 30 dias". Duas
 * datas respondem os dois casos, e o `input type="date"` é o calendário do
 * próprio sistema, traduzido e sem biblioteca.
 *
 * Formulário `GET` puro: o navegador monta a URL, a gaveta fecha ao enviar e o
 * endereço com o intervalo pode ser guardado e repetido.
 */

export function BotaoFiltros({ href, ativos }: { href: string; ativos: number }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-body-sm
        font-medium transition-colors duration-fast ease-soft
        ${
          ativos > 0
            ? "border-ink bg-ink text-white hover:opacity-90"
            : "border-line-strong bg-surface text-ink-2 hover:border-ink hover:text-ink"
        }`}
    >
      <Funil className="h-4 w-4" />
      Filtros
      {ativos > 0 && (
        <span
          data-nums
          className="flex size-5 items-center justify-center rounded-full bg-white/20 text-caption"
        >
          {ativos}
        </span>
      )}
    </Link>
  );
}

export function FiltroGaveta({
  fechar,
  de,
  ate,
  /** Campos da tela que precisam sobreviver ao envio (aba, modo, busca). */
  ocultos = {},
}: {
  fechar: string;
  de?: string;
  ate?: string;
  ocultos?: Record<string, string>;
}) {
  const base = fechar.split("?")[0];

  return (
    <Gaveta rotulo="Filtros do financeiro" titulo="Filtros" fechar={fechar}>
      <form action={base} method="get" className="flex flex-1 flex-col">
        {Object.entries(ocultos).map(([nome, valor]) => (
          <input key={nome} type="hidden" name={nome} value={valor} />
        ))}

        <fieldset className="flex flex-col gap-3 border-t border-line px-4 py-4">
          <legend className="text-body-sm font-semibold text-ink">Período</legend>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-caption font-semibold text-ink-2">Data inicial</span>
              <input
                type="date"
                name="de"
                defaultValue={de}
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-body-sm
                  text-ink outline-none transition-[border-color] duration-base ease-soft
                  focus:border-brand-deep [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-caption font-semibold text-ink-2">Data final</span>
              <input
                type="date"
                name="ate"
                defaultValue={ate}
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-body-sm
                  text-ink outline-none transition-[border-color] duration-base ease-soft
                  focus:border-brand-deep [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </label>
          </div>
        </fieldset>

        <div className="mt-auto flex gap-2 border-t border-line px-4 py-4">
          <Link
            href={base}
            scroll={false}
            className="inline-flex h-10 items-center justify-center rounded-md border
              border-line-strong bg-surface px-3.5 text-body-sm font-medium text-ink-2
              transition-colors duration-fast ease-soft hover:border-ink hover:text-ink"
          >
            Limpar
          </Link>
          <button
            type="submit"
            className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-ink
              px-3.5 text-body-sm font-semibold text-white transition-opacity duration-fast
              ease-soft hover:opacity-90 active:scale-[0.99] motion-reduce:active:scale-100"
          >
            Aplicar
          </button>
        </div>
      </form>
    </Gaveta>
  );
}

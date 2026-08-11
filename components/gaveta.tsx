import Link from "next/link";
import { X } from "./icones";

/**
 * Painel lateral. Abre por cima da lista, com o que está aberto na URL.
 *
 * Ser parâmetro de URL em vez de estado de componente resolve três coisas de
 * graça: o botão voltar fecha, o link pode ser mandado para outra pessoa, e a
 * lista atrás não perde filtro nem rolagem.
 *
 * A casca saiu do detalhe do pedido, que foi a primeira a existir, quando a
 * criação de cliente precisou do mesmo comportamento. Fundo, largura, sombra e
 * botão de fechar são decididos aqui uma vez; cada tela cuida só do miolo.
 */

export function Gaveta({
  rotulo,
  titulo,
  subtitulo,
  fechar,
  children,
}: {
  /** Nome da região para quem usa leitor de tela. */
  rotulo: string;
  titulo: string;
  subtitulo?: React.ReactNode;
  /** Para onde o fundo e o X levam: a mesma tela sem a gaveta. */
  fechar: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Fundo. É um link para o mesmo lugar sem a gaveta: clicar fora fecha. */}
      <Link
        href={fechar}
        scroll={false}
        aria-label="Fechar"
        className="fixed inset-0 z-40 bg-ink/15"
      />

      <aside
        aria-label={rotulo}
        className="surge fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l
          border-line bg-surface shadow-lift"
      >
        <header className="flex items-start justify-between gap-2 px-4 py-3.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="truncate text-h2">{titulo}</h2>
            {subtitulo && <p className="truncate text-caption text-muted">{subtitulo}</p>}
          </div>
          <Link
            href={fechar}
            scroll={false}
            aria-label="Fechar"
            className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-md
              text-muted transition-colors duration-fast ease-soft hover:bg-surface-2
              hover:text-ink"
          >
            <X className="h-4 w-4" />
          </Link>
        </header>

        <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
      </aside>
    </>
  );
}

import Link from "next/link";
import { TresPontos } from "./icones";

/**
 * Menu de três pontos, ao lado do lápis.
 *
 * O lápis é a ação de sempre e fica à mostra. Aqui dentro vai o resto, que é
 * raro e às vezes perigoso: arquivar, excluir, encerrar. Deixar tudo no cartão
 * transformaria uma lista de doze itens numa parede de botões.
 *
 * `details` nativo, mesma escolha do menu do celular: abre e fecha sem estado,
 * sem JavaScript, e continua sendo componente de servidor. O preço é não fechar
 * ao clicar fora, aceitável para um menu de três itens.
 *
 * O botão tem borda e cor de texto de verdade, não um cinza apagado. A versão
 * anterior era `text-faint` sem moldura: sumia no branco do cartão, e quem não
 * sabia que o menu existe não achava. Alvo de 36px, que é o mínimo confortável
 * no celular.
 *
 * ponytail: se um dia precisar fechar ao clicar fora ou navegar por setas, aí
 * vira ilha de cliente com `popover` nativo, que já existe nos navegadores.
 */

export function MenuAcoes({
  rotulo,
  children,
}: {
  /** Some no leitor de tela como "Mais ações de 3A", não como "botão". */
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group/menu relative open:z-30">
      <summary
        aria-label={rotulo}
        className="flex size-9 cursor-pointer list-none items-center justify-center rounded-md
          border border-line-strong bg-surface text-ink-2 transition-colors duration-fast
          ease-soft hover:border-ink hover:bg-surface-2 hover:text-ink focus-visible:outline
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep
          group-open/menu:border-ink group-open/menu:bg-ink group-open/menu:text-white
          [&::-webkit-details-marker]:hidden"
      >
        <TresPontos className="h-4 w-4" />
      </summary>

      <div
        className="surge absolute right-0 top-full z-20 mt-1 flex w-52 flex-col gap-0.5
          rounded-lg border border-line-strong bg-surface p-1 shadow-lift"
      >
        {children}
      </div>
    </details>
  );
}

/**
 * Botão de ícone ao lado do menu, hoje sempre o lápis.
 *
 * Mesma moldura do menu de três pontos de propósito: os dois ficam colados e,
 * sem borda nos dois, o par lia como um ícone e meio. Cor de texto de verdade,
 * não cinza apagado, porque editar é a ação mais usada da lista.
 */
export function AcaoIcone({
  href,
  rotulo,
  children,
}: {
  href: string;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-label={rotulo}
      className="flex size-9 items-center justify-center rounded-md border border-line-strong
        bg-surface text-ink-2 transition-colors duration-fast ease-soft hover:border-ink
        hover:bg-surface-2 hover:text-ink focus-visible:outline focus-visible:outline-2
        focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
    >
      {children}
    </Link>
  );
}

const ITEM =
  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body-sm font-medium " +
  "transition-colors duration-fast ease-soft focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:outline-offset-[-2px] focus-visible:outline-brand-deep";

const TOM = {
  normal: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  perigo: "text-danger hover:bg-danger-soft",
} as const;

export function ItemMenu({
  href,
  icone,
  tom = "normal",
  children,
}: {
  href: string;
  icone: React.ReactNode;
  tom?: keyof typeof TOM;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} scroll={false} className={`${ITEM} ${TOM[tom]}`}>
      <span className="shrink-0 text-muted">{icone}</span>
      {children}
    </Link>
  );
}

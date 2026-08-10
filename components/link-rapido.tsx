"use client";

/**
 * Link que troca a URL sem ir ao servidor.
 *
 * Serve à área de gestão, onde filtro, aba e detalhe do pedido são decisões
 * sobre dados que já estão na tela. Mandar cada uma delas ao servidor custava
 * uma ida e volta de rede para redesenhar o que não mudou, e era o que fazia o
 * painel parecer travado.
 *
 * `history.pushState` é entendido pelo App Router, que propaga a mudança para
 * `useSearchParams` sem refazer a página. Quem lê a URL reage; o servidor não é
 * incomodado.
 *
 * Continua sendo âncora com endereço real: o navegador mostra o destino na
 * barra de status, `ctrl`/`cmd` e o botão do meio abrem em outra aba, e sem
 * JavaScript o link ainda funciona, aí sim navegando. O `preventDefault` vale
 * só para o clique simples, que é o caminho que precisa ser instantâneo.
 */
export function LinkRapido({
  href,
  substituir = false,
  children,
  ...resto
}: React.ComponentProps<"a"> & {
  href: string;
  /** Troca a entrada atual do histórico em vez de empilhar uma nova. */
  substituir?: boolean;
}) {
  return (
    <a
      href={href}
      onClick={(e) => {
        // Deixa passar o que o usuário pediu explicitamente para abrir fora.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        if (substituir) window.history.replaceState(null, "", href);
        else window.history.pushState(null, "", href);
      }}
      {...resto}
    >
      {children}
    </a>
  );
}

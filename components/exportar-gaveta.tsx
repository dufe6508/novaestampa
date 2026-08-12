import { tamanhoLegivel } from "@/lib/formato";
import { Gaveta } from "./gaveta";

/**
 * Escolha do que vai para a planilha.
 *
 * O botão Exportar baixava sempre a grade inteira, uma aba por tamanho. Na mesa
 * de corte isso quase nunca é o que se quer: separa-se um tamanho por vez, e a
 * pessoa imprimia seis folhas para usar uma.
 *
 * Formulário `GET` puro, sem JavaScript: o navegador monta a URL de exportação e
 * a rota devolve o arquivo. Sem estado, sem `onChange`, sem ilha de cliente, e o
 * endereço gerado pode ser guardado e repetido.
 *
 * Nada marcado quer dizer a grade inteira. É o comportamento antigo, que
 * continua sendo o mais comum, e evita um botão de rádio a mais só para dizer
 * "tudo".
 */
export function ExportarGaveta({
  grupoId,
  produto,
  busca,
  tamanhos,
  fechar,
}: {
  grupoId: string;
  /** Produto da aba aberta. Vai junto: um arquivo por produto. */
  produto?: string;
  busca?: string;
  /** Tamanhos que existem nesta lista, na ordem da grade, com a contagem. */
  tamanhos: { tamanho: string; total: number }[];
  fechar: string;
}) {
  const total = tamanhos.reduce((n, t) => n + t.total, 0);

  return (
    <Gaveta
      rotulo="Exportar lista de produção"
      titulo="Exportar"
      subtitulo={
        produto
          ? `${produto} · ${total} ${total === 1 ? "Peça" : "Peças"}`
          : `${total} ${total === 1 ? "Peça" : "Peças"}`
      }
      fechar={fechar}
    >
      <form action={`/exportar/${grupoId}`} className="flex flex-1 flex-col">
        {produto && <input type="hidden" name="produto" value={produto} />}
        {busca && <input type="hidden" name="q" value={busca} />}

        <fieldset className="flex flex-1 flex-col gap-3 border-t border-line px-4 py-4">
          <legend className="sr-only">Tamanhos</legend>
          <p className="text-body-sm text-ink-2">
            Marque os tamanhos que vão para a folha. Sem marcar nenhum, sai a grade inteira,
            uma aba por tamanho.
          </p>

          <ul className="grid grid-cols-2 gap-1.5">
            {tamanhos.map((t) => (
              <li key={t.tamanho}>
                {/*
                  O rótulo inteiro é o alvo, com 44px de altura: quem exporta
                  costuma estar no celular, em pé na oficina.
                */}
                <label
                  className="flex h-11 cursor-pointer items-center gap-2.5 rounded-md border
                    border-line bg-surface px-3 transition-colors duration-fast ease-soft
                    hover:border-line-strong hover:bg-surface-2
                    has-[:checked]:border-ink has-[:checked]:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    name="tamanho"
                    value={t.tamanho}
                    className="size-4 shrink-0 accent-ink"
                  />
                  <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-ink">
                    {tamanhoLegivel(t.tamanho)}
                  </span>
                  <span data-nums className="shrink-0 text-caption text-muted">
                    {t.total}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="mt-auto border-t border-line px-4 py-3">
          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-ink
              px-4 text-body-sm font-semibold text-white transition-[opacity,transform]
              duration-fast ease-soft hover:opacity-90 active:scale-[0.985]
              motion-reduce:active:scale-100"
          >
            Baixar planilha
          </button>
        </div>
      </form>
    </Gaveta>
  );
}

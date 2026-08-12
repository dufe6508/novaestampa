import { Gaveta } from "./gaveta";

type TurmaExportavel = {
  id: string;
  nome: string;
  codigo: string;
  pecas: number;
};

/** Seleção das turmas incluídas na planilha consolidada da campanha. */
export function ExportarCampanhaGaveta({
  campanhaId,
  campanha,
  labelGrupoPlural,
  turmas,
  fechar,
}: {
  campanhaId: string;
  campanha: string;
  labelGrupoPlural: string;
  turmas: TurmaExportavel[];
  fechar: string;
}) {
  const total = turmas.reduce((soma, turma) => soma + turma.pecas, 0);

  return (
    <Gaveta
      rotulo="Exportar listas de produção"
      titulo="Exportar produção"
      subtitulo={`${campanha} · ${total} ${total === 1 ? "Peça" : "Peças"}`}
      fechar={fechar}
    >
      <form action={`/exportar/campanha/${campanhaId}`} className="flex flex-1 flex-col">
        <fieldset className="flex flex-1 flex-col gap-3 border-t border-line px-4 py-4">
          <legend className="sr-only">{labelGrupoPlural} para exportar</legend>
          <div className="flex flex-col gap-1">
            <h2 className="text-body-sm font-semibold text-ink">Selecione as turmas</h2>
            <p className="text-caption leading-relaxed text-muted">
              Cada turma será separada por produto e tamanho. Sem marcar nenhuma, todas as
              turmas com peças liberadas serão incluídas.
            </p>
          </div>

          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line">
            {turmas.map((turma) => (
              <li key={turma.id}>
                <label
                  className="flex min-h-12 cursor-pointer items-center gap-3 bg-surface px-3
                    transition-colors duration-fast ease-soft hover:bg-surface-2
                    has-[:checked]:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    name="grupo"
                    value={turma.id}
                    className="size-4 shrink-0 accent-ink"
                  />
                  <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-ink">
                    {turma.nome}
                  </span>
                  <span className="shrink-0 font-mono text-caption tracking-wider text-muted">
                    {turma.codigo}
                  </span>
                  <span data-nums className="w-16 shrink-0 text-right text-caption text-muted">
                    {turma.pecas} {turma.pecas === 1 ? "Peça" : "Peças"}
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

import {
  Bloco,
  Esqueleto,
  KpisEsqueleto,
  TabelaEsqueleto,
  TopoEsqueleto,
} from "@/components/esqueleto";

/** E3 · Campanha. Números, listas de cobrança e a tabela de turmas. */
export default function Carregando() {
  return (
    <Esqueleto>
      <TopoEsqueleto />
      <KpisEsqueleto />

      <div className="grid gap-3 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg border border-line bg-surface">
            <div className="border-b border-line px-4 py-3">
              <Bloco className="h-4 w-32" />
            </div>
            <div className="flex flex-col gap-3 px-4 py-4">
              <Bloco className="h-6 w-48" />
              <Bloco className="h-1.5 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-line bg-surface">
            <div className="border-b border-line px-4 py-3">
              <Bloco className="h-4 w-36" />
            </div>
            <div className="divide-y divide-line">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="flex items-center justify-between gap-3 px-4 py-3">
                  <Bloco className="h-4 flex-1" />
                  <Bloco className="h-4 w-16 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <TabelaEsqueleto linhas={6} />
    </Esqueleto>
  );
}

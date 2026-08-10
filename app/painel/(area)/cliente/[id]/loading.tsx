import { Bloco, Esqueleto, KpisEsqueleto, TopoEsqueleto } from "@/components/esqueleto";

/** E2 · Cliente. KPIs e os cards de campanha. */
export default function Carregando() {
  return (
    <Esqueleto>
      <TopoEsqueleto />
      <KpisEsqueleto />

      <div className="grid gap-3 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <Bloco className="h-5 w-48" />
                <Bloco className="h-3 w-32" />
              </div>
              <Bloco className="h-6 w-20 rounded-full" />
            </div>
            <Bloco className="h-1.5 w-full rounded-full" />
            <div className="grid grid-cols-3 gap-3 border-t border-line pt-3">
              <Bloco className="h-8" />
              <Bloco className="h-8" />
              <Bloco className="h-8" />
            </div>
          </div>
        ))}
      </div>
    </Esqueleto>
  );
}

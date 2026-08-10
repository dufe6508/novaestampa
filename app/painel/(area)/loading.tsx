import { Bloco, Esqueleto, TopoEsqueleto } from "@/components/esqueleto";

/** E1 · Clientes. Grade de cards. */
export default function Carregando() {
  return (
    <Esqueleto>
      <TopoEsqueleto comMigalha={false} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <Bloco className="h-5 w-40" />
                <Bloco className="h-3 w-24" />
              </div>
              <Bloco className="h-6 w-24 rounded-sm" />
            </div>
            <Bloco className="h-1.5 w-full rounded-full" />
            <div className="grid grid-cols-2 gap-3 border-t border-line pt-3">
              <Bloco className="h-8" />
              <Bloco className="h-8" />
            </div>
          </div>
        ))}
      </div>
    </Esqueleto>
  );
}

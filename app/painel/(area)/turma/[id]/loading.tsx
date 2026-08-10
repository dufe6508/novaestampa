import { Bloco, Esqueleto, TabelaEsqueleto, TopoEsqueleto } from "@/components/esqueleto";

/** E4 · Turma. Abas, filtros e a planilha. */
export default function Carregando() {
  return (
    <Esqueleto>
      <TopoEsqueleto />

      <div className="flex items-end justify-between gap-4 border-b border-line pb-2">
        <div className="flex items-center gap-4">
          <Bloco className="h-5 w-20" />
          <Bloco className="h-5 w-20" />
        </div>
        <Bloco className="h-10 w-full max-w-xs rounded-lg" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Bloco key={i} className="h-8 w-24" />
        ))}
      </div>

      <TabelaEsqueleto linhas={10} />
    </Esqueleto>
  );
}

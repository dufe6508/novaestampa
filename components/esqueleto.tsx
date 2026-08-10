/**
 * Esqueletos da área de gestão.
 *
 * Existem por um motivo só: sem `loading.tsx`, o App Router segura a navegação
 * inteira até o servidor responder, e a tela antiga fica congelada sem nenhum
 * sinal. O clique parece não ter funcionado, e a pessoa clica de novo.
 *
 * Cada esqueleto tem a forma do conteúdo que vai chegar, não um spinner solto:
 * o layout não pula quando os dados entram, e a espera parece mais curta do que
 * é. Mesma escolha que já valia na área do aluno.
 */

export function Bloco({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-2 ${className}`} />;
}

/** Casca comum: marca a região como ocupada para quem usa leitor de tela. */
export function Esqueleto({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando</span>
      {children}
    </div>
  );
}

/** Título e subtítulo do topo de qualquer tela do painel. */
export function TopoEsqueleto({ comMigalha = true }: { comMigalha?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {comMigalha && <Bloco className="h-3 w-64" />}
      <div className="flex flex-col gap-2">
        <Bloco className="h-8 w-56" />
        <Bloco className="h-4 w-72" />
      </div>
    </div>
  );
}

/** Faixa de quatro números. Mesma altura da `Kpis` de verdade. */
export function KpisEsqueleto() {
  return (
    <div className="grid grid-cols-2 rounded-lg border border-line bg-surface sm:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2 px-4 py-3.5">
          <Bloco className="h-3 w-16" />
          <Bloco className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Tabela densa. `linhas` acompanha o tamanho típico da lista real. */
export function TabelaEsqueleto({ linhas = 8 }: { linhas?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="border-b border-line bg-surface-2 px-3.5 py-3">
        <Bloco className="h-3 w-40" />
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: linhas }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-3.5 py-3">
            <Bloco className="h-4 w-6 shrink-0" />
            <Bloco className="h-4 flex-1" />
            <Bloco className="hidden h-4 w-24 sm:block" />
            <Bloco className="h-4 w-16 shrink-0" />
            <Bloco className="h-5 w-16 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

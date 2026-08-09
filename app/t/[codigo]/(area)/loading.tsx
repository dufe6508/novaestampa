/**
 * Esqueleto das abas.
 *
 * Tem a forma do conteúdo que vai chegar, não um spinner solto: o layout não
 * pula quando os dados entram, e a espera parece mais curta do que é.
 */

function Bloco({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-2 ${className}`} />;
}

export default function Carregando() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando</span>

      <div className="flex flex-col gap-2">
        <Bloco className="h-7 w-52" />
        <Bloco className="h-4 w-36" />
      </div>

      <Bloco className="h-16 w-full rounded-xl" />

      <div className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex gap-4">
              <Bloco className="size-16 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Bloco className="h-5 w-40" />
                <Bloco className="h-4 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

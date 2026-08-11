import { Grafico } from "@/components/icones";
import { Topo } from "@/components/painel";

/**
 * Relatório financeiro. O destino existe, mas o desenho fica para a conversa
 * dedicada a ele. Número provisório aqui seria confundido com dado real.
 */
export default function Financeiro() {
  return (
    <>
      <Topo
        titulo="Financeiro"
        subtitulo="Relatório completo por cliente, campanha e turma."
      />

      <section
        className="entra flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg
          border border-dashed border-line-strong bg-surface px-6 py-12 text-center"
      >
        <Grafico className="h-8 w-8 text-faint" />
        <h2 className="text-h3">Relatório reservado para a próxima etapa</h2>
        <p className="max-w-lg text-body-sm text-muted">
          Esta tela será planejada com calma antes de receber filtros, indicadores ou
          comparações. Assim, nenhum formato provisório vira decisão por acidente.
        </p>
      </section>
    </>
  );
}

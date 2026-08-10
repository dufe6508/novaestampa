import { Suspense } from "react";
import { carregarTurma } from "@/lib/painel";
import type { CampanhaResumo, GrupoResumo } from "@/lib/planilha";
import { PlanilhaCliente } from "./planilha-cliente";
import { TabelaEsqueleto } from "./esqueleto";

export type { QueryPlanilha } from "./planilha-cliente";
export { montarUrl } from "./planilha-cliente";

/**
 * A planilha da turma, pelo lado do servidor: busca os dados e entrega.
 *
 * Toda a interação (aba, sub-aba, filtro, busca, abrir e fechar pedido) mora em
 * `PlanilhaCliente`, e o motivo está documentado lá: são operações sobre dados
 * que já estão na tela, e mandá-las ao servidor só acrescentava a espera da
 * rede. Aqui ficou o que de fato precisa do banco.
 *
 * Este componente não lê `searchParams` de propósito. Se lesse, cada clique
 * teria que voltar ao servidor para manter as duas versões de acordo, que é
 * exatamente o que se quis eliminar. A página é desenhada uma vez, e a URL
 * passa a ser assunto do navegador.
 *
 * O `Suspense` é o que permite ao restante da tela (cabeçalho, números da
 * turma) aparecer antes de a lista chegar, em vez de tudo esperar junto.
 */
export function PlanilhaTurma({
  grupo,
  campanha,
  base,
}: {
  grupo: GrupoResumo;
  campanha: CampanhaResumo;
  /** Endereço desta lista. Todo link é montado em cima dele. */
  base: string;
}) {
  return (
    <Suspense fallback={<TabelaEsqueleto linhas={10} />}>
      <Lista grupo={grupo} campanha={campanha} base={base} />
    </Suspense>
  );
}

async function Lista({
  grupo,
  campanha,
  base,
}: {
  grupo: GrupoResumo;
  campanha: CampanhaResumo;
  base: string;
}) {
  const pedidos = await carregarTurma(grupo.id);

  return (
    <PlanilhaCliente
      grupo={grupo}
      campanha={campanha}
      base={base}
      pedidos={pedidos}
    />
  );
}

import { notFound } from "next/navigation";
import { buscarTurmaPorCodigo, pct } from "@/lib/painel";
import { reais } from "@/lib/formato";
import { Kpi, Kpis } from "@/components/painel";
import { PlanilhaTurma, type QueryPlanilha } from "@/components/planilha-turma";

/**
 * Gestão da turma · a tela do representante.
 *
 * O escopo é a turma dele e para por aí. Não existe lista de clientes, não
 * existe outra campanha, não existe turma vizinha: quem chega aqui chegou pelo
 * código de uma turma só, e o código é o limite do que ele enxerga.
 *
 * Não há adesão. Ela dependia de alguém informar quantos alunos a turma tem,
 * e ninguém informou. Medir "faltam 30 de 32" com um número inventado é pior
 * que não medir. O que entra no lugar é o que os próprios pedidos respondem:
 * quantos já foram pagos por inteiro.
 *
 * Ressalva registrada: no protótipo, quem abre esta tela também dá baixa em
 * pagamento e mexe no estado de produção. O representante do produto final
 * cobra mas não baixa pagamento. Enquanto não houver papel de verdade no
 * banco, separar isso seria só esconder botão.
 */

export default async function Gestao({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<QueryPlanilha>;
}) {
  const { codigo } = await params;
  const query = await searchParams;

  const turma = await buscarTurmaPorCodigo(codigo);
  if (!turma) notFound();

  const { grupo, campanha } = turma;

  return (
    <div className="flex flex-col gap-5">
      <header className="entra flex flex-col gap-0.5">
        <h1>
          {campanha.label_grupo} {grupo.nome}
        </h1>
        <p className="text-caption text-muted">
          {campanha.nome} · {campanha.cliente_nome}
        </p>
      </header>

      <div className="entra" style={{ "--atraso": "40ms" } as React.CSSProperties}>
        <Kpis>
          <Kpi
            rotulo="Pedidos"
            valor={String(grupo.pedidos)}
            nota={`${grupo.alunos_com_pedido} ${
              grupo.alunos_com_pedido === 1 ? "Aluno" : "Alunos"
            }`}
          />
          <Kpi
            rotulo="Quitados"
            valor={`${pct(grupo.pedidos_pagos, grupo.pedidos)}%`}
            nota={`${grupo.pedidos_pagos} de ${grupo.pedidos} pedidos`}
          />
          <Kpi
            rotulo="Recebido"
            valor={reais(grupo.recebido_centavos)}
            nota={`de ${reais(grupo.vendido_centavos)}`}
          />
          <Kpi
            rotulo="Em atraso"
            valor={reais(grupo.atrasado_centavos)}
            tom={grupo.atrasado_centavos > 0 ? "alerta" : "normal"}
            nota={
              grupo.pedidos_atrasados > 0
                ? `${grupo.pedidos_atrasados} ${
                    grupo.pedidos_atrasados === 1 ? "Pedido vencido" : "Pedidos vencidos"
                  }`
                : "nada vencido"
            }
          />
        </Kpis>
      </div>

      <PlanilhaTurma
        grupo={grupo}
        campanha={campanha}
        base={`/t/${codigo}/gestao`}
        query={query}
      />
    </div>
  );
}

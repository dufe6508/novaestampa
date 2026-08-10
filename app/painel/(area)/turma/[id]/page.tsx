import { notFound } from "next/navigation";
import { buscarTurmaPainel, pct } from "@/lib/painel";
import { Topo } from "@/components/painel";
import { PlanilhaTurma, type QueryPlanilha } from "@/components/planilha-turma";

/**
 * E4 · Turma, pelo lado da empresa.
 *
 * Só o cabeçalho é daqui: a trilha até o cliente e a campanha, que é o caminho
 * que só a empresa percorre. A lista em si é a mesma que o representante vê em
 * `/t/[codigo]/gestao`, e mora em `PlanilhaTurma`.
 */

export default async function Turma({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<QueryPlanilha>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const turma = await buscarTurmaPainel(id);
  if (!turma) notFound();

  const { grupo, campanha } = turma;

  return (
    <>
      <Topo
        migalha={[
          { texto: "Clientes", href: "/painel" },
          { texto: campanha.cliente_nome, href: `/painel/cliente/${campanha.cliente_id}` },
          { texto: campanha.nome, href: `/painel/campanha/${campanha.id}` },
          { texto: `${campanha.label_grupo} ${grupo.nome}` },
        ]}
        titulo={`${campanha.label_grupo} ${grupo.nome}`}
        subtitulo={
          <span data-nums>
            {grupo.pedidos} {grupo.pedidos === 1 ? "pedido" : "pedidos"} ·{" "}
            {grupo.alunos_com_pedido} {grupo.alunos_com_pedido === 1 ? "aluno" : "alunos"} ·{" "}
            {grupo.pedidos_pagos} quitados ({pct(grupo.pedidos_pagos, grupo.pedidos)}%) · código{" "}
            <span className="font-mono tracking-wider text-ink-2">{grupo.codigo}</span>
          </span>
        }
      />

      <PlanilhaTurma
        grupo={grupo}
        campanha={campanha}
        base={`/painel/turma/${id}`}
        query={query}
      />
    </>
  );
}

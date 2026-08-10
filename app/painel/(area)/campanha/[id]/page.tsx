import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buscarCampanha,
  data,
  listarGrupos,
  listarPedidosDaCampanha,
  pct,
  resumoDeCorte,
  type PedidoPainel,
} from "@/lib/painel";
import { reais } from "@/lib/formato";
import { Barra, Bloco, Kpi, Kpis, Topo, Valor } from "@/components/painel";
import { Seta } from "@/components/icones";

/**
 * E3 · Campanha. A tela de acompanhamento.
 *
 * Ordem das seções é a ordem das perguntas: quanto entrou, quanto falta, quem
 * precisa ser cobrado hoje, como está cada turma, e o que a oficina tem para
 * cortar. O bloco de cobrança vem antes da tabela de turmas de propósito: é o
 * único que exige ação, e ação não pode ficar depois de dado.
 */

const STATUS: Record<string, { texto: string; classe: string }> = {
  rascunho: { texto: "Rascunho", classe: "bg-surface-2 text-muted" },
  aberta: { texto: "Aberta", classe: "bg-success-soft text-success" },
  encerrada: { texto: "Encerrada", classe: "bg-surface-2 text-ink-2" },
  concluida: { texto: "Concluída", classe: "bg-surface-2 text-muted" },
};

/** Uma linha da lista de cobrança. Nome, turma, quanto deve, e o caminho até ele. */
function LinhaCobranca({
  pedido,
  turma,
}: {
  pedido: PedidoPainel & { grupo_nome: string };
  turma: string;
}) {
  return (
    <li>
      <Link
        href={`/painel/turma/${pedido.grupo_id}?pedido=${pedido.id}`}
        className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors
          duration-fast ease-soft hover:bg-surface-2"
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-body-sm font-medium text-ink">
            {pedido.aluno_nome}
          </span>
          <span className="truncate text-caption text-muted">
            {turma} {pedido.grupo_nome} · {pedido.produto_nome_snapshot}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-body-sm">
          <Valor
            centavos={pedido.saldo_centavos}
            tom={pedido.status_pagamento === "atrasado" ? "alerta" : "forte"}
          />
          <Seta className="h-3.5 w-3.5 text-faint" />
        </span>
      </Link>
    </li>
  );
}

function ListaCobranca({
  titulo,
  explica,
  pedidos,
  turma,
  atraso,
}: {
  titulo: string;
  explica: string;
  pedidos: (PedidoPainel & { grupo_nome: string })[];
  turma: string;
  atraso: number;
}) {
  const mostrados = pedidos.slice(0, 6);

  return (
    <Bloco
      titulo={titulo}
      atraso={atraso}
      acao={
        <span data-nums className="text-caption font-semibold text-ink-2">
          {pedidos.length}
        </span>
      }
    >
      <p className="border-b border-line px-4 py-2 text-caption text-muted">{explica}</p>
      {pedidos.length === 0 ? (
        <p className="px-4 py-6 text-center text-caption text-muted">
          Ninguém nesta situação.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {mostrados.map((p) => (
              <LinhaCobranca key={p.id} pedido={p} turma={turma} />
            ))}
          </ul>
          {pedidos.length > mostrados.length && (
            <p className="border-t border-line px-4 py-2 text-caption text-muted">
              e mais {pedidos.length - mostrados.length}, abra a turma para ver a lista
              inteira
            </p>
          )}
        </>
      )}
    </Bloco>
  );
}

export default async function Campanha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campanha = await buscarCampanha(id);
  if (!campanha) notFound();

  const [grupos, pedidos, corte] = await Promise.all([
    listarGrupos(id),
    listarPedidosDaCampanha(id),
    resumoDeCorte("campanha_id", id),
  ]);

  const marca = STATUS[campanha.status] ?? STATUS.rascunho;

  // As três listas de cobrança. São exclusivas entre si de propósito: a mesma
  // pessoa aparecendo em duas listas faria a soma das listas mentir.
  const porSaldo = (a: PedidoPainel, b: PedidoPainel) => b.saldo_centavos - a.saldo_centavos;
  const atrasados = pedidos.filter((p) => p.status_pagamento === "atrasado").sort(porSaldo);
  const faltaSegunda = pedidos
    .filter((p) => p.status_pagamento === "parcial")
    .sort(porSaldo);
  const semPagamento = pedidos
    .filter((p) => p.status_pagamento === "pendente")
    .sort(porSaldo);

  const prazos = [
    { rotulo: "Pedidos até", valor: campanha.prazo_pedidos },
    { rotulo: "Alterações até", valor: campanha.prazo_alteracoes },
    { rotulo: "Entrega prevista", valor: campanha.entrega_prevista },
  ].filter((p) => p.valor);

  return (
    <>
      <Topo
        migalha={[
          { texto: "Clientes", href: "/painel" },
          { texto: campanha.cliente_nome, href: `/painel/cliente/${campanha.cliente_id}` },
          { texto: campanha.nome },
        ]}
        titulo={campanha.nome}
        subtitulo={
          <span data-nums>
            {campanha.grupos}{" "}
            {campanha.grupos === 1 ? campanha.label_grupo : campanha.label_grupo_plural} ·{" "}
            {campanha.pedidos} {campanha.pedidos === 1 ? "pedido" : "pedidos"} · entrada de{" "}
            {campanha.percentual_entrada}%
          </span>
        }
        acoes={
          <span
            className={`rounded-full px-2.5 py-1 text-caption font-semibold ${marca.classe}`}
          >
            {marca.texto}
          </span>
        }
      />

      <div className="entra" style={{ "--atraso": "40ms" } as React.CSSProperties}>
        <Kpis>
          <Kpi rotulo="Vendido" valor={reais(campanha.vendido_centavos)} />
          <Kpi
            rotulo="Recebido"
            valor={reais(campanha.recebido_centavos)}
            nota={`${pct(campanha.recebido_centavos, campanha.vendido_centavos)}% do vendido`}
          />
          <Kpi rotulo="A receber" valor={reais(campanha.a_receber_centavos)} />
          <Kpi
            rotulo="Em atraso"
            valor={reais(campanha.atrasado_centavos)}
            tom={campanha.atrasado_centavos > 0 ? "alerta" : "normal"}
            nota={
              campanha.pedidos_atrasados > 0
                ? `${campanha.pedidos_atrasados} ${
                    campanha.pedidos_atrasados === 1 ? "pedido" : "pedidos"
                  }`
                : "nada vencido"
            }
          />
        </Kpis>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Bloco titulo="Recebimento" atraso={80}>
          <div className="flex flex-col gap-3 px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body-sm text-muted">
                <Valor centavos={campanha.recebido_centavos} tom="forte" /> de{" "}
                <Valor centavos={campanha.vendido_centavos} />
              </span>
              <span data-nums className="text-num font-semibold">
                {pct(campanha.recebido_centavos, campanha.vendido_centavos)}%
              </span>
            </div>
            <Barra
              parte={campanha.recebido_centavos}
              total={campanha.vendido_centavos}
              tom="success"
            />
          </div>
          {prazos.length > 0 && (
            <dl className="grid grid-cols-3 divide-x divide-line border-t border-line">
              {prazos.map((p) => (
                <div key={p.rotulo} className="flex flex-col gap-0.5 px-4 py-3">
                  <dt className="label text-muted">{p.rotulo}</dt>
                  <dd data-nums className="text-body-sm font-semibold">
                    {data(p.valor)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Bloco>

        {/* Pedidos quitados, não adesão. Adesão exigiria saber quantos alunos a
            turma tem, e ninguém informou esse número. Isto aqui os próprios
            pedidos respondem. */}
        <Bloco titulo="Pedidos quitados" atraso={80}>
          <div className="flex flex-col gap-3 px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body-sm text-muted">
                <strong data-nums className="font-semibold text-ink">
                  {campanha.pedidos_pagos}
                </strong>{" "}
                de {campanha.pedidos} pedidos, de {campanha.alunos_com_pedido} alunos
              </span>
              <span data-nums className="text-num font-semibold">
                {pct(campanha.pedidos_pagos, campanha.pedidos)}%
              </span>
            </div>
            <Barra parte={campanha.pedidos_pagos} total={campanha.pedidos} />
            <p className="text-caption leading-relaxed text-muted">
              Quem pediu duas peças conta como um aluno e dois pedidos. A conta de aluno é por
              nome, a de dinheiro é por pedido.
            </p>
          </div>
        </Bloco>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ListaCobranca
          titulo="Em atraso"
          explica="Venceu e ainda tem saldo. É a fila de cobrança de hoje."
          pedidos={atrasados}
          turma={campanha.label_grupo}
          atraso={120}
        />
        <ListaCobranca
          titulo="Falta a segunda parcela"
          explica="Pagou a entrada, ainda deve o resto. Vence na entrega."
          pedidos={faltaSegunda}
          turma={campanha.label_grupo}
          atraso={160}
        />
        <ListaCobranca
          titulo="Não pagou nada"
          explica="Pediu e não pagou. Não entra na produção enquanto isso."
          pedidos={semPagamento}
          turma={campanha.label_grupo}
          atraso={200}
        />
      </div>

      <Bloco titulo={campanha.label_grupo_plural} atraso={240}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-left">
                <th className="label px-4 py-2 text-muted">{campanha.label_grupo}</th>
                <th className="label px-3 py-2 text-muted">Código</th>
                <th className="label px-3 py-2 text-right text-muted">Pedidos</th>
                <th className="label px-3 py-2 text-right text-muted">Alunos</th>
                <th className="label px-3 py-2 text-right text-muted">Quitados</th>
                <th className="label px-3 py-2 text-right text-muted">Vendido</th>
                <th className="label px-3 py-2 text-right text-muted">Recebido</th>
                <th className="label px-3 py-2 text-right text-muted">A receber</th>
                <th className="label px-4 py-2 text-right text-muted">Em atraso</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => (
                <tr
                  key={g.id}
                  className="border-b border-line last:border-0 transition-colors
                    duration-fast ease-soft hover:bg-surface-2"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/painel/turma/${g.id}`}
                      className="font-semibold text-ink underline-offset-2 hover:underline"
                    >
                      {g.nome}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-caption tracking-wider text-muted">
                    {g.codigo}
                  </td>
                  <td data-nums className="px-3 py-2.5 text-right text-ink-2">
                    {g.pedidos}
                  </td>
                  <td data-nums className="px-3 py-2.5 text-right text-ink-2">
                    {g.alunos_com_pedido}
                  </td>
                  <td data-nums className="px-3 py-2.5 text-right">
                    <span className="text-ink-2">{g.pedidos_pagos}</span>{" "}
                    <span className="font-semibold text-ink">
                      {g.pedidos ? `${pct(g.pedidos_pagos, g.pedidos)}%` : ""}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Valor centavos={g.vendido_centavos} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Valor centavos={g.recebido_centavos} tom="forte" />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Valor centavos={g.a_receber_centavos} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Valor
                      centavos={g.atrasado_centavos}
                      tom={g.atrasado_centavos > 0 ? "alerta" : "normal"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bloco>

      {corte.length > 0 && (
        <Bloco titulo="Resumo de corte" atraso={280}>
          <p className="border-b border-line px-4 py-2 text-caption text-muted">
            Só peça liberada para produção. Peça não paga não vira corte.
          </p>
          <div className="grid gap-x-6 gap-y-1 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(
              corte.reduce<Record<string, typeof corte>>((acc, l) => {
                (acc[l.produto] ??= []).push(l);
                return acc;
              }, {}),
            ).map(([produto, linhas]) => (
              <div key={produto} className="flex flex-col gap-1 py-2">
                <p className="text-body-sm font-semibold">{produto}</p>
                <p data-nums className="text-caption leading-relaxed text-ink-2">
                  {linhas
                    .reduce<{ tamanho: string; total: number }[]>((acc, l) => {
                      const j = acc.find((x) => x.tamanho === l.tamanho);
                      if (j) j.total += l.total;
                      else acc.push({ tamanho: l.tamanho, total: l.total });
                      return acc;
                    }, [])
                    .map((t) => `${t.tamanho} ${t.total}`)
                    .join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </Bloco>
      )}
    </>
  );
}

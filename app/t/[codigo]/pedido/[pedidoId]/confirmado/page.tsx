import { notFound, redirect } from "next/navigation";
import { buscarTurma, dia, meusPedidos, tamanhoLegivel } from "@/lib/aluno";
import { sessao } from "@/lib/sessao";
import { reais } from "@/lib/supabase";
import { BotaoLink, Linha } from "@/components/campos";
import { Certo } from "@/components/icones";
import { SeloProducao } from "@/components/selo";

/**
 * Confirmado · A7.
 *
 * Duas coisas em pé de igualdade: o comprovante, e o que acontece agora. A
 * segunda evita a pergunta que o representante ia receber no WhatsApp.
 */

export default async function Confirmado({
  params,
}: {
  params: Promise<{ codigo: string; pedidoId: string }>;
}) {
  const { codigo, pedidoId } = await params;

  const turma = await buscarTurma(codigo);
  if (!turma) notFound();

  const aluno = await sessao();
  if (!aluno) redirect(`/t/${turma.codigo}/entrar`);

  const pedido = (await meusPedidos(aluno.id, turma.codigo)).find((p) => p.id === pedidoId);
  if (!pedido) notFound();

  const emAberto = pedido.parcelas.find((p) => p.saldo > 0);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 pb-12 pt-10">
      <header className="entra flex flex-col items-center gap-4 text-center">
        <span
          className="surge flex size-14 items-center justify-center rounded-full bg-success-soft
            text-success"
        >
          <Certo className="h-7 w-7" />
        </span>
        <div className="flex flex-col gap-2">
          <h1>{pedido.saldo > 0 ? "Uniforme confirmado" : "Pedido quitado"}</h1>

          {/* O valor pago em destaque: é o comprovante, e é o que o aluno
              mostra para o representante quando cobram dele. */}
          <p
            data-nums
            className="inline-flex items-center gap-2 self-center rounded-full bg-success-soft
              px-3.5 py-1.5 text-body-sm font-semibold text-success"
          >
            <Certo className="h-4 w-4" />
            Pago {reais(pedido.pago)}
            {pedido.saldo > 0 && (
              <span className="font-normal opacity-80">De {reais(pedido.valor)}</span>
            )}
          </p>

          <p className="text-body-sm leading-relaxed text-muted">
            {pedido.saldo > 0
              ? "Sua peça está confirmada e entrou na fila de produção."
              : "Nada a pagar na entrega. Sua peça está confirmada."}
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-h3">{pedido.produto}</h2>
            <p className="text-caption text-muted">
              {turma.cliente_nome} · {turma.label_grupo} {turma.grupo_nome}
            </p>
          </div>
          <SeloProducao status={pedido.status_producao} />
        </div>

        <ul className="flex flex-col gap-1 border-t border-line pt-3 text-body-sm">
          {pedido.itens.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span className="min-w-0 break-words text-ink">{i.nome_estampa}</span>
              <span className="shrink-0 text-muted">Tamanho {tamanhoLegivel(i.tamanho)}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <Linha rotulo="Valor do pedido" valor={reais(pedido.valor)} />
          <Linha rotulo="Já pago" valor={reais(pedido.pago)} forte />
          {pedido.saldo > 0 && (
            <Linha
              rotulo={
                emAberto?.vencimento ? `Falta, até ${dia(emAberto.vencimento)}` : "Falta"
              }
              valor={reais(pedido.saldo)}
            />
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-xl bg-surface-2 p-5">
        <h2 className="text-h3">O que acontece agora</h2>
        <ol className="flex list-inside list-decimal flex-col gap-1.5 text-body-sm text-ink-2">
          <li>Sua peça entra na lista de produção da {turma.label_grupo.toLowerCase()}.</li>
          {turma.prazo_alteracoes && (
            <li>
              Alterações de tamanho e nome até{" "}
              <strong className="font-semibold text-ink">
                {dia(turma.prazo_alteracoes)}
              </strong>
              . A produção inicia após essa data.
            </li>
          )}
          {pedido.saldo > 0 && (
            <li>
              O restante,{" "}
              <strong className="font-semibold text-ink">{reais(pedido.saldo)}</strong>, você
              paga pela Carteira
              {turma.entrega_prevista ? ` até ${dia(turma.entrega_prevista)}` : ""}.
            </li>
          )}
          <li>
            {turma.entrega_prevista
              ? `A entrega está prevista para ${dia(turma.entrega_prevista)}.`
              : "A data de entrega é avisada pela escola."}
          </li>
        </ol>
      </section>

      <div className="flex flex-col gap-2">
        <BotaoLink href={`/t/${turma.codigo}/pedidos`}>Ver meus pedidos</BotaoLink>
        <BotaoLink href={`/t/${turma.codigo}/loja`} tom="fantasma">
          Voltar para a loja
        </BotaoLink>
      </div>
    </main>
  );
}

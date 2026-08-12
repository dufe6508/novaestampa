import { notFound, redirect } from "next/navigation";
import { buscarTurma, dia, diasAte, meusPedidos } from "@/lib/aluno";
import { sessao } from "@/lib/sessao";
import { reais } from "@/lib/supabase";
import { BotaoLink } from "@/components/campos";

/**
 * Informações da turma. Abre pelo card do trilho lateral e pelo cabeçalho.
 *
 * Junta num lugar só o que estava espalhado em avisos de rodapé: quem é o
 * cliente, quais são as datas, e o que cada data significa. É a tela que o
 * aluno abre para responder "até quando eu posso mexer nisso".
 */

export default async function Turma({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;

  const turma = await buscarTurma(codigo);
  if (!turma) notFound();

  const aluno = await sessao();
  if (!aluno) redirect(`/t/${turma.codigo}/entrar`);

  const pedidos = await meusPedidos(aluno.id, turma.codigo);
  const restamPedidos = diasAte(turma.prazo_pedidos);

  const datas = [
    {
      rotulo: "Pedidos até",
      valor: dia(turma.prazo_pedidos),
      nota:
        restamPedidos === null
          ? "Sem data definida."
          : restamPedidos < 0
            ? "Prazo encerrado."
            : restamPedidos === 0
              ? "Hoje é o último dia."
              : `Faltam ${restamPedidos} ${restamPedidos === 1 ? "Dia" : "Dias"}.`,
    },
    {
      rotulo: "Alterações até",
      valor: dia(turma.prazo_alteracoes),
      nota: "A produção inicia após essa data, e tamanho e nome ficam travados.",
    },
    {
      rotulo: "Entrega prevista",
      valor: dia(turma.entrega_prevista),
      nota: "É também quando a segunda parcela vence.",
    },
  ].filter((d) => d.valor);

  return (
    <div className="flex flex-col gap-6">
      <header className="entra flex flex-col gap-1">
        <h1>
          {turma.label_grupo} {turma.grupo_nome}
        </h1>
        <p className="text-body-sm text-muted">{turma.campanha_nome}</p>
      </header>

      <section className="entra flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
        <div className="flex flex-col gap-0.5">
          <p className="label text-muted">Cliente</p>
          <p className="text-body font-semibold">{turma.cliente_nome}</p>
          {turma.cliente_cidade && (
            <p className="text-caption text-muted">{turma.cliente_cidade}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-line pt-4">
          <div className="flex flex-col gap-0.5">
            <p className="label text-muted">Código</p>
            <p data-nums className="font-mono text-body font-semibold tracking-wider">
              {turma.codigo}
            </p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="label text-muted">Meus pedidos</p>
            <p data-nums className="text-body font-semibold">
              {pedidos.length}
            </p>
          </div>
        </div>
      </section>

      <section
        className="entra overflow-hidden rounded-xl border border-line bg-surface"
        style={{ "--atraso": "60ms" } as React.CSSProperties}
      >
        <h2 className="border-b border-line px-5 py-3 text-h3">Datas da campanha</h2>
        <dl className="divide-y divide-line">
          {datas.map((d) => (
            <div key={d.rotulo} className="flex flex-col gap-0.5 px-5 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-body-sm text-muted">{d.rotulo}</dt>
                <dd data-nums className="whitespace-nowrap text-body-sm font-semibold">
                  {d.valor}
                </dd>
              </div>
              <p className="text-caption leading-relaxed text-muted">{d.nota}</p>
            </div>
          ))}
        </dl>
      </section>

      <section
        className="entra flex flex-col gap-2 rounded-xl bg-surface-2 p-5"
        style={{ "--atraso": "120ms" } as React.CSSProperties}
      >
        <h2 className="text-h3">Como funciona o pagamento</h2>
        <p className="text-body-sm leading-relaxed text-ink-2">
          {turma.percentual_entrada < 100 ? (
            <>
              A entrada é {turma.percentual_entrada}% do valor, e é ela que confirma o pedido
              e manda a peça para a produção. O restante vence na entrega
              {turma.entrega_prevista ? `, em ${dia(turma.entrega_prevista)}` : ""}. Se
              preferir, dá para quitar tudo de uma vez na hora do pagamento.
            </>
          ) : (
            "O pagamento é à vista, e é ele que confirma o pedido e manda a peça para a produção."
          )}
        </p>
        {pedidos.length > 0 && (
          <p data-nums className="text-body-sm text-ink-2">
            Você já pagou{" "}
            <strong className="font-semibold text-ink">
              {reais(pedidos.reduce((s, p) => s + p.pago, 0))}
            </strong>{" "}
            nesta {turma.label_grupo.toLowerCase()}.
          </p>
        )}
      </section>

      <BotaoLink href={`/t/${turma.codigo}/conta`} tom="secundario">
        Trocar de {turma.label_grupo.toLowerCase()}
      </BotaoLink>
    </div>
  );
}

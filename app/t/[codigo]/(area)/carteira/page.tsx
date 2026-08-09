import { notFound, redirect } from "next/navigation";
import { buscarTurma, dia, diasAte, meusPedidos, totalEmAberto } from "@/lib/aluno";
import { sessao } from "@/lib/sessao";
import { imagemUrl, reais } from "@/lib/supabase";
import { BotaoLink, Vazio } from "@/components/campos";
import { Carteira as IconeCarteira } from "@/components/icones";
import { SeloPagamento } from "@/components/selo";

/**
 * Carteira · o dinheiro.
 *
 * É a tela que faz o dinheiro entrar sem passar pelo representante, que é o
 * objetivo nº 1 do projeto. Por isso o total em aberto vem antes de tudo, e o
 * botão de pagar é a ação mais pesada da tela.
 *
 * Não tem botão editar: editar é assunto de Pedidos.
 */

export default async function Carteira({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;

  const turma = await buscarTurma(codigo);
  if (!turma) notFound();

  const aluno = await sessao();
  if (!aluno) redirect(`/t/${turma.codigo}/entrar`);

  const pedidos = await meusPedidos(aluno.id, turma.codigo);
  const emAberto = totalEmAberto(pedidos);
  const pago = pedidos.reduce((s, p) => s + p.pago, 0);

  // A próxima parcela a vencer, entre todos os pedidos. É o que o aluno quer saber.
  const proxima = pedidos
    .flatMap((p) => p.parcelas)
    .filter((p) => p.saldo > 0 && p.vencimento)
    .sort((a, b) => (a.vencimento! < b.vencimento! ? -1 : 1))[0];

  const atrasada = proxima ? (diasAte(proxima.vencimento) ?? 0) < 0 : false;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1>Carteira</h1>
        <p className="text-body-sm text-muted">
          Seus pagamentos da {turma.campanha_nome}
        </p>
      </header>

      {pedidos.length === 0 ? (
        <Vazio
          icone={<IconeCarteira className="h-10 w-10" />}
          titulo="Nada a pagar"
          texto="Quando você fizer um pedido, o valor e as parcelas aparecem aqui."
          acao={<BotaoLink href={`/t/${turma.codigo}/loja`}>Ver os uniformes</BotaoLink>}
        />
      ) : (
        <>
          <section
            className={`flex flex-col gap-3 rounded-xl border p-5 shadow-card
              ${atrasada ? "border-danger/30 bg-danger-soft" : "border-line bg-surface"}`}
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <p className="label text-muted">Em aberto</p>
                <p
                  data-nums
                  className={`text-num-lg font-semibold tracking-tight
                    ${emAberto > 0 ? (atrasada ? "text-danger" : "text-ink") : "text-success"}`}
                >
                  {reais(emAberto)}
                </p>
              </div>

              <div className="flex flex-col items-end gap-0.5 text-right">
                <p className="label text-muted">Já pago</p>
                <p data-nums className="text-h3 font-semibold text-ink-2">
                  {reais(pago)}
                </p>
              </div>
            </div>

            {emAberto === 0 ? (
              <p className="border-t border-line pt-3 text-body-sm text-success">
                Tudo quitado. Nada a pagar nesta turma.
              </p>
            ) : (
              proxima && (
                <p
                  className={`border-t pt-3 text-body-sm
                    ${atrasada ? "border-danger/20 text-danger" : "border-line text-ink-2"}`}
                >
                  {atrasada ? "Venceu em " : "Próximo vencimento em "}
                  <strong className="font-semibold">{dia(proxima.vencimento)}</strong>
                  {", "}
                  {reais(proxima.saldo)}.
                </p>
              )
            )}
          </section>

          <ul className="flex flex-col gap-4">
            {pedidos.map((pedido, i) => {
              const aPagar = pedido.parcelas.find((p) => p.saldo > 0);

              return (
                <li
                  key={pedido.id}
                  style={{ "--atraso": `${i * 60}ms` } as React.CSSProperties}
                  className="entra overflow-hidden rounded-xl border border-line bg-surface shadow-card"
                >
                  <div className="flex items-start gap-4 p-4">
                    {pedido.capa && (
                      <img
                        src={imagemUrl(pedido.capa)}
                        alt=""
                        loading="lazy"
                        className="size-14 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="text-h3">{pedido.produto}</h2>
                        <p className="text-caption text-muted">
                          {pedido.itens.map((i) => i.tamanho).join(", ")} ·{" "}
                          {reais(pedido.valor)}
                        </p>
                      </div>
                      <SeloPagamento status={pedido.status_pagamento} />
                    </div>
                  </div>

                  <ul className="divide-y divide-line border-t border-line">
                    {pedido.parcelas.map((parcela) => {
                      const venceu = (diasAte(parcela.vencimento) ?? 0) < 0;
                      const aberta = parcela.saldo > 0;

                      return (
                        <li
                          key={parcela.id}
                          className="flex items-baseline justify-between gap-3 px-4 py-3 text-body-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">
                              {parcela.eh_entrada ? "Entrada" : `${parcela.numero}ª parcela`}
                            </p>
                            <p
                              className={`text-caption ${
                                aberta && venceu ? "text-danger" : "text-muted"
                              }`}
                            >
                              {!aberta
                                ? "Pago"
                                : parcela.vencimento
                                  ? `${venceu ? "Venceu" : "Vence"} em ${dia(parcela.vencimento)}`
                                  : "Em aberto"}
                            </p>
                          </div>

                          <p
                            data-nums
                            className={`shrink-0 font-semibold ${
                              aberta ? "text-ink" : "text-muted line-through"
                            }`}
                          >
                            {reais(parcela.valor)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>

                  {aPagar && (
                    <div className="border-t border-line p-4">
                      <BotaoLink
                        href={`/t/${turma.codigo}/pedido/${pedido.id}/pagamento?parcela=${aPagar.id}`}
                        className="w-full"
                      >
                        Pagar {reais(aPagar.saldo)}
                      </BotaoLink>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

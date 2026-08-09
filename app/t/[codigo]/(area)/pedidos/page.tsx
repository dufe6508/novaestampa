import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buscarTurma, dia, meusPedidos, podeEditar, tamanhoLegivel } from "@/lib/aluno";
import { sessao } from "@/lib/sessao";
import { imagemUrl } from "@/lib/supabase";
import { BotaoLink, Vazio } from "@/components/campos";
import { Lapis, Pacote } from "@/components/icones";
import { SeloProducao } from "@/components/selo";

/**
 * Pedidos · a peça.
 *
 * Responde "cadê minha camisa": status de produção, prazo, editar. SEM valor em
 * reais, isso é assunto da Carteira. Os dois mostram os mesmos pedidos e
 * respondem perguntas diferentes.
 */

export default async function Pedidos({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;

  const turma = await buscarTurma(codigo);
  if (!turma) notFound();

  const aluno = await sessao();
  if (!aluno) redirect(`/t/${turma.codigo}/entrar`);

  const pedidos = await meusPedidos(aluno.id, turma.codigo);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1>Meus pedidos</h1>
        <p className="text-body-sm text-muted">
          {pedidos.length === 0
            ? "Você ainda não pediu nada nesta turma."
            : `${pedidos.length} ${pedidos.length === 1 ? "pedido" : "pedidos"} · ${
                turma.label_grupo
              } ${turma.grupo_nome}`}
        </p>
      </header>

      {pedidos.length === 0 ? (
        <Vazio
          icone={<Pacote className="h-10 w-10" />}
          titulo="Nenhum pedido ainda"
          texto="Quando você fizer um pedido, ele aparece aqui com o status da produção."
          acao={<BotaoLink href={`/t/${turma.codigo}/loja`}>Ver os uniformes</BotaoLink>}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {pedidos.map((pedido, i) => {
            const editavel = podeEditar(pedido, turma);

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
                      className="size-16 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="text-h3">{pedido.produto}</h2>
                      <SeloProducao status={pedido.status_producao} />
                    </div>
                    <p className="text-caption text-muted">
                      Pedido em{" "}
                      {new Date(pedido.criado_em).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                      })}
                    </p>
                  </div>
                </div>

                <ul className="divide-y divide-line border-t border-line">
                  {pedido.itens.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        {pedido.itens.length > 1 && (
                          <p className="text-caption text-muted">{item.produto}</p>
                        )}
                        <p className="break-words text-body font-semibold">
                          {item.nome_estampa}
                        </p>
                        <p className="text-caption text-muted">Tamanho {tamanhoLegivel(item.tamanho)}</p>
                      </div>

                      {editavel && (
                        <Link
                          href={`/t/${turma.codigo}/pedido/${pedido.id}/editar/${item.id}`}
                          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md
                            border border-line-strong bg-surface px-3 text-caption font-semibold
                            text-ink transition-colors duration-fast ease-soft hover:bg-surface-2"
                        >
                          <Lapis className="h-4 w-4" />
                          Editar
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Quando trava, o botão não some: vira texto. Botão que
                    desaparece deixa o aluno achando que a tela quebrou.

                    A produção começa quando as alterações fecham, senão a
                    oficina produziria peça que ainda pode mudar. Por isso a
                    mesma data serve para as duas frases. */}
                <p className="border-t border-line bg-surface-2 px-4 py-3 text-caption leading-relaxed text-ink-2">
                  {editavel ? (
                    turma.prazo_alteracoes ? (
                      <>
                        Alterações de tamanho e nome até{" "}
                        <strong className="font-semibold text-ink">
                          {dia(turma.prazo_alteracoes)}
                        </strong>
                        . A produção inicia após essa data.
                      </>
                    ) : (
                      "Alterações de tamanho e nome liberadas até o início da produção."
                    )
                  ) : ["aguardando", "liberado"].includes(pedido.status_producao) ? (
                    <>
                      O prazo de alterações terminou
                      {turma.prazo_alteracoes ? ` em ${dia(turma.prazo_alteracoes)}` : ""}, e a
                      peça entrou na fila de produção. Fale com seu representante.
                    </>
                  ) : (
                    "Esta peça já está sendo produzida, então tamanho e nome estão travados."
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

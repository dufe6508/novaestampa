import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buscarCampanha,
  buscarPedido,
  data,
  ehSituacao,
  listarGrupos,
  listarPedidosDaCampanha,
  SITUACOES,
  tamanhoLegivel,
  type PedidoPainel,
  type Situacao,
} from "@/lib/painel";
import { reais } from "@/lib/formato";
import { Busca, Chips, Kpi, Kpis, Topo, Valor } from "@/components/painel";
import { SeloPagamento } from "@/components/selo";
import { DetalhePedido } from "@/components/detalhe-pedido";
import { Pacote } from "@/components/icones";
import { Vazio } from "@/components/campos";

/**
 * A fila de cobrança da campanha inteira, numa tela só.
 *
 * Existe porque o cartão da campanha sabia que havia 71 pessoas em atraso e a
 * única saída que oferecia era "abra a turma". Cobrança não se faz turma por
 * turma: quem liga liga pela lista dos que devem mais, e a turma é só o filtro
 * que ajuda a agrupar as ligações.
 *
 * Situação, turma, busca e detalhe vivem na URL. O endereço pode ser mandado
 * para o representante ("olha os atrasados da 3B"), o voltar desfaz o filtro, e
 * o detalhe do pedido é a mesma gaveta da turma, com a mesma baixa de pagamento.
 */

type Query = { s?: string; g?: string; q?: string; pedido?: string };

/** Ordem da lista: quem deve mais primeiro. É a ordem em que se liga. */
const porSaldo = (a: PedidoPainel, b: PedidoPainel) => b.saldo_centavos - a.saldo_centavos;

const TH = "label px-3.5 py-2.5 text-muted";
const TD = "px-3.5 py-2.5";

export default async function Cobranca({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Query>;
}) {
  const { id } = await params;
  const { s, g, q, pedido: pedidoId } = await searchParams;

  const situacao: Situacao = ehSituacao(s) ? s : "atrasado";

  const campanha = await buscarCampanha(id);
  if (!campanha) notFound();

  const [grupos, todos] = await Promise.all([
    listarGrupos(id),
    listarPedidosDaCampanha(id),
  ]);

  const daSituacao = todos.filter(SITUACOES[situacao].vale).sort(porSaldo);

  const termo = q?.trim().toLowerCase();
  const lista = daSituacao
    .filter((p) => !g || p.grupo_id === g)
    .filter((p) => !termo || p.aluno_nome.toLowerCase().includes(termo));

  const total = lista.reduce((n, p) => n + p.saldo_centavos, 0);
  const alunos = new Set(lista.map((p) => p.aluno_nome)).size;

  const base = `/painel/campanha/${id}/cobranca`;
  const url = (extra: Query) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ s: situacao, g, q, ...extra })) if (v) p.set(k, v);
    const t = p.toString();
    return t ? `${base}?${t}` : base;
  };

  const aberto = pedidoId ? await buscarPedido(pedidoId) : null;
  // Pedido de outra campanha não abre aqui: trocar o id na URL não pode mostrar
  // o financeiro de um cliente que não é este.
  const detalhe = aberto && todos.some((p) => p.id === aberto.id) ? aberto : null;
  const grupoDoDetalhe = grupos.find((x) => x.id === detalhe?.grupo_id);

  return (
    <>
      <Topo
        voltar={`/painel/campanha/${id}`}
        migalha={[
          { texto: "Clientes", href: "/painel" },
          { texto: campanha.cliente_nome, href: `/painel/cliente/${campanha.cliente_id}` },
          { texto: campanha.nome, href: `/painel/campanha/${id}` },
          { texto: "Cobrança" },
        ]}
        titulo={SITUACOES[situacao].titulo}
        subtitulo={SITUACOES[situacao].explica}
        acoes={<Busca valor={q} placeholder="Buscar aluno" escondidos={{ s: situacao, g }} />}
      />

      {/* Trocar de fila sem voltar para a campanha. A contagem em cada aba é a
          fila inteira, não a filtrada: ela serve para escolher para onde ir. */}
      <div className="entra" style={{ "--atraso": "40ms" } as React.CSSProperties}>
        <Chips
          opcoes={(Object.keys(SITUACOES) as Situacao[]).map((k) => ({
            texto: SITUACOES[k].titulo,
            href: `${base}?s=${k}${g ? `&g=${g}` : ""}`,
            ativo: situacao === k,
            contagem: todos.filter(SITUACOES[k].vale).length,
          }))}
        />
      </div>

      <div className="entra" style={{ "--atraso": "80ms" } as React.CSSProperties}>
        <Kpis>
          <Kpi
            rotulo="Falta receber"
            valor={reais(total)}
            tom={situacao === "atrasado" && total > 0 ? "alerta" : "normal"}
            nota={g ? "nesta turma" : "nesta fila"}
          />
          <Kpi
            rotulo="Pedidos"
            valor={String(lista.length)}
            nota={`${alunos} ${alunos === 1 ? "aluno" : "alunos"}`}
          />
          <Kpi
            rotulo="Média por pedido"
            valor={reais(lista.length ? Math.round(total / lista.length) : 0)}
            nota="saldo em aberto"
          />
          <Kpi
            rotulo={campanha.label_grupo_plural}
            valor={String(new Set(lista.map((p) => p.grupo_id)).size)}
            nota={`de ${grupos.length}`}
          />
        </Kpis>
      </div>

      {/* Filtro por turma. Turma sem ninguém nesta fila não vira botão: botão que
          leva a uma lista vazia é um clique jogado fora. */}
      <div className="entra" style={{ "--atraso": "100ms" } as React.CSSProperties}>
        <Chips
          opcoes={[
            {
              texto: `Todas as ${campanha.label_grupo_plural.toLowerCase()}`,
              href: url({ g: undefined }),
              ativo: !g,
              contagem: daSituacao.length,
            },
            ...grupos
              .map((x) => ({
                grupo: x,
                n: daSituacao.filter((p) => p.grupo_id === x.id).length,
              }))
              .filter((x) => x.n > 0)
              .map(({ grupo, n }) => ({
                texto: grupo.nome,
                href: url({ g: grupo.id }),
                ativo: g === grupo.id,
                contagem: n,
              })),
          ]}
        />
      </div>

      {lista.length === 0 ? (
        <Vazio
          icone={<Pacote className="h-8 w-8" />}
          titulo={
            daSituacao.length === 0
              ? "Ninguém nesta situação"
              : "Ninguém com esses filtros"
          }
          texto={
            daSituacao.length === 0
              ? "Nada a cobrar aqui. Confira as outras filas no topo da tela."
              : "Limpe a busca ou escolha outra turma para ver o resto da fila."
          }
          acao={
            daSituacao.length > 0 ? (
              <Link
                href={`${base}?s=${situacao}`}
                className="text-caption font-semibold text-ink underline"
              >
                Ver a fila inteira
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div
            className="entra hidden overflow-hidden rounded-lg border border-line bg-surface
              md:block"
            style={{ "--atraso": "120ms" } as React.CSSProperties}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-body-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2">
                    <th className={`${TH} w-11 text-right`}>#</th>
                    <th className={`${TH} text-left`}>Aluno</th>
                    <th className={`${TH} text-left`}>{campanha.label_grupo}</th>
                    <th className={`${TH} text-left`}>Produto</th>
                    <th className={`${TH} text-right`}>Pago</th>
                    <th className={`${TH} text-right`}>Falta pagar</th>
                    <th className={`${TH} text-left`}>Situação</th>
                    <th className={`${TH} text-right`}>Feito</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((p, i) => (
                    <tr
                      key={p.id}
                      className={`border-b border-line transition-colors duration-fast ease-soft
                        last:border-0 hover:bg-surface-2
                        ${detalhe?.id === p.id ? "bg-surface-2" : ""}`}
                    >
                      <td data-nums className={`${TD} text-right text-caption text-faint`}>
                        {i + 1}
                      </td>
                      <td className={TD}>
                        <Link
                          href={url({ pedido: p.id })}
                          scroll={false}
                          className="font-medium text-ink underline-offset-2 hover:underline"
                        >
                          {p.aluno_nome}
                        </Link>
                      </td>
                      <td className={`${TD} text-ink-2`}>{p.grupo_nome}</td>
                      <td className={`${TD} text-ink-2`}>
                        {p.produto_nome_snapshot}
                        <span className="text-muted">
                          {" · "}
                          {p.itens.map((i) => tamanhoLegivel(i.tamanho)).join(" + ")}
                        </span>
                      </td>
                      <td className={`${TD} text-right`}>
                        <Valor centavos={p.pago_centavos} />
                      </td>
                      <td className={`${TD} text-right`}>
                        <Valor
                          centavos={p.saldo_centavos}
                          tom={p.status_pagamento === "atrasado" ? "alerta" : "forte"}
                        />
                      </td>
                      <td className={TD}>
                        <SeloPagamento status={p.status_pagamento} />
                      </td>
                      <td data-nums className={`${TD} text-right text-caption text-muted`}>
                        {data(p.criado_em)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line-strong bg-surface-2">
                    <td colSpan={5} className={`${TD} text-caption font-semibold text-ink-2`}>
                      {lista.length} {lista.length === 1 ? "pedido" : "pedidos"} · {alunos}{" "}
                      {alunos === 1 ? "aluno" : "alunos"}
                    </td>
                    <td className={`${TD} text-right`}>
                      <Valor
                        centavos={total}
                        tom={situacao === "atrasado" ? "alerta" : "forte"}
                      />
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <ul
            className="entra divide-y divide-line overflow-hidden rounded-lg border border-line
              bg-surface md:hidden"
            style={{ "--atraso": "120ms" } as React.CSSProperties}
          >
            {lista.map((p) => (
              <li key={p.id}>
                <Link
                  href={url({ pedido: p.id })}
                  scroll={false}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors duration-fast
                    ease-soft active:bg-surface-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-body-sm font-semibold">
                      {p.aluno_nome}
                    </span>
                    <SeloPagamento status={p.status_pagamento} />
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-caption text-muted">
                      {campanha.label_grupo} {p.grupo_nome} · {p.produto_nome_snapshot}
                    </span>
                    <span className="shrink-0 text-caption text-muted">
                      falta{" "}
                      <Valor
                        centavos={p.saldo_centavos}
                        tom={p.status_pagamento === "atrasado" ? "alerta" : "forte"}
                      />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
            <li className="flex items-baseline justify-between gap-3 bg-surface-2 px-4 py-2.5">
              <span className="text-caption font-semibold text-ink-2">
                {lista.length} {lista.length === 1 ? "pedido" : "pedidos"}
              </span>
              <span className="text-caption text-muted">
                falta{" "}
                <Valor centavos={total} tom={situacao === "atrasado" ? "alerta" : "forte"} />
              </span>
            </li>
          </ul>
        </>
      )}

      {detalhe && (
        <DetalhePedido
          pedido={detalhe}
          turma={grupoDoDetalhe?.nome ?? ""}
          campanha={campanha.nome}
          labelGrupo={campanha.label_grupo}
          fechar={url({ pedido: undefined })}
        />
      )}
    </>
  );
}

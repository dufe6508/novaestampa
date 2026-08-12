import Link from "next/link";
import { cancelarPedidos } from "@/app/painel/acoes";
import { reais } from "@/lib/formato";
import { buscarCampanha, buscarPedido } from "@/lib/painel";
import {
  COBRANCA,
  ehFaixa,
  filas,
  foraDoPrazo,
  listarContasReceber,
  porFaixa,
  ranking,
  type ContaReceber,
  type Faixa,
} from "@/lib/financeiro";
import { Busca, Retratil, Topo } from "@/components/painel";
import { FaixasAtraso, Modos, Ranking } from "@/components/financeiro";
import { TabelaReceber } from "@/components/tabela-receber";
import { DetalhePedido } from "@/components/detalhe-pedido";
import { Confirmar } from "@/components/confirmar";
import { Vazio } from "@/components/campos";
import { Pacote } from "@/components/icones";

/**
 * Contas a receber da empresa inteira. A unidade da linha é a **parcela**.
 *
 * Serve o dia de cobrança, quando se liga para todo mundo sem olhar escola. O
 * mesmo trabalho dentro de uma campanha vive em
 * `/painel/financeiro/campanha/[id]?aba=receber`, com a mesma tabela e o escopo já
 * aplicado.
 *
 * Três modos: a carteira inteira mais os dois grupos de cobrança. Cada grupo é
 * uma conversa diferente, Atrasado é "falta a segunda parcela" e Vencido é "você
 * ainda quer a peça?". Escola, campanha e turma ficam no botão Filtros; período
 * não entra aqui, porque parcela em aberto é foto de hoje e não tem data de
 * recebimento.
 */

type Modo = "tudo" | "atrasado" | "sem_pagamento";

type Query = {
  modo?: string;
  faixa?: string;
  oficina?: string;
  cliente?: string;
  campanha?: string;
  turma?: string;
  q?: string;
  pedido?: string;
  sel?: string | string[];
};

const TITULOS: Record<Modo, { titulo: string; explica: string }> = {
  tudo: { titulo: "Tudo a receber", explica: "Toda parcela em aberto, vencida ou não." },
  atrasado: COBRANCA.atrasado,
  sem_pagamento: COBRANCA.sem_pagamento,
};

/** Em aberto e nada mais. Parcela quitada não é conta a receber. */
const emAberto = (c: ContaReceber) => c.saldo_centavos > 0;

export default async function Receber({ searchParams }: { searchParams: Promise<Query> }) {
  const {
    modo: m,
    faixa: f,
    oficina,
    cliente,
    campanha,
    turma,
    q,
    pedido: pedidoId,
    sel,
  } = await searchParams;

  const modo: Modo = m === "atrasado" || m === "sem_pagamento" ? m : "tudo";
  const faixa: Faixa | undefined = ehFaixa(f) ? f : undefined;

  const contas = await listarContasReceber(cliente, campanha, turma);

  const base = "/painel/financeiro/receber";
  const url = (extra: Partial<Query>) => {
    const p = new URLSearchParams();
    const campos = { modo, faixa, oficina, cliente, campanha, turma, q, ...extra };
    for (const [k, v] of Object.entries(campos)) {
      if (!v || typeof v !== "string") continue;
      if (k === "modo" && v === "tudo") continue;
      p.set(k, v);
    }
    const t = p.toString();
    return t ? `${base}?${t}` : base;
  };

  const escondidos = Object.fromEntries(
    Object.entries({ modo, faixa, oficina, cliente, campanha, turma }).filter(
      ([, v]) => typeof v === "string" && v,
    ),
  ) as Record<string, string>;

  const noModo =
    modo === "tudo"
      ? contas.filter(emAberto)
      : foraDoPrazo(contas).filter((c) => c.grupo_cobranca === modo);

  const termo = q?.trim().toLowerCase();
  const linhas = noModo
    .filter((c) => !faixa || c.faixa_atraso === faixa)
    .filter((c) => oficina !== "1" || c.pode_produzir)
    .filter((c) => !termo || c.aluno_nome.toLowerCase().includes(termo))
    // No modo Tudo ordena por saldo; nos outros, pelo atraso mais antigo. Quem
    // abre a tela quer a fila já formada, não quer ordenar.
    .sort((a, b) =>
      modo === "tudo"
        ? b.saldo_centavos - a.saldo_centavos
        : (b.dias_atraso ?? 0) - (a.dias_atraso ?? 0),
    );

  const total = linhas.reduce((t, c) => t + c.saldo_centavos, 0);
  const [atrasado, semPagamento] = filas(contas);
  const faixasDoModo = porFaixa(noModo);
  const totalFaixas = faixasDoModo.reduce((t, x) => t + x.valor_centavos, 0);

  const tudo = contas.filter(emAberto);
  const comAtraso = modo !== "tudo";

  // Seleção do lote. Vem como repetição do campo `sel` no envio do formulário.
  const selecionados = (Array.isArray(sel) ? sel : sel ? [sel] : []).filter((id) =>
    linhas.some((c) => c.pedido_id === id),
  );
  const doLote = linhas.filter((c) => selecionados.includes(c.pedido_id));
  const valorDoLote = doLote.reduce((t, c) => t + c.saldo_centavos, 0);
  const alunosDoLote = [...new Set(doLote.map((c) => c.aluno_nome))];

  const aberto = pedidoId ? await buscarPedido(pedidoId) : null;
  // Pedido fora do escopo não abre: trocar o id na URL não pode mostrar o
  // financeiro de um cliente que não está nesta tela.
  const detalhe = aberto && contas.some((c) => c.pedido_id === aberto.id) ? aberto : null;
  const contaDoDetalhe = contas.find((c) => c.pedido_id === detalhe?.id);
  const campanhaDoDetalhe = contaDoDetalhe
    ? await buscarCampanha(contaDoDetalhe.campanha_id)
    : null;

  const escopoNome = turma
    ? contas[0]?.grupo_nome
    : campanha
      ? contas[0]?.campanha_nome
      : cliente
        ? contas[0]?.cliente_nome
        : null;

  return (
    <>
      <Topo
        voltar="/painel/financeiro"
        migalha={[{ texto: "Financeiro", href: "/painel/financeiro" }, { texto: "A receber" }]}
        titulo={TITULOS[modo].titulo}
        subtitulo={
          escopoNome ? `${TITULOS[modo].explica} Escopo: ${escopoNome}.` : TITULOS[modo].explica
        }
        // O escopo chega pela navegação, não por filtro: quem entrou por uma
        // escola ou por uma turma já escolheu na tela anterior, e o único
        // controle que falta aqui é desfazer isso.
        acoes={
          <div className="flex items-center gap-2">
            {escopoNome && (
              <Link
                href={url({ cliente: undefined, campanha: undefined, turma: undefined })}
                className="inline-flex h-10 items-center rounded-md border border-line-strong
                  bg-surface px-3.5 text-body-sm font-medium text-ink-2 transition-colors
                  duration-fast ease-soft hover:border-ink hover:text-ink"
              >
                Ver a empresa inteira
              </Link>
            )}
            <Busca valor={q} placeholder="Buscar aluno" escondidos={escondidos} />
          </div>
        }
      />

      <div className="entra" style={{ "--atraso": "40ms" } as React.CSSProperties}>
        <Modos
          opcoes={[
            {
              texto: "Tudo a receber",
              href: url({ modo: "tudo", faixa: undefined, oficina: undefined, sel: undefined }),
              ativo: modo === "tudo",
              centavos: tudo.reduce((t, c) => t + c.saldo_centavos, 0),
              pedidos: new Set(tudo.map((c) => c.pedido_id)).size,
            },
            ...[atrasado, semPagamento].map((fila) => ({
              texto: COBRANCA[fila.grupo].titulo,
              href: url({ modo: fila.grupo, faixa: undefined, oficina: undefined, sel: undefined }),
              ativo: modo === fila.grupo,
              centavos: fila.valor,
              pedidos: fila.pedidos,
            })),
          ]}
        />
      </div>

      {comAtraso && totalFaixas > 0 && (
        <section
          className="entra flex flex-col gap-2"
          style={{ "--atraso": "80ms" } as React.CSSProperties}
          aria-label="Faixas de atraso"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="label text-muted">Há quanto tempo</h2>
            {faixa && (
              <Link
                href={url({ faixa: undefined })}
                className="text-caption text-ink-2 underline-offset-2 hover:underline"
              >
                Ver todas as faixas
              </Link>
            )}
          </div>
          <FaixasAtraso
            total={totalFaixas}
            linhas={faixasDoModo.map((x) => ({
              valor: x.valor,
              curto: x.curto,
              href: url({ faixa: faixa === x.valor ? undefined : x.valor, sel: undefined }),
              ativo: faixa === x.valor,
              valor_centavos: x.valor_centavos,
              parcelas: x.parcelas,
            }))}
          />
        </section>
      )}

      {comAtraso && (
        <div className="grid gap-3 lg:grid-cols-3">
          {(
            [
              { nivel: "cliente" as const, titulo: "Escolas com mais atraso" },
              { nivel: "campanha" as const, titulo: "Campanhas" },
              { nivel: "turma" as const, titulo: "Turmas" },
            ]
          ).map((r, i) => (
            <Retratil
              key={r.nivel}
              titulo={r.titulo}
              atraso={120 + i * 40}
              resumo={`${ranking(noModo, r.nivel).length} Na lista`}
            >
              <Ranking
                linhas={ranking(noModo, r.nivel)}
                href={(l) =>
                  url({
                    cliente: r.nivel === "cliente" ? l.id : undefined,
                    campanha: r.nivel === "campanha" ? l.id : undefined,
                    turma: r.nivel === "turma" ? l.id : undefined,
                    sel: undefined,
                  })
                }
              />
            </Retratil>
          ))}
        </div>
      )}

      {linhas.length === 0 ? (
        <Vazio
          icone={<Pacote className="h-7 w-7" />}
          titulo={termo ? "Ninguém com esse nome nesta fila" : "Nada nesta fila"}
          texto={
            termo
              ? "Tente outro nome, ou limpe a busca para ver a fila inteira."
              : "Nenhuma parcela em aberto neste corte. É o resultado que se quer."
          }
        />
      ) : (
        /* Formulário nativo em GET: marcar as caixas e enviar recoloca a seleção
           na URL, e a confirmação abre em cima. Sem estado no cliente, sem
           JavaScript, e a seleção sobrevive ao recarregar a página. */
        <form method="get" action={base} className="flex flex-col gap-3">
          {Object.entries(escondidos).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {q && <input type="hidden" name="q" value={q} />}

          <TabelaReceber
            linhas={linhas}
            url={(extra) => url(extra)}
            selecionaveis={modo === "sem_pagamento"}
            selecionados={selecionados}
            colunas={{ turma: !turma, campanha: !campanha && !turma }}
            destaque={detalhe?.id}
            total={total}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <a
              href={`/painel/financeiro/receber/csv?${new URLSearchParams(
                Object.entries({ modo, faixa, oficina, cliente, campanha, turma, q }).filter(
                  ([, v]) => typeof v === "string" && v,
                ) as [string, string][],
              ).toString()}`}
              className="inline-flex h-10 items-center rounded-md border border-line-strong
                bg-surface px-3.5 text-body-sm font-medium text-ink-2 transition-colors
                duration-fast ease-soft hover:border-ink hover:text-ink"
            >
              Exportar CSV
            </a>

            {modo === "sem_pagamento" && (
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-md border border-danger
                  bg-surface px-3.5 text-body-sm font-medium text-danger transition-colors
                  duration-fast ease-soft hover:bg-danger-soft active:scale-[0.98]"
              >
                Cancelar selecionados
              </button>
            )}
          </div>
        </form>
      )}

      {selecionados.length > 0 && (
        <Confirmar
          titulo="Cancelar pedidos"
          subtitulo={`${selecionados.length} ${selecionados.length === 1 ? "Pedido" : "Pedidos"} · ${reais(valorDoLote)} Sai da carteira`}
          consequencia={
            <>
              Some das listas, dos relatórios e da produção, e o histórico fica guardado. Nenhum
              desses pedidos tem pagamento, então não há valor a devolver.
              <span className="mt-2 block text-caption">{alunosDoLote.join(", ")}</span>
            </>
          }
          acao={cancelarPedidos}
          botao="Cancelar os pedidos"
          pendenteTexto="Cancelando"
          ocultos={{ pedidos: selecionados.join(",") }}
          fechar={url({ sel: undefined })}
        />
      )}

      {detalhe && contaDoDetalhe && (
        <DetalhePedido
          pedido={detalhe}
          turma={contaDoDetalhe.grupo_nome}
          campanha={contaDoDetalhe.campanha_nome}
          labelGrupo={campanhaDoDetalhe?.label_grupo ?? "Turma"}
          fechar={url({ pedido: undefined })}
        />
      )}
    </>
  );
}

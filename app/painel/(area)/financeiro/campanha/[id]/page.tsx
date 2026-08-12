import Link from "next/link";
import { notFound } from "next/navigation";
import { hojeNoFuso } from "@/lib/data";
import { reais } from "@/lib/formato";
import { buscarCampanha, buscarPedido, data, listarGrupos, pct } from "@/lib/painel";
import {
  COBRANCA,
  PERIODO_PADRAO,
  aVencer,
  ehData,
  ehFaixa,
  ehGrupoCobranca,
  filas,
  foraDoPrazo,
  janela,
  janelaEntre,
  listarContasReceber,
  listarMovimento,
  listarRecebimentos,
  posicao,
  porFaixa,
  ranking,
  serie,
  somarMovimento,
  type Faixa,
} from "@/lib/financeiro";
import { Barra, Bloco, Retratil, SubAbas, Topo, Valor } from "@/components/painel";
import { Curvas, Entradas, FaixasAtraso, Modos, Ranking } from "@/components/financeiro";
import { TabelaReceber } from "@/components/tabela-receber";
import { BotaoFiltros, FiltroGaveta } from "@/components/filtro-gaveta";
import { DetalhePedido } from "@/components/detalhe-pedido";
import { Busca } from "@/components/painel";

/**
 * Financeiro de uma campanha. É aqui que o trabalho acontece.
 *
 * A visão geral do módulo é a empresa inteira; esta tela é uma escola e uma
 * campanha, com sub-abas em vez de tudo empilhado:
 *
 * · **Visão geral**, a posição da campanha e onde está concentrado
 * · **A receber**, parcela por parcela, com faixas de atraso
 * · **Entradas**, o que entrou de dinheiro, do mais recente para trás
 * · **Turmas**, a comparação entre elas
 *
 * O filtro de turma vive no botão Filtros, junto do período. Escola e campanha já
 * estão decididas pela rota, então não aparecem lá.
 */

type Aba = "geral" | "receber" | "entradas" | "turmas";

type Query = {
  aba?: string;
  de?: string;
  ate?: string;
  turma?: string;
  modo?: string;
  faixa?: string;
  q?: string;
  pedido?: string;
  filtros?: string;
};

const ABAS: { valor: Aba; texto: string }[] = [
  { valor: "geral", texto: "Visão geral" },
  { valor: "receber", texto: "A receber" },
  { valor: "entradas", texto: "Entradas" },
  { valor: "turmas", texto: "Turmas" },
];

export default async function FinanceiroDaCampanha({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Query>;
}) {
  const { id } = await params;
  const {
    aba: a,
    de: deQuery,
    ate: ateQuery,
    turma,
    modo: m,
    faixa: f,
    q,
    pedido: pedidoId,
    filtros,
  } = await searchParams;

  const aba: Aba = ABAS.some((x) => x.valor === a) ? (a as Aba) : "geral";
  const de = ehData(deQuery) ? deQuery : undefined;
  const ate = ehData(ateQuery) ? ateQuery : undefined;
  const intervalo = !!(de && ate);
  const modo = m === "tudo" || ehGrupoCobranca(m) ? m : "tudo";
  const faixa: Faixa | undefined = ehFaixa(f) ? f : undefined;

  const campanha = await buscarCampanha(id);
  if (!campanha) notFound();

  const [contas, movimento, recebimentos, grupos] = await Promise.all([
    listarContasReceber(undefined, id, turma),
    listarMovimento(undefined, id, turma),
    listarRecebimentos(undefined, id, turma),
    listarGrupos(id),
  ]);

  const hoje = hojeNoFuso();
  const j = intervalo ? janelaEntre(de!, ate!) : janela(PERIODO_PADRAO, hoje);

  const carteira = posicao(movimento, contas);
  const [atrasado, semPagamento] = filas(contas);
  const foraDoPrazoTotal = atrasado.valor + semPagamento.valor;
  const proximos7 = aVencer(contas, 7, hoje);
  const noPeriodo = somarMovimento(movimento, j.de, j.ate);

  const base = `/painel/financeiro/campanha/${id}`;
  const url = (extra: Partial<Query>) => {
    const s = new URLSearchParams();
    const campos = {
      aba: aba === "geral" ? undefined : aba,
      de,
      ate,
      turma,
      modo,
      faixa,
      q,
      filtros,
      ...extra,
    };
    for (const [k, v] of Object.entries(campos)) {
      if (!v) continue;
      if (k === "modo" && v === "tudo") continue;
      s.set(k, String(v));
    }
    const t = s.toString();
    return t ? `${base}?${t}` : base;
  };

  const escondidos = Object.fromEntries(
    Object.entries({ aba, de, ate, turma, modo, faixa }).filter(([, v]) => v),
  ) as Record<string, string>;

  // A tabela da aba A receber: modo, faixa e busca aplicados na ordem.
  const noModo =
    modo === "tudo"
      ? contas.filter((c) => c.saldo_centavos > 0)
      : foraDoPrazo(contas).filter((c) => c.grupo_cobranca === modo);

  const termo = q?.trim().toLowerCase();
  const linhas = noModo
    .filter((c) => !faixa || c.faixa_atraso === faixa)
    .filter((c) => !termo || c.aluno_nome.toLowerCase().includes(termo))
    .sort((x, y) =>
      modo === "tudo"
        ? y.saldo_centavos - x.saldo_centavos
        : (y.dias_atraso ?? 0) - (x.dias_atraso ?? 0),
    );

  const totalDaLista = linhas.reduce((t, c) => t + c.saldo_centavos, 0);
  const faixasDoModo = porFaixa(noModo);
  const totalFaixas = faixasDoModo.reduce((t, x) => t + x.valor_centavos, 0);

  const aberto = pedidoId ? await buscarPedido(pedidoId) : null;
  const detalhe = aberto && contas.some((c) => c.pedido_id === aberto.id) ? aberto : null;
  const contaDoDetalhe = contas.find((c) => c.pedido_id === detalhe?.id);

  const ativos = [turma, intervalo ? "1" : undefined].filter(Boolean).length;
  const turmaAberta = grupos.find((g) => g.id === turma);

  return (
    <>
      <Topo
        voltar="/painel/financeiro"
        migalha={[
          { texto: "Financeiro", href: "/painel/financeiro" },
          { texto: campanha.cliente_nome },
          { texto: campanha.nome },
        ]}
        titulo={campanha.nome}
        subtitulo={
          <span data-nums>
            {campanha.cliente_nome} · {carteira.arrecadado}% Arrecadado de{" "}
            {reais(carteira.vendido)}
            {turmaAberta && ` · ${campanha.label_grupo} ${turmaAberta.nome}`}
          </span>
        }
        acoes={<BotaoFiltros href={url({ filtros: "1" })} ativos={ativos} />}
      />

      <SubAbas
        opcoes={ABAS.map((x) => ({
          texto: x.texto,
          href: url({ aba: x.valor, pedido: undefined }),
          ativo: aba === x.valor,
        }))}
      />

      {/* A posição fica em toda aba: é o contexto de quem está trabalhando dentro
          da campanha, e trocar de aba não pode fazer o número desaparecer. */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Posição da campanha">
        {[
          {
            rotulo: "Vendido",
            valor: carteira.vendido,
            nota: `${carteira.pedidos} ${carteira.pedidos === 1 ? "Pedido" : "Pedidos"}`,
          },
          {
            rotulo: "Recebido",
            valor: carteira.recebido,
            nota: `${carteira.arrecadado}% Do vendido`,
          },
          {
            rotulo: "A receber",
            valor: carteira.aReceber,
            nota: `${reais(proximos7.valor_centavos)} Vence em 7 dias`,
          },
          {
            rotulo: "Fora do prazo",
            valor: foraDoPrazoTotal,
            nota: `${atrasado.pedidos + semPagamento.pedidos} ${atrasado.pedidos + semPagamento.pedidos === 1 ? "Pedido" : "Pedidos"}`,
            alerta: true,
          },
        ].map((k) => (
          <div
            key={k.rotulo}
            className="entra flex flex-col gap-1 rounded-lg border border-line bg-surface px-4 py-3.5"
          >
            <p className="label text-muted">{k.rotulo}</p>
            <p
              data-nums
              className={`text-num font-semibold ${k.alerta && k.valor > 0 ? "text-danger" : ""}`}
            >
              {reais(k.valor)}
            </p>
            <p data-nums className="text-caption text-muted">
              {k.nota}
            </p>
          </div>
        ))}
      </section>

      {aba === "geral" && (
        <>
          <section className="flex flex-col gap-2" aria-label="Precisa de cobrança">
            <h2 className="label text-muted">Precisa de cobrança</h2>
            <Modos
              opcoes={[atrasado, semPagamento].map((fila) => ({
                texto: COBRANCA[fila.grupo].titulo,
                href: url({ aba: "receber", modo: fila.grupo }),
                ativo: false,
                centavos: fila.valor,
                pedidos: fila.pedidos,
              }))}
            />
          </section>

          <div className="grid items-start gap-3 lg:grid-cols-[1.6fr_1fr]">
            <Bloco titulo="Vendido x Recebido">
              <Curvas pontos={serie(movimento, j)} />
            </Bloco>
            <Bloco titulo="Últimas entradas">
              <Entradas linhas={recebimentos.slice(0, 12)} />
            </Bloco>
          </div>

          <Retratil
            titulo={`${campanha.label_grupo_plural} com mais atraso`}
            resumo={
              foraDoPrazoTotal > 0
                ? `${reais(foraDoPrazoTotal)} Fora do prazo`
                : "Nada fora do prazo"
            }
          >
            <Ranking
              linhas={ranking(contas, "turma")}
              href={(l) => url({ aba: "receber", turma: l.id })}
              vazio="Nada fora do prazo nesta campanha."
            />
          </Retratil>
        </>
      )}

      {aba === "receber" && (
        <>
          <Modos
            opcoes={[
              {
                texto: "Tudo a receber",
                href: url({ modo: "tudo", faixa: undefined }),
                ativo: modo === "tudo",
                centavos: carteira.aReceber,
                pedidos: new Set(
                  contas.filter((c) => c.saldo_centavos > 0).map((c) => c.pedido_id),
                ).size,
              },
              ...[atrasado, semPagamento].map((fila) => ({
                texto: COBRANCA[fila.grupo].titulo,
                href: url({ modo: fila.grupo, faixa: undefined }),
                ativo: modo === fila.grupo,
                centavos: fila.valor,
                pedidos: fila.pedidos,
              })),
            ]}
          />

          {modo !== "tudo" && totalFaixas > 0 && (
            <FaixasAtraso
              total={totalFaixas}
              linhas={faixasDoModo.map((x) => ({
                valor: x.valor,
                curto: x.curto,
                href: url({ faixa: faixa === x.valor ? undefined : x.valor }),
                ativo: faixa === x.valor,
                valor_centavos: x.valor_centavos,
                parcelas: x.parcelas,
              }))}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Busca valor={q} placeholder="Buscar aluno" escondidos={escondidos} />
            <a
              href={`/painel/financeiro/receber/csv?modo=${modo}&campanha=${id}${turma ? `&turma=${turma}` : ""}${faixa ? `&faixa=${faixa}` : ""}`}
              className="inline-flex h-10 items-center rounded-md border border-line-strong
                bg-surface px-3.5 text-body-sm font-medium text-ink-2 transition-colors
                duration-fast ease-soft hover:border-ink hover:text-ink"
            >
              Exportar CSV
            </a>
          </div>

          {linhas.length === 0 ? (
            <p
              className="rounded-lg border border-dashed border-line-strong bg-surface px-4 py-10
                text-center text-body-sm text-muted"
            >
              {termo
                ? "Ninguém com esse nome nesta fila."
                : "Nada nesta fila. É o resultado que se quer."}
            </p>
          ) : (
            <TabelaReceber
              linhas={linhas}
              url={(extra) => url(extra)}
              colunas={{ turma: !turma, campanha: false }}
              destaque={detalhe?.id}
              total={totalDaLista}
            />
          )}
        </>
      )}

      {aba === "entradas" && (
        <Bloco
          titulo="Entradas"
          acao={
            <span data-nums className="text-caption text-muted">
              {reais(noPeriodo.recebido)} No período
            </span>
          }
        >
          <Entradas linhas={recebimentos} limite={20} />
        </Bloco>
      )}

      {aba === "turmas" && (
        <Bloco titulo={campanha.label_grupo_plural}>
          <ul className="divide-y divide-line">
            {grupos
              .slice()
              .sort(
                (x, y) =>
                  y.vencido_centavos +
                  y.atrasado_vencido_centavos -
                  (x.vencido_centavos + x.atrasado_vencido_centavos),
              )
              .map((g) => {
                const fora = g.vencido_centavos + g.atrasado_vencido_centavos;
                return (
                  <li key={g.id}>
                    <Link
                      href={url({ aba: "receber", turma: g.id })}
                      className="flex flex-col gap-2 px-4 py-3 transition-colors duration-fast
                        ease-soft hover:bg-surface-2"
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-body-sm font-semibold">
                          {campanha.label_grupo} {g.nome}
                        </span>
                        <span className="shrink-0 text-right">
                          <Valor centavos={g.a_receber_centavos} tom="forte" />
                          <span className="block text-caption text-muted">A receber</span>
                        </span>
                      </span>
                      <Barra parte={g.recebido_centavos} total={g.vendido_centavos || 1} />
                      <span data-nums className="text-caption text-muted">
                        {pct(g.recebido_centavos, g.vendido_centavos)}% Arrecadado · {g.pedidos}{" "}
                        {g.pedidos === 1 ? "Pedido" : "Pedidos"} · {g.pedidos_pagos} Quitados
                        {fora > 0 && (
                          <span className="text-danger">
                            {" · "}
                            {reais(fora)} Fora do prazo
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </Bloco>
      )}

      {filtros === "1" && (
        <FiltroGaveta
          fechar={url({ filtros: undefined })}
          de={de}
          ate={ate}
          // Sem `de` e `ate`: quem manda neles é o próprio formulário.
          ocultos={
            Object.fromEntries(
              Object.entries({ aba, turma, modo, faixa, q }).filter(([, v]) => v),
            ) as Record<string, string>
          }
        />
      )}

      {detalhe && contaDoDetalhe && (
        <DetalhePedido
          pedido={detalhe}
          turma={contaDoDetalhe.grupo_nome}
          campanha={campanha.nome}
          labelGrupo={campanha.label_grupo}
          fechar={url({ pedido: undefined })}
        />
      )}
    </>
  );
}

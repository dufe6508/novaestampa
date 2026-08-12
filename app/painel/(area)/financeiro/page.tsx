import Link from "next/link";
import { diasEntre, hojeNoFuso, somarDias } from "@/lib/data";
import { reais } from "@/lib/formato";
import { listarClientes, listarTodasCampanhas, pct, type CampanhaResumo } from "@/lib/painel";
import {
  COBRANCA,
  PERIODO_PADRAO,
  aVencer,
  ehData,
  ehTudo,
  entrouDireto,
  filas,
  janela,
  janelaEntre,
  listarContasReceber,
  listarMovimento,
  listarRecebimentos,
  listarUltimasEntradas,
  posicao,
  porFaixa,
  ranking,
  serie,
  somarMovimento,
  variacao,
  type ContaReceber,
  type MovimentoDia,
} from "@/lib/financeiro";
import { Abas, Barra, Bloco, Kpi, Kpis, Retratil, Topo } from "@/components/painel";
import { Curvas, Delta, Entradas, Fio, Modos, Ranking } from "@/components/financeiro";
import { BotaoFiltros, FiltroGaveta } from "@/components/filtro-gaveta";
import { Seta } from "@/components/icones";

/**
 * Financeiro · a empresa inteira e cada escola, na mesma tela.
 *
 * **Cliente é aba, não filtro.** A escola era uma escolha escondida atrás do
 * botão Filtros, e a lista de escolas repetia lá embaixo a mesma navegação, com
 * outro desenho. Agora a faixa de abas responde "de quem eu quero ver o
 * dinheiro" no primeiro toque, e a seção de escolas saiu por ter virado
 * redundante.
 *
 * Duas réguas que valem na tela toda:
 *
 * · **Posição não tem período.** Vendido, recebido e a receber são a foto de hoje;
 *   o período manda no movimento e no gráfico. Parcela em aberto não tem data de
 *   recebimento, então "vencido nos últimos 30 dias" não significa nada.
 * · **Filtro é só data.** Escola virou aba e campanha tem tela própria, então
 *   sobrou o intervalo, que é a única coisa que a navegação não resolve.
 */

type Query = {
  cliente?: string;
  de?: string;
  ate?: string;
  filtros?: string;
};

type Alerta = { texto: string; valor: string; href: string };

function alertas({
  contas,
  hoje,
  escopo,
  campanhas,
}: {
  contas: ContaReceber[];
  hoje: string;
  escopo: string;
  campanhas: CampanhaResumo[];
}): Alerta[] {
  const lista: Alerta[] = [];
  const [atrasado, semPagamento] = filas(contas);
  const faixas = porFaixa(contas);

  const vencendoHoje = contas.filter((c) => c.saldo_centavos > 0 && c.vencimento === hoje);
  if (vencendoHoje.length > 0) {
    lista.push({
      texto: `${vencendoHoje.length} ${vencendoHoje.length === 1 ? "Parcela vence" : "Parcelas vencem"} hoje`,
      valor: reais(vencendoHoje.reduce((t, c) => t + c.saldo_centavos, 0)),
      href: `/painel/financeiro/receber?modo=tudo${escopo}`,
    });
  }

  const antigo = faixas
    .filter((f) => f.valor === "31a60" || f.valor === "mais60")
    .reduce((t, f) => t + f.valor_centavos, 0);
  if (antigo > 0) {
    lista.push({
      texto: "Fora do prazo há mais de 30 dias",
      valor: reais(antigo),
      href: `/painel/financeiro/receber?modo=atrasado&faixa=mais60${escopo}`,
    });
  }

  if (atrasado.naOficina > 0) {
    lista.push({
      texto: "Peça na oficina com parcela vencida",
      valor: reais(atrasado.naOficina),
      href: `/painel/financeiro/receber?modo=atrasado&oficina=1${escopo}`,
    });
  }

  // Arrecadação contra o prazo: é a única que ainda dá tempo de corrigir.
  for (const c of campanhas) {
    if (!c.entrega_prevista || !c.vendido_centavos) continue;
    const dias = diasEntre(hoje, c.entrega_prevista);
    const arrecadado = pct(c.recebido_centavos, c.vendido_centavos);
    if (dias < 0 || dias > 30 || arrecadado >= 80) continue;
    lista.push({
      texto: `${c.nome} · ${arrecadado}% Arrecadado · Entrega em ${dias} ${dias === 1 ? "Dia" : "Dias"}`,
      valor: reais(c.vendido_centavos - c.recebido_centavos),
      href: `/painel/financeiro/campanha/${c.id}`,
    });
  }

  if (semPagamento.pedidos > 0) {
    lista.push({
      texto: `${semPagamento.pedidos} ${semPagamento.pedidos === 1 ? "Pedido" : "Pedidos"} sem nenhum pagamento e fora do prazo`,
      valor: reais(semPagamento.valor),
      href: `/painel/financeiro/receber?modo=sem_pagamento${escopo}`,
    });
  }

  return lista.slice(0, 5);
}

/** Cartão de posição: um número manda, o resto desce para a legenda. */
function Posicao({
  rotulo,
  valor,
  nota,
  fio,
}: {
  rotulo: string;
  valor: string;
  nota: React.ReactNode;
  fio?: number[];
}) {
  return (
    <div className="entra flex flex-col gap-1 rounded-lg border border-line bg-surface px-4 py-3.5">
      <p className="label text-muted">{rotulo}</p>
      <p data-nums className="text-num-lg font-semibold">
        {valor}
      </p>
      <p className="text-caption leading-snug text-muted">{nota}</p>
      {fio && fio.length > 1 && (
        <div className="mt-1 text-faint">
          <Fio valores={fio} />
        </div>
      )}
    </div>
  );
}

/** Série acumulada dos últimos 30 dias, para o fio do cartão. */
function fioDe(
  movimento: MovimentoDia[],
  campo: "vendido_centavos" | "recebido_centavos",
  hoje: string,
) {
  const de = somarDias(hoje, -29);
  const porDia = new Map<string, number>();
  for (let i = 0; i < 30; i++) porDia.set(somarDias(de, i), 0);
  for (const m of movimento) {
    if (m.dia < de || m.dia > hoje) continue;
    porDia.set(m.dia, (porDia.get(m.dia) ?? 0) + m[campo]);
  }

  let total = 0;
  return [...porDia.values()].map((v) => (total += v));
}

/** Data curta, para a faixa de filtro dizer o intervalo sem abrir a gaveta. */
const DIA_CURTO = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

function dataCurta(d: string) {
  return DIA_CURTO.format(new Date(`${d}T12:00:00Z`));
}

export default async function Financeiro({ searchParams }: { searchParams: Promise<Query> }) {
  const { cliente, de: deQuery, ate: ateQuery, filtros } = await searchParams;

  const [contas, movimento, entradas, recebimentos, campanhas, clientes] = await Promise.all([
    listarContasReceber(cliente),
    listarMovimento(cliente),
    listarUltimasEntradas(cliente),
    listarRecebimentos(cliente),
    listarTodasCampanhas(),
    listarClientes(),
  ]);

  const hoje = hojeNoFuso();
  const de = ehData(deQuery) ? deQuery : undefined;
  const ate = ehData(ateQuery) ? ateQuery : undefined;
  const intervalo = !!(de && ate);
  const j = intervalo ? janelaEntre(de!, ate!) : janela(PERIODO_PADRAO, hoje);

  const carteira = posicao(movimento, contas);
  const [atrasado, semPagamento] = filas(contas);
  const direto = entrouDireto(recebimentos);
  const proximos7 = aVencer(contas, 7, hoje);
  const foraDoPrazoTotal = atrasado.valor + semPagamento.valor;

  const noPeriodo = somarMovimento(movimento, j.de, j.ate);
  const noAnterior = somarMovimento(movimento, j.anterior.de, j.anterior.ate);
  const deHoje = somarMovimento(movimento, hoje, hoje);
  const deOntem = somarMovimento(movimento, somarDias(hoje, -1), somarDias(hoje, -1));

  // O escopo viaja nos links de drill-down, para a lista abrir no mesmo corte.
  const escopo = cliente ? `&cliente=${cliente}` : "";

  const base = "/painel/financeiro";
  const url = (extra: Partial<Query>) => {
    const q = new URLSearchParams();
    const campos = { cliente, de, ate, filtros, ...extra };
    for (const [k, v] of Object.entries(campos)) if (v) q.set(k, String(v));
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };

  const linhasAtencao = alertas({
    contas,
    hoje,
    escopo,
    campanhas: campanhas.filter((c) => (cliente ? c.cliente_id === cliente : true)),
  });

  // Concentração: um nível abaixo do escopo. Na empresa inteira, escolas; dentro
  // de uma escola, turmas. Ranking de um item só não é ranking.
  const nivel = cliente ? "turma" : "cliente";
  const concentracao = ranking(contas, nivel);

  const pontos = serie(movimento, j);
  const comparavel = !ehTudo(j);

  // As escolas viram abas, na ordem do que tem mais a receber: quem abre esta
  // tela abre pelo problema, não pelo alfabeto.
  const comMovimento = clientes
    .filter((c) => c.pedidos > 0)
    .sort((a, b) => b.a_receber_centavos - a.a_receber_centavos);

  const escolaAberta = comMovimento.find((c) => c.id === cliente);
  const daEscola = escolaAberta
    ? campanhas
        .filter((c) => c.cliente_id === escolaAberta.id)
        .sort(
          (a, b) =>
            Number(b.status === "aberta") - Number(a.status === "aberta") ||
            (a.entrega_prevista ?? "9999").localeCompare(b.entrega_prevista ?? "9999"),
        )
    : [];

  return (
    <>
      <Topo
        titulo="Financeiro"
        subtitulo={
          escolaAberta ? escolaAberta.nome : "Todas as escolas, campanhas e turmas somadas."
        }
        acoes={
          <div className="flex items-center gap-2">
            <BotaoFiltros href={url({ filtros: "1" })} ativos={intervalo ? 1 : 0} />
            <Link
              href={`/painel/financeiro/receber${escopo ? `?modo=tudo${escopo}` : ""}`}
              className="inline-flex h-10 items-center rounded-md bg-ink px-3.5 text-body-sm
                font-medium text-white transition-opacity duration-fast ease-soft
                hover:opacity-90 active:scale-[0.98] focus-visible:outline focus-visible:outline-2
                focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
            >
              Contas a receber
            </Link>
          </div>
        }
      />

      <Abas
        opcoes={[
          { texto: "Visão geral", href: url({ cliente: undefined }), ativo: !cliente },
          ...comMovimento.map((c) => ({
            texto: c.nome,
            href: url({ cliente: c.id }),
            ativo: cliente === c.id,
          })),
        ]}
      />

      {intervalo && (
        <p className="text-caption text-muted">
          Movimento de <span data-nums>{dataCurta(j.de)}</span> a{" "}
          <span data-nums>{dataCurta(j.ate)}</span>.{" "}
          <Link
            href={url({ de: undefined, ate: undefined })}
            className="font-medium text-ink underline-offset-2 hover:underline"
          >
            Limpar
          </Link>
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Posição da carteira, hoje">
        <Posicao
          rotulo="Vendido"
          valor={reais(carteira.vendido)}
          nota={`${carteira.pedidos} ${carteira.pedidos === 1 ? "Pedido" : "Pedidos"} desde o início`}
          fio={fioDe(movimento, "vendido_centavos", hoje)}
        />
        <Posicao
          rotulo="Recebido"
          valor={reais(carteira.recebido)}
          nota={`${carteira.arrecadado}% Do vendido`}
          fio={fioDe(movimento, "recebido_centavos", hoje)}
        />
        <Posicao
          rotulo="A receber"
          valor={reais(carteira.aReceber)}
          nota={
            <>
              {reais(foraDoPrazoTotal)} Fora do prazo · {reais(proximos7.valor_centavos)} Vence em
              7 dias
            </>
          }
        />
      </section>

      <section className="flex flex-col gap-2" aria-label="Precisa de cobrança">
        <h2 className="label text-muted">Precisa de cobrança</h2>
        <Modos
          opcoes={[atrasado, semPagamento].map((f) => ({
            texto: COBRANCA[f.grupo].titulo,
            href: `/painel/financeiro/receber?modo=${f.grupo}${escopo}`,
            ativo: false,
            centavos: f.valor,
            pedidos: f.pedidos,
          }))}
        />
        <p className="text-caption text-muted">
          {atrasado.naOficina > 0 ? (
            <>
              {reais(atrasado.naOficina)} Disso é peça que já está na oficina.{" "}
              {atrasado.maiorAtraso > 0 && `Atraso mais antigo: ${atrasado.maiorAtraso} dias.`}
            </>
          ) : (
            "Nenhuma peça na oficina com pagamento vencido."
          )}
        </p>
      </section>

      <Kpis>
        <Kpi rotulo="Recebido hoje" valor={reais(deHoje.recebido)} />
        <div className="flex flex-col gap-1 px-4 py-3.5">
          <p className="label text-muted">Recebido no período</p>
          <p data-nums className="text-num font-semibold">
            {reais(noPeriodo.recebido)}
          </p>
          {comparavel ? (
            <Delta
              valor={variacao(noPeriodo.recebido, noAnterior.recebido)}
              contra="Vs período anterior"
            />
          ) : (
            <p className="text-caption text-muted">Desde o início</p>
          )}
        </div>
        <div className="flex flex-col gap-1 px-4 py-3.5">
          <p className="label text-muted">Ontem</p>
          <p data-nums className="text-num font-semibold">
            {reais(deOntem.recebido)}
          </p>
          <Delta valor={variacao(deHoje.recebido, deOntem.recebido)} contra="Hoje contra ontem" />
        </div>
        <Kpi
          rotulo="Vendido no período"
          valor={reais(noPeriodo.vendido)}
          nota={`${noPeriodo.pedidos} ${noPeriodo.pedidos === 1 ? "Pedido novo" : "Pedidos novos"}`}
        />
      </Kpis>

      <Bloco titulo="Precisa de atenção">
        {linhasAtencao.length > 0 ? (
          <ul className="divide-y divide-line">
            {linhasAtencao.map((a) => (
              <li key={a.texto}>
                <Link
                  href={a.href}
                  className="flex items-center justify-between gap-3 px-4 py-2.5
                    transition-colors duration-fast ease-soft hover:bg-surface-2"
                >
                  <span className="min-w-0 text-body-sm">{a.texto}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span data-nums className="text-body-sm font-semibold text-danger">
                      {a.valor}
                    </span>
                    <Seta className="h-3.5 w-3.5 text-muted" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-body-sm text-muted">
            Nada exigindo ação hoje. Nenhuma parcela vencendo, nada fora do prazo e nenhuma
            campanha atrasada na arrecadação.
          </p>
        )}
      </Bloco>

      {/* `items-start` mata a faixa branca: sem isso o gráfico esticava até a
          altura do bloco vizinho e sobrava vazio embaixo da curva. */}
      <div className="grid items-start gap-3 lg:grid-cols-[1.6fr_1fr]">
        <Bloco titulo="Vendido x Recebido">
          <Curvas pontos={pontos} />
        </Bloco>
        <Bloco
          titulo="Últimas entradas"
          acao={
            <span data-nums className="text-caption text-muted">
              {direto.pct}% Direto
            </span>
          }
        >
          <Entradas linhas={entradas} />
        </Bloco>
      </div>

      {/* Dentro da escola, as campanhas dela: é o nível seguinte da navegação, e
          é lá que ficam as sub-abas de A receber, Entradas e Turmas. */}
      {escolaAberta && (
        <Bloco titulo="Campanhas">
          {daEscola.length === 0 ? (
            <p className="px-4 py-8 text-center text-body-sm text-muted">
              Esta escola ainda não tem campanha cadastrada.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {daEscola.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/painel/financeiro/campanha/${c.id}`}
                    className="flex flex-col gap-2 px-4 py-3 transition-colors duration-fast
                      ease-soft hover:bg-surface-2"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-body-sm font-semibold">{c.nome}</span>
                      <span className="shrink-0 text-right">
                        <span data-nums className="block text-body-sm font-semibold tabular-nums">
                          {reais(c.a_receber_centavos)}
                        </span>
                        <span className="text-caption text-muted">A receber</span>
                      </span>
                    </span>
                    <Barra parte={c.recebido_centavos} total={c.vendido_centavos || 1} />
                    <span data-nums className="text-caption text-muted">
                      {pct(c.recebido_centavos, c.vendido_centavos)}% Arrecadado de{" "}
                      {reais(c.vendido_centavos)} · {c.pedidos}{" "}
                      {c.pedidos === 1 ? "Pedido" : "Pedidos"}
                      {c.vencido_centavos + c.atrasado_vencido_centavos > 0 && (
                        <span className="text-danger">
                          {" · "}
                          {reais(c.vencido_centavos + c.atrasado_vencido_centavos)} Fora do prazo
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Bloco>
      )}

      <Retratil
        titulo={nivel === "cliente" ? "Onde está concentrado" : "Turmas com mais atraso"}
        resumo={
          foraDoPrazoTotal > 0 ? `${reais(foraDoPrazoTotal)} Fora do prazo` : "Nada fora do prazo"
        }
      >
        <Ranking
          linhas={concentracao}
          href={(l) =>
            nivel === "cliente"
              ? url({ cliente: l.id })
              : `/painel/financeiro/receber?modo=tudo&turma=${l.id}`
          }
          vazio="Nada fora do prazo neste escopo."
        />
      </Retratil>

      {filtros === "1" && (
        <FiltroGaveta
          fechar={url({ filtros: undefined })}
          de={de}
          ate={ate}
          ocultos={cliente ? { cliente } : {}}
        />
      )}
    </>
  );
}

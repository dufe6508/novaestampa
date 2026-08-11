import Link from "next/link";
import { notFound } from "next/navigation";
import {
  agruparCorte,
  buscarCampanha,
  data,
  listarGrupos,
  listarPedidosDaCampanha,
  listarProdutosDaCampanha,
  pct,
  resumoDeCorte,
  resumoPorProduto,
  SITUACOES,
  tamanhoLegivel,
  type GrupoResumo,
  type PedidoPainel,
  type Situacao,
} from "@/lib/painel";
import { reais } from "@/lib/formato";
import {
  Abas,
  Barra,
  Bloco,
  Busca,
  Kpi,
  Kpis,
  Quitados,
  ResumoProdutos,
  Topo,
  Valor,
} from "@/components/painel";
import { SeloCampanha } from "@/components/selo";
import { Camiseta, Lapis, Lixeira, Mais, Pacote, Seta } from "@/components/icones";
import { Vazio } from "@/components/campos";
import { CampanhaGaveta } from "@/components/campanha-gaveta";
import { ProdutoGaveta } from "@/components/produto-gaveta";
import { ListaProdutos } from "@/components/lista-produtos";
import { Confirmar } from "@/components/confirmar";
import { AcaoIcone, ItemMenu, MenuAcoes } from "@/components/menu-acoes";
import { excluirCampanha, excluirProduto } from "@/app/painel/acoes";
import { ExportarCampanhaGaveta } from "@/components/exportar-campanha-gaveta";

/**
 * E3 · Campanha, em três abas.
 *
 * A tela vinha crescendo numa coluna só: financeiro, cobrança, produtos, tabela
 * de turmas e resumo de corte empilhados, e a turma, que é o que mais se abre,
 * era a última coisa da página. Rolar até o fim para clicar no que se usa todo
 * dia é o sintoma clássico de tela que virou depósito.
 *
 * As abas separam por pergunta, não por tipo de dado:
 *
 * · **Visão geral**, como está o dinheiro e quem precisa ser cobrado hoje
 * · **Turmas**, um cartão por turma, com busca
 * · **Produção**, o que a oficina tem para cortar
 *
 * Os KPIs ficam **fora** das abas, sempre visíveis: eles são o cabeçalho da
 * campanha, não o conteúdo de uma seção. Trocar de aba não pode fazer o total
 * da campanha sumir da tela.
 *
 * Aba de produtos ainda não existe porque a tela E7 não existe (CLAUDE.md §4.2).
 * Quando existir, entra aqui como quarta aba, sem mexer em mais nada.
 */

type Query = {
  aba?: string;
  q?: string;
  editar?: string;
  excluir?: string;
  exportar?: string;
  /** `novo` cria; um id edita. */
  produto?: string;
  excluir_produto?: string;
};

/** O botão de ação da tela. Mesma peça na faixa de abas, no vazio e no aviso. */
const BOTAO = `inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-ink px-3
  text-caption font-semibold text-white transition-opacity duration-fast ease-soft
  hover:opacity-90 active:scale-[0.98] focus-visible:outline focus-visible:outline-2
  focus-visible:outline-offset-2 focus-visible:outline-brand-deep`;

function NovoProduto({ href, texto = "Novo produto" }: { href: string; texto?: string }) {
  return (
    <Link href={href} scroll={false} className={BOTAO}>
      <Mais className="h-3.5 w-3.5" />
      {texto}
    </Link>
  );
}

/**
 * Cartão de turma. Pequeno de propósito: cabem três por fileira no desktop e a
 * campanha inteira aparece sem rolar.
 *
 * Um número manda, e é **o que falta receber**, porque é ele que decide se vale
 * abrir a turma hoje. Pedidos, quitados e vencido descem para duas linhas de
 * legenda. A regra é a mesma do cartão de cliente (CLAUDE.md §5.1.1): sem rótulo
 * em caixa alta acima de número, sem sombra, e selo só na exceção, que aqui é o
 * dinheiro vencido.
 */
function CartaoTurma({
  grupo,
  atraso,
}: {
  grupo: GrupoResumo;
  atraso: number;
}) {
  const vencido = grupo.atrasado_centavos > 0;

  return (
    <li
      className="entra group relative flex flex-col rounded-lg border border-line bg-surface
        transition-colors duration-base ease-soft focus-within:border-ink-2 hover:border-ink-2"
      style={{ "--atraso": `${atraso}ms` } as React.CSSProperties}
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 truncate text-h3">
            <Link
              href={`/painel/turma/${grupo.id}`}
              className="rounded-sm after:absolute after:inset-0 after:content-['']
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-brand-deep"
            >
              {grupo.nome}
            </Link>
          </h3>
          <span className="shrink-0 font-mono text-caption tracking-wider text-muted">
            {grupo.codigo}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span
            data-nums
            className={`text-num font-semibold tracking-tight
              ${grupo.a_receber_centavos === 0 ? "text-faint" : "text-ink"}`}
          >
            {reais(grupo.a_receber_centavos)}
          </span>
          <span className="text-caption text-muted">
            A receber · {grupo.pedidos} pedidos · {grupo.pedidos_pagos} quitados
            {" ("}
            {pct(grupo.pedidos_pagos, grupo.pedidos)}%)
          </span>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <Barra parte={grupo.pedidos_pagos} total={grupo.pedidos} tom="success" />
          {vencido && (
            <span data-nums className="text-caption text-danger">
              {reais(grupo.atrasado_centavos)} vencidos em {grupo.pedidos_atrasados} pedidos
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Cobrança em um número, uma barra e três linhas.
 *
 * A versão anterior eram três cartões do mesmo tamanho, cada um com título,
 * frase explicativa, valor em corpo grande e amostra de dois pedidos. Três
 * valores grandes lado a lado é o mesmo erro do cartão de cliente (CLAUDE.md
 * §5.1.1): ninguém vence, e o saldo total, que é a resposta da pergunta
 * "quanto falta entrar", ficava miúdo no canto do cabeçalho.
 *
 * Aqui o total manda, a barra segmentada mostra a proporção entre as três filas
 * de uma olhada, e cada fila vira uma linha com contagem e valor alinhados à
 * direita, comparáveis entre si. A frase explicativa saiu (legenda instrutiva,
 * CLAUDE.md) e a amostra de dois pedidos também: dois de setenta não decidem
 * nada, e a tela de cobrança já tem a lista inteira com busca.
 */
const TOM_FILA: Record<Situacao, string> = {
  atrasado: "bg-danger",
  parcial: "bg-ink-2",
  pendente: "bg-faint",
};

type Fila = { situacao: Situacao; pedidos: PedidoPainel[]; total: number };

/**
 * Barra de uma cor por fila. Proporção do saldo, não do número de pedidos.
 *
 * Um traço só, dividido: os segmentos são encostados e sem canto próprio, e o
 * arredondamento fica nas duas pontas do trilho. Com folga entre eles a peça
 * lia como três barrinhas separadas, que é justamente o que ela veio desfazer.
 */
function BarraCobranca({ filas, saldo }: { filas: Fila[]; saldo: number }) {
  return (
    <div
      role="img"
      aria-label={filas
        .map((f) => `${SITUACOES[f.situacao].titulo}, ${pct(f.total, saldo)}%`)
        .join(". ")}
      className="flex h-1 w-full overflow-hidden rounded-full bg-line"
    >
      {saldo > 0 &&
        filas
          .filter((f) => f.total > 0)
          .map((f) => (
            <div
              key={f.situacao}
              style={{ width: `${(f.total / saldo) * 100}%` }}
              className={`h-full transition-[width] duration-slow ease-soft ${TOM_FILA[f.situacao]}`}
            />
          ))}
    </div>
  );
}

function LinhaCobranca({
  fila: { situacao, pedidos, total },
  campanhaId,
  atraso,
}: {
  fila: Fila;
  campanhaId: string;
  atraso: number;
}) {
  const { titulo } = SITUACOES[situacao];
  const alerta = situacao === "atrasado" && total > 0;
  const vazio = pedidos.length === 0;

  return (
    <li className="entra" style={{ "--atraso": `${atraso}ms` } as React.CSSProperties}>
      <Link
        href={`/painel/campanha/${campanhaId}/cobranca?s=${situacao}`}
        aria-label={`Abrir fila ${titulo}: ${pedidos.length} ${
          pedidos.length === 1 ? "pedido" : "pedidos"
        }, ${reais(total)} em aberto`}
        className="group flex items-center gap-3 px-4 py-3 transition-colors duration-base
          ease-soft hover:bg-surface-2/60 focus-visible:outline focus-visible:outline-2
          focus-visible:outline-offset-[-2px] focus-visible:outline-brand-deep"
      >
        {/* Bolinha, e só como legenda da barra: ela liga a linha ao pedaço de cor
            logo acima. O que informa continua sendo o título ao lado. */}
        <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${TOM_FILA[situacao]}`} />
        <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-ink">{titulo}</span>
        <span data-nums className="shrink-0 text-caption text-muted">
          {pedidos.length} ped.
        </span>
        <span
          data-nums
          className={`w-24 shrink-0 text-right text-body-sm font-semibold tabular-nums
            sm:w-28 ${vazio ? "text-faint" : alerta ? "text-danger" : "text-ink"}`}
        >
          {reais(total)}
        </span>
        <Seta
          className="h-3.5 w-3.5 shrink-0 text-faint transition-[color,transform] duration-fast
            ease-soft group-hover:translate-x-0.5 group-hover:text-ink-2
            motion-reduce:group-hover:translate-x-0"
        />
      </Link>
    </li>
  );
}

export default async function Campanha({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Query>;
}) {
  const { id } = await params;
  const { aba, q, editar, excluir, exportar, produto, excluir_produto } = await searchParams;

  const campanha = await buscarCampanha(id);
  if (!campanha) notFound();

  const [grupos, pedidos, corte, catalogo] = await Promise.all([
    listarGrupos(id),
    listarPedidosDaCampanha(id),
    resumoDeCorte("campanha_id", id),
    listarProdutosDaCampanha(id),
  ]);

  // As três filas de cobrança. São exclusivas entre si de propósito: a mesma
  // pessoa aparecendo em duas listas faria a soma das listas mentir.
  const porSaldo = (a: PedidoPainel, b: PedidoPainel) => b.saldo_centavos - a.saldo_centavos;
  const fila = (s: Situacao) => pedidos.filter(SITUACOES[s].vale).sort(porSaldo);
  const filasCobranca: Fila[] = (["atrasado", "parcial", "pendente"] as Situacao[]).map(
    (situacao) => {
      const pedidosDaFila = fila(situacao);
      return {
        situacao,
        pedidos: pedidosDaFila,
        total: pedidosDaFila.reduce((soma, pedido) => soma + pedido.saldo_centavos, 0),
      };
    },
  );
  const saldoEmCobranca = filasCobranca.reduce((soma, f) => soma + f.total, 0);
  const pedidosEmCobranca = filasCobranca.reduce(
    (total, grupo) => total + grupo.pedidos.length,
    0,
  );

  const produtos = resumoPorProduto(pedidos);
  const cortePorProduto = agruparCorte(corte);
  const pecasNoCorte = cortePorProduto.reduce((n, c) => n + c.total, 0);
  const pecasPorGrupo = new Map<string, number>();
  for (const linha of corte) {
    pecasPorGrupo.set(linha.grupo_id, (pecasPorGrupo.get(linha.grupo_id) ?? 0) + linha.total);
  }
  const gruposNaProducao = grupos
    .map((grupo) => ({ ...grupo, pecas: pecasPorGrupo.get(grupo.id) ?? 0 }))
    .filter((grupo) => grupo.pecas > 0);

  const termo = q?.trim().toLowerCase();
  const turmas = grupos.filter(
    (g) =>
      !termo ||
      g.nome.toLowerCase().includes(termo) ||
      g.codigo.toLowerCase().includes(termo),
  );

  const prazos = [
    { rotulo: "Pedidos até", valor: campanha.prazo_pedidos },
    { rotulo: "Alterações até", valor: campanha.prazo_alteracoes },
    { rotulo: "Entrega prevista", valor: campanha.entrega_prevista },
  ].filter((p) => p.valor);

  const base = `/painel/campanha/${id}`;
  const emTurmas = aba === "turmas";
  const emProducao = aba === "producao";
  const emProdutos = aba === "produtos";
  const estado = new URLSearchParams();
  if (emTurmas) estado.set("aba", "turmas");
  if (emProducao) estado.set("aba", "producao");
  if (emProdutos) estado.set("aba", "produtos");
  if (emTurmas && q) estado.set("q", q);
  const fechar = estado.size ? `${base}?${estado.toString()}` : base;
  const comAcao = (acao: string) =>
    `${fechar}${fechar.includes("?") ? "&" : "?"}${acao}=1`;
  const comValor = (chave: string, valor: string) =>
    `${fechar}${fechar.includes("?") ? "&" : "?"}${chave}=${valor}`;

  const emEdicao = produto && produto !== "novo"
    ? catalogo.find((p) => p.id === produto)
    : undefined;
  const paraExcluir = excluir_produto
    ? catalogo.find((p) => p.id === excluir_produto)
    : undefined;
  const prazosDaCampanha = {
    pedidos: campanha.prazo_pedidos,
    alteracoes: campanha.prazo_alteracoes,
  };

  return (
    <>
      <Topo
        voltar={`/painel/cliente/${campanha.cliente_id}`}
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
            {campanha.alunos_com_pedido}{" "}
            {campanha.alunos_com_pedido === 1 ? "aluno" : "alunos"} · entrada de{" "}
            {campanha.percentual_entrada}%
          </span>
        }
        acoes={
          <>
            <SeloCampanha status={campanha.status} />
            <AcaoIcone href={comAcao("editar")} rotulo={`Editar ${campanha.nome}`}>
              <Lapis className="h-4 w-4" />
            </AcaoIcone>
            <MenuAcoes rotulo={`Mais ações de ${campanha.nome}`}>
              <ItemMenu href={comAcao("editar")} icone={<Lapis className="h-4 w-4" />}>
                Editar campanha
              </ItemMenu>
              <ItemMenu
                href={comValor("produto", "novo")}
                icone={<Camiseta className="h-4 w-4" />}
              >
                Novo produto
              </ItemMenu>
              <ItemMenu
                href={comAcao("excluir")}
                icone={<Lixeira className="h-4 w-4" />}
                tom="perigo"
              >
                Excluir campanha
              </ItemMenu>
            </MenuAcoes>
          </>
        }
      />

      {/*
        Cada KPI carrega a contagem que o explica. Dinheiro sozinho não diz se
        são dez pedidos grandes ou duzentos pequenos, e é essa diferença que
        decide se vale a pena ligar para alguém hoje.

        Fica fora das abas: é o cabeçalho da campanha, não o miolo de uma seção.
      */}
      <div className="entra" style={{ "--atraso": "40ms" } as React.CSSProperties}>
        <Kpis>
          <Kpi
            rotulo="Vendido"
            valor={reais(campanha.vendido_centavos)}
            nota={`${campanha.pedidos} ${campanha.pedidos === 1 ? "pedido" : "pedidos"}`}
          />
          <Kpi
            rotulo="Recebido"
            valor={reais(campanha.recebido_centavos)}
            nota={`${pct(campanha.recebido_centavos, campanha.vendido_centavos)}% do vendido · ${
              campanha.pedidos_pagos
            } quitados`}
          />
          <Kpi
            rotulo="A receber"
            valor={reais(campanha.a_receber_centavos)}
            nota={`${campanha.pedidos - campanha.pedidos_pagos} ${
              campanha.pedidos - campanha.pedidos_pagos === 1 ? "pedido" : "pedidos"
            } em aberto`}
          />
          <Kpi
            rotulo="Em atraso"
            valor={reais(campanha.atrasado_centavos)}
            tom={campanha.atrasado_centavos > 0 ? "alerta" : "normal"}
            nota={
              campanha.pedidos_atrasados > 0
                ? `${campanha.pedidos_atrasados} ${
                    campanha.pedidos_atrasados === 1 ? "pedido" : "pedidos"
                  } vencidos`
                : "nada vencido"
            }
          />
        </Kpis>
      </div>

      <Abas
        atraso={80}
        opcoes={[
          { texto: "Visão geral", href: base, ativo: !emTurmas && !emProducao && !emProdutos },
          {
            texto: campanha.label_grupo_plural,
            href: `${base}?aba=turmas`,
            ativo: emTurmas,
            contagem: grupos.length,
          },
          {
            texto: "Produtos",
            href: `${base}?aba=produtos`,
            ativo: emProdutos,
            contagem: catalogo.length,
          },
          {
            texto: "Produção",
            href: `${base}?aba=producao`,
            ativo: emProducao,
            contagem: pecasNoCorte,
          },
        ]}
        // A busca só existe na aba que tem lista para filtrar. Em Produtos, o
        // lugar da direita é do botão que cria: cadastrar produto é a ação da
        // aba, e ela precisa estar à vista antes da lista, não enterrada nos
        // três pontos do cabeçalho da campanha.
        acao={
          emTurmas ? (
            <Busca
              valor={q}
              placeholder={`Buscar ${campanha.label_grupo.toLowerCase()}`}
              escondidos={{ aba: "turmas" }}
            />
          ) : emProdutos ? (
            <NovoProduto href={comValor("produto", "novo")} />
          ) : undefined
        }
      />

      {emTurmas ? (
        turmas.length === 0 ? (
          <Vazio
            icone={<Pacote className="h-8 w-8" />}
            titulo={
              grupos.length === 0
                ? `Nenhuma ${campanha.label_grupo.toLowerCase()} ainda`
                : "Nada com esse nome"
            }
            texto={
              grupos.length === 0
                ? `A ${campanha.label_grupo.toLowerCase()} é o que recebe o código de acesso do aluno.`
                : "Confira a escrita ou limpe a busca para ver todas."
            }
            acao={
              grupos.length > 0 ? (
                <Link
                  href={`${base}?aba=turmas`}
                  className="text-caption font-semibold text-ink underline"
                >
                  Limpar busca
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {turmas.map((g, i) => (
              <CartaoTurma key={g.id} grupo={g} atraso={i * 30} />
            ))}
          </ul>
        )
      ) : emProdutos ? (
        catalogo.length === 0 ? (
          <Vazio
            icone={<Camiseta className="h-8 w-8" />}
            titulo="Nenhum produto cadastrado"
            texto="O produto é o que aparece na loja do aluno. Sem ele, quem entra com o código não tem o que pedir."
            acao={
              <NovoProduto
                href={comValor("produto", "novo")}
                texto="Cadastrar o primeiro produto"
              />
            }
          />
        ) : (
          <Bloco
            titulo="Produtos"
            atraso={120}
            acao={
              <span data-nums className="text-caption text-muted">
                {catalogo.length} {catalogo.length === 1 ? "produto" : "produtos"}
              </span>
            }
          >
            <ListaProdutos produtos={catalogo} fechar={fechar} />
          </Bloco>
        )
      ) : emProducao ? (
        cortePorProduto.length === 0 ? (
          <Vazio
            icone={<Pacote className="h-8 w-8" />}
            titulo="Nenhuma peça liberada"
            texto="Só entra na produção quem pagou a entrada. Confira as filas de cobrança na visão geral."
            acao={
              <Link href={base} className="text-caption font-semibold text-ink underline">
                Ver a visão geral
              </Link>
            }
          />
        ) : (
          <Bloco
            titulo="Quantidades para corte"
            atraso={120}
            acao={
              <div className="flex items-center gap-3">
                <span data-nums className="hidden text-caption text-muted sm:inline">
                  {pecasNoCorte} {pecasNoCorte === 1 ? "peça" : "peças"}
                </span>
                <Link href={comAcao("exportar")} scroll={false} className={BOTAO}>
                  Exportar listas
                </Link>
              </div>
            }
          >
            <p className="border-b border-line px-4 py-2.5 text-caption leading-relaxed text-muted">
              Consolidação das peças liberadas para produção, agrupadas por produto e tamanho.
            </p>
            <div className="divide-y divide-line">
              {cortePorProduto.map((c) => (
                <div
                  key={c.produto}
                  className="grid gap-3 px-4 py-3.5 md:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.3fr)]
                    md:items-center md:gap-6"
                >
                  <div className="flex min-w-0 items-baseline justify-between gap-3 md:block">
                    <h3 className="min-w-0 truncate text-body-sm font-semibold text-ink">
                      {c.produto}
                    </h3>
                    <span data-nums className="shrink-0 text-caption text-muted md:mt-0.5 md:block">
                      {c.total} {c.total === 1 ? "peça liberada" : "peças liberadas"}
                    </span>
                  </div>

                  <dl className="flex flex-wrap overflow-hidden rounded-md bg-surface-2">
                    {c.tamanhos.map((t) => (
                      <div
                        key={t.tamanho}
                        className="flex min-w-16 flex-1 flex-col items-center gap-0.5 border-l
                          border-line px-2.5 py-2 first:border-l-0"
                      >
                        <dt className="label text-muted">{tamanhoLegivel(t.tamanho)}</dt>
                        <dd data-nums className="text-body-sm font-semibold text-ink">
                          {t.total}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </Bloco>
        )
      ) : (
        <>
          {/*
            Campanha recém-criada cai aqui, na visão geral, com tudo zerado e
            nenhum caminho óbvio para o passo seguinte. Sem produto a loja não
            existe, então o aviso mora na primeira tela e some sozinho quando o
            primeiro produto entra.
          */}
          {catalogo.length === 0 && (
            <div
              className="entra flex flex-wrap items-center justify-between gap-3 rounded-lg
                border border-dashed border-line-strong bg-surface px-4 py-3.5"
              style={{ "--atraso": "100ms" } as React.CSSProperties}
            >
              <p className="flex min-w-0 items-center gap-3 text-body-sm text-ink-2">
                <Camiseta className="h-5 w-5 shrink-0 text-faint" />
                A loja desta campanha está vazia. Sem produto, quem entra com o código não
                tem o que pedir.
              </p>
              <NovoProduto href={comValor("produto", "novo")} texto="Cadastrar produto" />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Bloco titulo="Recebimento" atraso={120}>
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

            {/* Pedidos quitados, não adesão. Adesão exigiria saber quantos alunos
                a turma tem, e ninguém informou esse número. Isto aqui os próprios
                pedidos respondem. */}
            <Bloco titulo="Pedidos quitados" atraso={120}>
              <div className="flex flex-col gap-3 px-4 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-body-sm text-muted">
                    <Quitados pagos={campanha.pedidos_pagos} total={campanha.pedidos} /> de{" "}
                    <span data-nums>{campanha.pedidos}</span> pedidos
                  </span>
                  <span data-nums className="text-num font-semibold">
                    {pct(campanha.pedidos_pagos, campanha.pedidos)}%
                  </span>
                </div>
                <Barra parte={campanha.pedidos_pagos} total={campanha.pedidos} />
                <dl className="grid grid-cols-2 gap-x-4 border-t border-line pt-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-caption text-muted">Alunos</dt>
                    <dd data-nums className="text-body-sm font-semibold">
                      {campanha.alunos_com_pedido}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-caption text-muted">Peças</dt>
                    <dd data-nums className="text-body-sm font-semibold">
                      {produtos.reduce((n, p) => n + p.pecas, 0)}
                    </dd>
                  </div>
                </dl>
              </div>
            </Bloco>
          </div>

          <Bloco titulo="Acompanhamento de pagamentos" atraso={160}>
            <div className="flex flex-col gap-3 px-4 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="flex items-baseline gap-2">
                  <span
                    data-nums
                    className={`text-num-lg font-semibold tracking-tight
                      ${saldoEmCobranca === 0 ? "text-faint" : "text-ink"}`}
                  >
                    {reais(saldoEmCobranca)}
                  </span>
                  <span className="text-body-sm text-muted">em aberto</span>
                </p>
                <span data-nums className="text-caption text-muted">
                  {pedidosEmCobranca} {pedidosEmCobranca === 1 ? "pedido" : "pedidos"}
                </span>
              </div>
              <BarraCobranca filas={filasCobranca} saldo={saldoEmCobranca} />
            </div>

            <ul className="divide-y divide-line border-t border-line">
              {filasCobranca.map((f, i) => (
                <LinhaCobranca key={f.situacao} fila={f} campanhaId={id} atraso={200 + i * 30} />
              ))}
            </ul>
          </Bloco>

          {produtos.length > 0 && (
            <Bloco titulo="Vendas por produto" atraso={240}>
              <ResumoProdutos linhas={produtos} />
            </Bloco>
          )}
        </>
      )}

      {exportar && emProducao && gruposNaProducao.length > 0 && (
        <ExportarCampanhaGaveta
          campanhaId={campanha.id}
          campanha={campanha.nome}
          labelGrupoPlural={campanha.label_grupo_plural}
          turmas={gruposNaProducao}
          fechar={fechar}
        />
      )}

      {editar && !excluir && <CampanhaGaveta campanha={campanha} fechar={fechar} />}

      {(produto === "novo" || emEdicao) && !paraExcluir && (
        <ProdutoGaveta
          campanhaId={campanha.id}
          produto={emEdicao}
          prazosDaCampanha={prazosDaCampanha}
          fechar={fechar}
        />
      )}

      {paraExcluir && (
        <Confirmar
          titulo="Excluir produto"
          subtitulo={paraExcluir.nome}
          consequencia={
            paraExcluir.pedidos > 0 ? (
              <>
                Este produto já tem {paraExcluir.pedidos}{" "}
                {paraExcluir.pedidos === 1 ? "pedido" : "pedidos"} e não pode ser excluído.
                Oculte da loja em vez disso: os pedidos continuam, e ele some da vitrine.
              </>
            ) : (
              <>
                Apaga o produto e as fotos dele. Não tem como desfazer. Produto com pedido
                não pode ser excluído.
              </>
            )
          }
          acao={excluirProduto}
          botao="Excluir para sempre"
          pendenteTexto="Excluindo…"
          ocultos={{ produto_id: paraExcluir.id, voltar: fechar }}
          fechar={fechar}
        />
      )}

      {excluir && (
        <Confirmar
          titulo="Excluir campanha"
          subtitulo={campanha.nome}
          consequencia={
            <>
              Apaga a campanha, as {campanha.label_grupo_plural.toLowerCase()} e os produtos
              dela. Não tem como desfazer. Campanha com pedido não pode ser excluída.
            </>
          }
          acao={excluirCampanha}
          botao="Excluir para sempre"
          pendenteTexto="Excluindo…"
          ocultos={{
            campanha_id: campanha.id,
            voltar: `/painel/cliente/${campanha.cliente_id}`,
          }}
          fechar={fechar}
        />
      )}
    </>
  );
}

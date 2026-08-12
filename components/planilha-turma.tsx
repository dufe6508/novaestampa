import Link from "next/link";
import {
  buscarPedido,
  data,
  ehFiltro,
  filtrar,
  FILTROS,
  listarPedidosDaTurma,
  pecasParaProduzir,
  posicaoDoTamanho,
  resumoPorProduto,
  somar,
  tamanhoLegivel,
  type CampanhaResumo,
  type Filtro,
  type GrupoResumo,
  type PedidoPainel,
} from "@/lib/painel";
import { capitalizarNome, reais } from "@/lib/formato";
import { Abas, Busca, Chips, ResumoProdutos, Retratil, SubAbas, Valor } from "./painel";
import { DetalhePedido } from "./detalhe-pedido";
import { ExportarGaveta } from "./exportar-gaveta";
import { Pacote } from "./icones";
import { Vazio } from "./campos";
import { SeloPagamento } from "./selo";
import { FinanceiroDaTurma } from "./financeiro-turma";

/**
 * A lista da turma. Duas abas, e elas não são a mesma lista com um filtro.
 *
 * · Pedidos, uma linha por pedido. É a visão do dinheiro: quem pagou, quem
 *   deve, quem está vencido. Quem pediu duas blusas aparece duas vezes, porque
 *   são duas cobranças.
 * · Produção, uma linha por peça física. É a visão da oficina, e é a que
 *   exporta. Kit vira duas linhas, e o mesmo aluno com dois pedidos vira duas
 *   linhas, que é exatamente o que a produção precisa cortar.
 *
 * Denso de propósito. Quem abre isso está conferindo nome por nome contra o
 * que tem no papel, e cada linha alta a mais é um nome a menos na tela.
 *
 * Filtro, busca e detalhe vivem na URL: o voltar fecha o detalhe, o endereço
 * pode ser mandado para outra pessoa, e a lista não perde o lugar.
 */

export type QueryPlanilha = {
  aba?: string;
  /** Produto da sub-aba. Vazio na aba Pedidos quer dizer "todos". */
  p?: string;
  f?: string;
  q?: string;
  /** Tamanho, só na aba Produção. Vazio é a grade inteira. */
  t?: string;
  pedido?: string;
  /** Gaveta de exportação aberta. */
  exportar?: string;
};

export function montarUrl(base: string, q: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

/**
 * Alinhamento por tipo de dado, e não tudo no centro.
 *
 * Centralizar a tabela inteira era o que fazia ela parecer apertada mesmo com
 * espaço sobrando: nome, produto e tamanho começavam em pontos diferentes a
 * cada linha, então o olho não tinha onde descer, e dinheiro centralizado
 * desalinha a vírgula, que é justamente o que se compara numa coluna de valor.
 *
 * A regra é a de CLAUDE.md §5.1.2, que já valia para a tabela de turmas e não
 * tinha sido aplicada aqui: texto à esquerda, contagem no centro, dinheiro à
 * direita. Cabeçalho segue o alinhamento da coluna dele, senão o rótulo aponta
 * para um lado e o dado para o outro.
 */
const TH_BASE = "label whitespace-nowrap px-3 py-2.5 text-muted font-semibold";
const TH_E = `${TH_BASE} text-left`;
const TH_C = `${TH_BASE} text-center`;
const TH_D = `${TH_BASE} text-right`;

const TD_BASE = "px-3 py-2.5 align-middle";
const TD_E = `${TD_BASE} text-left`;
const TD_C = `${TD_BASE} text-center`;
const TD_D = `${TD_BASE} text-right`;

/**
 * O status do pedido é o chip do resto do painel (`SeloPagamento`), não mais um
 * traço colorido colado na borda esquerda da linha.
 *
 * O traço era decoração com pretensão de dado: fininho, sem texto, encostado no
 * canto onde ninguém procura informação, e em lista longa virava uma coluna de
 * riscos que não se lê. Pior, duplicava o que a legenda cinza embaixo do nome já
 * dizia, com uma escala de cor própria (verde, âmbar, vermelho, cinza) que não
 * era a de nenhum outro lugar do sistema.
 *
 * O chip tom sobre tom já é a decisão travada em CLAUDE.md §5.1.2, e traz junto
 * o texto, que é o que sobrevive a quem não distingue as cores.
 */

/** Tamanhos de um pedido. Kit tem mais de uma peça, e cada uma conta. */
function tamanhos(pedido: PedidoPainel) {
  return pedido.itens.map((i) => tamanhoLegivel(i.tamanho)).join(" + ");
}

export async function PlanilhaTurma({
  grupo,
  campanha,
  base,
  query,
  financeiro,
}: {
  grupo: GrupoResumo;
  campanha: CampanhaResumo;
  /** Endereço desta lista. Todo link é montado em cima dele. */
  base: string;
  query: QueryPlanilha;
  /**
   * Liga a aba Financeiro. Só o painel da empresa passa isto: a gestão do
   * representante existe para cobrar pessoa, não para ler a posição da turma, e
   * o papel dele no banco ainda não existe (CLAUDE.md §3.3). Quando existir, a
   * decisão volta a ser de permissão, não de prop.
   */
  financeiro?: boolean;
}) {
  const { aba, p: produtoQuery, f, q, t, pedido: pedidoId, exportar } = query;
  const naProducao = aba === "producao";
  const noFinanceiro = financeiro === true && aba === "financeiro";
  const filtro: Filtro = ehFiltro(f) ? f : "todos";

  const todos = await listarPedidosDaTurma(grupo.id);
  const termo = q?.trim().toLowerCase();
  const todasAsPecas = pecasParaProduzir(todos);

  // Produtos que existem nesta turma, do que tem mais pedido para o que tem
  // menos. É essa lista que vira sub-aba nas duas abas.
  const produtos = [...new Set(todos.map((x) => x.produto_nome_snapshot))].sort(
    (a, b) =>
      todos.filter((x) => x.produto_nome_snapshot === b).length -
      todos.filter((x) => x.produto_nome_snapshot === a).length,
  );

  // Na aba Pedidos, sem sub-aba escolhida quer dizer todos. Na Produção não
  // existe "todos": a oficina corta um produto de cada vez, e o arquivo que
  // ela exporta é de um produto só.
  const produto =
    produtoQuery && produtos.includes(produtoQuery)
      ? produtoQuery
      : naProducao
        ? produtos[0]
        : undefined;

  const lista = filtrar(todos, filtro, q).filter(
    (x) => !produto || x.produto_nome_snapshot === produto,
  );
  const total = somar(lista);

  // As peças do produto aberto, antes do filtro de tamanho: é dessa lista que
  // saem as contagens dos botões de tamanho e as opções da exportação. Filtrar
  // antes faria cada botão mostrar a contagem do tamanho já escolhido.
  const pecasDoProduto = todasAsPecas
    .filter((x) => !termo || x.aluno_nome.toLowerCase().includes(termo))
    .filter((x) => !produto || x.produto === produto);

  const tamanhosDoProduto = [
    ...pecasDoProduto
      .reduce(
        (m, x) => m.set(x.tamanho, (m.get(x.tamanho) ?? 0) + x.quantidade),
        new Map<string, number>(),
      )
      .entries(),
  ]
    .map(([tamanho, total]) => ({ tamanho, total }))
    .sort((a, b) => posicaoDoTamanho(a.tamanho) - posicaoDoTamanho(b.tamanho));

  const tamanho = t && tamanhosDoProduto.some((x) => x.tamanho === t) ? t : undefined;
  const pecas = pecasDoProduto.filter((x) => !tamanho || x.tamanho === tamanho);

  const url = (extra: Partial<QueryPlanilha>) =>
    montarUrl(base, { aba, p: produtoQuery, f, q, t: tamanho, ...extra } as Record<
      string,
      string | undefined
    >);

  const aberto = pedidoId ? await buscarPedido(pedidoId) : null;

  // Pedido de outra turma não abre aqui. Sem isso, trocar o id na URL mostraria
  // o financeiro de uma turma que não é a da pessoa.
  const detalhe = aberto?.grupo_id === grupo.id ? aberto : null;

  const abas = [
    {
      texto: "Pedidos",
      ativo: !naProducao && !noFinanceiro,
      href: montarUrl(base, { q }),
      contagem: todos.length,
    },
    {
      texto: "Produção",
      ativo: naProducao,
      href: montarUrl(base, { aba: "producao", q }),
      contagem: todasAsPecas.length,
    },
    ...(financeiro
      ? [
          {
            texto: "Financeiro",
            ativo: noFinanceiro,
            href: montarUrl(base, { aba: "financeiro" }),
          },
        ]
      : []),
  ];

  return (
    <>
      <Abas
        atraso={40}
        opcoes={abas}
        acao={<Busca valor={q} placeholder="Buscar Aluno" escondidos={{ aba }} />}
      />

      {produtos.length > 1 && !noFinanceiro && (
        <div
          className="entra -mt-1 flex flex-wrap items-center gap-2"
          style={{ "--atraso": "80ms" } as React.CSSProperties}
        >
          <SubAbas
            opcoes={[
              // "Todos" só na aba Pedidos: lá a lista é de cobrança e faz
              // sentido ver a turma inteira de uma vez.
              ...(naProducao
                ? []
                : [
                    {
                      texto: "Todos",
                      href: montarUrl(base, { aba, f, q }),
                      ativo: !produto,
                      contagem: todos.length,
                    },
                  ]),
              ...produtos.map((nome) => ({
                texto: nomeCurto(nome),
                href: montarUrl(base, { aba, f, q, p: nome }),
                ativo: produto === nome,
                contagem: naProducao
                  ? todasAsPecas.filter((x) => x.produto === nome).length
                  : todos.filter((x) => x.produto_nome_snapshot === nome).length,
              })),
            ]}
          />
        </div>
      )}

      {!naProducao && !noFinanceiro && (
        <div
          className="entra -mt-1"
          style={{ "--atraso": "100ms" } as React.CSSProperties}
        >
          <Chips
            opcoes={(Object.keys(FILTROS) as Filtro[]).map((k) => ({
              texto: capitalizarNome(FILTROS[k].texto),
              href: montarUrl(base, { q, p: produtoQuery, f: k === "todos" ? undefined : k }),
              ativo: filtro === k,
              contagem: todos
                .filter((x) => !produto || x.produto_nome_snapshot === produto)
                .filter(FILTROS[k].vale).length,
            }))}
          />
        </div>
      )}

      {/*
        Visão geral do que está na tela: quantas camisas, quantos moletons, e
        quanto de cada um já foi pago. Fechado por padrão, porque a pergunta do
        dia a dia é sobre uma pessoa, não sobre o total; quem precisa do total
        precisa dele inteiro, e aí abre.
      */}
      {!naProducao && !noFinanceiro && lista.length > 0 && (
        <Retratil
          titulo="Por Produto"
          resumo={`${lista.length} ${lista.length === 1 ? "Pedido" : "Pedidos"} Nesta Lista`}
          atraso={110}
        >
          <ResumoProdutos linhas={resumoPorProduto(lista)} />
        </Retratil>
      )}

      {noFinanceiro ? (
        <FinanceiroDaTurma grupoId={grupo.id} url={url} />
      ) : naProducao ? (
        <Producao
          pecas={pecas}
          produto={produto}
          vazio={todos.length === 0}
          base={base}
          tamanhos={tamanhosDoProduto}
          tamanho={tamanho}
          url={url}
        />
      ) : lista.length === 0 ? (
        <Vazio
          icone={<Pacote className="h-8 w-8" />}
          titulo={todos.length === 0 ? "Nenhum pedido ainda" : "Nenhum pedido com esses filtros"}
          texto={
            todos.length === 0
              ? `Assim que alguém da ${campanha.label_grupo.toLowerCase()} ${grupo.nome} pedir, aparece aqui. O código de acesso é ${grupo.codigo}.`
              : "Limpe a busca ou escolha outro filtro para ver o resto da lista."
          }
          acao={
            todos.length > 0 ? (
              <Link href={base} className="text-caption font-semibold text-ink underline">
                Ver todos
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop. A tabela rola dentro do card, a página nunca. */}
          <div
            className="entra hidden overflow-hidden rounded-lg border border-line bg-surface
              md:block"
            style={{ "--atraso": "120ms" } as React.CSSProperties}
          >
            <div className="overflow-x-auto">
              {/*
                O selo saiu de baixo do nome e foi para o lado dele. Empilhado,
                ele fazia toda linha ter duas alturas e formava uma coluna de
                cor no meio do nome, que é onde o olho desce procurando pessoa.
                Ao lado, ele qualifica o nome, que é o que ele faz.

                As larguras deixaram de ser sete fatias quase iguais: quem
                carrega texto (aluno, produto, tamanho) ganhou espaço, e as de
                dinheiro só precisam caber "R$ 159,90".
              */}
              <table className="w-full min-w-[880px] table-fixed border-collapse text-body-sm">
                <colgroup>
                  <col className="w-[27%]" />
                  <col className="w-[18%]" />
                  <col className="w-[13%]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                  <col className="w-[12%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-line bg-surface-2">
                    <th className={TH_E}>Aluno</th>
                    <th className={TH_E}>Produto</th>
                    <th className={TH_E}>Tam.</th>
                    <th className={TH_D}>Valor</th>
                    <th className={TH_D}>Pago</th>
                    <th className={TH_D}>Falta pagar</th>
                    <th className={TH_D}>Feito</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((p, i) => {
                    const repetido = i > 0 && lista[i - 1].aluno_nome === p.aluno_nome;
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-line transition-colors duration-fast
                          ease-soft last:border-0 hover:bg-surface-2
                          ${detalhe?.id === p.id ? "bg-surface-2" : ""}`}
                      >
                        <td className={TD_E}>
                          <div className="flex min-w-0 items-center gap-2">
                            <Link
                              href={url({ pedido: p.id })}
                              scroll={false}
                              className={`min-w-0 truncate font-medium underline-offset-2 hover:underline
                                ${repetido ? "text-muted" : "text-ink"}`}
                            >
                              {capitalizarNome(p.aluno_nome)}
                            </Link>
                            <SeloPagamento status={p.status_pagamento} />
                          </div>
                        </td>
                        <td
                          className={`${TD_E} truncate text-ink-2`}
                          title={capitalizarNome(p.produto_nome_snapshot)}
                        >
                          {capitalizarNome(p.produto_nome_snapshot)}
                        </td>
                        <td className={`${TD_E} truncate text-ink-2`} title={tamanhos(p)}>
                          {tamanhos(p)}
                        </td>
                        <td className={TD_D}>
                          <Valor centavos={p.valor_centavos} />
                        </td>
                        <td className={TD_D}>
                          <Valor centavos={p.pago_centavos} />
                        </td>
                        <td className={TD_D}>
                          <Valor
                            centavos={p.saldo_centavos}
                            tom={p.status_pagamento === "atrasado" ? "alerta" : "forte"}
                          />
                        </td>
                        <td data-nums className={`${TD_D} text-caption text-muted`}>
                          {data(p.criado_em)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line-strong bg-surface-2">
                    <td colSpan={3} className={`${TD_E} text-caption font-semibold text-ink-2`}>
                      {lista.length} {lista.length === 1 ? "Pedido" : "Pedidos"}
                    </td>
                    <td className={TD_D}>
                      <Valor centavos={total.vendido} tom="forte" />
                    </td>
                    <td className={TD_D}>
                      <Valor centavos={total.recebido} tom="forte" />
                    </td>
                    <td className={TD_D}>
                      <Valor
                        centavos={total.aReceber}
                        tom={total.aReceber > 0 ? "alerta" : "forte"}
                      />
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Celular: a mesma lista, duas linhas por pedido. Nome e saldo
              primeiro, que é o que se procura enquanto liga para cobrar. */}
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
                  {/* Nome e situação em cima, dinheiro embaixo.
                      O selo qualifica a pessoa, então anda com o nome; o pago e
                      o total são um número só, e ficam juntos numa linha que se
                      lê de uma vez: "60,00 de 60,00". Antes o "de R$ 60,00"
                      dividia espaço com o selo e os dois se atrapalhavam. */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 truncate text-body-sm font-semibold">
                      {capitalizarNome(p.aluno_nome)}
                    </span>
                    <SeloPagamento status={p.status_pagamento} />
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-caption text-muted">
                      {capitalizarNome(p.produto_nome_snapshot)} · {tamanhos(p)}
                    </span>
                    <span
                      data-nums
                      className="shrink-0 whitespace-nowrap text-caption text-muted"
                    >
                      <strong
                        className={`text-body-sm font-semibold ${
                          p.status_pagamento === "atrasado" ? "text-danger" : "text-ink"
                        }`}
                      >
                        {reais(p.pago_centavos)}
                      </strong>{" "}
                      De {reais(p.valor_centavos)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
            <li className="flex items-baseline justify-between gap-3 bg-surface-2 px-4 py-2.5">
              <span className="text-caption font-semibold text-ink-2">
                {lista.length} {lista.length === 1 ? "Pedido" : "Pedidos"}
              </span>
              <span className="text-caption text-muted">
                Recebido <Valor centavos={total.recebido} tom="forte" /> De{" "}
                <span data-nums>{reais(total.vendido)}</span>
              </span>
            </li>
          </ul>
        </>
      )}

      {detalhe && (
        <DetalhePedido
          pedido={detalhe}
          turma={grupo.nome}
          campanha={campanha.nome}
          labelGrupo={campanha.label_grupo}
          fechar={montarUrl(base, { aba, f, q })}
        />
      )}

      {exportar && naProducao && tamanhosDoProduto.length > 0 && (
        <ExportarGaveta
          grupoId={grupo.id}
          produto={produto}
          busca={q}
          tamanhos={tamanhosDoProduto}
          fechar={url({ exportar: undefined })}
        />
      )}
    </>
  );
}


/**
 * Aba Produção. Um produto por vez, escolhido na sub-aba.
 *
 * A oficina não corta "peças", corta camiseta e corta moletom, em momentos e
 * máquinas diferentes. Uma tabela misturando os dois obriga quem está na mesa a
 * filtrar com o olho, e é assim que sai moletom no lugar de camiseta. Por isso
 * aqui não existe "todos": o que a tela mostra é o que o papel vai ter.
 *
 * Sem valor em reais em lugar nenhum. Quem separa tecido não decide nada com
 * dinheiro, e saldo seria só uma coluna a mais para atrapalhar.
 */

/**
 * "Moletom Canguru" vira "Moletom". "Uniforme terceirização" vira "Uniforme".
 *
 * A primeira palavra é o que a produção fala em voz alta. O resto é nome
 * comercial, útil na vitrine e ruído no chão da oficina.
 */
function nomeCurto(produto: string) {
  return produto.split(/[\s·,(]+/)[0];
}

function Producao({
  pecas,
  produto,
  vazio,
  base,
  tamanhos,
  tamanho,
  url,
}: {
  pecas: ReturnType<typeof pecasParaProduzir>;
  produto?: string;
  vazio: boolean;
  base: string;
  /** Todos os tamanhos do produto, com a contagem de peças de cada um. */
  tamanhos: { tamanho: string; total: number }[];
  /** O tamanho escolhido, se algum. */
  tamanho?: string;
  url: (extra: Partial<QueryPlanilha>) => string;
}) {
  if (pecas.length === 0) {
    return (
      <Vazio
        icone={<Pacote className="h-8 w-8" />}
        titulo={vazio ? "Nenhum pedido ainda" : "Nenhuma peça liberada"}
        texto={
          vazio
            ? "A lista de produção aparece assim que o primeiro pedido for pago."
            : "Só entra aqui quem pagou a entrada, ou quem foi liberado na mão. Confira a aba Pedidos."
        }
        acao={
          <Link href={base} className="text-caption font-semibold text-ink underline">
            Ver os pedidos
          </Link>
        }
      />
    );
  }

  const total = pecas.reduce((s, p) => s + p.quantidade, 0);
  const daGrade = tamanhos.reduce((s, t) => s + t.total, 0);

  return (
    <section
      className="entra overflow-hidden rounded-lg border border-line bg-surface"
      style={{ "--atraso": "120ms" } as React.CSSProperties}
    >
      {/*
        Cabeçalho de uma linha só. A versão anterior gastava 56px de altura para
        dizer "Polo · 214 peças" e ainda deixava o botão de exportar boiando na
        outra ponta, com a lista começando longe demais do título.
      */}
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3.5 py-2.5">
        <h3 className="flex min-w-0 items-baseline gap-2 text-h3">
          <span className="truncate">{produto ? nomeCurto(produto) : "Produção"}</span>
          <span data-nums className="shrink-0 text-caption font-normal text-muted">
            {total} {total === 1 ? "Peça" : "Peças"}
            {tamanho && <span> De {daGrade}</span>}
          </span>
        </h3>
        <Link
          href={url({ exportar: "1" })}
          scroll={false}
          className="inline-flex h-8 shrink-0 items-center rounded-md border border-line
            bg-surface px-3 text-caption font-semibold text-ink transition-colors
            duration-fast ease-soft hover:border-line-strong hover:bg-surface-2"
        >
          Exportar
        </Link>
      </header>

      {/*
        Os tamanhos como filtro, dentro do card, colados na lista que eles
        mandam. É também o resumo de corte da turma: a contagem em cada botão é
        quantas peças daquele tamanho saem desta mesa.
      */}
      {tamanhos.length > 1 && (
        <div className="border-y border-line bg-surface-2/50 px-3.5 py-2">
          <Chips
            opcoes={[
              {
                texto: "Todos",
                href: url({ t: undefined }),
                ativo: !tamanho,
                contagem: daGrade,
              },
              ...tamanhos.map((t) => ({
                texto: tamanhoLegivel(t.tamanho),
                href: url({ t: t.tamanho }),
                ativo: tamanho === t.tamanho,
                contagem: t.total,
              })),
            ]}
          />
        </div>
      )}

      {/*
        Cinco colunas em largura fixa, sem rolagem lateral em nenhuma tela.
        Aluno e Na estampa são nomes, e nome centralizado numa lista de duzentas
        linhas não tem margem por onde descer: os dois passaram para a esquerda,
        que é onde a coluna de nomes se lê. Tam. e Qtd continuam no centro,
        porque são contagens curtas e é ali que o olho procura o número.
      */}
      <table className="w-full table-fixed border-collapse text-body-sm">
        <colgroup>
          <col className="w-[7%]" />
          <col className="w-[34%]" />
          <col className="w-[32%]" />
          <col className="w-[16%]" />
          <col className="w-[11%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-line bg-surface-2">
            <th className={TH_C}>#</th>
            <th className={TH_E}>Aluno</th>
            <th className={TH_E}>Na estampa</th>
            <th className={TH_C}>Tam.</th>
            <th className={TH_C}>Qtd</th>
          </tr>
        </thead>
        <tbody>
          {pecas.map((p, i) => {
            const repetido = i > 0 && pecas[i - 1].aluno_nome === p.aluno_nome;
            return (
              <tr
                key={p.item_id}
                className="border-b border-line transition-colors duration-fast ease-soft
                  hover:bg-surface-2"
              >
                <td data-nums className={`${TD_C} text-caption text-faint`}>
                  {i + 1}
                </td>
                <td
                  title={p.aluno_nome}
                  className={`${TD_E} truncate ${
                    repetido ? "text-muted" : "font-medium text-ink"
                  }`}
                >
                  {capitalizarNome(p.aluno_nome)}
                </td>
                <td
                  title={capitalizarNome(p.nome_estampa)}
                  className={`${TD_E} truncate font-medium text-ink`}
                >
                  {capitalizarNome(p.nome_estampa)}
                </td>
                <td className={`${TD_C} whitespace-nowrap text-ink-2`}>
                  {tamanhoLegivel(p.tamanho)}
                </td>
                <td data-nums className={`${TD_C} text-ink-2`}>
                  {p.quantidade}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-surface-2">
            <td colSpan={3} className={`${TD_E} text-caption font-semibold text-ink-2`}>
              {pecas.length} {pecas.length === 1 ? "Linha" : "Linhas"}
              {tamanho && ` · Tamanho ${tamanhoLegivel(tamanho)}`}
            </td>
            <td className={`${TD_C} text-caption font-semibold text-ink-2`}>Peças</td>
            <td data-nums className={`${TD_C} font-semibold text-ink`}>
              {total}
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

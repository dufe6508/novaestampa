import Link from "next/link";
import {
  buscarPedido,
  data,
  ehFiltro,
  filtrar,
  FILTROS,
  listarPedidosDaTurma,
  pecasParaProduzir,
  somar,
  tamanhoLegivel,
  type CampanhaResumo,
  type Filtro,
  type GrupoResumo,
  type PedidoPainel,
} from "@/lib/painel";
import { reais } from "@/lib/formato";
import { Busca, Chips, SubAbas, Valor } from "./painel";
import { SeloPagamento } from "./selo";
import { DetalhePedido } from "./detalhe-pedido";
import { Pacote } from "./icones";
import { Vazio } from "./campos";

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
  pedido?: string;
};

export function montarUrl(base: string, q: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

const TH = "label px-3.5 py-2.5 text-muted font-semibold";
const TD = "px-3.5 py-2.5";

/** Tamanhos de um pedido. Kit tem mais de uma peça, e cada uma conta. */
function tamanhos(pedido: PedidoPainel) {
  return pedido.itens.map((i) => tamanhoLegivel(i.tamanho)).join(" + ");
}

export async function PlanilhaTurma({
  grupo,
  campanha,
  base,
  query,
}: {
  grupo: GrupoResumo;
  campanha: CampanhaResumo;
  /** Endereço desta lista. Todo link é montado em cima dele. */
  base: string;
  query: QueryPlanilha;
}) {
  const { aba, p: produtoQuery, f, q, pedido: pedidoId } = query;
  const naProducao = aba === "producao";
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

  const pecas = todasAsPecas
    .filter((x) => !termo || x.aluno_nome.toLowerCase().includes(termo))
    .filter((x) => !produto || x.produto === produto);

  const url = (extra: Partial<QueryPlanilha>) =>
    montarUrl(base, { aba, p: produtoQuery, f, q, ...extra } as Record<
      string,
      string | undefined
    >);

  const aberto = pedidoId ? await buscarPedido(pedidoId) : null;

  // Pedido de outra turma não abre aqui. Sem isso, trocar o id na URL mostraria
  // o financeiro de uma turma que não é a da pessoa.
  const detalhe = aberto?.grupo_id === grupo.id ? aberto : null;

  const abas = [
    { texto: "Pedidos", ativo: !naProducao, href: montarUrl(base, { q }), n: todos.length },
    {
      texto: "Produção",
      ativo: naProducao,
      href: montarUrl(base, { aba: "producao", q }),
      n: todasAsPecas.length,
    },
  ];

  return (
    <>
      <div
        className="entra flex flex-wrap items-end justify-between gap-x-4 gap-y-2
          border-b border-line"
        style={{ "--atraso": "40ms" } as React.CSSProperties}
      >
        <div className="flex items-center gap-1">
          {abas.map((t) => (
            <Link
              key={t.texto}
              href={t.href}
              scroll={false}
              aria-current={t.ativo ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 py-2.5 text-body-sm transition-colors
                duration-fast ease-soft
                ${
                  t.ativo
                    ? "border-ink font-semibold text-ink"
                    : "border-transparent font-medium text-muted hover:text-ink"
                }`}
            >
              {t.texto}
              <span data-nums className="ml-2 text-caption text-faint">
                {t.n}
              </span>
            </Link>
          ))}
        </div>

        <div className="mb-1.5 flex min-w-0 flex-1 items-center justify-end gap-2">
          <Busca valor={q} placeholder="Buscar aluno" escondidos={{ aba }} />
        </div>
      </div>

      {produtos.length > 1 && (
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

      {!naProducao && (
        <div
          className="entra -mt-1"
          style={{ "--atraso": "100ms" } as React.CSSProperties}
        >
          <Chips
            opcoes={(Object.keys(FILTROS) as Filtro[]).map((k) => ({
              texto: FILTROS[k].texto,
              href: montarUrl(base, { q, p: produtoQuery, f: k === "todos" ? undefined : k }),
              ativo: filtro === k,
              contagem: todos
                .filter((x) => !produto || x.produto_nome_snapshot === produto)
                .filter(FILTROS[k].vale).length,
            }))}
          />
        </div>
      )}

      {naProducao ? (
        <Producao
          pecas={pecas}
          produto={produto}
          vazio={todos.length === 0}
          base={base}
          grupoId={grupo.id}
          busca={q}
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
              <table className="w-full min-w-[760px] border-collapse text-body-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-left">
                    <th className={`${TH} w-11 text-right`}>#</th>
                    <th className={TH}>Aluno</th>
                    <th className={TH}>Produto</th>
                    <th className={TH}>Tam.</th>
                    <th className={`${TH} text-right`}>Valor</th>
                    <th className={`${TH} text-right`}>Pago</th>
                    <th className={`${TH} text-right`}>Saldo</th>
                    <th className={TH}>Situação</th>
                    <th className={`${TH} text-right`}>Feito</th>
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
                        <td data-nums className={`${TD} text-right text-caption text-faint`}>
                          {i + 1}
                        </td>
                        <td className={TD}>
                          <Link
                            href={url({ pedido: p.id })}
                            scroll={false}
                            className={`font-medium underline-offset-2 hover:underline
                              ${repetido ? "text-muted" : "text-ink"}`}
                          >
                            {p.aluno_nome}
                          </Link>
                        </td>
                        <td className={`${TD} text-ink-2`}>{p.produto_nome_snapshot}</td>
                        <td className={`${TD} whitespace-nowrap text-ink-2`}>{tamanhos(p)}</td>
                        <td className={`${TD} text-right`}>
                          <Valor centavos={p.valor_centavos} />
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
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line-strong bg-surface-2">
                    <td colSpan={4} className={`${TD} text-caption font-semibold text-ink-2`}>
                      {lista.length} {lista.length === 1 ? "pedido" : "pedidos"}
                    </td>
                    <td className={`${TD} text-right`}>
                      <Valor centavos={total.vendido} tom="forte" />
                    </td>
                    <td className={`${TD} text-right`}>
                      <Valor centavos={total.recebido} tom="forte" />
                    </td>
                    <td className={`${TD} text-right`}>
                      <Valor
                        centavos={total.aReceber}
                        tom={total.aReceber > 0 ? "alerta" : "forte"}
                      />
                    </td>
                    <td colSpan={2} />
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
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-body-sm font-semibold">
                      {p.aluno_nome}
                    </span>
                    <SeloPagamento status={p.status_pagamento} />
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-caption text-muted">
                      {p.produto_nome_snapshot} · {tamanhos(p)}
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
                      de {reais(p.valor_centavos)}
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
                recebido <Valor centavos={total.recebido} tom="forte" /> de{" "}
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
  grupoId,
  busca,
}: {
  pecas: ReturnType<typeof pecasParaProduzir>;
  produto?: string;
  vazio: boolean;
  base: string;
  grupoId: string;
  busca?: string;
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

  return (
    <section
      className="entra overflow-hidden rounded-lg border border-line bg-surface"
      style={{ "--atraso": "120ms" } as React.CSSProperties}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex items-baseline gap-2">
          <h3 className="text-h3">{produto ? nomeCurto(produto) : "Produção"}</h3>
          <span data-nums className="text-caption text-muted">
            {total} {total === 1 ? "peça" : "peças"}
          </span>
        </div>
        <a
          href={montarUrl(`/exportar/${grupoId}`, { q: busca, produto })}
          className="inline-flex h-8 shrink-0 items-center rounded-md border border-line
            bg-surface px-3 text-caption font-semibold text-ink transition-colors
            duration-fast ease-soft hover:border-line-strong hover:bg-surface-2"
        >
          Exportar
        </a>
      </header>

      {/* Sem largura mínima e sem rolagem lateral: cinco colunas cabem em
          qualquer tela. O que pode ficar longo é nome, e nome trunca com
          reticências em vez de quebrar a linha em duas. */}
      <table className="w-full table-fixed border-collapse text-body-sm">
        <thead>
          <tr className="border-y border-line bg-surface-2 text-left">
            <th className={`${TH} w-10 text-right`}>#</th>
            <th className={TH}>Aluno</th>
            <th className={TH}>Na estampa</th>
            <th className={`${TH} w-24`}>Tam.</th>
            <th className={`${TH} w-16 text-right`}>Qtd</th>
          </tr>
        </thead>
        <tbody>
          {pecas.map((p, i) => {
            const repetido = i > 0 && pecas[i - 1].aluno_nome === p.aluno_nome;
            return (
              <tr
                key={p.item_id}
                className="border-b border-line transition-colors duration-fast ease-soft
                  last:border-0 hover:bg-surface-2"
              >
                <td data-nums className={`${TD} text-right text-caption text-faint`}>
                  {i + 1}
                </td>
                <td
                  title={p.aluno_nome}
                  className={`${TD} truncate ${
                    repetido ? "text-muted" : "font-medium text-ink"
                  }`}
                >
                  {p.aluno_nome}
                </td>
                <td title={p.nome_estampa} className={`${TD} truncate font-medium text-ink`}>
                  {p.nome_estampa}
                </td>
                <td className={`${TD} whitespace-nowrap text-ink-2`}>
                  {tamanhoLegivel(p.tamanho)}
                </td>
                <td data-nums className={`${TD} text-right text-ink-2`}>
                  {p.quantidade}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  data,
  ehFiltro,
  filtrar,
  FILTROS,
  pecasParaProduzir,
  somar,
  type CampanhaResumo,
  type Filtro,
  type GrupoResumo,
  type PecaProducao,
  type PedidoCompleto,
  type PedidoPainel,
} from "@/lib/planilha";
import { reais, tamanhoLegivel } from "@/lib/formato";
import { Valor } from "./painel";
import { LinkRapido } from "./link-rapido";
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
 * ------------------------------------------------------------
 * Por que isto roda no navegador
 *
 * Filtro, busca, sub-aba e detalhe continuam vivendo na URL, pelas mesmas
 * razões de sempre: o voltar fecha o detalhe, o endereço pode ser mandado para
 * outra pessoa, e a lista não perde o lugar.
 *
 * O que mudou é quem responde ao clique. Antes cada troca de filtro era uma
 * navegação de servidor inteira: o Next refazia as consultas da turma, esperava
 * o banco, redesenhava a página, e só então aplicava um filtro que já rodava em
 * memória sobre exatamente os mesmos dados. Pagava-se ida e volta de rede para
 * não descobrir nada novo, e era isso que fazia o painel parecer travado.
 *
 * Agora a turma inteira chega uma vez e o clique só reescreve a URL, com
 * `history.pushState`, que o App Router entende e propaga para `useSearchParams`
 * sem tocar no servidor. A resposta é imediata, e a URL continua a mesma coisa
 * que era antes: recarregar a página nesse endereço devolve a mesma tela.
 *
 * Os controles continuam sendo `<a href>` de verdade. Só o clique comum é
 * interceptado, então abrir em outra aba, copiar o endereço e o meio da roda do
 * mouse seguem funcionando.
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

/**
 * "Moletom Canguru" vira "Moletom". "Uniforme terceirização" vira "Uniforme".
 *
 * A primeira palavra é o que a produção fala em voz alta. O resto é nome
 * comercial, útil na vitrine e ruído no chão da oficina.
 */
function nomeCurto(produto: string) {
  return produto.split(/[\s·,(]+/)[0];
}

/**
 * Filtros como link, não como botão de estado.
 *
 * Cada filtro é uma URL. Dá para mandar para alguém "abre a lista dos
 * atrasados da 3B" e a pessoa cai exatamente ali.
 */
function Chips({
  opcoes,
}: {
  opcoes: { texto: string; href: string; ativo: boolean; contagem?: number }[];
}) {
  // Uma linha só, que rola de lado quando não cabe. Quebrar em duas fileiras
  // empurra a lista para baixo e faz a segunda linha parecer outro grupo de
  // filtros. Rolar é o gesto que o dedo já espera numa faixa de filtros.
  return (
    <div className="sem-barra -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
      {opcoes.map((o) => (
        <LinkRapido
          key={o.href}
          href={o.href}
          aria-current={o.ativo ? "true" : undefined}
          className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border
            px-2.5 text-caption font-medium transition-colors duration-fast ease-soft
            active:scale-[0.98]
            ${
              o.ativo
                ? "border-ink bg-ink text-white"
                : "border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-surface-2"
            }`}
        >
          {o.texto}
          {o.contagem !== undefined && (
            <span data-nums className={o.ativo ? "text-white/70" : "text-muted"}>
              {o.contagem}
            </span>
          )}
        </LinkRapido>
      ))}
    </div>
  );
}

/**
 * Sub-abas. Um nível abaixo das abas principais, e com desenho diferente.
 *
 * Aba principal é sublinhado; sub-aba é segmento dentro de uma caixa cinza.
 * Se as duas fossem iguais, a tela teria duas fileiras de links parecidos e
 * ninguém saberia qual manda em qual.
 */
function SubAbas({
  opcoes,
}: {
  opcoes: { texto: string; href: string; ativo: boolean; contagem?: number }[];
}) {
  return (
    <div className="inline-flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-lg bg-surface-2 p-0.5">
      {opcoes.map((o) => (
        <LinkRapido
          key={o.href}
          href={o.href}
          aria-current={o.ativo ? "page" : undefined}
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md
            px-3 text-caption transition-colors duration-fast ease-soft
            ${
              o.ativo
                ? "bg-surface font-semibold text-ink shadow-card"
                : "font-medium text-muted hover:text-ink"
            }`}
        >
          {o.texto}
          {o.contagem !== undefined && (
            <span data-nums className={o.ativo ? "text-muted" : "text-faint"}>
              {o.contagem}
            </span>
          )}
        </LinkRapido>
      ))}
    </div>
  );
}

/**
 * Busca que filtra enquanto se digita.
 *
 * Antes era formulário GET: cada consulta custava um Enter e uma volta ao
 * servidor. Como a turma inteira já está aqui, filtrar é uma varredura num
 * vetor de algumas dezenas de itens, e esperar o Enter só atrasava.
 *
 * A URL acompanha com `replaceState` e um respiro de 300 ms, senão cada tecla
 * viraria uma entrada no histórico e o botão voltar teria que ser apertado
 * letra por letra.
 */
function BuscaViva({
  valor,
  aoMudar,
  placeholder,
}: {
  valor: string;
  aoMudar: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs">
      <label htmlFor="busca-planilha" className="sr-only">
        {placeholder}
      </label>
      <input
        id="busca-planilha"
        type="search"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-body-sm
          text-ink outline-none transition-[border-color,box-shadow] duration-base ease-soft
          placeholder:text-faint focus:border-brand-deep
          focus:shadow-[0_0_0_3px_rgb(15_168_188_/_0.16)]"
      />
    </div>
  );
}

export function PlanilhaCliente({
  grupo,
  campanha,
  base,
  pedidos: todos,
}: {
  grupo: GrupoResumo;
  campanha: CampanhaResumo;
  /** Endereço desta lista. Todo link é montado em cima dele. */
  base: string;
  /** A turma inteira, já com peças, parcelas e baixas. */
  pedidos: PedidoCompleto[];
}) {
  const parametros = useSearchParams();

  const aba = parametros.get("aba") ?? undefined;
  const produtoQuery = parametros.get("p") ?? undefined;
  const f = parametros.get("f") ?? undefined;
  const pedidoId = parametros.get("pedido") ?? undefined;

  const naProducao = aba === "producao";
  const filtro: Filtro = ehFiltro(f) ? f : "todos";

  // A busca é estado local para o campo responder à tecla sem esperar a URL.
  // A URL recebe o valor depois, com atraso.
  const [q, setQ] = useState(() => parametros.get("q") ?? "");

  // Voltar e avançar precisam devolver a busca que estava na URL. Sem isto o
  // campo continuaria mostrando o texto novo depois de voltar.
  useEffect(() => {
    const aoVoltar = () =>
      setQ(new URLSearchParams(window.location.search).get("q") ?? "");
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const atual = new URLSearchParams(window.location.search);
      if ((atual.get("q") ?? "") === q) return;
      if (q) atual.set("q", q);
      else atual.delete("q");
      const s = atual.toString();
      window.history.replaceState(null, "", s ? `${base}?${s}` : base);
    }, 300);
    return () => clearTimeout(t);
  }, [q, base]);

  const termo = q.trim().toLowerCase();

  const todasAsPecas = useMemo(() => pecasParaProduzir(todos), [todos]);

  // Produtos que existem nesta turma, do que tem mais pedido para o que tem
  // menos. É essa lista que vira sub-aba nas duas abas.
  //
  // A contagem sai de um mapa em vez de um `filter` dentro do comparador: como
  // o comparador roda O(n log n) vezes e cada `filter` varria a lista inteira,
  // ordenar cinco produtos numa turma cheia custava mais que desenhar a tabela.
  const produtos = useMemo(() => {
    const quantos = new Map<string, number>();
    for (const p of todos) {
      quantos.set(p.produto_nome_snapshot, (quantos.get(p.produto_nome_snapshot) ?? 0) + 1);
    }
    return [...quantos.keys()].sort((a, b) => quantos.get(b)! - quantos.get(a)!);
  }, [todos]);

  // Na aba Pedidos, sem sub-aba escolhida quer dizer todos. Na Produção não
  // existe "todos": a oficina corta um produto de cada vez, e o arquivo que
  // ela exporta é de um produto só.
  const produto =
    produtoQuery && produtos.includes(produtoQuery)
      ? produtoQuery
      : naProducao
        ? produtos[0]
        : undefined;

  const doProduto = useMemo(
    () => todos.filter((x) => !produto || x.produto_nome_snapshot === produto),
    [todos, produto],
  );

  const lista = useMemo(() => filtrar(doProduto, filtro, q), [doProduto, filtro, q]);
  const total = useMemo(() => somar(lista), [lista]);

  const pecas = useMemo(
    () =>
      todasAsPecas.filter(
        (x) =>
          (!termo || x.aluno_nome.toLowerCase().includes(termo)) &&
          (!produto || x.produto === produto),
      ),
    [todasAsPecas, termo, produto],
  );

  // Contagem de cada chip numa passada só, em vez de uma varredura por filtro.
  const contagens = useMemo(() => {
    const c = {} as Record<Filtro, number>;
    for (const k of Object.keys(FILTROS) as Filtro[]) c[k] = 0;
    for (const p of doProduto) {
      for (const k of Object.keys(FILTROS) as Filtro[]) if (FILTROS[k].vale(p)) c[k]++;
    }
    return c;
  }, [doProduto]);

  const porProduto = useMemo(() => {
    const pedidos = new Map<string, number>();
    const pecasPorProduto = new Map<string, number>();
    for (const p of todos) {
      pedidos.set(p.produto_nome_snapshot, (pedidos.get(p.produto_nome_snapshot) ?? 0) + 1);
    }
    for (const p of todasAsPecas) {
      pecasPorProduto.set(p.produto, (pecasPorProduto.get(p.produto) ?? 0) + 1);
    }
    return { pedidos, pecas: pecasPorProduto };
  }, [todos, todasAsPecas]);

  const url = (extra: Partial<QueryPlanilha>) =>
    montarUrl(base, { aba, p: produtoQuery, f, q, ...extra } as Record<
      string,
      string | undefined
    >);

  // Pedido de outra turma não abre aqui. Sem isso, trocar o id na URL mostraria
  // o financeiro de uma turma que não é a da pessoa.
  const aberto = pedidoId ? todos.find((p) => p.id === pedidoId) : undefined;
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
            <LinkRapido
              key={t.texto}
              href={t.href}
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
            </LinkRapido>
          ))}
        </div>

        <div className="mb-1.5 flex min-w-0 flex-1 items-center justify-end gap-2">
          <BuscaViva valor={q} aoMudar={setQ} placeholder="Buscar aluno" />
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
                  ? (porProduto.pecas.get(nome) ?? 0)
                  : (porProduto.pedidos.get(nome) ?? 0),
              })),
            ]}
          />
        </div>
      )}

      {!naProducao && (
        <div className="entra -mt-1" style={{ "--atraso": "100ms" } as React.CSSProperties}>
          <Chips
            opcoes={(Object.keys(FILTROS) as Filtro[]).map((k) => ({
              texto: FILTROS[k].texto,
              href: montarUrl(base, { q, p: produtoQuery, f: k === "todos" ? undefined : k }),
              ativo: filtro === k,
              contagem: contagens[k],
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
          titulo={
            todos.length === 0 ? "Nenhum pedido ainda" : "Nenhum pedido com esses filtros"
          }
          texto={
            todos.length === 0
              ? `Assim que alguém da ${campanha.label_grupo.toLowerCase()} ${grupo.nome} pedir, aparece aqui. O código de acesso é ${grupo.codigo}.`
              : "Limpe a busca ou escolha outro filtro para ver o resto da lista."
          }
          acao={
            todos.length > 0 ? (
              <LinkRapido
                href={base}
                className="text-caption font-semibold text-ink underline"
              >
                Ver todos
              </LinkRapido>
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
                          <LinkRapido
                            href={url({ pedido: p.id })}
                            className={`font-medium underline-offset-2 hover:underline
                              ${repetido ? "text-muted" : "text-ink"}`}
                          >
                            {p.aluno_nome}
                          </LinkRapido>
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
                <LinkRapido
                  href={url({ pedido: p.id })}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors duration-fast
                    ease-soft active:bg-surface-2"
                >
                  {/* Nome e situação em cima, dinheiro embaixo.
                      O selo qualifica a pessoa, então anda com o nome; o pago e
                      o total são um número só, e ficam juntos numa linha que se
                      lê de uma vez: "60,00 de 60,00". */}
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
                </LinkRapido>
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
          parcelas={detalhe.parcelas}
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
function Producao({
  pecas,
  produto,
  vazio,
  base,
  grupoId,
  busca,
}: {
  pecas: PecaProducao[];
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
          <LinkRapido href={base} className="text-caption font-semibold text-ink underline">
            Ver os pedidos
          </LinkRapido>
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
        {/* Exportar sai do app: âncora normal, download de verdade. */}
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

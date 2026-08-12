import Link from "next/link";
import { listarTodosProdutos, reais, tamanhoLegivel, type ProdutoPainel } from "@/lib/painel";
import { imagemUrl } from "@/lib/supabase";
import { Busca, Topo } from "@/components/painel";
import { SeloCampanha, SeloProduto } from "@/components/selo";
import { Camiseta } from "@/components/icones";
import { Vazio } from "@/components/campos";

/**
 * Produtos, lendo todas as campanhas de uma vez.
 *
 * Não é catálogo global. Produto pertence à campanha e é lá que ele nasce
 * (CLAUDE.md §3.2.1); esta tela existe para responder o que hoje obriga abrir
 * campanha por campanha: o que a empresa vende, por quanto, em que grade e o que
 * de fato tem pedido.
 *
 * Por isso não há botão de criar aqui. Criar fora de uma campanha não teria
 * onde pousar, e um botão que leva para outro lugar é pior que nenhum botão.
 *
 * O agrupamento é por cliente e campanha porque é assim que a dona procura:
 * ela lembra da escola antes de lembrar do nome do produto.
 *
 * A linha encolheu. A foto virou miniatura de 40px, o suficiente para
 * reconhecer a peça, e a grade virou contagem com os tamanhos em texto miúdo:
 * doze etiquetas com borda por produto viravam duas fileiras de confete e
 * dobravam a altura da lista sem responder nada que a contagem não responda.
 */

const CLASSE: Record<ProdutoPainel["classe"], string> = {
  camisa: "Camisa",
  moletom: "Moletom",
  polo: "Polo",
  outro: "Outro",
};

function Miniatura({ produto }: { produto: ProdutoPainel }) {
  const capa = produto.imagens[0];

  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md
        border border-line bg-surface-2"
    >
      {capa ? (
        <img src={imagemUrl(capa)} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <Camiseta className="h-4 w-4 text-faint" />
      )}
    </div>
  );
}

function Linha({ produto }: { produto: ProdutoPainel }) {
  const grade = produto.tamanhos.map(tamanhoLegivel).join(" · ");

  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <Miniatura produto={produto} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="min-w-0 truncate text-body-sm font-semibold text-ink">{produto.nome}</h3>
          <span className="text-caption text-muted">{CLASSE[produto.classe]}</span>
          <SeloProduto situacao={produto.situacao} />
        </div>
        <p className="truncate text-caption text-muted" title={grade}>
          {produto.tamanhos.length > 0
            ? `${produto.tamanhos.length} Tamanhos · ${grade}`
            : "Sem grade cadastrada"}
        </p>
      </div>

      <span
        data-nums
        className="hidden w-24 shrink-0 text-right text-caption text-muted sm:block"
      >
        {produto.pedidos} {produto.pedidos === 1 ? "Pedido" : "Pedidos"}
      </span>

      <span
        data-nums
        className="w-24 shrink-0 text-right text-body-sm font-semibold tabular-nums text-ink"
      >
        {reais(produto.preco_centavos)}
      </span>
    </li>
  );
}

/** Um bloco por campanha, com o cliente na linha de cima. */
function Campanha({ produtos, atraso }: { produtos: ProdutoPainel[]; atraso: number }) {
  const [primeiro] = produtos;
  const pedidos = produtos.reduce((n, p) => n + p.pedidos, 0);

  return (
    <section
      className="entra overflow-hidden rounded-lg border border-line bg-surface"
      style={{ "--atraso": `${atraso}ms` } as React.CSSProperties}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b
          border-line px-4 py-2.5"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-h3 leading-snug">
            <Link
              href={`/painel/campanha/${primeiro.campanha_id}?aba=produtos`}
              className="rounded-sm transition-colors duration-fast ease-soft hover:text-brand-deep
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-brand-deep"
            >
              {primeiro.campanha_nome}
            </Link>
          </h2>
          <p className="text-caption text-muted">
            {primeiro.cliente_nome}
            {" · "}
            <span data-nums>{produtos.length}</span>{" "}
            {produtos.length === 1 ? "Produto" : "Produtos"}
            {" · "}
            <span data-nums>{pedidos}</span> {pedidos === 1 ? "Pedido" : "Pedidos"}
          </p>
        </div>
        {primeiro.campanha_status !== "aberta" && (
          <SeloCampanha status={primeiro.campanha_status} />
        )}
      </div>

      <ul className="divide-y divide-line">
        {produtos.map((p) => (
          <Linha key={p.id} produto={p} />
        ))}
      </ul>
    </section>
  );
}

export default async function Produtos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const produtos = await listarTodosProdutos(q);

  // Agrupa por campanha preservando a ordem que veio do banco. Objeto simples,
  // não `Map`: o retorno em cache passa por JSON e `Map` volta vazio.
  const porCampanha: Record<string, ProdutoPainel[]> = {};
  for (const p of produtos) (porCampanha[p.campanha_id] ??= []).push(p);

  const grupos = Object.values(porCampanha).sort((a, b) =>
    (a[0].cliente_nome + a[0].campanha_nome).localeCompare(
      b[0].cliente_nome + b[0].campanha_nome,
    ),
  );

  const aVenda = produtos.filter((p) => p.situacao === "a_venda").length;

  return (
    <>
      <Topo
        titulo="Produtos"
        subtitulo={
          produtos.length > 0
            ? `${produtos.length} ${produtos.length === 1 ? "Produto" : "Produtos"} em ${
                grupos.length
              } ${grupos.length === 1 ? "Campanha" : "Campanhas"} · ${aVenda} À venda`
            : undefined
        }
        acoes={<Busca valor={q} placeholder="Buscar produto" />}
      />

      {/*
        Sem botão de criar, e é decisão, não esquecimento: produto pertence à
        campanha, e o cadastro fica lá. Esta tela é a visão de cima.
      */}
      {produtos.length === 0 ? (
        <Vazio
          icone={<Camiseta className="h-8 w-8" />}
          titulo={q ? "Nenhum produto com esse nome" : "Nenhum produto cadastrado"}
          texto={
            q
              ? "Confira a escrita ou limpe a busca para ver todos."
              : "Produto é cadastrado dentro da campanha. Abra a campanha e cadastre por lá."
          }
          acao={
            q ? (
              <Link
                href="/painel/produtos"
                className="text-caption font-semibold text-ink underline"
              >
                Limpar busca
              </Link>
            ) : (
              <Link href="/painel" className="text-caption font-semibold text-ink underline">
                Ir para os clientes
              </Link>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {grupos.map((g, i) => (
            <Campanha key={g[0].campanha_id} produtos={g} atraso={i * 40} />
          ))}
        </div>
      )}
    </>
  );
}

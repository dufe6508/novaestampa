import Link from "next/link";
import {
  listarTodosProdutos,
  reais,
  tamanhoLegivel,
  type ProdutoPainel,
} from "@/lib/painel";
import { Busca, Topo } from "@/components/painel";
import { SeloCampanha } from "@/components/selo";
import { Camiseta } from "@/components/icones";
import { Vazio } from "@/components/campos";

/**
 * Produtos, lendo todas as campanhas de uma vez.
 *
 * Não é catálogo global. Produto pertence à campanha e é lá que ele nasce
 * (CLAUDE.md §3.2.1); esta tela existe para responder o que hoje obriga abrir
 * campanha por campanha: o que a empresa já vendeu, por quanto, e em que grade.
 *
 * Por isso não há botão de criar aqui. Criar fora de uma campanha não teria
 * onde pousar, e um botão que leva para outro lugar é pior que nenhum botão.
 *
 * O agrupamento é por cliente e campanha porque é assim que a dona procura:
 * ela lembra da escola antes de lembrar do nome do produto.
 */

function Grade({ tamanhos }: { tamanhos: string[] }) {
  if (tamanhos.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1">
      {tamanhos.map((t) => (
        <li
          key={t}
          data-nums
          className="rounded border border-line px-1.5 py-0.5 text-caption text-muted"
        >
          {tamanhoLegivel(t)}
        </li>
      ))}
    </ul>
  );
}

function Linha({ produto }: { produto: ProdutoPainel }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-body-sm font-semibold text-ink">{produto.nome}</span>
          {produto.tipo === "kit" && (
            <span className="text-caption text-muted">kit</span>
          )}
          {!produto.ativo && (
            <span
              className="rounded border border-line px-1.5 py-0.5 text-caption font-medium
                text-muted"
            >
              Desativado
            </span>
          )}
        </div>
        <Grade tamanhos={produto.tamanhos} />
      </div>

      <span
        data-nums
        className="shrink-0 text-body-sm font-semibold tabular-nums text-ink sm:text-right"
      >
        {reais(produto.preco_centavos)}
      </span>
    </li>
  );
}

/** Um bloco por campanha, com o cliente na linha de cima. */
function Campanha({
  produtos,
  atraso,
}: {
  produtos: ProdutoPainel[];
  atraso: number;
}) {
  const [primeiro] = produtos;
  const pecas = produtos.filter((p) => p.tipo === "simples").length;

  return (
    <section
      className="entra overflow-hidden rounded-lg border border-line bg-surface"
      style={{ "--atraso": `${atraso}ms` } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b
        border-line px-4 py-2.5"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-h3 leading-snug">
            <Link
              href={`/painel/campanha/${primeiro.campanha_id}`}
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
            {produtos.length === 1 ? "produto" : "produtos"}
            {pecas !== produtos.length && (
              <>
                {" · "}
                <span data-nums>{produtos.length - pecas}</span> em kit
              </>
            )}
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

  const ativos = produtos.filter((p) => p.ativo).length;

  return (
    <>
      <Topo
        titulo="Produtos"
        subtitulo={
          produtos.length > 0
            ? `${produtos.length} ${produtos.length === 1 ? "produto" : "produtos"} em ${
                grupos.length
              } ${grupos.length === 1 ? "campanha" : "campanhas"}${
                ativos !== produtos.length ? ` · ${produtos.length - ativos} desativados` : ""
              }`
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
              <Link href="/painel/produtos" className="text-caption font-semibold text-ink underline">
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
        <div className="flex flex-col gap-4">
          {grupos.map((g, i) => (
            <Campanha key={g[0].campanha_id} produtos={g} atraso={i * 40} />
          ))}
        </div>
      )}
    </>
  );
}

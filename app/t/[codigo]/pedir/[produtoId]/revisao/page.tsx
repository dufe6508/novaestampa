import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  buscarProduto,
  buscarTurma,
  criarPedido,
  dia,
  listarPecas,
  tamanhoLegivel,
} from "@/lib/aluno";
import { sessao } from "@/lib/sessao";
import { imagemUrl, reais } from "@/lib/supabase";
import { Linha } from "@/components/campos";
import { Estampa } from "@/components/estampa";
import { FormAcao } from "@/components/form-acao";
import { Lapis, Voltar } from "@/components/icones";

/**
 * Revisão · A5. Último olhar antes de existir um pedido no banco.
 *
 * Mostra o nome de cada peça em texto grande E no desenho: é a última chance
 * barata de pegar erro de digitação.
 */

function lista(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function Revisao({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string; produtoId: string }>;
  searchParams: Promise<{ t?: string | string[]; n?: string | string[] }>;
}) {
  const { codigo, produtoId } = await params;
  const { t, n } = await searchParams;

  const turma = await buscarTurma(codigo);
  if (!turma) notFound();

  const aluno = await sessao();
  if (!aluno) redirect(`/t/${turma.codigo}/entrar`);

  const produto = await buscarProduto(turma.campanha_id, produtoId);
  if (!produto) notFound();

  const pecasKit = produto.tipo === "kit" ? await listarPecas(produto.id) : [];
  const modelo =
    produto.tipo === "kit"
      ? pecasKit.flatMap((p) =>
          Array.from({ length: p.quantidade }, () => ({
            produtoId: p.componente_id,
            nome: p.componente_nome,
            tamanhos: p.componente_tamanhos,
          })),
        )
      : [{ produtoId: produto.id, nome: produto.nome, tamanhos: produto.tamanhos }];

  const tamanhos = lista(t);
  const nomes = lista(n);

  const valido =
    tamanhos.length === modelo.length &&
    nomes.length === modelo.length &&
    tamanhos.every((tam, i) => modelo[i].tamanhos.includes(tam)) &&
    nomes.every((nome) => nome.trim().length > 0);
  if (!valido) redirect(`/t/${turma.codigo}/loja/${produto.id}`);

  const pecas = modelo.map((m, i) => ({ ...m, tamanho: tamanhos[i], estampa: nomes[i] }));

  const entrada = Math.round((produto.preco_centavos * turma.percentual_entrada) / 100);
  const restante = produto.preco_centavos - entrada;

  // Volta para a personalização já preenchida, com o campo certo em foco.
  // Sem isso, corrigir uma letra custaria redigitar o pedido inteiro.
  const editar = (foco: "nome" | "tamanho") => {
    const q = new URLSearchParams();
    pecas.forEach((p) => {
      q.append("t", p.tamanho);
      q.append("n", p.estampa);
    });
    q.append("foco", foco);
    return `/t/${turma!.codigo}/pedir/${produto!.id}/personalizar?${q}`;
  };

  async function confirmar(_estado: string | null, _dados: FormData) {
    "use server";

    const r = await criarPedido(
      aluno!.id,
      turma!.codigo,
      produto!.id,
      pecas.map((p) => ({
        produto_id: p.produtoId,
        tamanho: p.tamanho,
        nome_estampa: p.estampa,
      })),
    );
    if (r.erro) return r.erro;

    redirect(`/t/${turma!.codigo}/pedido/${r.pedidoId}/pagamento`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 pb-12 pt-6">
      <Link
        href={editar("tamanho")}
        className="inline-flex w-fit items-center gap-1.5 text-caption font-semibold text-ink-2
          transition-colors duration-fast ease-soft hover:text-ink"
      >
        <Voltar className="h-4 w-4" />
        Voltar
      </Link>

      <header className="flex flex-col gap-1.5">
        <h1>Confira antes de confirmar</h1>
        <p className="text-body-sm text-muted">
          {turma.cliente_nome} · {turma.label_grupo} {turma.grupo_nome}
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <div className="flex items-center gap-4 border-b border-line p-4">
          {produto.imagens?.[0] && (
            <img
              src={imagemUrl(produto.imagens[0])}
              alt=""
              className="size-16 shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0">
            <h2 className="text-h3">{produto.nome}</h2>
            <p className="text-caption text-muted">
              {pecas.length === 1 ? "1 peça" : `${pecas.length} peças`}
            </p>
          </div>
        </div>

        <ul className="divide-y divide-line">
          {pecas.map((p, i) => (
            <li key={`${p.produtoId}-${i}`} className="flex items-center gap-4 p-4">
              <Estampa nome={p.estampa} className="w-14 shrink-0" />
              <dl className="min-w-0 flex-1 text-body-sm">
                {pecas.length > 1 && (
                  <p className="mb-1 text-caption font-semibold text-muted">{p.nome}</p>
                )}
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <dt className="shrink-0 text-muted">Nome</dt>
                    <dd className="min-w-0 break-words font-semibold text-ink">{p.estampa}</dd>
                    <Link
                      href={editar("nome")}
                      aria-label={`Alterar o nome da estampa, hoje ${p.estampa}`}
                      className="ml-auto inline-flex size-8 shrink-0 items-center justify-center
                        self-center rounded-md text-muted transition-colors duration-fast
                        ease-soft hover:bg-surface-2 hover:text-ink"
                    >
                      <Lapis className="h-4 w-4" />
                    </Link>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <dt className="shrink-0 text-muted">Tamanho</dt>
                    <dd className="font-semibold text-ink">{tamanhoLegivel(p.tamanho)}</dd>
                    <Link
                      href={editar("tamanho")}
                      aria-label={`Alterar o tamanho, hoje ${tamanhoLegivel(p.tamanho)}`}
                      className="ml-auto inline-flex size-8 shrink-0 items-center justify-center
                        self-center rounded-md text-muted transition-colors duration-fast
                        ease-soft hover:bg-surface-2 hover:text-ink"
                    >
                      <Lapis className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 bg-surface-2 p-4">
          <Linha rotulo="Valor do pedido" valor={reais(produto.preco_centavos)} />
          {restante > 0 ? (
            <>
              <Linha
                rotulo={`Você paga agora (${turma.percentual_entrada}%)`}
                valor={reais(entrada)}
                forte
              />
              <Linha
                rotulo={
                  turma.entrega_prevista
                    ? `Na entrega, ${dia(turma.entrega_prevista)}`
                    : "Na entrega"
                }
                valor={reais(restante)}
              />
            </>
          ) : (
            <Linha rotulo="Você paga agora" valor={reais(entrada)} forte />
          )}
        </div>
      </section>

      <FormAcao acao={confirmar} texto="Confirmar pedido" pendenteTexto="Confirmando…" />

      <p className="text-center text-caption leading-relaxed text-muted">
        Depois de confirmar você ainda pode mudar tamanho e nome
        {turma.prazo_alteracoes ? ` até ${dia(turma.prazo_alteracoes)}` : ""}, desde que a
        peça ainda não tenha entrado na produção.
      </p>
    </main>
  );
}

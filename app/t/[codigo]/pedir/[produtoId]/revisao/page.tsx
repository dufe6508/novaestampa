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
import { capitalizarNome } from "@/lib/formato";
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

/**
 * Uma peça manda `n=""` quando o produto sai sem bordado, e string vazia é
 * falsa: testar por `!v` sumia com a peça inteira e devolvia o aluno para a
 * loja sem explicação nenhuma.
 */
function lista(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
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
    (!produto.exige_nome || nomes.every((nome) => nome.trim().length > 0));
  if (!valido) redirect(`/t/${turma.codigo}/loja/${produto.id}`);

  const pecas = modelo.map((m, i) => ({ ...m, tamanho: tamanhos[i], estampa: nomes[i] }));

  const entrada = Math.round((produto.preco_centavos * turma.percentual_entrada) / 100);
  const restante = produto.preco_centavos - entrada;

  /**
   * Em quantas vezes. A primeira parcela é sempre a entrada, então escolher 3
   * quer dizer entrada mais duas. `1` é pagar tudo agora, e por isso aparece
   * como "à vista" em vez de "1x", que não quer dizer nada para quem compra.
   */
  const vezes = Array.from({ length: produto.max_parcelas }, (_, i) => i + 1);
  const valorDaVez = (n: number) =>
    n === 1 ? produto!.preco_centavos : Math.round(restante / (n - 1));

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

  async function confirmar(_estado: string | null, dados: FormData) {
    "use server";

    const escolhidas = Number(dados.get("parcelas") ?? 2);

    const r = await criarPedido(
      aluno!.id,
      turma!.codigo,
      produto!.id,
      pecas.map((p) => ({
        produto_id: p.produtoId,
        tamanho: p.tamanho,
        nome_estampa: capitalizarNome(p.estampa),
      })),
      // O banco corta pelo teto do produto de qualquer jeito; isto só evita
      // mandar lixo quando alguém mexe no formulário.
      Number.isFinite(escolhidas) ? escolhidas : undefined,
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
              {/* Sem bordado, o desenho continua: ele mostra a peça, e é o que
                  o aluno reconhece. O que sai é a linha do nome. */}
              <Estampa nome={produto.exige_nome ? p.estampa : ""} className="w-14 shrink-0" />
              <dl className="min-w-0 flex-1 text-body-sm">
                {pecas.length > 1 && (
                  <p className="mb-1 text-caption font-semibold text-muted">{p.nome}</p>
                )}
                <div className="flex flex-col gap-1">
                  {produto.exige_nome && (
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
                  )}
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

      <FormAcao acao={confirmar} texto="Confirmar pedido" pendenteTexto="Confirmando…">
        {/* Em quantas vezes, só quando há mais de uma opção. Um produto à vista
            não precisa de uma pergunta com uma resposta só. */}
        {vezes.length > 1 && restante > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-body-sm font-semibold text-ink">Em quantas vezes</legend>
            <div className="flex flex-col gap-2">
              {vezes.map((n) => (
                <label
                  key={n}
                  className="cursor-pointer rounded-lg has-[:focus-visible]:outline
                    has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2
                    has-[:focus-visible]:outline-brand-deep"
                >
                  <input
                    type="radio"
                    name="parcelas"
                    value={n}
                    defaultChecked={n === Math.min(2, produto.max_parcelas)}
                    className="peer sr-only"
                  />
                  <span
                    className="flex items-baseline justify-between gap-3 rounded-lg border
                      border-line-strong bg-surface px-4 py-3 text-body-sm text-ink-2
                      transition-[color,border-color,background-color] duration-fast ease-soft
                      hover:border-ink peer-checked:border-ink peer-checked:bg-surface-2
                      peer-checked:text-ink peer-checked:font-semibold"
                  >
                    <span>{n === 1 ? "À vista" : `Entrada + ${n - 1}x`}</span>
                    <span data-nums className="shrink-0">
                      {n === 1
                        ? reais(valorDaVez(1))
                        : `${reais(entrada)} + ${n - 1}x de ${reais(valorDaVez(n))}`}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </FormAcao>

      <p className="text-center text-caption leading-relaxed text-muted">
        Depois de confirmar você ainda pode mudar{" "}
        {produto.exige_nome ? "tamanho e nome" : "o tamanho"}
        {produto.prazo_alteracoes ?? turma.prazo_alteracoes
          ? ` até ${dia(produto.prazo_alteracoes ?? turma.prazo_alteracoes)}`
          : ""}
        , desde que a peça ainda não tenha entrado na produção.
      </p>
    </main>
  );
}

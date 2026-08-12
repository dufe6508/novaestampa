import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buscarProduto, buscarTurma, criarPedido, dia, tamanhoLegivel } from "@/lib/aluno";
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
 * `n` chega vazio quando o produto sai sem bordado, e string vazia é falsa:
 * testar por `!n` devolveria o aluno para a loja sem explicação nenhuma.
 */
export default async function Revisao({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string; produtoId: string }>;
  searchParams: Promise<{ t?: string; n?: string }>;
}) {
  const { codigo, produtoId } = await params;
  const { t, n } = await searchParams;

  const turma = await buscarTurma(codigo);
  if (!turma) notFound();

  const aluno = await sessao();
  if (!aluno) redirect(`/t/${turma.codigo}/entrar`);

  const produto = await buscarProduto(turma.campanha_id, produtoId);
  if (!produto) notFound();

  const estampa = n ?? "";
  const valido =
    !!t && produto.tamanhos.includes(t) && (!produto.exige_nome || estampa.trim().length > 0);
  if (!valido) redirect(`/t/${turma.codigo}/loja/${produto.id}`);

  const tamanho = t!;

  const entrada = Math.round((produto.preco_centavos * turma.percentual_entrada) / 100);
  const restante = produto.preco_centavos - entrada;

  // Cada lápis volta para a tela que decide aquilo, já preenchida: o nome para a
  // personalização, o tamanho para o produto. Sem isso, corrigir uma letra
  // custaria refazer o pedido inteiro.
  const q = new URLSearchParams({ t: tamanho, n: estampa });
  const editarNome = `/t/${turma.codigo}/pedir/${produto.id}/personalizar?${q}`;
  const editarTamanho = `/t/${turma.codigo}/loja/${produto.id}?${q}`;

  async function confirmar(_estado: string | null, dados: FormData) {
    "use server";

    // Entrada mais uma, que é o 50/50 da empresa. Em quantas vezes deixou de
    // ser perguntado aqui: a tela seguinte já decide quanto pagar agora, e a
    // mesma pergunta em duas telas seguidas faz o aluno responder duas vezes
    // sem saber qual das duas valeu.
    const escolhidas = Math.min(2, produto!.max_parcelas);

    const r = await criarPedido(
      aluno!.id,
      turma!.codigo,
      produto!.id,
      [
        {
          produto_id: produto!.id,
          tamanho: tamanho,
          nome_estampa: capitalizarNome(estampa),
        },
      ],
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
        href={produto.exige_nome ? editarNome : editarTamanho}
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
            <p className="text-caption text-muted">1 Peça</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4">
          {/* Sem bordado, o desenho continua: ele mostra a peça, e é o que o
              aluno reconhece. O que sai é a linha do nome. */}
          <Estampa nome={produto.exige_nome ? estampa : ""} className="w-14 shrink-0" />
          <dl className="flex min-w-0 flex-1 flex-col gap-1 text-body-sm">
            {produto.exige_nome && (
              <div className="flex items-baseline gap-2">
                <dt className="shrink-0 text-muted">Nome</dt>
                <dd className="min-w-0 break-words font-semibold text-ink">{estampa}</dd>
                <Link
                  href={editarNome}
                  aria-label={`Alterar o nome da estampa, hoje ${estampa}`}
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
              <dd className="font-semibold text-ink">{tamanhoLegivel(tamanho)}</dd>
              <Link
                href={editarTamanho}
                aria-label={`Alterar o tamanho, hoje ${tamanhoLegivel(tamanho)}`}
                className="ml-auto inline-flex size-8 shrink-0 items-center justify-center
                  self-center rounded-md text-muted transition-colors duration-fast
                  ease-soft hover:bg-surface-2 hover:text-ink"
              >
                <Lapis className="h-4 w-4" />
              </Link>
            </div>
          </dl>
        </div>

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

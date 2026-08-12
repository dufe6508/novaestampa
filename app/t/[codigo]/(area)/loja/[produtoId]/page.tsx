import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarProduto, buscarTurma, dia, podeComprar, prazoDoProduto } from "@/lib/aluno";
import { reais } from "@/lib/supabase";
import { Alerta, Botao, Tamanhos } from "@/components/campos";
import { Galeria } from "@/components/galeria";
import { Seta, Voltar } from "@/components/icones";

/**
 * Produto · A4, primeira metade.
 *
 * Aqui o aluno decide se quer **e em que tamanho**. O tamanho subiu da tela de
 * personalização para cá: ele é parte de escolher a peça, aparece junto da foto
 * e do preço, e a tela seguinte fica só com o nome, que é a decisão que precisa
 * de conferência.
 *
 * O seletor é um `form` com `method="get"`: o navegador monta
 * `/pedir/[id]/personalizar?t=M` sozinho, sem estado e sem JavaScript, e a tela
 * de personalização já sabia ler `t` da URL, porque é assim que o lápis da
 * revisão volta preenchido.
 *
 * Peça sem bordado pula a personalização inteira e vai direto para a revisão:
 * não sobrou nada para ela perguntar.
 */

export default async function Produto({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string; produtoId: string }>;
  /** `t` e `n` chegam quando o aluno volta da revisão para trocar o tamanho. */
  searchParams: Promise<{ t?: string; n?: string }>;
}) {
  const { codigo, produtoId } = await params;
  const { t, n } = await searchParams;
  const turma = await buscarTurma(codigo);
  if (!turma) notFound();

  const produto = await buscarProduto(turma.campanha_id, produtoId);
  if (!produto) notFound();

  const vendendo = podeComprar(turma, produto);
  const tamanhoAtual = t && produto.tamanhos.includes(t) ? t : undefined;
  // Sem nome bordado não há o que personalizar, então o passo do meio some.
  const destino = produto.exige_nome
    ? `/t/${turma.codigo}/pedir/${produto.id}/personalizar`
    : `/t/${turma.codigo}/pedir/${produto.id}/revisao`;
  const prazos = prazoDoProduto(turma, produto);
  const entrada = Math.round((produto.preco_centavos * turma.percentual_entrada) / 100);
  const parcelaMinima = Math.round(
    (produto.preco_centavos - entrada) / Math.max(1, produto.max_parcelas - 1),
  );

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/t/${turma.codigo}/loja`}
        className="inline-flex w-fit items-center gap-1.5 text-caption font-semibold text-ink-2
          transition-colors duration-fast ease-soft hover:text-ink"
      >
        <Voltar className="h-4 w-4" />
        Voltar para a loja
      </Link>

      <div className="grid gap-6 md:grid-cols-2 md:items-start md:gap-10">
        <Galeria imagens={produto.imagens ?? []} nome={produto.nome} />

        <div className="entra flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1>{produto.nome}</h1>
            <p data-nums className="text-num-lg font-semibold tracking-tight">
              {reais(produto.preco_centavos)}
            </p>
            {turma.percentual_entrada < 100 && (
              <p className="text-body-sm text-muted">
                {produto.max_parcelas > 2 ? (
                  <>
                    Entrada De {reais(entrada)} e até {produto.max_parcelas - 1}x de{" "}
                    {reais(parcelaMinima)}.
                  </>
                ) : (
                  <>
                    Entrada De {reais(entrada)}, o resto na entrega
                    {turma.entrega_prevista ? ` em ${dia(turma.entrega_prevista)}` : ""}.
                  </>
                )}
              </p>
            )}
            {!produto.exige_nome && (
              <p className="text-body-sm text-muted">Esta peça sai sem nome bordado.</p>
            )}
          </div>

          {!vendendo ? (
            <Alerta>
              {produto.situacao === "pausado"
                ? "A venda desta peça está pausada. Fale com seu representante."
                : prazos.pedidos
                  ? `O prazo de pedidos terminou em ${dia(prazos.pedidos)}. Fale com seu representante.`
                  : "Esta campanha não está mais aceitando pedidos."}
            </Alerta>
          ) : (
            <form action={destino} method="get" className="flex flex-col gap-5">
              {/* O nome digitado volta junto quando o aluno vem da revisão só
                  para trocar o tamanho. Sem isso ele redigitaria as duas vezes. */}
              {/* Sem bordado, o nome vai vazio e é ele que a revisão grava. */}
              {(produto.exige_nome ? n !== undefined : true) && (
                <input type="hidden" name="n" value={produto.exige_nome ? n : ""} />
              )}

              <Tamanhos nome="t" opcoes={produto.tamanhos} padrao={tamanhoAtual} />

              <Botao type="submit" className="w-full">
                {produto.exige_nome ? "Personalizar" : "Continuar"}
              </Botao>
            </form>
          )}

          {/* Descrição recolhida: quem já decidiu não precisa ler, e quem quer
              o detalhe do tecido abre. `details` nativo abre sem JS. */}
          {produto.descricao && (
            <details className="group border-t border-line pt-4">
              <summary
                className="flex cursor-pointer list-none items-center justify-between gap-3
                  text-body-sm font-semibold text-ink
                  transition-colors duration-fast ease-soft hover:text-ink-2
                  [&::-webkit-details-marker]:hidden"
              >
                Detalhes do produto
                <Seta
                  className="h-4 w-4 shrink-0 text-muted transition-transform duration-base
                    ease-soft group-open:rotate-90"
                />
              </summary>
              <p className="mt-3 max-w-[60ch] text-body-sm leading-relaxed text-ink-2">
                {produto.descricao}
              </p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

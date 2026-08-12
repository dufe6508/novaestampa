import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buscarProduto,
  buscarTurma,
  dia,
  listarPecas,
  podeComprar,
  prazoDoProduto,
} from "@/lib/aluno";
import { reais } from "@/lib/supabase";
import { Alerta, BotaoLink } from "@/components/campos";
import { Galeria } from "@/components/galeria";
import { Seta, Voltar } from "@/components/icones";

/**
 * Produto · A4, primeira metade.
 *
 * Aqui o aluno decide SE quer. Tamanho e nome ficam juntos na tela seguinte,
 * que é a tela de personalização: assim existe um lugar só para onde o lápis
 * da revisão volta, em vez de espalhar a mesma decisão em duas telas.
 */

export default async function Produto({
  params,
}: {
  params: Promise<{ codigo: string; produtoId: string }>;
}) {
  const { codigo, produtoId } = await params;
  const turma = await buscarTurma(codigo);
  if (!turma) notFound();

  const produto = await buscarProduto(turma.campanha_id, produtoId);
  if (!produto) notFound();

  const pecas = produto.tipo === "kit" ? await listarPecas(produto.id) : [];
  const vendendo = podeComprar(turma, produto);
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

          {produto.tipo === "kit" && pecas.length > 0 && (
            <div className="rounded-lg border border-line bg-surface-2 px-4 py-3">
              <p className="label mb-2 text-muted">O kit inclui</p>
              <ul className="flex flex-col gap-1 text-body-sm text-ink-2">
                {pecas.map((p) => (
                  <li key={p.componente_id}>
                    {p.quantidade > 1 && `${p.quantidade}× `}
                    {p.componente_nome}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!vendendo ? (
            <Alerta>
              {produto.situacao === "pausado"
                ? "A venda desta peça está pausada. Fale com seu representante."
                : prazos.pedidos
                  ? `O prazo de pedidos terminou em ${dia(prazos.pedidos)}. Fale com seu representante.`
                  : "Esta campanha não está mais aceitando pedidos."}
            </Alerta>
          ) : (
            // "Personalizar" e não "fazer pedido": o botão leva para escolher
            // tamanho e nome, não fecha compra nenhuma. Prometer pedido aqui
            // faria o aluno hesitar em clicar. Sem bordado a tela seguinte é só
            // o tamanho, e o verbo muda junto.
            <BotaoLink
              href={`/t/${turma.codigo}/pedir/${produto.id}/personalizar`}
              className="w-full"
            >
              {produto.exige_nome
                ? `Personalizar meu ${produto.tipo === "kit" ? "kit" : "uniforme"}`
                : "Escolher o tamanho"}
            </BotaoLink>
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

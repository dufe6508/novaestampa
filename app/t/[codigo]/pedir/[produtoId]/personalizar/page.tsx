import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buscarProduto, buscarTurma, listarPecas } from "@/lib/aluno";
import { sessao } from "@/lib/sessao";
import { Voltar } from "@/components/icones";
import { FormPersonalizar } from "./form-personalizar";

/**
 * Personalização · A4, segunda metade. Tamanho e nome, numa tela só.
 *
 * Fora da casca de abas de propósito: quem está fechando um pedido não precisa
 * de quatro saídas na tela.
 *
 * Aceita `t` e `n` na URL para voltar preenchida. É o que faz o lápis da tela
 * de revisão funcionar sem o aluno redigitar tudo.
 */

function lista(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function Personalizar({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string; produtoId: string }>;
  searchParams: Promise<{ t?: string | string[]; n?: string | string[]; foco?: string }>;
}) {
  const { codigo, produtoId } = await params;
  const { t, n, foco } = await searchParams;

  const turma = await buscarTurma(codigo);
  if (!turma) notFound();
  if (!(await sessao())) redirect(`/t/${turma.codigo}/entrar`);

  const produto = await buscarProduto(turma.campanha_id, produtoId);
  if (!produto) notFound();

  const pecasKit = produto.tipo === "kit" ? await listarPecas(produto.id) : [];

  // Uma entrada por peça física.
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

  // Só aceita o que veio da URL se bater com a grade real. Lixo na URL não
  // pode virar pedido, e o servidor valida de novo na hora de gravar.
  const tamanhos = lista(t);
  const nomes = lista(n);
  const prefill = modelo.map((m, i) => ({
    tamanho: m.tamanhos.includes(tamanhos[i]) ? tamanhos[i] : undefined,
    nome: nomes[i] ?? "",
  }));

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 pb-12 pt-6">
      <Link
        href={`/t/${turma.codigo}/loja/${produto.id}`}
        className="inline-flex w-fit items-center gap-1.5 text-caption font-semibold text-ink-2
          transition-colors duration-fast ease-soft hover:text-ink"
      >
        <Voltar className="h-4 w-4" />
        Voltar
      </Link>

      <header className="entra flex flex-col gap-1.5">
        <h1>Tamanho e nome</h1>
        <p className="text-body-sm leading-relaxed text-muted">
          O nome vai bordado na peça. Confira letra por letra, esta parte não tem conserto
          depois que a peça é produzida.
        </p>
      </header>

      <FormPersonalizar
        codigo={turma.codigo}
        produtoId={produto.id}
        maxCaracteres={produto.max_caracteres_nome}
        pecas={modelo}
        prefill={prefill}
        foco={foco === "nome" ? "nome" : foco === "tamanho" ? "tamanho" : undefined}
      />
    </main>
  );
}

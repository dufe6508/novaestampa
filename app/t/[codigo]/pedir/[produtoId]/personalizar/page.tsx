import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buscarProduto, buscarTurma, tamanhoLegivel } from "@/lib/aluno";
import { sessao } from "@/lib/sessao";
import { Voltar } from "@/components/icones";
import { FormPersonalizar } from "./form-personalizar";

/**
 * Personalização · A4, segunda metade. Só o nome.
 *
 * O tamanho subiu para a tela do produto, junto da foto e do preço. Aqui ficou a
 * única decisão que precisa de conferência letra por letra, e a tela encolheu
 * para dois campos e o desenho da peça.
 *
 * `t` vem obrigatoriamente da URL, e `n` vem quando o aluno volta da revisão
 * para corrigir a digitação. Tamanho fora da grade não entra: quem chega com
 * lixo na URL volta para o produto e escolhe de novo.
 *
 * Produto sem bordado nem passa por aqui: o formulário do produto manda direto
 * para a revisão.
 */

export default async function Personalizar({
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
  if (!(await sessao())) redirect(`/t/${turma.codigo}/entrar`);

  const produto = await buscarProduto(turma.campanha_id, produtoId);
  if (!produto) notFound();

  const voltar = `/t/${turma.codigo}/loja/${produto.id}`;

  // Sem tamanho válido não há pedido a montar, e sem bordado não há o que
  // perguntar: os dois casos voltam para a tela que resolve.
  if (!t || !produto.tamanhos.includes(t) || !produto.exige_nome) {
    redirect(`${voltar}${t ? `?t=${encodeURIComponent(t)}` : ""}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 px-4 pb-12 pt-6">
      <Link
        href={`${voltar}?t=${encodeURIComponent(t)}`}
        className="inline-flex w-fit items-center gap-1.5 text-caption font-semibold text-ink-2
          transition-colors duration-fast ease-soft hover:text-ink"
      >
        <Voltar className="h-4 w-4" />
        Voltar
      </Link>

      <header className="entra flex flex-col gap-1">
        <h1>Nome da estampa</h1>
        <p className="text-body-sm text-muted">
          {produto.nome} · Tamanho {tamanhoLegivel(t)}
        </p>
      </header>

      <FormPersonalizar
        codigo={turma.codigo}
        produtoId={produto.id}
        tamanho={t}
        maxCaracteres={produto.max_caracteres_nome}
        nomeInicial={n ?? ""}
      />
    </main>
  );
}

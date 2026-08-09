import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buscarTurma, meusPedidos, totalEmAberto } from "@/lib/aluno";
import { sessao } from "@/lib/sessao";
import { reais } from "@/lib/formato";
import { Logo, Marca } from "@/components/logo";
import { Info } from "@/components/icones";
import { NavInferior, NavLateral } from "@/components/nav-aluno";

/**
 * Casca das quatro abas.
 *
 * Dois layouts de verdade, não um esticado:
 *
 * · Celular: conteúdo em coluna única, cabeçalho na cor do fundo (não uma
 *   barra branca colada em cima) e barra de abas embaixo.
 * · Desktop: trilho lateral de altura inteira em superfície branca contra o
 *   fundo cinza. O trilho carrega marca, contexto da turma, navegação e o
 *   saldo, então o cabeçalho do celular simplesmente deixa de existir.
 *
 * A coluna de conteúdo é limitada a 860px de propósito. Esticar card de
 * produto até 1500px não é aproveitar a tela, é perder a proporção da foto e
 * a linha de leitura.
 *
 * O checkout fica FORA daqui: quem está pagando não precisa de quatro saídas.
 */

export default async function AreaAluno({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const turma = await buscarTurma(codigo);
  if (!turma) notFound();

  const aluno = await sessao();
  if (!aluno) redirect(`/t/${turma.codigo}/entrar`);

  const pedidos = await meusPedidos(aluno.id, turma.codigo);
  const emAberto = totalEmAberto(pedidos);

  return (
    <div className="flex min-h-dvh">
      {/* trilho lateral · desktop */}
      <aside
        className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-line
          bg-surface px-4 py-6 md:flex"
      >
        <Link
          href={`/t/${turma.codigo}/loja`}
          className="mb-7 px-3 transition-opacity duration-fast ease-soft hover:opacity-70"
        >
          <Logo destaque />
        </Link>

        <Link
          href={`/t/${turma.codigo}/turma`}
          className="mb-6 rounded-lg bg-surface-2 px-3 py-2.5
            transition-colors duration-fast ease-soft hover:bg-line"
        >
          <p className="label mb-1 text-muted">{turma.label_grupo}</p>
          <p className="text-body-sm font-semibold leading-tight">
            {turma.grupo_nome} · {turma.campanha_nome}
          </p>
          <p className="mt-0.5 truncate text-caption text-muted">{turma.cliente_nome}</p>
        </Link>

        <NavLateral codigo={turma.codigo} emAberto={emAberto} />

        {emAberto > 0 && (
          <Link
            href={`/t/${turma.codigo}/carteira`}
            className="mt-auto rounded-lg border border-line px-3 py-3
              transition-colors duration-fast ease-soft hover:border-line-strong hover:bg-surface-2"
          >
            <p className="label mb-1 text-muted">Em aberto</p>
            {/* Verde de dinheiro, não o ciano da marca: aqui o número é valor,
                não identidade. */}
            <p data-nums className="text-h3 font-semibold tracking-tight text-success">
              {reais(emAberto)}
            </p>
          </Link>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabeçalho · só no celular, na cor do fundo para não virar uma laje.
            Carrega o contexto que no desktop mora no trilho: cliente e turma.
            Prazo não entra aqui, é dado que muda e envelhece; ele vive na tela
            da turma, que o botão de informação abre. */}
        <header
          className="sticky top-0 z-20 flex h-14 items-center gap-2.5 bg-ground/85 px-4
            backdrop-blur md:hidden"
        >
          <Marca destaque className="h-5 w-5 shrink-0 text-ink" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-caption font-semibold leading-tight">
              {turma.cliente_nome}
            </p>
            <p className="truncate text-caption leading-tight text-muted">
              {turma.label_grupo} {turma.grupo_nome}
            </p>
          </div>

          <Link
            href={`/t/${turma.codigo}/turma`}
            aria-label="Ver informações da turma e prazos"
            className="-mr-2 flex size-9 shrink-0 items-center justify-center rounded-full
              text-muted transition-colors duration-fast ease-soft
              active:bg-surface-2 active:text-ink"
          >
            <Info className="h-5 w-5" />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-[860px] px-4 pb-24 pt-2 md:px-10 md:pb-16 md:pt-12">
          {children}
        </main>
      </div>

      <NavInferior codigo={turma.codigo} emAberto={emAberto} />
    </div>
  );
}

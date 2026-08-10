import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  buscarTurma,
  dia,
  editarItem,
  meusPedidos,
  podeEditar,
  tamanhoLegivel,
} from "@/lib/aluno";
import { sessao } from "@/lib/sessao";
import { capitalizarNome } from "@/lib/formato";
import { Alerta, BotaoLink } from "@/components/campos";
import { Voltar } from "@/components/icones";
import { FormEditar } from "./form-editar";

/**
 * Editar peça · tamanho e nome.
 *
 * Regra: dentro do prazo de alterações E a peça ainda não sendo produzida.
 * Pagar a entrada não trava nada, só tira o pedido da fila de espera: a oficina
 * começa depois que as alterações fecham. A mesma regra é validada de novo no
 * banco, porque URL qualquer um digita.
 */

export default async function Editar({
  params,
}: {
  params: Promise<{ codigo: string; pedidoId: string; itemId: string }>;
}) {
  const { codigo, pedidoId, itemId } = await params;

  const turma = await buscarTurma(codigo);
  if (!turma) notFound();

  const aluno = await sessao();
  if (!aluno) redirect(`/t/${turma.codigo}/entrar`);

  const pedido = (await meusPedidos(aluno.id, turma.codigo)).find((p) => p.id === pedidoId);
  if (!pedido) notFound();

  const item = pedido.itens.find((i) => i.id === itemId);
  if (!item) notFound();

  const editavel = podeEditar(pedido, turma);

  async function acao(_estado: string | null, dados: FormData) {
    "use server";

    const r = await editarItem(
      aluno!.id,
      itemId,
      String(dados.get("t") ?? ""),
      capitalizarNome(String(dados.get("nome") ?? "")),
    );
    if (r.erro) return r.erro;

    redirect(`/t/${turma!.codigo}/pedidos`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 pb-12 pt-6">
      <Link
        href={`/t/${turma.codigo}/pedidos`}
        className="inline-flex w-fit items-center gap-1.5 text-caption font-semibold text-ink-2
          transition-colors duration-fast ease-soft hover:text-ink"
      >
        <Voltar className="h-4 w-4" />
        Voltar para meus pedidos
      </Link>

      <header className="flex flex-col gap-1.5">
        <h1>Alterar peça</h1>
        <p className="text-body-sm text-muted">
          {item.produto} · pedido de{" "}
          {new Date(pedido.criado_em).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
          })}
        </p>
      </header>

      {editavel ? (
        <>
          {turma.prazo_alteracoes && (
            <Alerta>
              Alterações abertas até {dia(turma.prazo_alteracoes)}. A produção inicia após essa
              data, e tamanho e nome ficam travados.
            </Alerta>
          )}

          <FormEditar
            acao={acao}
            tamanhos={item.tamanhos}
            tamanhoAtual={item.tamanho}
            nomeAtual={item.nome_estampa}
            maxCaracteres={item.max_caracteres}
          />
        </>
      ) : (
        // Modo leitura em vez de sumir com a tela: o aluno precisa entender o
        // que aconteceu e ter para onde ir.
        <div className="flex flex-col gap-4">
          <Alerta>
            {["aguardando", "liberado"].includes(pedido.status_producao)
              ? `O prazo de alterações terminou${
                  turma.prazo_alteracoes ? ` em ${dia(turma.prazo_alteracoes)}` : ""
                }. Fale com seu representante.`
              : "Esta peça já está sendo produzida, então tamanho e nome não podem mais mudar."}
          </Alerta>

          <dl className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
            <div className="flex flex-col gap-0.5">
              <dt className="label text-muted">Nome bordado</dt>
              <dd className="break-words text-body font-semibold">{item.nome_estampa}</dd>
            </div>
            <div className="flex flex-col gap-0.5 border-t border-line pt-3">
              <dt className="label text-muted">Tamanho</dt>
              <dd className="text-body font-semibold">{tamanhoLegivel(item.tamanho)}</dd>
            </div>
          </dl>

          <BotaoLink href={`/t/${turma.codigo}/pedidos`} tom="secundario">
            Voltar para meus pedidos
          </BotaoLink>
        </div>
      )}
    </main>
  );
}

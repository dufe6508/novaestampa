import Link from "next/link";
import QRCode from "qrcode";
import { notFound, redirect } from "next/navigation";
import { buscarTurma, dia, meusPedidos, pagar, pagarPedido } from "@/lib/aluno";
import { sessao } from "@/lib/sessao";
import { reais } from "@/lib/supabase";
import { Marca } from "@/components/logo";
import { Voltar } from "@/components/icones";
import { FormPagamento } from "./form-pagamento";

/**
 * Pagamento · A6. Serve a entrada, a 2ª parcela e o pedido inteiro.
 *
 * SIMULADO. Não há gateway integrado (CLAUDE.md §3.1), e a tela diz isso em
 * texto: demo que finge cobrar de verdade confunde na reunião. O banco também
 * marca, `provider = 'simulado'`.
 *
 * O QR é gerado de verdade e escaneia. O conteúdo dele é um texto de
 * demonstração, não um código Pix válido, justamente para ninguém pagar nada
 * por engano.
 */

async function qr(texto: string) {
  return QRCode.toDataURL(texto, {
    margin: 1,
    width: 420,
    errorCorrectionLevel: "M",
    color: { dark: "#0e1416", light: "#ffffff" },
  });
}

export default async function Pagamento({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string; pedidoId: string }>;
  searchParams: Promise<{ parcela?: string }>;
}) {
  const { codigo, pedidoId } = await params;
  const { parcela: parcelaPedida } = await searchParams;

  const turma = await buscarTurma(codigo);
  if (!turma) notFound();

  const aluno = await sessao();
  if (!aluno) redirect(`/t/${turma.codigo}/entrar`);

  const pedido = (await meusPedidos(aluno.id, turma.codigo)).find((p) => p.id === pedidoId);
  if (!pedido) notFound();

  // Sem parcela indicada, cobra a primeira em aberto. É quase sempre a certa.
  const parcela = parcelaPedida
    ? pedido.parcelas.find((p) => p.id === parcelaPedida)
    : pedido.parcelas.find((p) => p.saldo > 0);

  // Já quitou tudo: em vez de erro, mostra o comprovante.
  if (!parcela || parcela.saldo <= 0) {
    redirect(`/t/${turma.codigo}/pedido/${pedido.id}/confirmado`);
  }

  const abertas = pedido.parcelas.filter((p) => p.saldo > 0);
  const total = abertas.reduce((s, p) => s + p.saldo, 0);
  const podeQuitar = total > parcela.saldo;
  const restoDepois = total - parcela.saldo;

  const ref = pedido.id.slice(0, 8).toUpperCase();
  const [qrParcela, qrTotal] = await Promise.all([
    qr(`NOVA ESTAMPA (DEMONSTRACAO) Pedido ${ref} valor ${reais(parcela.saldo)}`),
    podeQuitar
      ? qr(`NOVA ESTAMPA (DEMONSTRACAO) Pedido ${ref} valor ${reais(total)}`)
      : Promise.resolve(""),
  ]);

  async function acao(_estado: string | null, dados: FormData) {
    "use server";

    const metodo = String(dados.get("metodo") ?? "pix");
    const tudo = dados.get("escopo") === "tudo";

    const r = tudo
      ? await pagarPedido(aluno!.id, pedidoId, metodo)
      : await pagar(aluno!.id, parcela!.id, metodo);

    if (r.erro) return r.erro;

    redirect(`/t/${turma!.codigo}/pedido/${pedidoId}/confirmado`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 pb-12 pt-6">
      <Link
        href={`/t/${turma.codigo}/pedidos`}
        className="inline-flex w-fit items-center gap-1.5 text-caption font-semibold text-ink-2
          transition-colors duration-fast ease-soft hover:text-ink"
      >
        <Voltar className="h-4 w-4" />
        Meus pedidos
      </Link>

      <header className="entra flex flex-col items-center gap-3 text-center">
        <Marca destaque className="h-7 w-7 text-ink" />
        <div className="flex flex-col gap-1">
          <h1>{parcela.eh_entrada ? "Pagar o pedido" : `${parcela.numero}ª parcela`}</h1>
          <p className="text-body-sm text-muted">
            {pedido.produto} · {turma.label_grupo} {turma.grupo_nome}
          </p>
        </div>
      </header>

      <FormPagamento
        acao={acao}
        valorParcela={parcela.saldo}
        valorTotal={total}
        podeQuitar={podeQuitar}
        restoDepois={restoDepois}
        entrada={parcela.eh_entrada}
        percentualEntrada={turma.percentual_entrada}
        vencimentoResto={
          abertas.find((p) => p.id !== parcela!.id)?.vencimento
            ? dia(abertas.find((p) => p.id !== parcela!.id)!.vencimento)
            : null
        }
        qrParcela={qrParcela}
        qrTotal={qrTotal}
        referencia={ref}
        voltarPara={`/t/${turma.codigo}/pedidos`}
      />
    </main>
  );
}

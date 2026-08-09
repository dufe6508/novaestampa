import Link from "next/link";
import { notFound } from "next/navigation";
import { publico } from "@/lib/supabase";
import { Marca } from "@/components/logo";

/**
 * Confirmação de turma, caminho principal do aluno (o link que o representante manda).
 *
 * Existe por um motivo só: impedir que alguém peça na turma errada. Pedido na turma
 * errada não some, ele aparece na lista de produção de outra sala.
 */

const dia = (d: string | null) =>
  d
    ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
    : null;

type Turma = {
  codigo: string;
  grupo_nome: string;
  campanha_nome: string;
  campanha_status: string;
  label_grupo: string;
  prazo_pedidos: string | null;
  entrega_prevista: string | null;
  cliente_nome: string;
  cliente_cidade: string | null;
};

export default async function ConfirmarTurma({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;

  const { data } = await publico()
    .from("vw_turma_publica")
    .select("*")
    .eq("codigo", codigo.toUpperCase())
    .maybeSingle<Turma>();

  if (!data) notFound();

  const aberta = data.campanha_status === "aberta";

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-[352px]">
        <section className="rounded-xl border border-line bg-surface px-6 py-7 shadow-float">
          <header className="mb-5 flex flex-col items-center gap-3.5 text-center">
            <Marca destaque className="h-8 w-8 text-ink" />
            <p className="text-body-sm text-muted">Você está entrando em</p>
          </header>

          <dl className="flex flex-col gap-4">
            <div className="flex flex-col gap-0.5 text-center">
              <dt className="sr-only">Escola</dt>
              <dd className="text-[19px] font-semibold leading-snug">{data.cliente_nome}</dd>
              {data.cliente_cidade && (
                <dd className="text-caption text-muted">{data.cliente_cidade}</dd>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
              <div className="flex flex-col gap-0.5">
                <dt className="label text-muted">{data.label_grupo}</dt>
                <dd className="text-h3 font-semibold">{data.grupo_nome}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="label text-muted">Campanha</dt>
                <dd className="text-h3 font-semibold">{data.campanha_nome}</dd>
              </div>
            </div>

            {(dia(data.prazo_pedidos) || dia(data.entrega_prevista)) && (
              <div className="flex flex-col gap-1.5 border-t border-line pt-4 text-caption">
                {dia(data.prazo_pedidos) && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted">Pedidos até</dt>
                    <dd className="font-semibold text-ink">{dia(data.prazo_pedidos)}</dd>
                  </div>
                )}
                {dia(data.entrega_prevista) && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted">Entrega prevista</dt>
                    <dd className="font-semibold text-ink">{dia(data.entrega_prevista)}</dd>
                  </div>
                )}
              </div>
            )}
          </dl>

          {aberta ? (
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href={`/t/${data.codigo}/entrar`}
                className="flex h-11 items-center justify-center rounded-lg bg-ink px-4
                  text-body-sm font-semibold text-white
                  transition-opacity duration-fast ease-soft hover:opacity-90 active:opacity-80"
              >
                Sim, é a minha turma
              </Link>
              <Link
                href="/entrar"
                className="flex h-10 items-center justify-center rounded-lg px-4 text-caption
                  font-semibold text-ink-2
                  transition-colors duration-fast ease-soft hover:bg-surface-2 hover:text-ink"
              >
                Não é essa
              </Link>
            </div>
          ) : (
            // Campanha fechada não some com a tela: o aluno precisa entender o que houve
            // e ter para onde ir.
            <div className="mt-6 flex flex-col gap-3">
              <p className="rounded-lg bg-warning-soft px-3.5 py-3 text-caption leading-relaxed text-warning">
                Esta campanha não está aceitando novos pedidos. Se você já pediu e precisa
                acertar alguma coisa, fale com seu representante.
              </p>
              <Link
                href="/entrar"
                className="flex h-10 items-center justify-center rounded-lg px-4 text-caption
                  font-semibold text-ink-2
                  transition-colors duration-fast ease-soft hover:bg-surface-2 hover:text-ink"
              >
                Entrar em outra turma
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

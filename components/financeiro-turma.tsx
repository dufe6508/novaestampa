import Link from "next/link";
import { data } from "@/lib/painel";
import { reais } from "@/lib/formato";
import {
  COBRANCA,
  aVencer,
  filas,
  foraDoPrazo,
  listarContasReceber,
  listarUltimasEntradas,
  listarMovimento,
  posicao,
} from "@/lib/financeiro";
import { Bloco, Valor } from "./painel";
import { Entradas, Modos } from "./financeiro";

/**
 * Aba Financeiro da turma. Escopo da turma e nada mais.
 *
 * A unidade da tabela é a parcela, igual à tela de contas a receber, sem as
 * colunas de escola e campanha, que aqui são constantes. Turma quitada mostra
 * estado próprio, não uma tabela vazia: é o que a representante quer ver.
 */

const TH = "label px-4 py-2.5 text-muted";
const TD = "px-4 py-2.5";

export async function FinanceiroDaTurma({ grupoId, url }: { grupoId: string; url: (extra: { pedido?: string }) => string }) {
  const [contas, movimento, entradas] = await Promise.all([
    listarContasReceber(undefined, undefined, grupoId),
    listarMovimento(undefined, undefined, grupoId),
    listarUltimasEntradas(undefined, undefined, grupoId),
  ]);

  const carteira = posicao(movimento, contas);
  const [atrasado, semPagamento] = filas(contas);
  const proximos7 = aVencer(contas, 7);

  const emAberto = contas
    .filter((c) => c.saldo_centavos > 0)
    .sort(
      (a, b) => (b.dias_atraso ?? 0) - (a.dias_atraso ?? 0) || b.saldo_centavos - a.saldo_centavos,
    );

  const alunos = new Set(contas.map((c) => c.aluno_nome));
  const devendo = new Set(emAberto.map((c) => c.aluno_nome));
  const vencido = foraDoPrazo(contas).reduce((t, c) => t + c.saldo_centavos, 0);

  return (
    <div className="flex flex-col gap-3">
      <section
        className="entra grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Posição da turma, hoje"
      >
        {[
          { rotulo: "Vendido", valor: carteira.vendido, nota: `${carteira.pedidos} pedidos` },
          {
            rotulo: "Recebido",
            valor: carteira.recebido,
            nota: `${carteira.arrecadado}% do vendido`,
          },
          {
            rotulo: "A receber",
            valor: carteira.aReceber,
            nota: `${reais(proximos7.valor_centavos)} vence em 7 dias`,
          },
          {
            rotulo: "Fora do prazo",
            valor: vencido,
            nota: `${devendo.size} de ${alunos.size} alunos devendo`,
            alerta: true,
          },
        ].map((k) => (
          <div key={k.rotulo} className="rounded-lg border border-line bg-surface px-4 py-3.5">
            <p className="label text-muted">{k.rotulo}</p>
            <p
              data-nums
              className={`text-num font-semibold ${k.alerta && k.valor > 0 ? "text-danger" : ""}`}
            >
              {reais(k.valor)}
            </p>
            <p data-nums className="text-caption text-muted">
              {k.nota}
            </p>
          </div>
        ))}
      </section>

      {vencido > 0 && (
        <Modos
          opcoes={[atrasado, semPagamento]
            .filter((f) => f.valor > 0)
            .map((f) => ({
              texto: COBRANCA[f.grupo].titulo,
              href: `/painel/financeiro/receber?modo=${f.grupo}&turma=${grupoId}`,
              ativo: false,
              centavos: f.valor,
              pedidos: f.pedidos,
            }))}
        />
      )}

      <Bloco titulo="Parcelas em aberto">
        {emAberto.length === 0 ? (
          <p className="px-4 py-10 text-center text-body-sm text-muted">
            {alunos.size === 0
              ? "Nenhum pedido nesta turma ainda."
              : `As ${alunos.size} pessoas desta turma estão quitadas.`}
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] border-collapse text-body-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2">
                    <th className={`${TH} text-left`}>Aluno</th>
                    <th className={`${TH} text-left`}>Produto</th>
                    <th className={`${TH} text-center`}>Parcela</th>
                    <th className={`${TH} text-right`}>Valor</th>
                    <th className={`${TH} text-right`}>Pago</th>
                    <th className={`${TH} text-right`}>Falta</th>
                    <th className={`${TH} text-center`}>Vencimento</th>
                    <th className={`${TH} text-center`}>Atraso</th>
                  </tr>
                </thead>
                <tbody>
                  {emAberto.map((c) => (
                    <tr
                      key={c.parcela_id}
                      className="border-b border-line transition-colors duration-fast ease-soft
                        last:border-0 hover:bg-surface-2"
                    >
                      <td className={TD}>
                        <Link
                          href={url({ pedido: c.pedido_id })}
                          scroll={false}
                          className="font-medium text-ink underline-offset-2 hover:underline"
                        >
                          {c.aluno_nome}
                        </Link>
                      </td>
                      <td className={`${TD} text-ink-2`}>{c.produto}</td>
                      <td data-nums className={`${TD} text-center text-ink-2`}>
                        {c.numero}
                        {c.eh_entrada && (
                          <span className="block text-caption text-muted">Entrada</span>
                        )}
                      </td>
                      <td className={`${TD} text-right`}>
                        <Valor centavos={c.valor_centavos} />
                      </td>
                      <td className={`${TD} text-right`}>
                        <Valor centavos={c.pago_centavos} />
                      </td>
                      <td className={`${TD} text-right`}>
                        <Valor
                          centavos={c.saldo_centavos}
                          tom={c.dias_atraso ? "alerta" : "forte"}
                        />
                      </td>
                      <td data-nums className={`${TD} text-center text-caption text-muted`}>
                        {data(c.vencimento) ?? "Sem data"}
                      </td>
                      <td data-nums className={`${TD} text-center`}>
                        {c.dias_atraso ? (
                          <span className="font-medium text-danger">{c.dias_atraso} d</span>
                        ) : (
                          <span className="text-faint">no prazo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line-strong bg-surface-2">
                    <td colSpan={5} className={`${TD} text-caption font-semibold text-ink-2`}>
                      {emAberto.length}{" "}
                      {emAberto.length === 1 ? "Parcela em aberto" : "Parcelas em aberto"}
                    </td>
                    <td className={`${TD} text-right`}>
                      <Valor centavos={carteira.aReceber} tom="forte" />
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            <ul className="divide-y divide-line md:hidden">
              {emAberto.map((c) => (
                <li key={c.parcela_id}>
                  <Link
                    href={url({ pedido: c.pedido_id })}
                    scroll={false}
                    className="flex flex-col gap-1 px-4 py-3 transition-colors duration-fast
                      ease-soft active:bg-surface-2"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-body-sm font-semibold">
                        {c.aluno_nome}
                      </span>
                      <Valor centavos={c.saldo_centavos} tom={c.dias_atraso ? "alerta" : "forte"} />
                    </span>
                    <span className="flex items-baseline justify-between gap-3 text-caption">
                      <span className="min-w-0 truncate text-muted">
                        {c.produto} · parcela {c.numero}
                      </span>
                      <span data-nums className="shrink-0">
                        {c.dias_atraso ? (
                          <span className="text-danger">{c.dias_atraso} D de atraso</span>
                        ) : (
                          <span className="text-muted">{data(c.vencimento) ?? "Sem data"}</span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Bloco>

      <div className="grid gap-3 lg:grid-cols-2">
        <Bloco titulo="Últimas entradas">
          <Entradas linhas={entradas} />
        </Bloco>
        <Bloco titulo="Exportar">
          <div className="flex flex-col gap-3 px-4 py-4">
            <p className="text-body-sm text-muted">
              Uma linha por parcela, com aluno, valor, vencimento e atraso. Respeita o escopo
              desta turma.
            </p>
            <a
              href={`/painel/financeiro/receber/csv?modo=tudo&turma=${grupoId}`}
              className="inline-flex h-10 w-fit items-center rounded-md border border-line-strong
                bg-surface px-3.5 text-body-sm font-medium text-ink-2 transition-colors
                duration-fast ease-soft hover:border-ink hover:text-ink"
            >
              Exportar CSV
            </a>
          </div>
        </Bloco>
      </div>
    </div>
  );
}

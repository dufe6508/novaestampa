import Link from "next/link";
import { data } from "@/lib/painel";
import type { ContaReceber } from "@/lib/contas";
import { Valor } from "./painel";

/**
 * A tabela de contas a receber. Uma linha por **parcela**.
 *
 * Mora aqui porque três telas usam a mesma: a cobrança da empresa inteira, a da
 * campanha e a aba da turma. O que muda entre elas é só o escopo, e escopo é
 * filtro, não outra tabela.
 *
 * **A linha inteira é clicável**, não só o nome. Alvo de nome tem a largura do
 * nome, e "Ana" é um alvo de 30px no celular; a linha tem a largura da tela. No
 * desktop é o mesmo raciocínio, com menos precisão exigida do mouse.
 *
 * A célula da caixa de seleção fica fora desse alvo: marcar para cancelar e abrir
 * o pedido são ações diferentes, e uma não pode disparar a outra.
 */

const TH = "label px-3.5 py-2.5 text-muted";
const TD = "px-3.5 py-2.5";

/** Colunas que só fazem sentido fora do escopo da turma. */
export type Colunas = { turma?: boolean; campanha?: boolean };

export function TabelaReceber({
  linhas,
  url,
  selecionaveis,
  selecionados = [],
  colunas = { turma: true, campanha: true },
  destaque,
  total,
}: {
  linhas: ContaReceber[];
  url: (extra: { pedido?: string }) => string;
  /** Liga a coluna de seleção, no modo de cancelamento em lote. */
  selecionaveis?: boolean;
  selecionados?: string[];
  colunas?: Colunas;
  /** Pedido aberto na gaveta, para a linha ficar marcada. */
  destaque?: string;
  total: number;
}) {
  const pedidos = new Set(linhas.map((c) => c.pedido_id)).size;
  const alunos = new Set(linhas.map((c) => c.aluno_nome)).size;
  const colspan = 4 + (selecionaveis ? 1 : 0) + (colunas.turma ? 1 : 0);

  return (
    <>
      <div
        className="entra hidden overflow-hidden rounded-lg border border-line bg-surface
          shadow-card md:block"
        style={{ "--atraso": "160ms" } as React.CSSProperties}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                {selecionaveis && <th className={`${TH} w-10`} aria-label="Seleção" />}
                <th className={`${TH} text-left`}>Aluno</th>
                {colunas.turma && <th className={`${TH} text-left`}>Turma</th>}
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
              {linhas.map((c) => (
                <tr
                  key={c.parcela_id}
                  className={`group relative border-b border-line transition-colors duration-fast
                    ease-soft last:border-0 hover:bg-surface-2
                    ${destaque === c.pedido_id ? "bg-surface-2" : ""}`}
                >
                  {selecionaveis && (
                    <td className={`${TD} relative z-10`}>
                      <input
                        type="checkbox"
                        name="sel"
                        value={c.pedido_id}
                        defaultChecked={selecionados.includes(c.pedido_id)}
                        aria-label={`Selecionar o pedido de ${c.aluno_nome}`}
                        className="size-4 accent-ink"
                      />
                    </td>
                  )}
                  <td className={TD}>
                    {/* O link cobre a linha inteira com `after:absolute`. É o mesmo
                        truque do cartão de cliente, e por isso a linha é `relative`. */}
                    <Link
                      href={url({ pedido: c.pedido_id })}
                      scroll={false}
                      className="font-medium text-ink after:absolute after:inset-0
                        after:content-[''] group-hover:underline focus-visible:outline
                        focus-visible:outline-2 focus-visible:outline-offset-2
                        focus-visible:outline-brand-deep"
                    >
                      {c.aluno_nome}
                    </Link>
                    {c.aluno_telefone && (
                      <span data-nums className="block text-caption text-muted">
                        {c.aluno_telefone}
                      </span>
                    )}
                  </td>
                  {colunas.turma && (
                    <td className={`${TD} text-ink-2`}>
                      {c.grupo_nome}
                      {colunas.campanha && (
                        <span className="block text-caption text-muted">{c.campanha_nome}</span>
                      )}
                    </td>
                  )}
                  <td className={`${TD} text-ink-2`}>{c.produto}</td>
                  <td data-nums className={`${TD} text-center text-ink-2`}>
                    {c.numero}
                    {c.eh_entrada && <span className="block text-caption text-muted">Entrada</span>}
                  </td>
                  <td className={`${TD} text-right`}>
                    <Valor centavos={c.valor_centavos} />
                  </td>
                  <td className={`${TD} text-right`}>
                    <Valor centavos={c.pago_centavos} />
                  </td>
                  <td className={`${TD} text-right`}>
                    <Valor centavos={c.saldo_centavos} tom={c.dias_atraso ? "alerta" : "forte"} />
                  </td>
                  <td data-nums className={`${TD} text-center text-caption text-muted`}>
                    {data(c.vencimento) ?? "Sem data"}
                  </td>
                  <td data-nums className={`${TD} text-center`}>
                    {c.dias_atraso ? (
                      <span className="font-medium text-danger">{c.dias_atraso} D</span>
                    ) : (
                      <span className="text-faint">No prazo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line-strong bg-surface-2">
                <td colSpan={colspan} className={`${TD} text-caption font-semibold text-ink-2`}>
                  {linhas.length} {linhas.length === 1 ? "Parcela" : "Parcelas"} · {pedidos}{" "}
                  {pedidos === 1 ? "Pedido" : "Pedidos"} · {alunos}{" "}
                  {alunos === 1 ? "Aluno" : "Alunos"}
                </td>
                <td className={`${TD} text-right`}>
                  <Valor centavos={total} tom="forte" />
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* No celular a tabela vira lista: aluno e telefone em cima, o que falta e o
          atraso na segunda linha, que é o que a ligação precisa ter na mão. */}
      <ul
        className="entra divide-y divide-line overflow-hidden rounded-lg border border-line
          bg-surface md:hidden"
        style={{ "--atraso": "160ms" } as React.CSSProperties}
      >
        {linhas.map((c) => (
          <li key={c.parcela_id} className="flex items-start gap-3">
            {selecionaveis && (
              <span className="pl-4 pt-4">
                <input
                  type="checkbox"
                  name="sel"
                  value={c.pedido_id}
                  defaultChecked={selecionados.includes(c.pedido_id)}
                  aria-label={`Selecionar o pedido de ${c.aluno_nome}`}
                  className="size-4 shrink-0 accent-ink"
                />
              </span>
            )}
            <Link
              href={url({ pedido: c.pedido_id })}
              scroll={false}
              className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 transition-colors
                duration-fast ease-soft active:bg-surface-2"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-body-sm font-semibold">{c.aluno_nome}</span>
                <Valor centavos={c.saldo_centavos} tom={c.dias_atraso ? "alerta" : "forte"} />
              </span>
              <span className="flex items-baseline justify-between gap-3 text-caption">
                <span className="min-w-0 truncate text-muted">
                  {colunas.turma && `${c.grupo_nome} · `}
                  {c.produto} · Parcela {c.numero}
                </span>
                <span data-nums className="shrink-0">
                  {c.dias_atraso ? (
                    <span className="text-danger">{c.dias_atraso} D de atraso</span>
                  ) : (
                    <span className="text-muted">{data(c.vencimento) ?? "Sem data"}</span>
                  )}
                </span>
              </span>
              {c.aluno_telefone && (
                <span data-nums className="text-caption text-muted">
                  {c.aluno_telefone}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

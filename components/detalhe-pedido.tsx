import {
  cancelarPedido,
  estornarPagamento,
  liberarProducao,
  mudarProducao,
  registrarPagamento,
} from "@/app/painel/acoes";
import {
  data,
  dataHora,
  listarParcelas,
  tamanhoLegivel,
  type PedidoPainel,
} from "@/lib/painel";
import { reais } from "@/lib/formato";
import { Entrada } from "./campos";
import { FormAcao } from "./form-acao";
import { Escolha } from "./escolha";
import { SeloPagamento, SeloProducao } from "./selo";
import { Gaveta } from "./gaveta";
import { Seta } from "./icones";

/**
 * Detalhe do pedido. Abre por cima da lista, com o pedido na URL.
 *
 * Ser um parâmetro de URL em vez de estado de componente resolve três coisas de
 * graça: o botão voltar fecha, o link pode ser mandado para outra pessoa, e a
 * lista atrás não perde filtro nem rolagem.
 *
 * Denso, mas não apertado. A primeira versão compacta demais tinha ficado
 * ilegível: tudo em 11px e sem separação, o olho não achava onde uma coisa
 * terminava e outra começava. Aqui o que é dado fica em 13px, o que é rótulo
 * fica pequeno, e cada seção tem uma faixa de título que segura o bloco.
 *
 * Nenhum `select` e nenhuma seta de `details` padrão: a lista nativa do sistema
 * e o triângulo do navegador são as duas únicas coisas que não obedecem ao
 * design do resto da tela.
 */

const METODOS = [
  { valor: "pix", texto: "Pix" },
  { valor: "dinheiro", texto: "Dinheiro" },
  { valor: "transferencia", texto: "Transferência" },
  { valor: "cartao", texto: "Cartão" },
];

const PRODUCAO = [
  { valor: "aguardando", texto: "Aguardando" },
  { valor: "liberado", texto: "Liberado" },
  { valor: "em_producao", texto: "Em produção" },
  { valor: "pronto", texto: "Pronto" },
  { valor: "entregue", texto: "Entregue" },
];

/** Botão de formulário no tamanho do painel, não no tamanho do dedo do aluno. */
const BOTAO_MIUDO = "[&>button]:h-8 [&>button]:px-2.5 [&>button]:text-caption";

const CAMPO =
  "h-8 min-w-0 rounded-md border border-line bg-surface px-2.5 text-body-sm text-ink " +
  "outline-none transition-[border-color,box-shadow] duration-fast ease-soft " +
  "placeholder:text-faint focus:border-brand-deep " +
  "focus:shadow-[0_0_0_2px_rgb(15_168_188_/_0.16)]";

function Secao({
  titulo,
  extra,
  children,
}: {
  titulo: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line">
      <div className="flex items-center justify-between gap-2 bg-surface-2/60 px-4 py-2">
        <h3 className="label text-muted">{titulo}</h3>
        {extra}
      </div>
      <div className="flex flex-col gap-3 px-4 py-4">{children}</div>
    </section>
  );
}

/**
 * Abre e fecha sem o triângulo do navegador.
 *
 * O marcador padrão é preto, pequeno e desalinhado do texto em toda plataforma,
 * e não tem transição. Trocado por uma seta do pack do projeto que gira ao
 * abrir, com a mesma curva e a mesma duração do resto da interface.
 */
function Abre({
  titulo,
  tom = "normal",
  children,
}: {
  titulo: string;
  tom?: "normal" | "perigo";
  children: React.ReactNode;
}) {
  return (
    <details className="group">
      <summary
        className={`flex cursor-pointer list-none items-center gap-1.5 rounded-md px-1.5 py-1
          text-caption font-semibold transition-colors duration-fast ease-soft
          [&::-webkit-details-marker]:hidden
          ${
            tom === "perigo"
              ? "text-muted hover:bg-danger-soft hover:text-danger"
              : "text-ink-2 hover:bg-surface-2 hover:text-ink"
          }`}
      >
        <Seta
          className="h-3.5 w-3.5 shrink-0 transition-transform duration-base ease-soft
            group-open:rotate-90"
        />
        {titulo}
      </summary>
      <div className="px-1.5 pb-1 pt-2">{children}</div>
    </details>
  );
}

/** Ordinal da parcela. "1ª" diz de quem é o status; "Parcela" sozinho não. */
const ordinal = (n: number) => `${n}ª`;

export async function DetalhePedido({
  pedido,
  turma,
  campanha,
  labelGrupo,
  fechar,
}: {
  pedido: PedidoPainel;
  turma: string;
  campanha: string;
  labelGrupo: string;
  fechar: string;
}) {
  const parcelas = await listarParcelas(pedido.id);
  const telefone = pedido.aluno_telefone?.replace(/\D/g, "");

  return (
    <Gaveta
      rotulo={`Pedido de ${pedido.aluno_nome}`}
      titulo={pedido.aluno_nome}
      subtitulo={`${labelGrupo} ${turma} · ${campanha}`}
      fechar={fechar}
    >
      {/* Identificação. Tudo que se confere ao telefone, numa linha só. */}
          <dl className="flex flex-wrap gap-x-8 gap-y-3 px-4 pb-4">
            <div>
              <dt className="label text-muted">Telefone</dt>
              <dd className="text-body-sm">
                {telefone ? (
                  <a
                    href={`tel:${telefone}`}
                    className="font-medium text-brand-deep underline-offset-2 hover:underline"
                  >
                    {pedido.aluno_telefone}
                  </a>
                ) : (
                  <span className="text-faint">não informado</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="label text-muted">Pedido em</dt>
              <dd data-nums className="text-body-sm text-ink-2">
                {dataHora(pedido.criado_em)}
              </dd>
            </div>
            {pedido.origem === "admin" && (
              <div>
                <dt className="label text-muted">Origem</dt>
                <dd className="text-body-sm text-ink-2">Lançado no painel</dd>
              </div>
            )}
          </dl>

          <Secao titulo={pedido.produto_nome_snapshot}>
            <ul className="flex flex-col gap-2">
              {pedido.itens.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-body-sm text-ink-2">
                    {item.produto_nome_snapshot}
                  </span>
                  <span className="shrink-0 text-body-sm">
                    <span className="font-semibold text-ink">
                      {tamanhoLegivel(item.tamanho)}
                    </span>
                    <span className="text-faint"> · </span>
                    <span className="font-semibold text-ink">{item.nome_estampa}</span>
                    {item.quantidade > 1 && (
                      <span data-nums className="text-muted"> · {item.quantidade}x</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Secao>

          <Secao
            titulo="Pagamento"
            extra={
              pedido.saldo_centavos > 0 ? (
                <span
                  data-nums
                  className={`text-caption font-semibold ${
                    pedido.status_pagamento === "atrasado" ? "text-danger" : "text-ink"
                  }`}
                >
                  falta {reais(pedido.saldo_centavos)}
                </span>
              ) : (
                <SeloPagamento status="pago" />
              )
            }
          >
            <p className="text-body-sm text-muted">
              Pago{" "}
              <strong data-nums className="font-semibold text-ink">
                {reais(pedido.pago_centavos)}
              </strong>{" "}
              de{" "}
              <span data-nums className="text-ink-2">
                {reais(pedido.valor_centavos)}
              </span>
            </p>

            {/*
              Uma parcela por cartão, com três degraus na leitura: a linha do
              título diz de que parcela se trata e como ela está, o que já foi
              pago vem em seguida como histórico, e a baixa fica isolada numa
              caixa própria no rodapé.

              A versão anterior misturava os três na mesma pilha e a baixa lia
              como uma frase quebrada, "Baixar [campo] recebido em [Pix]
              [Dinheiro]", que precisava de um parágrafo embaixo explicando o que
              a tela devia dizer sozinha. Os campos agora se nomeiam: "Valor
              recebido" tem o saldo inteiro como sugestão, e os botões vêm sob o
              rótulo "Forma de pagamento".
            */}
            <ul className="flex flex-col gap-2">
              {parcelas.map((parcela) => (
                <li
                  key={parcela.id}
                  className="overflow-hidden rounded-lg border border-line"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1
                    px-3.5 py-2.5">
                    <span className="flex items-baseline gap-2">
                      <span className="text-body-sm font-semibold">
                        {ordinal(parcela.numero)}
                      </span>
                      <span data-nums className="text-body-sm font-semibold text-ink">
                        {reais(parcela.valor_centavos)}
                      </span>
                      {parcela.vencimento && (
                        <span data-nums className="text-caption text-muted">
                          vence {data(parcela.vencimento)}
                        </span>
                      )}
                    </span>
                    <SeloPagamento status={parcela.status} />
                  </div>

                  {parcela.pagamentos.length > 0 && (
                    <ul className="divide-y divide-line border-t border-line">
                      {parcela.pagamentos.map((g) => (
                        <li
                          key={g.id}
                          className="flex items-center justify-between gap-2 px-3.5 py-1.5
                            text-caption text-ink-2"
                        >
                          <span data-nums>
                            <span className="font-semibold text-ink">
                              {reais(g.valor_centavos)}
                            </span>{" "}
                            <span className="text-muted">
                              {g.metodo} · {data(g.pago_em)}
                            </span>
                          </span>
                          <FormAcao
                            acao={estornarPagamento}
                            texto="Estornar"
                            pendenteTexto="…"
                            tom="fantasma"
                            className={BOTAO_MIUDO}
                          >
                            <input type="hidden" name="pagamento_id" value={g.id} />
                          </FormAcao>
                        </li>
                      ))}
                    </ul>
                  )}

                  {parcela.saldo_centavos > 0 && (
                    <div className="border-t border-line bg-surface-2/50 px-3.5 py-3">
                      <Escolha
                        acao={registrarPagamento}
                        campo="metodo"
                        atual=""
                        opcoes={METODOS}
                        ocultos={{ parcela_id: parcela.id }}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <label
                              htmlFor={`valor-${parcela.id}`}
                              className="label shrink-0 text-muted"
                            >
                              Valor recebido
                            </label>
                            <input
                              id={`valor-${parcela.id}`}
                              name="valor"
                              inputMode="decimal"
                              placeholder={reais(parcela.saldo_centavos)}
                              className={`${CAMPO} w-32 text-right`}
                            />
                          </div>
                          <p className="label text-muted">Forma de pagamento</p>
                        </div>
                      </Escolha>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Secao>

          <Secao
            titulo="Produção"
            extra={<SeloProducao status={pedido.status_producao} />}
          >
            <Escolha
              acao={mudarProducao}
              campo="status"
              atual={pedido.status_producao}
              opcoes={PRODUCAO}
              ocultos={{ pedido_id: pedido.id }}
            />

            {pedido.producao_forcada && (
              <p className="rounded-md bg-warning-soft px-2.5 py-1.5 text-caption text-warning">
                Liberado sem pagamento pelo painel.
              </p>
            )}

            {!pedido.entrada_paga && !pedido.producao_forcada && (
              <Abre titulo="Liberar sem esperar o pagamento">
                <FormAcao
                  acao={liberarProducao}
                  texto="Liberar"
                  pendenteTexto="Liberando…"
                  tom="secundario"
                  className={`gap-2 ${BOTAO_MIUDO}`}
                >
                  <input type="hidden" name="pedido_id" value={pedido.id} />
                  <label htmlFor={`motivo-${pedido.id}`} className="sr-only">
                    Motivo da liberação
                  </label>
                  <Entrada
                    id={`motivo-${pedido.id}`}
                    name="motivo"
                    required
                    aviso="Escreva o motivo da liberação."
                    placeholder="Motivo"
                    className={`${CAMPO} w-full`}
                  />
                </FormAcao>
              </Abre>
            )}
          </Secao>

          <div className="border-t border-line px-4 py-3">
            <Abre titulo="Cancelar pedido" tom="perigo">
              <div className="flex flex-col gap-2">
                <p className="text-caption leading-relaxed text-muted">
                  Sai das duas listas e para de contar no financeiro. O que já foi pago
                  continua registrado, e devolver dinheiro é combinado fora do sistema.
                </p>
                <FormAcao
                  acao={cancelarPedido}
                  texto="Cancelar este pedido"
                  pendenteTexto="Cancelando…"
                  tom="secundario"
                  className={BOTAO_MIUDO}
                >
                  <input type="hidden" name="pedido_id" value={pedido.id} />
                </FormAcao>
              </div>
            </Abre>
          </div>
    </Gaveta>
  );
}

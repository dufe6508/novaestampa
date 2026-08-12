"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Alerta, Botao, Campo } from "@/components/campos";
import { Aviso, Certo } from "@/components/icones";
import { reais } from "@/lib/formato";

/**
 * Escolha do quanto e do como.
 *
 * Quanto vem primeiro de propósito: pagar tudo de uma vez é decisão de valor,
 * e o aluno precisa vê-la antes de pensar em Pix ou cartão.
 *
 * Nada aqui sai do navegador: os campos de cartão não são enviados, e o botão
 * chama a função que registra pagamento simulado no banco. A taxa por método
 * (Pix perto de 1%, cartão 4 a 5%) é decisão em aberto, item 2 do CLAUDE.md.
 */

const METODOS = [
  { id: "pix", texto: "Pix" },
  { id: "cartao", texto: "Cartão" },
] as const;

export function FormPagamento({
  acao,
  valorParcela,
  valorTotal,
  podeQuitar,
  restoDepois,
  entrada,
  percentualEntrada,
  vencimentoResto,
  qrParcela,
  qrTotal,
  referencia,
  voltarPara,
}: {
  acao: (estado: string | null, dados: FormData) => Promise<string | undefined>;
  valorParcela: number;
  valorTotal: number;
  podeQuitar: boolean;
  restoDepois: number;
  entrada: boolean;
  percentualEntrada: number;
  vencimentoResto: string | null;
  qrParcela: string;
  qrTotal: string;
  referencia: string;
  voltarPara: string;
}) {
  const [erro, formAction, pendente] = useActionState(
    async (estado: string | null, dados: FormData) => (await acao(estado, dados)) ?? null,
    null,
  );

  const [escopo, setEscopo] = useState<"parcela" | "tudo">("parcela");
  const [metodo, setMetodo] = useState<string>("pix");
  const [copiado, setCopiado] = useState(false);
  const [saindo, setSaindo] = useState(false);

  const tudo = escopo === "tudo";
  const valor = tudo ? valorTotal : valorParcela;
  const qr = tudo ? qrTotal : qrParcela;
  const codigoPix = `NOVAESTAMPA-DEMO-${referencia}-${valor}`;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="metodo" value={metodo} />
      <input type="hidden" name="escopo" value={escopo} />

      {/* quanto */}
      {podeQuitar ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-caption font-semibold text-ink-2">
            Quanto você quer pagar
          </legend>

          {(
            [
              {
                id: "parcela" as const,
                titulo: entrada ? `Entrada, ${percentualEntrada}%` : "Só esta parcela",
                valor: valorParcela,
                nota: vencimentoResto
                  ? `Depois fica ${reais(restoDepois)} para ${vencimentoResto}.`
                  : `Depois fica ${reais(restoDepois)}.`,
              },
              {
                id: "tudo" as const,
                titulo: "Tudo de uma vez",
                valor: valorTotal,
                nota: "Pedido quitado, nada a pagar na entrega.",
              },
            ] as const
          ).map((opcao) => {
            const ativa = escopo === opcao.id;
            return (
              <button
                key={opcao.id}
                type="button"
                aria-pressed={ativa}
                onClick={() => setEscopo(opcao.id)}
                className={`flex items-start gap-3 rounded-lg border p-4 text-left
                  transition-[border-color,background-color,transform] duration-fast ease-soft
                  active:scale-[0.99] motion-reduce:active:scale-100
                  ${
                    ativa
                      ? "border-ink bg-surface"
                      : "border-line bg-surface hover:border-line-strong"
                  }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 flex size-[18px] shrink-0 items-center justify-center
                    rounded-full border transition-colors duration-fast ease-soft
                    ${ativa ? "border-ink bg-ink text-white" : "border-line-strong"}`}
                >
                  {ativa && <Certo className="h-3 w-3" />}
                </span>

                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-body-sm font-semibold text-ink">{opcao.titulo}</span>
                    <span data-nums className="shrink-0 text-h3 font-semibold tracking-tight">
                      {reais(opcao.valor)}
                    </span>
                  </span>
                  <span className="text-caption leading-snug text-muted">{opcao.nota}</span>
                </span>
              </button>
            );
          })}
        </fieldset>
      ) : (
        <section
          className="flex flex-col items-center gap-1 rounded-xl border border-line bg-surface
            px-6 py-6 text-center"
        >
          <p className="label text-muted">Valor a pagar</p>
          <p data-nums className="text-display font-semibold tracking-tight">
            {reais(valor)}
          </p>
          <p className="text-caption text-muted">Última parcela deste pedido.</p>
        </section>
      )}

      {/* como */}
      <div className="flex flex-col gap-3">
        <p className="text-caption font-semibold text-ink-2">Como pagar</p>

        <div role="tablist" aria-label="Forma de pagamento" className="flex gap-2">
          {METODOS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={metodo === m.id}
              onClick={() => setMetodo(m.id)}
              className={`h-11 flex-1 rounded-lg border text-body-sm font-semibold
                transition-[color,background-color,border-color,transform] duration-fast ease-soft
                active:scale-[0.98] motion-reduce:active:scale-100
                ${
                  metodo === m.id
                    ? "border-ink bg-ink text-white"
                    : "border-line-strong bg-surface text-ink-2 hover:border-ink hover:text-ink"
                }`}
            >
              {m.texto}
            </button>
          ))}
        </div>

        {metodo === "pix" ? (
          <div className="surge flex flex-col items-center gap-4 rounded-xl border border-line bg-surface p-5">
            <img
              key={qr}
              src={qr}
              alt="QR code de demonstração para pagamento"
              width={176}
              height={176}
              className="surge size-44 rounded-lg"
            />

            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(codigoPix);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong
                bg-surface px-4 text-caption font-semibold text-ink
                transition-[background-color,transform] duration-fast ease-soft
                hover:bg-surface-2 active:scale-[0.97] motion-reduce:active:scale-100"
            >
              {copiado && <Certo className="h-4 w-4 text-success" />}
              {copiado ? "Código copiado" : "Copiar código"}
            </button>
          </div>
        ) : (
          <div className="surge flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
            <Campo
              id="cartao"
              etiqueta="Número do cartão"
              placeholder="0000 0000 0000 0000"
              inputMode="numeric"
              autoComplete="off"
            />
            <Campo id="titular" etiqueta="Nome do titular" placeholder="Como está no cartão" />
            <div className="grid grid-cols-2 gap-3">
              <Campo id="validade" etiqueta="Validade" placeholder="MM/AA" inputMode="numeric" />
              <Campo id="cvv" etiqueta="CVV" placeholder="123" inputMode="numeric" />
            </div>
          </div>
        )}
      </div>

      {erro && <Alerta tom="erro">{erro}</Alerta>}

      <div className="flex flex-col gap-3">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Confirmando pagamento…" : `Pagar ${reais(valor)}`}
        </Botao>

        {/* Pagar depois existe porque o aluno vai fechar a tela de qualquer
            jeito. Melhor dar a saída com o aviso junto do que perder o pedido.
            O aviso aparece ao clicar, não antes: texto de alerta permanente
            vira paisagem e ninguém lê. */}
        {saindo ? (
          /*
            O card fala numa cor só. O botão preto que estava aqui era o preto
            de ação do resto do sistema caído dentro de uma caixa âmbar, e lia
            como peça de outra tela colada nesta. Aqui a ação principal usa o
            próprio âmbar cheio, e a saída ganha borda: sem ela, "Sair mesmo
            assim" era texto solto, e a escolha parecia ter um lado só.

            O texto encolheu para duas frases. Três parágrafos com negrito no
            meio de cada um é a forma de ninguém ler nenhum, e a pessoa que
            está aqui já decidiu sair: ela precisa da consequência em uma
            linha, não da política inteira.
          */
          <div
            className="surge flex flex-col gap-4 rounded-xl border border-warning/25
              bg-warning-soft p-4"
          >
            <div className="flex gap-3">
              <Aviso className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div className="flex min-w-0 flex-col gap-1.5 text-warning">
                <p className="text-body-sm font-semibold leading-snug">
                  Sem o pagamento, seu uniforme não é produzido.
                </p>
                <p className="text-caption leading-relaxed">
                  O pedido fica guardado, mas só entra na produção da turma depois que a
                  primeira parcela é paga. As parcelas ficam na Carteira, com valor e
                  vencimento, e você paga quando quiser.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={() => setSaindo(false)}
                disabled={pendente}
                className="flex h-11 flex-1 items-center justify-center rounded-lg bg-warning px-4
                  text-body-sm font-semibold text-white transition-[opacity,transform]
                  duration-fast ease-soft hover:opacity-90 active:scale-[0.985]
                  disabled:cursor-not-allowed disabled:opacity-40
                  motion-reduce:active:scale-100"
              >
                Voltar e pagar agora
              </button>
              <Link
                href={voltarPara}
                className="flex h-11 flex-1 items-center justify-center rounded-lg border
                  border-warning/40 px-4 text-body-sm font-semibold text-warning
                  transition-[background-color,border-color] duration-fast ease-soft
                  hover:border-warning/70 hover:bg-warning/10"
              >
                Sair mesmo assim
              </Link>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSaindo(true)}
            className="flex h-11 items-center justify-center rounded-lg px-4 text-body-sm
              font-semibold text-ink-2 transition-colors duration-fast ease-soft
              hover:bg-surface-2 hover:text-ink"
          >
            Pagar depois
          </button>
        )}
      </div>
    </form>
  );
}

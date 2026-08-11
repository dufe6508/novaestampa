"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alerta, Botao } from "./campos";

/**
 * Formulário de uma ação só: envia, mostra pendência, mostra erro.
 *
 * A mensagem de erro vem do banco já escrita para o aluno ler
 * ("O prazo de alterações terminou em 30/09/2026"), então aparece como está.
 *
 * **Devolve o que foi digitado quando dá erro.** O React 19 limpa os campos de
 * um formulário depois de toda ação, o que faz sentido quando ela deu certo e é
 * cruel quando não deu: a pessoa erra uma letra do código e perde o nome, o
 * e-mail e o telefone que acabou de digitar. Aqui os valores enviados ficam
 * guardados e voltam para os campos assim que o erro aparece.
 *
 * O contador `n` existe porque errar duas vezes seguidas produz a mesma
 * mensagem, e sem ele o efeito não rodaria na segunda: o estado não teria
 * mudado.
 */

type Estado = { mensagem: string | null; n: number };

const VAZIO: Estado = { mensagem: null, n: 0 };

export function FormAcao({
  acao,
  texto,
  pendenteTexto,
  tom = "primario",
  className = "",
  children,
}: {
  acao: (estado: string | null, dados: FormData) => Promise<string | undefined>;
  texto: string;
  pendenteTexto: string;
  tom?: "primario" | "secundario" | "fantasma";
  className?: string;
  children?: React.ReactNode;
}) {
  const formulario = useRef<HTMLFormElement>(null);
  const enviado = useRef<[string, string][]>([]);

  const [estado, enviar, pendente] = useActionState(
    async (anterior: Estado, dados: FormData): Promise<Estado> => {
      enviado.current = [...dados.entries()].filter(
        (par): par is [string, string] => typeof par[1] === "string",
      );
      const mensagem = (await acao(anterior.mensagem, dados)) ?? null;
      return { mensagem, n: anterior.n + 1 };
    },
    VAZIO,
  );

  useEffect(() => {
    const form = formulario.current;
    if (!estado.mensagem || !form) return;

    for (const [nome, valor] of enviado.current) {
      const campo = form.elements.namedItem(nome);
      // `RadioNodeList` aceita `value` e marca o botão certo do grupo, então o
      // tipo escolhido também sobrevive ao erro.
      if (campo instanceof HTMLInputElement && campo.type !== "hidden") campo.value = valor;
      else if (campo instanceof RadioNodeList) campo.value = valor;
    }
  }, [estado]);

  return (
    <form ref={formulario} action={enviar} className={`flex flex-col gap-4 ${className}`}>
      {children}
      {estado.mensagem && <Alerta tom="erro">{estado.mensagem}</Alerta>}
      <Botao type="submit" tom={tom} disabled={pendente}>
        {pendente ? pendenteTexto : texto}
      </Botao>
    </form>
  );
}

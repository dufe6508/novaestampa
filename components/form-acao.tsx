"use client";

import { useActionState } from "react";
import { Alerta, Botao } from "./campos";

/**
 * Formulário de uma ação só: envia, mostra pendência, mostra erro.
 *
 * A mensagem de erro vem do banco já escrita para o aluno ler
 * ("O prazo de alterações terminou em 30/09/2026"), então aparece como está.
 */

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
  const [erro, formAction, pendente] = useActionState(
    async (estado: string | null, dados: FormData) => (await acao(estado, dados)) ?? null,
    null,
  );

  return (
    <form action={formAction} className={`flex flex-col gap-4 ${className}`}>
      {children}
      {erro && <Alerta tom="erro">{erro}</Alerta>}
      <Botao type="submit" tom={tom} disabled={pendente}>
        {pendente ? pendenteTexto : texto}
      </Botao>
    </form>
  );
}

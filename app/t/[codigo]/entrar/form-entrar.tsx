"use client";

import { useActionState } from "react";
import { Botao, Campo, CampoTelefone, Alerta } from "@/components/campos";
import { PADRAO_NOME_COMPLETO } from "@/lib/formato";

/**
 * Três campos, dois obrigatórios. Coletar o mínimo é decisão registrada:
 * boa parte dos titulares é menor de idade (CLAUDE.md §8, LGPD).
 */

export function FormEntrar({
  acao,
}: {
  acao: (estado: string | null, dados: FormData) => Promise<string | undefined>;
}) {
  const [erro, formAction, pendente] = useActionState(
    async (estado: string | null, dados: FormData) => (await acao(estado, dados)) ?? null,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Campo
        id="nome"
        name="nome"
        etiqueta="Seu nome completo"
        placeholder="Maria Fernandes"
        autoComplete="name"
        autoFocus
        required
        pattern={PADRAO_NOME_COMPLETO}
        aviso="Digite nome e sobrenome."
      />
      <Campo
        id="email"
        name="email"
        type="email"
        etiqueta="E-mail"
        placeholder="voce@email.com"
        autoComplete="email"
        inputMode="email"
        required
      />
      <CampoTelefone
        id="telefone"
        name="telefone"
        etiqueta="Telefone"
        ajuda="Opcional. Serve para falarem com você sobre a entrega."
      />

      {erro && <Alerta tom="erro">{erro}</Alerta>}

      <Botao type="submit" disabled={pendente}>
        {pendente ? "Entrando…" : "Continuar"}
      </Botao>
    </form>
  );
}

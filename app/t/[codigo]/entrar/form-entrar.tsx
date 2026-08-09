"use client";

import { useActionState } from "react";
import { Botao, Campo, Alerta } from "@/components/campos";

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
      <Campo
        id="telefone"
        name="telefone"
        type="tel"
        etiqueta="Telefone"
        ajuda="Opcional. Serve para falarem com você sobre a entrega."
        placeholder="(31) 90000-0000"
        autoComplete="tel"
        inputMode="tel"
      />

      {erro && <Alerta tom="erro">{erro}</Alerta>}

      <Botao type="submit" disabled={pendente}>
        {pendente ? "Entrando…" : "Continuar"}
      </Botao>
    </form>
  );
}

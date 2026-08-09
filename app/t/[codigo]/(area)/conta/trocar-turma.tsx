"use client";

import { useState } from "react";
import { Botao, BotaoLink } from "@/components/campos";
import { Aviso } from "@/components/icones";

/**
 * Trocar de turma, com confirmação.
 *
 * Confirma porque a troca tem um efeito que ninguém adivinha: o pedido pertence
 * ao grupo, não à conta. Quem pediu no 3A e muda para o 3B continua com a peça
 * saindo na lista do 3A, que é o certo do ponto de vista da produção, e é
 * exatamente o que precisa estar escrito antes de a pessoa clicar.
 */

export function TrocarTurma({
  label,
  grupo,
  quantos,
}: {
  label: string;
  grupo: string;
  quantos: number;
}) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <Botao tom="secundario" className="w-full" onClick={() => setConfirmando(true)}>
        Trocar de {label}
      </Botao>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 rounded-lg bg-warning-soft px-3.5 py-3 text-warning">
        <Aviso className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex flex-col gap-1.5 text-caption leading-relaxed">
          <p className="font-semibold">Quer mesmo mudar de {label}?</p>
          <p>
            {quantos === 0
              ? `Você vai sair da ${label} ${grupo} e digitar o código de outra.`
              : `Seus ${quantos === 1 ? "pedido continua" : `${quantos} pedidos continuam`} na ${label} ${grupo} e ${
                  quantos === 1 ? "vai ser produzido" : "vão ser produzidos"
                } na lista dela. Só a navegação muda de ${label}.`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <BotaoLink href="/entrar" className="flex-1">
          Sim, trocar de {label}
        </BotaoLink>
        <Botao tom="fantasma" className="flex-1" onClick={() => setConfirmando(false)}>
          Cancelar
        </Botao>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alerta, Botao, Campo } from "@/components/campos";
import { Estampa } from "@/components/estampa";
import { capitalizarNome } from "@/lib/formato";

/**
 * Nome do bordado, e nada mais.
 *
 * O nome é digitado duas vezes, como senha. É a defesa contra o erro mais
 * barato de evitar e mais caro de descobrir: a peça já bordada com o nome
 * errado. Colar é bloqueado no segundo campo, senão a conferência não confere
 * nada.
 *
 * Normalização: `trim`, colapso de espaço duplo e inicial maiúscula. Nada de
 * caixa alta automática, a peça real sai "Fernandes", não "FERNANDES", e
 * forçar maiúscula entregaria peça diferente da que o aluno viu na tela.
 *
 * O preview fica ao lado dos campos no desktop e embaixo no celular, sem card
 * próprio: a moldura em volta do desenho era uma caixa dentro da outra e
 * empurrava o botão para fora da primeira tela.
 */

const limpar = capitalizarNome;

export function FormPersonalizar({
  codigo,
  produtoId,
  tamanho,
  maxCaracteres,
  nomeInicial,
}: {
  codigo: string;
  produtoId: string;
  /** Já escolhido na tela do produto. Viaja escondido até a revisão. */
  tamanho: string;
  maxCaracteres: number;
  nomeInicial: string;
}) {
  const router = useRouter();

  const [nome, setNome] = useState(nomeInicial);
  // Voltando para conferir, o nome já foi digitado duas vezes uma vez.
  const [confirma, setConfirma] = useState(nomeInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [indo, setIndo] = useState(false);

  useEffect(() => {
    document.getElementById("nome")?.focus();
  }, []);

  const preenchido = limpar(nome).length > 0;
  const confere = limpar(nome) === limpar(confirma);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!preenchido) return setErro("Digite o nome que vai na peça.");
    if (!confere) return setErro("Os dois nomes estão diferentes. Confira a digitação.");

    setErro(null);
    setIndo(true);

    const q = new URLSearchParams({ t: tamanho, n: limpar(nome) });
    router.push(`/t/${codigo}/pedir/${produtoId}/revisao?${q}`);
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <div className="entra flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Campo
            id="nome"
            etiqueta="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value.slice(0, maxCaracteres))}
            placeholder="Nome que vai bordado"
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
          />

          <Campo
            id="confirma"
            etiqueta="Confirmação"
            value={confirma}
            onChange={(e) => setConfirma(e.target.value.slice(0, maxCaracteres))}
            onPaste={(e) => e.preventDefault()}
            placeholder="Digite o mesmo nome"
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            erro={confirma.length > 0 && !confere ? "Os dois nomes estão diferentes." : undefined}
          />
        </div>

        <figure className="flex shrink-0 flex-col items-center gap-1.5 self-center sm:self-start">
          <Estampa nome={limpar(nome)} className="w-32 sm:w-36" />
          <figcaption className="text-caption text-muted">Prévia da estampa</figcaption>
        </figure>
      </div>

      {erro && <Alerta tom="erro">{erro}</Alerta>}

      <Botao type="submit" disabled={indo || !preenchido || !confere}>
        {indo ? "Abrindo…" : "Revisar pedido"}
      </Botao>
    </form>
  );
}

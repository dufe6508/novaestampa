"use client";

import { useActionState, useState } from "react";
import { Alerta, Botao, Campo, Tamanhos } from "@/components/campos";
import { Estampa } from "@/components/estampa";
import { capitalizarNome } from "@/lib/formato";

/**
 * Edição também pede o nome duas vezes.
 *
 * Poderia pedir uma só, já que o valor antigo está na tela. Mas trocar o nome é
 * exatamente o momento em que o erro entra, e o custo de digitar de novo é bem
 * menor que o de uma peça bordada errada. Só pede a confirmação se o nome mudou.
 */

const limpar = capitalizarNome;

export function FormEditar({
  acao,
  tamanhos,
  tamanhoAtual,
  nomeAtual,
  maxCaracteres,
}: {
  acao: (estado: string | null, dados: FormData) => Promise<string | undefined>;
  tamanhos: string[];
  tamanhoAtual: string;
  nomeAtual: string;
  maxCaracteres: number;
}) {
  const [erroServidor, formAction, pendente] = useActionState(
    async (estado: string | null, dados: FormData) => (await acao(estado, dados)) ?? null,
    null,
  );

  const [nome, setNome] = useState(nomeAtual);
  const [confirma, setConfirma] = useState("");

  const mudou = limpar(nome) !== limpar(nomeAtual);
  const confere = !mudou || limpar(nome) === limpar(confirma);
  const vazio = limpar(nome).length === 0;
  const restantes = maxCaracteres - nome.length;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Tamanhos nome="t" opcoes={tamanhos} padrao={tamanhoAtual} />

      <Campo
        id="nome"
        name="nome"
        etiqueta="Nome da estampa"
        value={nome}
        onChange={(e) => setNome(e.target.value.slice(0, maxCaracteres))}
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        erro={vazio ? "O nome não pode ficar vazio." : undefined}
      />

      {mudou && (
        <Campo
          id="confirma"
          etiqueta="Digite o nome novo outra vez"
          value={confirma}
          onChange={(e) => setConfirma(e.target.value.slice(0, maxCaracteres))}
          onPaste={(e) => e.preventDefault()}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          autoFocus
          erro={
            confirma.length > 0 && !confere ? "Os dois nomes estão diferentes." : undefined
          }
        />
      )}

      <div className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface p-5">
        <p className="label self-start text-muted">Como vai ficar</p>
        <Estampa nome={nome} className="w-full max-w-[190px]" />
      </div>

      {erroServidor && <Alerta tom="erro">{erroServidor}</Alerta>}

      <Botao type="submit" disabled={pendente || vazio || !confere}>
        {pendente ? "Salvando…" : "Salvar alteração"}
      </Botao>
    </form>
  );
}

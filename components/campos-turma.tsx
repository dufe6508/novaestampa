"use client";

import { useRef } from "react";
import { sugerirCodigo } from "@/lib/formato";
import { CampoCodigo, CampoNome } from "./campos";

/**
 * Nome e código da turma, com o código se sugerindo sozinho.
 *
 * Digitar "3A" na campanha do Cláudio Brandão preenche "CB3A", que é o formato
 * que a empresa já usa no papel: iniciais do cliente mais a turma. Existe porque
 * uma escola tem doze turmas, e inventar doze códigos únicos à mão é onde nasce
 * o código repetido e o código impossível de ditar por telefone.
 *
 * A sugestão para de mandar assim que alguém escreve no código: dali em diante o
 * campo é da pessoa, e continuar reescrevendo por cima seria o autocompletar que
 * apaga o que a pessoa acabou de digitar.
 *
 * Ao editar não sugere nada. O código já existe, está no quadro da sala e num
 * link que circulou; trocá-lo porque o nome foi corrigido seria estragar o que
 * já está no mundo.
 */
export function CamposTurma({
  label,
  clienteNome,
  nome,
  codigo,
}: {
  /** "Turma", "Sala" ou "Setor", conforme a campanha. */
  label: string;
  /** Alimenta a sugestão. Ausente ao editar, e aí não há sugestão. */
  clienteNome?: string;
  nome?: string;
  codigo?: string;
}) {
  const campoCodigo = useRef<HTMLInputElement>(null);
  const tocado = useRef(false);
  const minusculo = label.toLowerCase();

  return (
    <>
      <CampoNome
        id="turma-nome"
        name="nome"
        etiqueta={`Nome d${minusculo === "setor" ? "o" : "a"} ${minusculo}`}
        required
        autoFocus
        autoComplete="off"
        defaultValue={nome}
        placeholder={minusculo === "setor" ? "Logística" : "3A"}
        onInput={(e) => {
          if (!clienteNome || tocado.current || !campoCodigo.current) return;
          campoCodigo.current.value = sugerirCodigo(e.currentTarget.value, clienteNome);
        }}
      />

      <CampoCodigo
        ref={campoCodigo}
        id="turma-codigo"
        name="codigo"
        etiqueta="Código de acesso"
        required
        defaultValue={codigo}
        onInput={() => {
          tocado.current = true;
        }}
        ajuda={
          codigo
            ? "Trocar o código derruba o link antigo. Quem já entrou continua dentro."
            : "É o que o aluno digita para achar esta turma."
        }
      />
    </>
  );
}

import { criarGrupo, editarGrupo } from "@/app/painel/acoes";
import type { GrupoResumo } from "@/lib/painel";
import { CamposTurma } from "./campos-turma";
import { FormAcao } from "./form-acao";
import { Gaveta } from "./gaveta";

/**
 * E8 · turma, criar e editar. Dois campos, e o segundo é o que importa.
 *
 * O código é a única coisa que o aluno digita para achar a turma: ele vai no
 * quadro, no grupo do WhatsApp e no link (`/t/CB3A`). Por isso ele aparece aqui
 * como campo de primeira classe, com máscara e alfabeto próprios, e não como
 * detalhe gerado escondido.
 *
 * Ao criar, o código já vem sugerido a partir do cliente e do nome da turma
 * ("Cláudio Brandão" + "3A" = "CB3A"), que é o formato que a empresa já usa no
 * papel. É chute com um clique de correção: quem não gostar apaga e escreve o
 * seu, e o servidor recusa código repetido em português antes de o banco
 * reclamar em inglês.
 */
export function TurmaGaveta({
  campanhaId,
  clienteNome,
  label,
  grupo,
  fechar,
}: {
  /** Obrigatório ao criar: a turma nasce dentro de uma campanha. */
  campanhaId?: string;
  /** Alimenta a sugestão de código. Só serve ao criar. */
  clienteNome?: string;
  /** "Turma", "Sala" ou "Setor", conforme a campanha. */
  label: string;
  /** Ausente cria; presente edita. */
  grupo?: GrupoResumo;
  fechar: string;
}) {
  const editando = !!grupo;
  const minusculo = label.toLowerCase();

  return (
    <Gaveta
      rotulo={editando ? `Editar ${grupo.nome}` : `Nova ${minusculo}`}
      titulo={editando ? `Editar ${minusculo}` : `Nova ${minusculo}`}
      subtitulo={editando ? grupo.nome : undefined}
      fechar={fechar}
    >
      <div className="px-4 pb-6">
        <FormAcao
          acao={editando ? editarGrupo : criarGrupo}
          texto={editando ? "Salvar" : `Criar ${minusculo}`}
          pendenteTexto={editando ? "Salvando…" : "Criando…"}
        >
          {editando ? (
            <>
              <input type="hidden" name="grupo_id" value={grupo.id} />
              <input type="hidden" name="voltar" value={fechar} />
            </>
          ) : (
            // Sem `voltar` de propósito: criar cai na lista de turmas, mesmo
            // tendo sido aberto do aviso da visão geral. Quem acabou de criar
            // quer ver a turma na lista, e é lá que cria a próxima.
            <input type="hidden" name="campanha_id" value={campanhaId} />
          )}

          <CamposTurma
            label={label}
            clienteNome={editando ? undefined : clienteNome}
            nome={grupo?.nome}
            codigo={grupo?.codigo}
          />
        </FormAcao>
      </div>
    </Gaveta>
  );
}

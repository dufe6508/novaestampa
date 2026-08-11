import { criarCampanha, editarCampanha } from "@/app/painel/acoes";
import type { CampanhaResumo } from "@/lib/painel";
import { Campo, CampoData, CampoNome, Opcoes } from "./campos";
import { FormAcao } from "./form-acao";
import { Gaveta } from "./gaveta";

/**
 * Campanha, criar e editar. Mesma gaveta, mesmos campos.
 *
 * Os três prazos ficam juntos de propósito: eles só fazem sentido em relação um
 * ao outro. Pedidos fecham, depois as alterações fecham, e é aí que a produção
 * começa (§3.5). Separar em telas diferentes esconderia a ordem que dá sentido
 * aos três.
 *
 * Data usa `input type="date"`, que é o calendário do próprio sistema. No
 * celular abre o seletor nativo, funciona sem JavaScript e já vem traduzido.
 * Nenhuma biblioteca de calendário faz melhor, e todas pesam mais.
 */

const LABELS = ["Turma", "Sala", "Setor"];

const STATUS = [
  { valor: "aberta", texto: "Aberta" },
  { valor: "encerrada", texto: "Encerrada" },
  { valor: "concluida", texto: "Concluída" },
];

function Data({
  id,
  name,
  etiqueta,
  valor,
}: {
  id: string;
  name: string;
  etiqueta: string;
  valor: string | null | undefined;
}) {
  return <CampoData id={id} name={name} etiqueta={etiqueta} defaultValue={valor ?? ""} />;
}

export function CampanhaGaveta({
  clienteId,
  campanha,
  fechar,
}: {
  /** Obrigatório ao criar: a campanha nasce dentro de um cliente. */
  clienteId?: string;
  /** Ausente cria; presente edita. */
  campanha?: CampanhaResumo;
  fechar: string;
}) {
  const editando = !!campanha;

  return (
    <Gaveta
      rotulo={editando ? `Editar ${campanha.nome}` : "Nova campanha"}
      titulo={editando ? "Editar campanha" : "Nova campanha"}
      subtitulo={editando ? campanha.nome : undefined}
      fechar={fechar}
    >
      <div className="px-4 pb-6">
        <FormAcao
          acao={editando ? editarCampanha : criarCampanha}
          texto={editando ? "Salvar" : "Criar campanha"}
          pendenteTexto={editando ? "Salvando…" : "Criando…"}
        >
          {editando ? (
            <>
              <input type="hidden" name="campanha_id" value={campanha.id} />
              <input type="hidden" name="voltar" value={fechar} />
            </>
          ) : (
            <input type="hidden" name="cliente_id" value={clienteId} />
          )}

          <CampoNome
            id="campanha-nome"
            name="nome"
            etiqueta="Nome"
            required
            autoFocus
            autoComplete="off"
            defaultValue={campanha?.nome}
            placeholder="Nome da campanha"
          />

          {/*
            O rótulo do grupo é o que faz o mesmo sistema servir escola,
            faculdade e empresa. Os três atalhos cobrem o que existe hoje.
          */}
          <Opcoes
            nome="label_grupo"
            legenda="Como chamar o grupo"
            opcoes={LABELS.map((l) => ({ valor: l, texto: l }))}
            atual={campanha?.label_grupo ?? "Turma"}
          />

          <Opcoes
            nome="status"
            legenda="Situação"
            opcoes={STATUS}
            atual={campanha?.status === "encerrada" || campanha?.status === "concluida"
              ? campanha.status
              : "aberta"}
          />

          <Data
            id="campanha-prazo-pedidos"
            name="prazo_pedidos"
            etiqueta="Pedidos até"
            valor={campanha?.prazo_pedidos}
          />

          <Data
            id="campanha-prazo-alteracoes"
            name="prazo_alteracoes"
            etiqueta="Alterações até"
            valor={campanha?.prazo_alteracoes}
          />

          <Data
            id="campanha-entrega"
            name="entrega_prevista"
            etiqueta="Entrega prevista"
            valor={campanha?.entrega_prevista}
          />

          <Campo
            id="campanha-entrada"
            name="percentual_entrada"
            etiqueta="Entrada (%)"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            defaultValue={campanha?.percentual_entrada ?? 50}
            ajuda={editando ? "Não altera pedidos já feitos." : undefined}
          />
        </FormAcao>
      </div>
    </Gaveta>
  );
}

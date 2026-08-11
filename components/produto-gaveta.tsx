import { criarProduto, editarProduto } from "@/app/painel/acoes";
import { CLASSES, SITUACOES_PRODUTO, type ProdutoCadastro } from "@/lib/painel";
import { PREFIXO_BABY_LOOK, mascaraDinheiro } from "@/lib/formato";
import { Area, CampoData, CampoNome, CampoPreco, Marcadores, Opcoes } from "./campos";
import { FormAcao } from "./form-acao";
import { FotosProduto } from "./fotos-produto";
import { Gaveta } from "./gaveta";

/**
 * E7 · cadastro do produto, dentro da campanha. Cria e edita na mesma gaveta.
 *
 * A ordem dos campos é uma decisão por bloco, de cima para baixo, e é a ordem
 * em que a dona pensa o produto: o que é, quanto custa, que tamanhos tem, se
 * leva nome bordado, com que cara aparece na loja, e até quando fica de pé.
 *
 * Os dois prazos ficam por último e são opcionais, porque quase sempre valem os
 * da campanha. Eles existem para o caso real de fechar a camisa antes do
 * moletom sem precisar encerrar a campanha inteira; em branco, herdam.
 */

const GRADE = ["PP", "P", "M", "G", "GG", "XG"];

const PARCELAS = [1, 2, 3, 4, 6, 10, 12];

export function ProdutoGaveta({
  campanhaId,
  produto,
  fechar,
  prazosDaCampanha,
}: {
  /** Obrigatório ao criar: o produto nasce dentro de uma campanha. */
  campanhaId: string;
  /** Ausente cria; presente edita. */
  produto?: ProdutoCadastro;
  fechar: string;
  prazosDaCampanha: { pedidos: string | null; alteracoes: string | null };
}) {
  const editando = !!produto;
  const tamanhos = produto?.tamanhos ?? [];

  // O preço já entra no campo com a máscara aplicada, para editar não mostrar
  // um formato diferente do que a digitação produz.
  const preco = produto ? mascaraDinheiro(String(produto.preco_centavos)) : "";

  return (
    <Gaveta
      rotulo={editando ? `Editar ${produto.nome}` : "Novo produto"}
      titulo={editando ? "Editar produto" : "Novo produto"}
      subtitulo={editando ? produto.nome : "Vale só nesta campanha"}
      fechar={fechar}
    >
      <div className="px-4 pb-6">
        <FormAcao
          acao={editando ? editarProduto : criarProduto}
          texto={editando ? "Salvar" : "Criar produto"}
          pendenteTexto={editando ? "Salvando…" : "Criando…"}
        >
          <input type="hidden" name="voltar" value={fechar} />
          {editando ? (
            <input type="hidden" name="produto_id" value={produto.id} />
          ) : (
            <input type="hidden" name="campanha_id" value={campanhaId} />
          )}

          <CampoNome
            id="produto-nome"
            name="nome"
            etiqueta="Nome"
            required
            autoFocus
            autoComplete="off"
            defaultValue={produto?.nome}
            placeholder="Nome do produto"
          />

          <Opcoes
            nome="classe"
            legenda="Tipo de peça"
            opcoes={CLASSES}
            atual={produto?.classe ?? "camisa"}
          />

          <Area
            id="produto-descricao"
            name="descricao"
            etiqueta="Descrição"
            defaultValue={produto?.descricao ?? ""}
            placeholder="Tecido, modelagem, o que o aluno precisa saber"
          />

          {/* Texto e não `number`: o campo numérico do navegador usa ponto como
              separador e não deixa escrever "R$". A máscara resolve os dois. */}
          <CampoPreco id="produto-preco" name="preco" etiqueta="Preço" required defaultValue={preco} />

          <Opcoes
            nome="max_parcelas"
            legenda="Parcelar em até"
            opcoes={PARCELAS.map((n) => ({
              valor: String(n),
              texto: n === 1 ? "À vista" : `${n}x`,
            }))}
            atual={String(produto?.max_parcelas ?? 2)}
            ajuda="A primeira parcela é sempre a entrada, no percentual da campanha."
          />

          <Marcadores
            nome="tamanhos"
            legenda="Grade"
            opcoes={GRADE.map((t) => ({ valor: t, texto: t }))}
            marcados={tamanhos}
          />

          <Marcadores
            nome="tamanhos"
            legenda="Grade baby look"
            opcoes={GRADE.map((t) => ({
              valor: `${PREFIXO_BABY_LOOK}${t}`,
              texto: t,
            }))}
            marcados={tamanhos}
          />

          <Opcoes
            nome="exige_nome"
            legenda="Nome bordado"
            opcoes={[
              { valor: "1", texto: "Leva nome" },
              { valor: "0", texto: "Sem nome" },
            ]}
            atual={produto?.exige_nome === false ? "0" : "1"}
            ajuda="Sem nome, a tela de personalização some do fluxo do aluno."
          />

          <FotosProduto campanhaId={campanhaId} iniciais={produto?.imagens ?? []} />

          <Opcoes
            nome="situacao"
            legenda="Situação"
            opcoes={(["a_venda", "pausado", "oculto"] as const).map((s) => ({
              valor: s,
              texto: SITUACOES_PRODUTO[s].titulo,
            }))}
            atual={produto?.situacao ?? "a_venda"}
            ajuda={SITUACOES_PRODUTO[produto?.situacao ?? "a_venda"].explicacao}
          />

          <CampoData
            id="produto-prazo-pedidos"
            name="prazo_pedidos"
            etiqueta="Pedidos até"
            defaultValue={produto?.prazo_pedidos ?? ""}
            ajuda={
              prazosDaCampanha.pedidos
                ? `Em branco, vale o da campanha: ${dataCurta(prazosDaCampanha.pedidos)}.`
                : "Em branco, vale o da campanha."
            }
          />

          <CampoData
            id="produto-prazo-alteracoes"
            name="prazo_alteracoes"
            etiqueta="Alterações até"
            defaultValue={produto?.prazo_alteracoes ?? ""}
            ajuda={
              prazosDaCampanha.alteracoes
                ? `Em branco, vale o da campanha: ${dataCurta(prazosDaCampanha.alteracoes)}.`
                : "Em branco, vale o da campanha."
            }
          />
        </FormAcao>
      </div>
    </Gaveta>
  );
}

function dataCurta(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR");
}

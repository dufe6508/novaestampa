import { criarCliente, editarCliente } from "@/app/painel/acoes";
import type { ClienteCadastro } from "@/lib/painel";
import { Area, Campo, CampoNome, CampoTelefone, Opcoes } from "./campos";
import { FormAcao } from "./form-acao";
import { Gaveta } from "./gaveta";

/**
 * E10 · cadastro do cliente, em gaveta sobre a lista. Cria e edita.
 *
 * Um componente para as duas coisas porque os campos são exatamente os mesmos.
 * Duas gavetas quase idênticas envelheceriam separado: acrescentar um campo
 * viraria acrescentar em dois lugares, e um dia só um deles seria lembrado.
 *
 * Só o nome é obrigatório. O resto ajuda a diferenciar dois clientes de nome
 * parecido, e o banco já tem o caso: duas escolas Cláudio Brandão. Exigir tudo
 * na criação atrasaria quem só quer abrir a campanha e procurar o telefone da
 * responsável depois.
 *
 * Sem botão de cancelar: o X e o clique no fundo já fecham, e um terceiro
 * caminho para a mesma coisa só ocupa espaço.
 */

const TIPOS = [
  { valor: "escola", texto: "Escola" },
  { valor: "faculdade", texto: "Faculdade" },
  { valor: "empresa", texto: "Empresa" },
  { valor: "outro", texto: "Outro" },
];

export function ClienteGaveta({
  cliente,
  fechar,
}: {
  /** Ausente cria; presente edita. */
  cliente?: ClienteCadastro;
  fechar: string;
}) {
  const editando = !!cliente;

  return (
    <Gaveta
      rotulo={editando ? `Editar ${cliente.nome}` : "Novo cliente"}
      titulo={editando ? "Editar cliente" : "Novo cliente"}
      subtitulo={editando ? cliente.nome : "Escola, faculdade ou empresa"}
      fechar={fechar}
    >
      <div className="px-4 pb-6">
        <FormAcao
          acao={editando ? editarCliente : criarCliente}
          texto={editando ? "Salvar" : "Criar cliente"}
          pendenteTexto={editando ? "Salvando…" : "Criando…"}
        >
          {editando && (
            <>
              <input type="hidden" name="cliente_id" value={cliente.id} />
              <input type="hidden" name="voltar" value={fechar} />
            </>
          )}

          <CampoNome
            id="cliente-nome"
            name="nome"
            etiqueta="Nome"
            required
            autoFocus
            autoComplete="off"
            defaultValue={cliente?.nome}
            placeholder="Nome da escola, faculdade ou empresa"
          />

          <Opcoes
            nome="tipo"
            legenda="Tipo"
            opcoes={TIPOS}
            atual={cliente?.tipo ?? "escola"}
          />

          <CampoNome
            id="cliente-cidade"
            name="cidade"
            etiqueta="Cidade"
            autoComplete="off"
            defaultValue={cliente?.cidade ?? ""}
            placeholder="Cidade"
          />

          <Campo
            id="cliente-endereco"
            name="endereco"
            etiqueta="Endereço"
            autoComplete="off"
            defaultValue={cliente?.endereco ?? ""}
            placeholder="Rua, número e bairro"
          />

          <CampoNome
            id="cliente-contato"
            name="contato_nome"
            etiqueta="Pessoa de contato"
            autoComplete="off"
            defaultValue={cliente?.contato_nome ?? ""}
            placeholder="Nome do responsável"
          />

          <Campo
            id="cliente-cargo"
            name="contato_cargo"
            etiqueta="Cargo"
            autoComplete="off"
            defaultValue={cliente?.contato_cargo ?? ""}
            placeholder="Cargo ou função"
          />

          <CampoTelefone
            id="cliente-telefone"
            name="contato_telefone"
            etiqueta="Telefone"
            defaultValue={cliente?.contato_telefone ?? ""}
          />

          <Campo
            id="cliente-email"
            name="contato_email"
            etiqueta="E-mail"
            type="email"
            autoComplete="off"
            defaultValue={cliente?.contato_email ?? ""}
            placeholder="email@email.com"
          />

          <Area
            id="cliente-observacoes"
            name="observacoes"
            etiqueta="Observações"
            defaultValue={cliente?.observacoes ?? ""}
            placeholder="Uso interno"
          />
        </FormAcao>
      </div>
    </Gaveta>
  );
}

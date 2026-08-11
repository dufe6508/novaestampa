import { criarCliente } from "@/app/painel/acoes";
import { CampoNome, CampoTelefone } from "./campos";
import { FormAcao } from "./form-acao";
import { Gaveta } from "./gaveta";

/**
 * E10 · cadastro do cliente, em gaveta sobre a lista.
 *
 * Só o nome é obrigatório. O resto existe para diferenciar dois clientes de nome
 * parecido, e o banco já tem o caso: duas escolas Cláudio Brandão. Exigir tudo
 * na criação atrasaria quem só quer abrir a campanha e procurar o telefone da
 * responsável depois.
 *
 * Sem botão de cancelar: o X e o clique no fundo já fecham, e um terceiro
 * caminho para a mesma coisa só ocupa espaço.
 *
 * Termina dentro do cliente criado, não de volta na lista. É a ação seguinte
 * óbvia: cadastrou a escola, cria a campanha dela.
 */

const TIPOS = [
  { valor: "escola", texto: "Escola" },
  { valor: "faculdade", texto: "Faculdade" },
  { valor: "empresa", texto: "Empresa" },
  { valor: "outro", texto: "Outro" },
];

/**
 * Tipo do cliente. Rádio de verdade, pelo mesmo motivo da escolha de tamanho:
 * o `select` do navegador abre uma lista desenhada pelo sistema operacional e
 * ignora o resto da interface. Quatro opções cabem numa linha.
 */
function Tipo() {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-caption font-semibold text-ink-2">Tipo</legend>
      <div className="flex flex-wrap gap-2">
        {TIPOS.map((t, i) => (
          <label
            key={t.valor}
            className="cursor-pointer rounded-lg has-[:focus-visible]:outline
              has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2
              has-[:focus-visible]:outline-brand-deep"
          >
            <input
              type="radio"
              name="tipo"
              value={t.valor}
              defaultChecked={i === 0}
              className="peer sr-only"
            />
            <span
              className="flex h-10 items-center justify-center whitespace-nowrap rounded-lg border
                border-line-strong bg-surface px-3 text-body-sm font-semibold text-ink-2
                transition-[color,background-color,border-color,transform] duration-fast ease-soft
                hover:border-ink hover:text-ink active:scale-[0.97] peer-checked:border-ink
                peer-checked:bg-ink peer-checked:text-white motion-reduce:active:scale-100"
            >
              {t.texto}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function NovoCliente({ fechar }: { fechar: string }) {
  return (
    <Gaveta
      rotulo="Novo cliente"
      titulo="Novo cliente"
      subtitulo="Escola, faculdade ou empresa"
      fechar={fechar}
    >
      <div className="px-4 pb-6">
        <FormAcao acao={criarCliente} texto="Criar cliente" pendenteTexto="Criando…">
          <CampoNome
            id="cliente-nome"
            name="nome"
            etiqueta="Nome"
            required
            autoFocus
            autoComplete="off"
            placeholder="Escola Estadual Cláudio Brandão"
            ajuda="É o que aparece na lista e no cabeçalho da planilha de produção."
          />

          <Tipo />

          <CampoNome
            id="cliente-cidade"
            name="cidade"
            etiqueta="Cidade"
            autoComplete="off"
            placeholder="Belo Horizonte"
          />

          <CampoNome
            id="cliente-contato"
            name="contato_nome"
            etiqueta="Pessoa de contato"
            autoComplete="off"
            placeholder="Márcia D'Ávila"
            ajuda="Quem responde pela campanha do lado do cliente."
          />

          <CampoTelefone id="cliente-telefone" name="contato_telefone" etiqueta="Telefone" />
        </FormAcao>
      </div>
    </Gaveta>
  );
}

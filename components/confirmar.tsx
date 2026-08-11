import { Alerta } from "./campos";
import { FormAcao } from "./form-acao";
import { Gaveta } from "./gaveta";

/**
 * Confirmação de ação destrutiva, na mesma gaveta do resto.
 *
 * `consequencia` é obrigatória e não é enfeite: a diferença entre uma
 * confirmação útil e um "tem certeza?" é dizer o que exatamente vai acontecer.
 *
 * O tom separa as duas naturezas. Arquivar se desfaz num clique e vem em
 * `atencao`; excluir não volta e vem em `erro`. Vestir as duas de vermelho
 * ensina a pessoa a confirmar sem ler, que é justamente o que estraga a
 * confirmação que importa.
 */

export function Confirmar({
  titulo,
  subtitulo,
  consequencia,
  tom = "erro",
  acao,
  botao,
  pendenteTexto,
  ocultos,
  fechar,
}: {
  titulo: string;
  subtitulo?: string;
  consequencia: React.ReactNode;
  /** `atencao` para o que se desfaz, `erro` para o que não volta. */
  tom?: "atencao" | "erro";
  acao: (estado: string | null, dados: FormData) => Promise<string | undefined>;
  botao: string;
  pendenteTexto: string;
  ocultos: Record<string, string>;
  fechar: string;
}) {
  return (
    <Gaveta rotulo={titulo} titulo={titulo} subtitulo={subtitulo} fechar={fechar}>
      <div className="flex flex-col gap-4 px-4 pb-6">
        <Alerta tom={tom}>{consequencia}</Alerta>

        <FormAcao acao={acao} texto={botao} pendenteTexto={pendenteTexto} tom="secundario">
          {Object.entries(ocultos).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </FormAcao>
      </div>
    </Gaveta>
  );
}

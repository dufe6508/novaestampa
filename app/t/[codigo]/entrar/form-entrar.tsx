import { Campo, CampoNome, CampoTelefone } from "@/components/campos";
import { FormAcao } from "@/components/form-acao";
import { PADRAO_NOME_COMPLETO } from "@/lib/formato";

/**
 * Três campos, dois obrigatórios. Coletar o mínimo é decisão registrada:
 * boa parte dos titulares é menor de idade (CLAUDE.md §8, LGPD).
 *
 * A fiação do envio é a do `FormAcao`, que é a mesma do resto do sistema. Ela
 * estava copiada aqui, e a cópia não recebeu a correção que devolve o que foi
 * digitado quando dá erro: quem errava o e-mail perdia o nome e o telefone.
 */

export function FormEntrar({
  acao,
}: {
  acao: (estado: string | null, dados: FormData) => Promise<string | undefined>;
}) {
  return (
    <FormAcao acao={acao} texto="Continuar" pendenteTexto="Entrando…">
      <CampoNome
        id="nome"
        name="nome"
        etiqueta="Seu nome completo"
        placeholder="Nome e sobrenome"
        autoFocus
        required
        pattern={PADRAO_NOME_COMPLETO}
        aviso="Digite nome e sobrenome."
      />
      <Campo
        id="email"
        name="email"
        type="email"
        etiqueta="E-mail"
        placeholder="seunome@email.com"
        autoComplete="email"
        inputMode="email"
        required
      />
      <CampoTelefone
        id="telefone"
        name="telefone"
        etiqueta="Telefone"
        ajuda="Opcional. Serve para falarem com você sobre a entrega."
      />
    </FormAcao>
  );
}

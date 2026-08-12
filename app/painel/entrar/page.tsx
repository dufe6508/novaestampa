import { redirect } from "next/navigation";
import { entrarNaEmpresa, entrarNaEmpresaComConta } from "../acoes";
import { perfilEmpresa } from "@/lib/empresa";
import { sessao } from "@/lib/sessao";
import { Logo } from "@/components/logo";
import { Campo, CampoNome, CampoTelefone, Entrada } from "@/components/campos";
import { FormAcao } from "@/components/form-acao";

/**
 * A porta da área da empresa.
 *
 * Fica fora do grupo `(area)` de propósito: se estivesse dentro, o guarda do
 * layout devolveria 404 para a própria porta e ninguém entraria nunca.
 *
 * Duas versões da mesma tela, decididas pela sessão:
 *
 * · Com sessão, pede só o código. É o caminho de quem já usou o sistema.
 * · Sem sessão, pede nome, e-mail e código de uma vez. O acesso gruda na conta
 *   (CLAUDE.md §3.3), então alguma conta precisa existir; separar em duas telas
 *   obrigaria a responsável a entrar por uma turma de aluno antes, que é um
 *   desvio sem sentido para quem é dona da empresa.
 *
 * O 404 para quem chega sem sessão caiu em 10/08/2026, junto com a decisão de
 * aceitar o código da empresa na tela pública `/entrar`. A partir do momento em
 * que o código abre a porta lá, esconder este endereço não protegia mais nada,
 * e o preço era a dona não conseguir entrar sem alguém digitar a URL por ela.
 * O que protege continua sendo o código, não o segredo do endereço.
 */

const CAMPO_CODIGO =
  "h-12 w-full rounded-lg border border-line bg-surface px-3.5 text-center font-mono " +
  "text-h3 tracking-[0.14em] text-ink uppercase outline-none " +
  "transition-[border-color,box-shadow] duration-base ease-soft placeholder:text-faint " +
  "focus:border-brand-deep focus:shadow-[0_0_0_3px_rgb(15_168_188_/_0.16)]";

function CampoCodigo() {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="codigo" className="text-caption font-semibold text-ink-2">
        Código da empresa
      </label>
      <Entrada
        id="codigo"
        name="codigo"
        autoComplete="off"
        required
        aviso="Digite o código da empresa."
        className={CAMPO_CODIGO}
      />
    </div>
  );
}

export default async function EntrarNaEmpresa() {
  const quem = await sessao();

  // Já é empresa: não faz sentido pedir o código de novo.
  if (quem?.id && (await perfilEmpresa())) redirect("/painel");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-7 px-5 py-12">
      <div className="entra flex flex-col gap-4">
        <Logo destaque />
        <div className="flex flex-col gap-1.5">
          <h1>Área da empresa</h1>
          <p className="text-body-sm leading-relaxed text-muted">
            Use o código da Nova Estampa. O acesso fica ligado à sua conta, então você não
            precisa digitar de novo, e continua valendo mesmo se o código for trocado depois.
          </p>
        </div>
      </div>

      <div className="entra" style={{ "--atraso": "60ms" } as React.CSSProperties}>
        {quem?.id ? (
          <FormAcao acao={entrarNaEmpresa} texto="Entrar" pendenteTexto="Conferindo…">
            <CampoCodigo />
          </FormAcao>
        ) : (
          <FormAcao acao={entrarNaEmpresaComConta} texto="Entrar" pendenteTexto="Conferindo…">
            <CampoNome
              id="empresa-nome"
              name="nome"
              etiqueta="Seu nome"
              required
              placeholder="Nome e sobrenome"
            />
            <Campo
              id="empresa-email"
              name="email"
              etiqueta="E-mail"
              type="email"
              required
              autoComplete="email"
              placeholder="seuemail@email.com"
            />
            <CampoTelefone
              id="empresa-telefone"
              name="telefone"
              etiqueta="Telefone"
              ajuda="Opcional"
            />
            <CampoCodigo />
          </FormAcao>
        )}
      </div>

    </main>
  );
}

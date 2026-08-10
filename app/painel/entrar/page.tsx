import { notFound, redirect } from "next/navigation";
import { entrarNaEmpresa } from "../acoes";
import { perfilEmpresa } from "@/lib/empresa";
import { sessao } from "@/lib/sessao";
import { Logo } from "@/components/logo";
import { FormAcao } from "@/components/form-acao";

/**
 * A porta da área da empresa.
 *
 * Fica fora do grupo `(area)` de propósito: se estivesse dentro, o guarda do
 * layout devolveria 404 para a própria porta e ninguém entraria nunca.
 *
 * Quem não tem sessão recebe 404 daqui também. O endereço não confirma nada
 * para quem chegou chutando, e a ordem certa é a de sempre: entra com a conta,
 * depois usa o código.
 */

export default async function EntrarNaEmpresa() {
  const quem = await sessao();
  if (!quem?.id) notFound();

  // Já é empresa: não faz sentido pedir o código de novo.
  if (await perfilEmpresa()) redirect("/painel");

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
        <FormAcao acao={entrarNaEmpresa} texto="Entrar" pendenteTexto="Conferindo…">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="codigo" className="text-caption font-semibold text-ink-2">
              Código da empresa
            </label>
            <input
              id="codigo"
              name="codigo"
              autoComplete="off"
              autoFocus
              required
              className="h-12 w-full rounded-lg border border-line bg-surface px-3.5 text-center
                font-mono text-h3 tracking-[0.14em] text-ink uppercase outline-none
                transition-[border-color,box-shadow] duration-base ease-soft
                placeholder:text-faint focus:border-brand-deep
                focus:shadow-[0_0_0_3px_rgb(15_168_188_/_0.16)]"
            />
          </div>
        </FormAcao>
      </div>

      <p
        className="entra text-caption leading-relaxed text-muted"
        style={{ "--atraso": "120ms" } as React.CSSProperties}
      >
        Errar o código não diz nada além de que ele está errado, e nenhum dado da empresa
        aparece antes de acertar.
      </p>
    </main>
  );
}

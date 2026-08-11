import Link from "next/link";
import { Logo } from "@/components/logo";
import { Sair } from "@/components/icones";
import { NavPainel } from "@/components/nav-painel";
import { exigirEmpresa } from "@/lib/empresa";

/**
 * Casca da área da empresa, e a porta dela.
 *
 * O `exigirEmpresa` aqui vale para tudo que está dentro deste grupo de rotas:
 * `/painel`, `/painel/cliente/...`, `/painel/campanha/...`, `/painel/turma/...`.
 * Quem não é empresa recebe 404 em qualquer uma, sem nenhuma consulta ao banco
 * antes disso. Guardar no layout, e não em cada página, é o que garante que a
 * próxima tela criada aqui dentro já nasça protegida.
 *
 * A gestão da turma do representante NÃO passa por aqui: ela vive em
 * `/t/[codigo]/gestao` e enxerga uma turma só.
 *
 * Desktop: trilho lateral fixo, altura inteira. Celular: o mesmo conteúdo
 * dentro de um `details`, que é menu deslizante nativo, sem estado nem
 * JavaScript. O layout inteiro continua sendo componente de servidor, e o que
 * chega ao navegador é a planilha, não a navegação.
 *
 * A lista de destinos vive em `components/nav-painel.tsx`, que é a única ilha
 * de cliente daqui: ela precisa saber a rota atual para acender o item aberto.
 */

function Rodape() {
  return (
    <Link
      href="/entrar"
      className="group flex items-center gap-3 rounded-md px-3 py-2 text-caption
        font-medium text-muted transition-colors duration-fast ease-soft hover:bg-surface-2
        hover:text-ink"
    >
      <Sair className="h-4 w-4" />
      Área do aluno
    </Link>
  );
}

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  await exigirEmpresa();

  return (
    <div className="min-h-dvh md:flex">
      {/* Celular: menu nativo. Aberto ou fechado é estado do próprio elemento. */}
      <details className="group border-b border-line bg-surface md:hidden">
        <summary
          className="flex cursor-pointer list-none items-center justify-between px-4 py-3
            [&::-webkit-details-marker]:hidden"
        >
          <Logo />
          <span
            className="flex h-9 items-center gap-2 rounded-md border border-line px-3
              text-caption font-semibold text-ink-2"
          >
            <span className="flex flex-col gap-[3px]" aria-hidden>
              <span className="h-px w-4 bg-current" />
              <span className="h-px w-4 bg-current" />
              <span className="h-px w-4 bg-current" />
            </span>
            Menu
          </span>
        </summary>
        <div className="flex flex-col gap-1 border-t border-line px-2 py-2">
          <NavPainel />
          <div className="border-t border-line pt-1">
            <Rodape />
          </div>
        </div>
      </details>

      <aside
        className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col justify-between border-r
          border-line bg-surface px-3 py-5 md:flex"
      >
        <div className="flex flex-col gap-6">
          <div className="px-3">
            <Logo />
          </div>
          <NavPainel />
        </div>
        <Rodape />
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}

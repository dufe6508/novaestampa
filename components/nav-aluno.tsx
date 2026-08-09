"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Carteira, Gestao, Loja, Pacote, Usuario } from "./icones";

/**
 * Navegação do aluno · quatro abas, dois desenhos.
 *
 * Mobile e desktop compartilham a lista, não o layout. No celular é barra
 * inferior, onde o polegar alcança. No desktop é trilho lateral de altura
 * inteira, que é o que faz a tela parecer app e não página de celular esticada.
 *
 * A regra que separa Pedidos de Carteira: Pedidos é a peça, Carteira é o
 * dinheiro. Por isso o aviso de valor em aberto mora na Carteira.
 */

const ABAS = [
  { href: "loja", texto: "Loja", Icone: Loja },
  { href: "pedidos", texto: "Pedidos", Icone: Pacote },
  { href: "carteira", texto: "Carteira", Icone: Carteira },
  { href: "conta", texto: "Conta", Icone: Usuario },
] as const;

/**
 * Gestão, não "empresa": quem entra aqui pode ser admin da Nova Estampa,
 * comissão ou representante de turma, e são níveis de permissão diferentes.
 * Chamar de empresa daria a entender que é só a Nova Estampa.
 *
 * Aparece para todo mundo porque, no protótipo, todo usuário é admin
 * (CLAUDE.md §3.3). Quando os papéis existirem, esta aba passa a depender de
 * `perfil.tipo` e some para quem é aluno.
 */
const ABA_GESTAO = { href: "/painel", texto: "Gestão", Icone: Gestao } as const;

function useAbas(codigo: string, emAberto: number) {
  const caminho = usePathname();
  const base = `/t/${codigo}`;

  const abas = ABAS.map(({ href, texto, Icone }) => {
    const url = `${base}/${href}`;
    return {
      url,
      texto,
      Icone,
      ativa: caminho === url || caminho.startsWith(`${url}/`),
      alerta: href === "carteira" && emAberto > 0,
    };
  });

  return [
    ...abas,
    {
      url: ABA_GESTAO.href,
      texto: ABA_GESTAO.texto,
      Icone: ABA_GESTAO.Icone,
      ativa: caminho.startsWith(ABA_GESTAO.href),
      alerta: false,
    },
  ];
}

/** Trilho lateral do desktop. Mora dentro do `aside` do layout. */
export function NavLateral({ codigo, emAberto }: { codigo: string; emAberto: number }) {
  const abas = useAbas(codigo, emAberto);

  return (
    <nav aria-label="Navegação principal">
      <ul className="flex flex-col gap-0.5">
        {abas.map(({ url, texto, Icone, ativa, alerta }, i) => (
          // A gestão é outro contexto, não uma quinta aba do aluno.
          // A linha antes dela diz isso sem precisar de rótulo.
          <li key={url} className={i === abas.length - 1 ? "mt-2 border-t border-line pt-2" : ""}>
            <Link
              href={url}
              aria-current={ativa ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-md px-3 py-2 text-body-sm
                transition-colors duration-fast ease-soft
                ${
                  ativa
                    ? "bg-surface-2 font-semibold text-ink"
                    : "font-medium text-ink-2 hover:bg-surface-2/60 hover:text-ink"
                }`}
            >
              <Icone
                className={`h-[18px] w-[18px] transition-colors duration-fast ease-soft
                  ${ativa ? "text-ink" : "text-muted group-hover:text-ink-2"}`}
              />
              {texto}
              {alerta && (
                <span
                  aria-hidden
                  className="ml-auto size-1.5 rounded-full bg-brand"
                  title="Você tem valor em aberto"
                />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Barra inferior do celular. Fixa, fora do fluxo. */
export function NavInferior({ codigo, emAberto }: { codigo: string; emAberto: number }) {
  const abas = useAbas(codigo, emAberto);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95
        pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {abas.map(({ url, texto, Icone, ativa, alerta }) => (
          <li key={url} className="flex-1">
            <Link
              href={url}
              aria-current={ativa ? "page" : undefined}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1
                transition-colors duration-fast ease-soft
                ${ativa ? "text-ink" : "text-muted active:text-ink-2"}`}
            >
              <span className="relative">
                <Icone className="h-[22px] w-[22px]" />
                {alerta && (
                  <span
                    aria-hidden
                    className="absolute -right-1 -top-0.5 size-2 rounded-full bg-brand
                      ring-2 ring-surface"
                  />
                )}
              </span>
              <span
                className={`text-[0.6875rem] leading-none
                  ${ativa ? "font-semibold" : "font-medium"}`}
              >
                {texto}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

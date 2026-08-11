"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/**
 * Busca que filtra enquanto se digita.
 *
 * A versão anterior era um `form` GET puro, sem estado e sem JS: custava um
 * Enter e ganhava funcionar com o navegador desligado. O Enter é que não se
 * paga. Quem está conferindo nome por nome contra a lista de papel digita três
 * letras, olha, apaga, digita outras três, e o Enter no meio disso é uma
 * cerimônia por tentativa.
 *
 * O que a versão antiga protegia continua de pé:
 *
 * · **O resultado ainda é uma URL.** `router.replace` escreve `?q=` de verdade,
 *   então o endereço continua podendo ser mandado para outra pessoa.
 * · **Sem JS ainda funciona.** O `form` GET continua aqui embaixo. Com JS ele
 *   nunca chega a submeter, e sem JS ele é exatamente o comportamento antigo.
 * · **`replace`, não `push`.** Cada letra empilhada no histórico faria o botão
 *   voltar percorrer a palavra letra por letra.
 *
 * A espera de 220ms existe porque cada mudança de URL é uma renderização no
 * servidor: sem ela, "Fernandes" dispara nove.
 */
export function Busca({
  nome = "q",
  valor,
  placeholder,
  escondidos,
}: {
  nome?: string;
  valor?: string;
  placeholder: string;
  /** Só para o caminho sem JS, onde o `form` precisa reenviar o contexto. */
  escondidos?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const [texto, setTexto] = useState(valor ?? "");
  const [buscando, iniciar] = useTransition();

  // Sem isto o componente navega sozinho ao montar, e a primeira renderização
  // de cada tela viraria uma segunda renderização idêntica.
  const digitou = useRef(false);

  useEffect(() => {
    if (!digitou.current) return;

    const alvo = texto.trim();
    if ((params.get(nome) ?? "") === alvo) return;

    const id = setTimeout(() => {
      const proximos = new URLSearchParams(params.toString());
      if (alvo) proximos.set(nome, alvo);
      else proximos.delete(nome);

      const query = proximos.toString();
      iniciar(() => {
        router.replace(query ? `${caminho}?${query}` : caminho, { scroll: false });
      });
    }, 220);

    return () => clearTimeout(id);
  }, [texto, nome, params, caminho, router]);

  return (
    <form
      className="relative flex min-w-0 flex-1 items-center sm:max-w-xs"
      onSubmit={(e) => e.preventDefault()}
    >
      {Object.entries(escondidos ?? {}).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      <label htmlFor={`busca-${nome}`} className="sr-only">
        {placeholder}
      </label>
      <input
        id={`busca-${nome}`}
        type="search"
        name={nome}
        value={texto}
        onChange={(e) => {
          digitou.current = true;
          setTexto(e.target.value);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-body-sm
          text-ink outline-none transition-[border-color,box-shadow] duration-base ease-soft
          placeholder:text-faint focus:border-brand-deep
          focus:shadow-[0_0_0_3px_rgb(15_168_188_/_0.16)]"
      />

      {/* Sinal de que a lista atrás ainda é a antiga. Some sozinho, e some
          rápido: piscar a cada letra seria pior que não ter nada. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute right-3 size-1.5 rounded-full bg-brand
          transition-opacity duration-base ease-soft motion-safe:animate-pulse
          ${buscando ? "opacity-100" : "opacity-0"}`}
      />
    </form>
  );
}

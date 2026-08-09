"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { imagemUrl } from "@/lib/supabase";
import { Seta, Voltar, X } from "./icones";

/**
 * Galeria do produto · carrossel arrastável, com ampliação.
 *
 * Decisões que separam "grade de miniaturas" de vitrine:
 *
 * · **A foto seguinte aparece pela borda.** A fatia visível do próximo slide é
 *   o que diz "arrasta" sem precisar escrever. Miniatura embaixo só informa que
 *   existem outras fotos, não que dá para deslizar.
 * · **Rolagem nativa com `scroll-snap`.** Arrasta com o dedo, com o trackpad e
 *   com as setas do teclado, sem biblioteca e sem listener de scroll global. O
 *   índice sai da posição de rolagem, não de estado paralelo.
 * · **Contador fora da foto.** Pílula sobreposta suja o enquadramento da peça,
 *   que é justamente o que o aluno veio olhar. Ele vive na linha de baixo.
 * · **Tocar amplia.** O detalhe do bordado e do brasão não se resolve num
 *   card de 300px. A ampliação usa `<dialog>` nativo, que já traz foco preso,
 *   fechar no Esc e fundo inerte.
 *
 * As fotos do produto são 3:4 e 4:5, então o slide é 4:5 e a foto preenche.
 */

/** Índice do slide mais próximo da posição de rolagem. */
function indiceVisivel(el: HTMLElement, total: number) {
  const filhos = el.children as unknown as HTMLElement[];
  if (filhos.length < 2) return 0;
  const passo = filhos[1].offsetLeft - filhos[0].offsetLeft;
  return Math.min(Math.max(Math.round(el.scrollLeft / passo), 0), total - 1);
}

function rolarPara(el: HTMLElement | null, i: number, suave = true) {
  if (!el) return;
  const filhos = el.children as unknown as HTMLElement[];
  const passo = filhos.length > 1 ? filhos[1].offsetLeft - filhos[0].offsetLeft : el.clientWidth;
  el.scrollTo({ left: i * passo, behavior: suave ? "smooth" : "auto" });
}

export function Galeria({ imagens, nome }: { imagens: string[]; nome: string }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const [ampliada, setAmpliada] = useState<number | null>(null);

  const aoRolar = useCallback(() => {
    if (trilho.current) setAtual(indiceVisivel(trilho.current, imagens.length));
  }, [imagens.length]);

  if (imagens.length === 0) return null;

  const unica = imagens.length === 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="group/gal relative">
        <div
          ref={trilho}
          onScroll={aoRolar}
          tabIndex={0}
          role="group"
          aria-label={`Fotos de ${nome}`}
          className={`sem-barra relative flex snap-x snap-mandatory overflow-x-auto
            overscroll-x-contain rounded-xl
            ${unica ? "" : "gap-2 px-[6%] scroll-px-[6%]"}`}
        >
          {imagens.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => setAmpliada(i)}
              aria-label={`Ampliar foto ${i + 1} de ${imagens.length}`}
              className={`shrink-0 cursor-zoom-in snap-start overflow-hidden rounded-xl border
                border-line bg-surface-2 ${unica ? "w-full" : "w-[88%]"}`}
            >
              <img
                src={imagemUrl(img)}
                alt={`${nome}, foto ${i + 1} de ${imagens.length}`}
                loading={i === 0 ? "eager" : "lazy"}
                draggable={false}
                className="aspect-[4/5] w-full select-none object-cover"
              />
            </button>
          ))}
        </div>

        {/* Setas só no desktop, onde não existe arrastar com o dedo.
            Aparecem no hover para não competir com a foto. */}
        {!unica && (
          <>
            <SetaCarrossel
              lado="esquerda"
              rotulo="Foto anterior"
              desabilitada={atual === 0}
              aoClicar={() => rolarPara(trilho.current, atual - 1)}
            />
            <SetaCarrossel
              lado="direita"
              rotulo="Próxima foto"
              desabilitada={atual === imagens.length - 1}
              aoClicar={() => rolarPara(trilho.current, atual + 1)}
            />
          </>
        )}
      </div>

      {!unica && (
        <>
          <div className="flex items-center justify-center gap-3">
            {/* Barras, não bolinhas: com sete fotos, bolinha vira poeira e não
                dá para acertar com o dedo. */}
            <div className="flex gap-1.5">
              {imagens.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  onClick={() => rolarPara(trilho.current, i)}
                  className={`h-1 rounded-full transition-[width,background-color] duration-base
                    ease-soft ${i === atual ? "w-5 bg-ink" : "w-2 bg-line-strong"}`}
                />
              ))}
            </div>
            <p data-nums className="text-caption tabular-nums text-muted">
              {atual + 1} / {imagens.length}
            </p>
          </div>

          <ul className="sem-barra hidden gap-2 overflow-x-auto md:flex">
            {imagens.map((img, i) => (
              <li key={img} className="shrink-0">
                <button
                  type="button"
                  onClick={() => rolarPara(trilho.current, i)}
                  aria-label={`Ver foto ${i + 1}`}
                  aria-current={i === atual ? "true" : undefined}
                  className={`block size-14 overflow-hidden rounded-md border bg-surface-2
                    transition-colors duration-fast ease-soft
                    ${i === atual ? "border-ink" : "border-line hover:border-line-strong"}`}
                >
                  <img
                    src={imagemUrl(img)}
                    alt=""
                    loading="lazy"
                    className={`h-full w-full object-cover transition-opacity duration-fast
                      ${i === atual ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
                  />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Ampliada
        imagens={imagens}
        nome={nome}
        inicial={ampliada}
        aoFechar={(ultimo) => {
          setAmpliada(null);
          // Volta para a foto que a pessoa estava vendo ampliada, senão o
          // carrossel "esquece" onde ela parou.
          if (ultimo !== null) rolarPara(trilho.current, ultimo, false);
        }}
      />
    </div>
  );
}

function SetaCarrossel({
  lado,
  rotulo,
  desabilitada,
  aoClicar,
}: {
  lado: "esquerda" | "direita";
  rotulo: string;
  desabilitada: boolean;
  aoClicar: () => void;
}) {
  const Icone = lado === "esquerda" ? Voltar : Seta;
  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={desabilitada}
      aria-label={rotulo}
      className={`absolute top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center
        rounded-full bg-surface/90 text-ink shadow-lift backdrop-blur
        transition-opacity duration-base ease-soft
        disabled:pointer-events-none disabled:opacity-0
        md:flex md:opacity-0 md:group-hover/gal:opacity-100
        ${lado === "esquerda" ? "left-2" : "right-2"}`}
    >
      <Icone className="h-4 w-4" />
    </button>
  );
}

/**
 * Ampliação em `<dialog>` nativo: foco preso, Esc fecha e o resto da página
 * fica inerte sem uma linha de JS para isso.
 */
function Ampliada({
  imagens,
  nome,
  inicial,
  aoFechar,
}: {
  imagens: string[];
  nome: string;
  inicial: number | null;
  aoFechar: (ultimo: number | null) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const trilho = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;

    if (inicial === null) {
      if (d.open) d.close();
      return;
    }

    d.showModal();
    setAtual(inicial);
    // Sem animação na abertura: a foto precisa já estar na certa.
    requestAnimationFrame(() => rolarPara(trilho.current, inicial, false));
  }, [inicial]);

  const fechar = () => aoFechar(atual);

  return (
    <dialog
      ref={dialogo}
      onClose={fechar}
      onClick={(e) => {
        // Clique no fundo fecha. O conteúdo para a propagação.
        if (e.target === dialogo.current) dialogo.current?.close();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink/95 p-0 backdrop:bg-transparent"
    >
      {inicial !== null && (
        <div className="flex h-full flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex h-14 shrink-0 items-center justify-between px-4">
            <p data-nums className="text-caption font-semibold tabular-nums text-white/70">
              {atual + 1} / {imagens.length}
            </p>
            <button
              type="button"
              onClick={() => dialogo.current?.close()}
              aria-label="Fechar ampliação"
              className="-mr-2 flex size-10 items-center justify-center rounded-full text-white/80
                transition-colors duration-fast ease-soft hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            ref={trilho}
            onScroll={() => {
              if (trilho.current) setAtual(indiceVisivel(trilho.current, imagens.length));
            }}
            className="sem-barra flex flex-1 snap-x snap-mandatory items-center overflow-x-auto
              overscroll-contain"
          >
            {imagens.map((img, i) => (
              <div key={img} className="flex w-screen shrink-0 snap-start justify-center px-4">
                <img
                  src={imagemUrl(img)}
                  alt={`${nome}, foto ${i + 1} de ${imagens.length}`}
                  draggable={false}
                  className="max-h-[calc(100dvh-8rem)] w-auto max-w-full select-none rounded-lg
                    object-contain"
                />
              </div>
            ))}
          </div>

          <div className="flex h-14 shrink-0 items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => rolarPara(trilho.current, Math.max(atual - 1, 0))}
              disabled={atual === 0}
              aria-label="Foto anterior"
              className="flex size-10 items-center justify-center rounded-full text-white/80
                transition-colors duration-fast ease-soft hover:bg-white/10 hover:text-white
                disabled:pointer-events-none disabled:opacity-25"
            >
              <Voltar className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() =>
                rolarPara(trilho.current, Math.min(atual + 1, imagens.length - 1))
              }
              disabled={atual === imagens.length - 1}
              aria-label="Próxima foto"
              className="flex size-10 items-center justify-center rounded-full text-white/80
                transition-colors duration-fast ease-soft hover:bg-white/10 hover:text-white
                disabled:pointer-events-none disabled:opacity-25"
            >
              <Seta className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

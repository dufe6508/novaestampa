"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { Logo } from "@/components/logo";

/**
 * Apresentação do aluno, acima da tela de código.
 *
 * Quem chega pelo link do representante cai em /t/[codigo] e nunca passa por aqui. Esta
 * página é para quem digita o endereço na mão, e para a demonstração: antes de pedir um
 * código, mostra a peça e o que dá para fazer com ela.
 *
 * O movimento é conduzido pelo scroll, não por tempo: nada trava a leitura, e quem rola
 * rápido chega no campo do código na mesma velocidade de antes.
 *
 * `prefers-reduced-motion` é tratado aqui em JavaScript porque a regra global do
 * globals.css zera transição e animação de CSS, mas não alcança transform vindo do motion.
 */

const FOTOS = "/apresentacao";

/** Vira a faixa de valores em constante quando o usuário pediu menos movimento. */
function useFaixa(progresso: MotionValue<number>, entrada: number[], saida: number[]) {
  const reduzido = useReducedMotion();
  return useTransform(progresso, entrada, reduzido ? saida.map(() => saida[0]) : saida);
}

/** Entrada de bloco no viewport. Um só padrão, reusado em toda a página. */
function Entra({
  children,
  atraso = 0,
  className,
}: {
  children: ReactNode;
  atraso?: number;
  className?: string;
}) {
  const reduzido = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduzido ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, delay: atraso, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Foto com deslocamento leve contra o scroll. É o que dá profundidade sem distrair. */
function FotoParalaxe({ src, alt }: { src: string; alt: string }) {
  const alvo = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: alvo, offset: ["start end", "end start"] });
  const y = useFaixa(scrollYProgress, [0, 1], [-28, 28]);

  return (
    <div
      ref={alvo}
      className="overflow-hidden rounded-xl border border-line bg-surface shadow-lift"
    >
      <motion.img
        src={src}
        alt={alt}
        width={1086}
        height={1448}
        loading="lazy"
        decoding="async"
        style={{ y }}
        className="aspect-[3/4] w-full scale-[1.08] object-cover"
      />
    </div>
  );
}

const PASSOS = [
  {
    titulo: "Escolha a peça",
    texto: "Foto, tamanho e preço na tela. Sem lista de papel passando de mão em mão.",
  },
  {
    titulo: "Coloque seu nome",
    texto: "Você digita, confere e vê como fica na peça antes de confirmar.",
  },
  {
    titulo: "Pague a sua parte",
    texto: "Metade agora, metade na entrega. Direto para a Nova Estampa.",
  },
];

export function Apresentacao() {
  const reduzido = useReducedMotion();

  // O herói fica preso na tela enquanto o wrapper de 180vh rola por baixo. É esse
  // descompasso que produz a sensação de câmera, e não uma animação em loop.
  const palco = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: palco, offset: ["start start", "end start"] });

  const fotoY = useFaixa(scrollYProgress, [0, 1], [0, -90]);
  const fotoEscala = useFaixa(scrollYProgress, [0, 1], [1, 1.08]);
  const textoY = useFaixa(scrollYProgress, [0, 1], [0, -40]);
  const some = useFaixa(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <>
      {/* Herói ----------------------------------------------------------------- */}
      <div ref={palco} className="relative h-[180vh]">
        <section className="sticky top-0 flex h-dvh flex-col items-center justify-center overflow-hidden px-5">
          <motion.div
            style={{ y: fotoY, scale: fotoEscala, opacity: some }}
            className="absolute inset-x-0 top-0 flex justify-center"
            aria-hidden="true"
          >
            {/* No celular a foto ocupa a largura toda e não tem borda visível. No desktop
                ela vira uma coluna de 420px, e o corte reto nas laterais entrega o recorte:
                a máscara dissolve as bordas no fundo. */}
            <div
              className="relative w-full max-w-[420px]
                sm:[mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]"
            >
              <img
                src={`${FOTOS}/03-vestindo-frente.webp`}
                alt=""
                width={1122}
                height={1402}
                fetchPriority="high"
                decoding="async"
                className="h-[76dvh] w-full object-cover object-top"
              />
              {/* Topo: abre espaço limpo para a marca, que sozinha sobre o cabelo some. */}
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ground via-ground/80 to-transparent" />
              {/* O degradê apaga a base da foto para o texto nascer de dentro dela. */}
              <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-b from-transparent via-ground/70 to-ground" />
            </div>
          </motion.div>

          {/* A marca fica fora do bloco que rola com a foto: sobre a peça ela pareceria
              estampa, e a peça já tem o brasão do cliente. */}
          <motion.div style={{ opacity: some }} className="absolute top-6 left-1/2 -translate-x-1/2">
            <Logo destaque />
          </motion.div>

          <motion.div
            style={{ y: textoY, opacity: some }}
            className="relative mt-auto flex w-full max-w-[420px] flex-col items-center gap-5 pb-10 text-center"
          >
            <motion.h1
              initial={reduzido ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="text-display font-semibold tracking-[-0.03em]"
            >
              O uniforme da sua turma, com o seu nome.
            </motion.h1>

            <motion.p
              initial={reduzido ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
              className="max-w-[300px] text-body leading-relaxed text-ink-2"
            >
              Escolha o modelo, personalize e pague pelo celular. Leva dois minutos.
            </motion.p>

            <motion.a
              href="#codigo"
              initial={reduzido ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex h-11 items-center rounded-lg bg-ink px-6 text-body-sm font-semibold text-white
                transition-[opacity,transform] duration-fast ease-soft
                hover:opacity-90 active:scale-[0.98] active:opacity-80"
            >
              Tenho o código da turma
            </motion.a>
          </motion.div>

          <motion.span
            style={{ opacity: some }}
            className="pb-6 text-caption text-muted"
            aria-hidden="true"
          >
            role para ver a peça
          </motion.span>
        </section>
      </div>

      {/* O nome ---------------------------------------------------------------- */}
      <section className="mx-auto flex w-full max-w-[420px] flex-col gap-6 px-5 pb-24">
        <Entra className="flex flex-col gap-2">
          <span className="label text-brand-deep">Personalização</span>
          <h2 className="text-h1 tracking-[-0.025em]">Seu nome vai bordado nas costas.</h2>
          <p className="text-body leading-relaxed text-ink-2">
            Você digita, confere na tela e a peça sai exatamente assim. Nada de lista com letra
            que ninguém entende.
          </p>
        </Entra>

        <Entra atraso={0.1}>
          <FotoParalaxe src={`${FOTOS}/02-costas-nome.webp`} alt="Costas da polo com o nome bordado" />
        </Entra>
      </section>

      {/* O acabamento ---------------------------------------------------------- */}
      <section className="mx-auto flex w-full max-w-[420px] flex-col gap-6 px-5 pb-24">
        <Entra>
          <FotoParalaxe
            src={`${FOTOS}/07-detalhe-brasao.webp`}
            alt="Detalhe da gola e do brasão bordado na polo"
          />
        </Entra>

        <Entra atraso={0.1} className="flex flex-col gap-2">
          <span className="label text-brand-deep">Acabamento</span>
          <h2 className="text-h1 tracking-[-0.025em]">Feito para durar o ano inteiro.</h2>
          <p className="text-body leading-relaxed text-ink-2">
            Gola com punho listrado, brasão bordado na manga e costura reforçada. Produção
            própria, do corte à entrega.
          </p>
        </Entra>
      </section>

      {/* Como funciona --------------------------------------------------------- */}
      <section className="mx-auto flex w-full max-w-[420px] flex-col gap-6 px-5 pb-24">
        <Entra>
          <h2 className="text-h1 tracking-[-0.025em]">Como funciona</h2>
        </Entra>

        <ol className="flex flex-col gap-3">
          {PASSOS.map((passo, i) => (
            <li key={passo.titulo}>
              <Entra
                atraso={i * 0.1}
                className="flex gap-4 rounded-xl border border-line bg-surface px-5 py-4 shadow-card"
              >
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                    bg-surface-2 text-caption font-semibold text-ink-2"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3>{passo.titulo}</h3>
                  <p className="text-body-sm leading-relaxed text-muted">{passo.texto}</p>
                </div>
              </Entra>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

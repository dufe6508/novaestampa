/**
 * Preview da estampa · ilustração SVG das costas da peça, não foto.
 *
 * Por que SVG e não foto: a foto vende e mostra caimento, mas o nome precisa
 * cair sempre no mesmo lugar e do mesmo tamanho, independente da foto que o
 * admin subiu. Precisão onde errar custa caro.
 *
 * A letra é a mesma da interface (Geist), de propósito. Fonte cursiva no
 * preview PROMETE uma fonte, e a letra do bordado é decisão da produção. Este
 * preview responde "onde e de que tamanho meu nome fica", não "com que letra".
 *
 * Medidas tiradas de produtos/polo-formatura/02-costas-nome.webp: nome pequeno,
 * na parte inferior das costas, ocupando cerca de um terço da largura da peça.
 */

const LARGURA_MAXIMA = 74; // um terço da largura da peça, no viewBox de 200

export function Estampa({
  nome,
  className = "w-full",
}: {
  nome: string;
  className?: string;
}) {
  const limpo = nome.trim().replace(/\s+/g, " ");

  // Estimativa de largura para não deixar nome longo sair do contorno. Não dá
  // para medir texto no servidor, então o SVG comprime o próprio traço quando
  // a conta estoura, e o aluno vê o nome inteiro dentro da peça em qualquer caso.
  const estimativa = limpo.length * 5.3;
  const comprimir = estimativa > LARGURA_MAXIMA;

  return (
    <svg
      viewBox="0 0 200 236"
      className={className}
      role="img"
      aria-label={limpo ? `Costas da peça com o nome ${limpo}` : "Costas da peça, sem nome"}
    >
      {/* corpo */}
      <path
        d="M60 24 Q100 44 140 24 L160 30 L186 58 L170 84 L154 72 L158 210
           Q158 216 152 216 L48 216 Q42 216 42 210 L46 72 L30 84 L14 58 L40 30 Z"
        fill="var(--color-surface)"
        stroke="var(--color-line-strong)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* gola e punhos. Traço neutro: o preview mostra onde o nome cai, não a
          cor da peça, que varia de campanha para campanha. */}
      <path
        d="M60 24 Q100 44 140 24"
        fill="none"
        stroke="var(--color-ink-2)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M19 55 L35 81 M181 55 L165 81"
        fill="none"
        stroke="var(--color-ink-2)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {limpo ? (
        <text
          x="100"
          y="188"
          textAnchor="middle"
          fill="var(--color-ink)"
          fontSize="11"
          fontWeight="500"
          letterSpacing="0.02em"
          textLength={comprimir ? LARGURA_MAXIMA : undefined}
          lengthAdjust={comprimir ? "spacingAndGlyphs" : undefined}
        >
          {limpo}
        </text>
      ) : (
        // Estado vazio: o lugar do nome existe antes de o aluno digitar, senão
        // a peça parece quebrada enquanto ele pensa.
        <line
          x1="68"
          y1="188"
          x2="132"
          y2="188"
          stroke="var(--color-faint)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

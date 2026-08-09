/**
 * Marca Nova Estampa.
 *
 * Os paths vêm do arquivo original em `logo svg/NE-preto.svg`, não são redesenho.
 * O "E" (segundo path) é o que recebe o ciano da marca no logo original; o resto
 * segue a cor do texto ao redor via currentColor.
 */

type MarcaProps = {
  /** Pinta o E de ciano. Use só onde a marca é protagonista. */
  destaque?: boolean;
  className?: string;
};

export function Marca({ destaque = false, className }: MarcaProps) {
  return (
    <svg viewBox="0 0 1024 1024" className={className} aria-hidden="true" focusable="false">
      <g transform="translate(0,1024) scale(0.1,-0.1)" fill="currentColor" stroke="none">
        <path
          d="M4700 7502 c0 -4 37 -32 82 -62 97 -64 287 -248 314 -305 18 -39 19
-82 22 -1290 2 -1222 2 -1249 -17 -1230 -10 11 -146 164 -302 340 -156 176
-333 376 -394 445 -782 880 -1418 1601 -1663 1886 l-124 144 -439 0 c-261 0
-439 -4 -439 -9 0 -5 17 -15 38 -22 170 -55 375 -218 402 -321 7 -23 9 -606 8
-1640 l-3 -1603 -24 -44 c-32 -61 -111 -143 -201 -209 -41 -30 -79 -59 -84
-63 -6 -5 262 -9 597 -9 334 0 607 3 606 8 0 4 -50 36 -111 72 -131 76 -268
199 -313 282 l-30 53 -3 1328 c-1 730 0 1327 4 1327 3 0 16 -12 28 -27 11 -15
84 -100 161 -188 913 -1041 1219 -1388 1925 -2184 217 -246 442 -499 499 -563
l104 -118 134 0 133 0 0 1780 0 1780 1263 -2 1262 -3 55 -27 c86 -42 146 -106
192 -204 21 -46 41 -84 43 -84 3 0 5 173 5 385 l0 385 -1865 0 c-1026 0 -1865
-3 -1865 -8z"
        />
        <path
          fill={destaque ? "var(--color-brand)" : "currentColor"}
          d="M8308 5971 c-34 -59 -95 -116 -157 -145 -46 -21 -49 -21 -1033 -24
l-988 -2 0 -1150 0 -1150 1285 0 1285 0 0 385 c0 212 -3 385 -7 385 -5 -1 -23
-35 -42 -76 -47 -102 -131 -193 -219 -236 l-67 -33 -882 -3 -883 -2 0 700 0
701 753 -3 752 -3 50 -24 c68 -34 131 -100 165 -174 l29 -62 1 483 c0 265 -3
482 -7 482 -5 0 -20 -22 -35 -49z"
        />
      </g>
    </svg>
  );
}

/** Marca + nome, para cabeçalhos. */
export function Logo({
  destaque = false,
  className = "",
}: {
  destaque?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 text-ink ${className}`}>
      <Marca destaque={destaque} className="h-5 w-5" />
      <span className="text-[15px] font-semibold tracking-[-0.01em]">Nova Estampa</span>
    </span>
  );
}

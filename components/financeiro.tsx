import Link from "next/link";
import { capitalizarNome, reais } from "@/lib/formato";
import { pct } from "@/lib/painel";
import type { LinhaRanking, Ponto, Recebimento } from "@/lib/contas";
import { Barra } from "./painel";
import { Seta } from "./icones";

/**
 * Peças do Financeiro.
 *
 * Todas de servidor, todas sem estado, e os três gráficos são `svg` escrito à
 * mão. Nenhuma biblioteca de charting: são três formas (curva acumulada, fio de
 * cartão, barra de ranking), e toda biblioteca do gênero é client-only, o que
 * obrigaria `use client` mais hidratação em cada página do painel que mostrasse
 * um número. Aqui o gráfico chega pronto no HTML e aparece antes de hidratar
 * qualquer coisa, que é o que salva o 4G da escola.
 *
 * Cor de série vem dos tokens `--color-serie*`: a curva do realizado é `serie`,
 * a da referência é `serie-2` tracejada. Verde e vermelho não entram em série,
 * eles já significam estado em todo o painel.
 */

const METODOS: Record<Recebimento["metodo"], string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
  outro: "Outro",
};

// ------------------------------------------------------------
// Variação
// ------------------------------------------------------------

/**
 * A variação contra o período anterior.
 *
 * Verde e vermelho aparecem aqui e em nenhum outro lugar do módulo, e sempre com
 * a seta junto: quem não distingue as duas cores lê a direção na forma. Sem base
 * de comparação, o componente não renderiza nada, porque "+∞%" não é informação.
 */
export function Delta({
  valor,
  contra,
  bom = "subir",
}: {
  valor: number | null;
  /** O que está sendo comparado, em palavra: "vs ontem", "vs julho". */
  contra: string;
  /** Em vencido, subir é ruim. O padrão serve para dinheiro que entra. */
  bom?: "subir" | "descer";
}) {
  if (valor === null || valor === 0) {
    return <span className="text-caption text-muted">{contra}</span>;
  }

  const subiu = valor > 0;
  const positivo = bom === "subir" ? subiu : !subiu;

  return (
    <span className="text-caption">
      <span
        data-nums
        className={positivo ? "font-medium text-success" : "font-medium text-danger"}
      >
        {subiu ? "▲" : "▼"} {Math.abs(valor)}%
      </span>{" "}
      <span className="text-muted">{contra}</span>
    </span>
  );
}

// ------------------------------------------------------------
// Fio · a sparkline do cartão
// ------------------------------------------------------------

/**
 * Linha miúda, sem eixo e sem rótulo. Diz "está subindo" sem gastar um gráfico.
 *
 * Só entra nos cartões de posição. Nos de cobrança fica de fora: ali decide o
 * valor e a lista, não a tendência, e seis fios na primeira tela é o defeito do
 * painel de referência, onde nada se destaca.
 */
export function Fio({ valores }: { valores: number[] }) {
  if (valores.length < 2) return null;

  const w = 120;
  const h = 28;
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const amplitude = max - min || 1;

  const ponto = (v: number, i: number) => {
    const x = (i / (valores.length - 1)) * w;
    const y = h - ((v - min) / amplitude) * (h - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  const linha = valores.map(ponto).join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-7 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <polyline
        points={linha}
        fill="none"
        stroke="var(--color-serie)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ------------------------------------------------------------
// Curvas · vendido contra recebido
// ------------------------------------------------------------

const MES_CURTO = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

function rotuloDia(dia: string) {
  return MES_CURTO.format(new Date(`${dia}T12:00:00Z`)).replace(".", "");
}

/**
 * Duas curvas acumuladas: o que foi vendido e o que entrou.
 *
 * Acumulada, e nao barra por dia, porque a resposta esta na distancia entre as
 * linhas: ela e a carteira crescendo. O vendido e a referencia, entao vai
 * tracejado; o recebido e o que aconteceu, entao e solido e com preenchimento.
 *
 * **Tres numeros em cima e a tabela embaixo.** Linha sozinha responde "esta
 * subindo" e nao responde "quanto", que e a pergunta de quem cuida do dinheiro.
 * O eixo ganhou rotulo em reais, o topo ganhou os totais, e "Ver numero por
 * numero" abre a leitura exata sem sair da tela.
 *
 * O desenho nao e mais esticado: sem `preserveAspectRatio="none"` o traco e o
 * texto mantem a proporcao, e a altura vem do proprio `viewBox`, entao nao sobra
 * faixa branca embaixo quando o bloco vizinho e mais alto.
 */

/** "R$ 46 mil". Eixo com o valor inteiro empurra a coluna e ninguem le tudo. */
function curto(centavos: number) {
  const v = centavos / 100;
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000)} mil`;
  return `R$ ${Math.round(v)}`;
}

export function Curvas({ pontos }: { pontos: Ponto[] }) {
  if (pontos.length < 2) {
    return (
      <p className="px-4 py-10 text-center text-body-sm text-muted">
        Ainda nao ha movimento suficiente no periodo para desenhar a curva.
      </p>
    );
  }

  // Faixa a esquerda para o rotulo do eixo, faixa embaixo para as datas.
  const w = 640;
  const h = 210;
  const esq = 64;
  const base = h - 20;
  const topo = 8;

  const teto = Math.max(...pontos.map((p) => p.vendido)) || 1;
  const x = (i: number) => esq + (i / (pontos.length - 1)) * (w - esq - 6);
  const y = (v: number) => base - (v / teto) * (base - topo);

  const caminho = (campo: "vendido" | "recebido") =>
    pontos
      .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p[campo]).toFixed(1)}`)
      .join(" ");

  const area = `${caminho("recebido")} L ${x(pontos.length - 1).toFixed(1)} ${base} L ${esq} ${base} Z`;
  const ultimo = pontos[pontos.length - 1];
  const meio = pontos[Math.floor((pontos.length - 1) / 2)];

  return (
    <figure className="flex flex-col gap-3 px-4 pb-4 pt-3.5">
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        {[
          { rotulo: "Vendido", valor: ultimo.vendido, cor: "text-ink-2" },
          { rotulo: "Recebido", valor: ultimo.recebido, cor: "text-ink" },
          { rotulo: "Diferenca", valor: ultimo.vendido - ultimo.recebido, cor: "text-danger" },
        ].map((k) => (
          <div key={k.rotulo}>
            <p className="label text-muted">{k.rotulo}</p>
            <p data-nums className={`text-body font-semibold tabular-nums ${k.cor}`}>
              {reais(k.valor)}
            </p>
          </div>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        role="img"
        aria-label={`Vendido ${reais(ultimo.vendido)} e recebido ${reais(ultimo.recebido)} no periodo`}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1={esq}
              x2={w - 6}
              y1={y(teto * f)}
              y2={y(teto * f)}
              stroke="var(--color-serie-eixo)"
              strokeWidth="1"
            />
            <text
              x={esq - 8}
              y={y(teto * f) + 4}
              textAnchor="end"
              className="fill-muted text-[11px]"
            >
              {curto(teto * f)}
            </text>
          </g>
        ))}

        <path d={area} fill="var(--color-serie-fundo)" />
        <path
          d={caminho("vendido")}
          fill="none"
          stroke="var(--color-serie-2)"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        <path
          d={caminho("recebido")}
          fill="none"
          stroke="var(--color-serie)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {pontos.map((p, i) => (
          <circle key={p.dia} cx={x(i)} cy={y(p.recebido)} r="7" fill="transparent">
            <title>
              {rotuloDia(p.dia)} - Vendido {reais(p.vendido)} - Recebido {reais(p.recebido)}
            </title>
          </circle>
        ))}

        {[
          { dia: pontos[0].dia, anchor: "start" as const, cx: esq },
          { dia: meio.dia, anchor: "middle" as const, cx: (esq + w - 6) / 2 },
          { dia: ultimo.dia, anchor: "end" as const, cx: w - 6 },
        ].map((r) => (
          <text
            key={r.anchor}
            x={r.cx}
            y={h - 4}
            textAnchor={r.anchor}
            className="fill-muted text-[11px]"
          >
            {rotuloDia(r.dia)}
          </text>
        ))}
      </svg>

      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption">
        <span className="flex items-center gap-1.5 text-ink-2">
          <span className="h-0.5 w-4 rounded-full bg-[var(--color-serie)]" />
          Recebido
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <span
            className="h-0 w-4 border-t border-dashed"
            style={{ borderColor: "var(--color-serie-2)" }}
          />
          Vendido
        </span>
        <span data-nums className="ml-auto text-muted">
          Acumulado de {rotuloDia(pontos[0].dia)} a {rotuloDia(ultimo.dia)}
        </span>
      </figcaption>

      <details className="group border-t border-line pt-3">
        <summary
          className="flex cursor-pointer list-none items-center gap-2 text-caption font-medium
            text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden"
        >
          <Seta className="h-3 w-3 transition-transform duration-base ease-soft group-open:rotate-90" />
          Ver numero por numero
        </summary>

        <div className="mt-2 max-h-64 overflow-y-auto">
          <table className="w-full border-collapse text-caption">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-1.5 text-left font-medium">Data</th>
                <th className="py-1.5 text-right font-medium">Vendido</th>
                <th className="py-1.5 text-right font-medium">Recebido</th>
                <th className="py-1.5 text-right font-medium">Diferenca</th>
              </tr>
            </thead>
            <tbody>
              {[...pontos].reverse().map((p) => (
                <tr key={p.dia} className="border-b border-line last:border-0">
                  <td data-nums className="py-1.5 text-ink-2">
                    {rotuloDia(p.dia)}
                  </td>
                  <td data-nums className="py-1.5 text-right tabular-nums text-ink-2">
                    {reais(p.vendido)}
                  </td>
                  <td data-nums className="py-1.5 text-right font-medium tabular-nums">
                    {reais(p.recebido)}
                  </td>
                  <td data-nums className="py-1.5 text-right tabular-nums text-danger">
                    {reais(p.vendido - p.recebido)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

// ------------------------------------------------------------
// Modos · filtro com o valor dentro do botão
// ------------------------------------------------------------

/**
 * Os modos da tela de cobrança. O valor mora dentro do próprio botão, que é como
 * a Produção já mostra os tamanhos: o rótulo diz o que é, e o número diz o
 * tamanho do problema antes do clique.
 */
export function Modos({
  opcoes,
}: {
  opcoes: { texto: string; href: string; ativo: boolean; centavos: number; pedidos: number }[];
}) {
  return (
    <div className="sem-barra -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
      {opcoes.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          scroll={false}
          aria-current={o.ativo ? "page" : undefined}
          className={`flex min-w-36 flex-1 flex-col gap-0.5 rounded-lg border px-3 py-2.5
            transition-colors duration-fast ease-soft
            ${
              o.ativo
                ? "border-ink bg-ink text-white"
                : "border-line bg-surface hover:border-line-strong hover:bg-surface-2"
            }`}
        >
          <span className={`label ${o.ativo ? "text-white/70" : "text-muted"}`}>{o.texto}</span>
          <span data-nums className="text-body font-semibold tabular-nums">
            {reais(o.centavos)}
          </span>
          <span
            data-nums
            className={`text-caption ${o.ativo ? "text-white/70" : "text-muted"}`}
          >
            {o.pedidos} {o.pedidos === 1 ? "Pedido" : "Pedidos"}
          </span>
        </Link>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Ranking · onde o problema está concentrado
// ------------------------------------------------------------

/**
 * Lista curta com nome, valor e barra proporcional.
 *
 * Ordenada por valor, nunca por percentual: cobra-se reais, e 100% de atraso numa
 * turma de dois pedidos não é a prioridade de ninguém. A barra é comparação entre
 * as linhas, então a referência é a maior delas, não o total.
 */
export function Ranking({
  linhas,
  href,
  vazio = "Nada em atraso por aqui.",
}: {
  linhas: LinhaRanking[];
  /** Monta o link de cada linha. Sem ele, o ranking é só leitura. */
  href?: (linha: LinhaRanking) => string;
  vazio?: string;
}) {
  if (linhas.length === 0) {
    return <p className="px-4 py-6 text-center text-body-sm text-muted">{vazio}</p>;
  }

  const teto = linhas[0].valor_centavos || 1;

  return (
    <ul className="divide-y divide-line">
      {linhas.map((l) => {
        const conteudo = (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-body-sm font-medium">
                {capitalizarNome(l.nome)}
              </span>
              <span data-nums className="whitespace-nowrap text-body-sm font-semibold text-danger">
                {reais(l.valor_centavos)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <Barra parte={l.valor_centavos} total={teto} />
              <span data-nums className="whitespace-nowrap text-caption text-muted">
                {l.pedidos} {l.pedidos === 1 ? "Pedido" : "Pedidos"}
              </span>
            </div>
          </>
        );

        return (
          <li key={l.id}>
            {href ? (
              <Link
                href={href(l)}
                className="block px-4 py-2.5 transition-colors duration-fast ease-soft hover:bg-surface-2"
              >
                {conteudo}
              </Link>
            ) : (
              <div className="px-4 py-2.5">{conteudo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ------------------------------------------------------------
// Entradas · o feed das últimas baixas
// ------------------------------------------------------------

const HORA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/**
 * As últimas baixas, em lista.
 *
 * O cartão diz quanto entrou, o feed diz de quem veio, e é a peça que responde
 * "entrou dinheiro desde ontem?" sem precisar de relatório. `Dinheiro` e
 * `Manual` ficam à mostra porque é justamente o que o projeto quer diminuir:
 * pagamento que passou pela mão do representante.
 */
function LinhaEntrada({ r }: { r: Recebimento }) {
  return (
    <li>
      <Link
        href={`/painel/turma/${r.grupo_id}?pedido=${r.pedido_id}`}
        className="flex items-baseline justify-between gap-3 px-4 py-2
          transition-colors duration-fast ease-soft hover:bg-surface-2"
      >
        <span className="min-w-0">
          <span className="block truncate text-body-sm font-medium">
            {capitalizarNome(r.aluno_nome)}
          </span>
          <span className="text-caption text-muted">
            {r.grupo_nome} · {METODOS[r.metodo]}
            {!r.direto && " · No representante"}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span data-nums className="block text-body-sm font-semibold tabular-nums">
            {reais(r.valor_centavos)}
          </span>
          <span data-nums className="text-caption text-muted">
            {HORA.format(new Date(r.pago_em))}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function Entradas({ linhas, limite = 5 }: { linhas: Recebimento[]; limite?: number }) {
  if (linhas.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-body-sm text-muted">
        Nenhum pagamento registrado ainda.
      </p>
    );
  }

  // Cinco cabem sem empurrar o resto da tela para baixo. O que passa disso fica
  // atrás de um `details`: quem quer ver mais clica, e quem só quer saber se
  // entrou dinheiro hoje não paga por isso com rolagem.
  const primeiras = linhas.slice(0, limite);
  const resto = linhas.slice(limite);

  return (
    <>
      <ul className="divide-y divide-line">
        {primeiras.map((r) => (
          <LinhaEntrada key={r.pagamento_id} r={r} />
        ))}
      </ul>

      {resto.length > 0 && (
        <details className="group border-t border-line">
          <summary
            className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-caption
              font-medium text-ink-2 transition-colors duration-fast ease-soft
              hover:bg-surface-2 hover:text-ink [&::-webkit-details-marker]:hidden"
          >
            <Seta className="h-3 w-3 transition-transform duration-base ease-soft group-open:rotate-90" />
            Ver mais {resto.length}
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {resto.map((r) => (
              <LinhaEntrada key={r.pagamento_id} r={r} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

// ------------------------------------------------------------
// Faixas de atraso
// ------------------------------------------------------------

/**
 * As cinco faixas, como filtro e como distribuição na mesma peça.
 *
 * Gráfico separado obrigaria olhar em um lugar e clicar em outro. O aging das
 * referências de contas a receber é exatamente esta leitura, e aqui ele já é o
 * controle da tabela logo abaixo.
 */
export function FaixasAtraso({
  linhas,
  total,
}: {
  linhas: { valor: string; curto: string; href: string; ativo: boolean; valor_centavos: number; parcelas: number }[];
  total: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {linhas.map((f) => (
        <Link
          key={f.valor}
          href={f.href}
          scroll={false}
          aria-current={f.ativo ? "true" : undefined}
          className={`rounded-lg border px-3 py-2 transition-colors duration-fast ease-soft
            ${
              f.ativo
                ? "border-ink bg-surface-2"
                : "border-line bg-surface hover:border-line-strong hover:bg-surface-2"
            }`}
        >
          <span className="label block text-muted">{f.curto}</span>
          <span data-nums className="block text-body-sm font-semibold tabular-nums">
            {reais(f.valor_centavos)}
          </span>
          <span className="mt-1 block">
            <Barra parte={f.valor_centavos} total={total || 1} />
          </span>
          <span data-nums className="mt-1 block text-caption text-muted">
            {f.parcelas} {f.parcelas === 1 ? "Parcela" : "Parcelas"} ·{" "}
            {pct(f.valor_centavos, total)}%
          </span>
        </Link>
      ))}
    </div>
  );
}

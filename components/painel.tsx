import Link from "next/link";
import { capitalizarNome, reais } from "@/lib/formato";
import { pct, type ResumoProduto } from "@/lib/painel";
import { Seta, Voltar as SetaVoltar } from "./icones";

/**
 * Peças da área de gestão.
 *
 * Todas são componentes de servidor de propósito: a planilha é grande e nada
 * aqui precisa de estado. Interatividade fica nas duas ilhas que realmente
 * precisam, o formulário de baixa e o menu do celular.
 *
 * Densidade diferente da área do aluno, mesmos tokens. Lá o aluno está
 * comprando; aqui alguém está trabalhando e quer caber mais linha na tela.
 */

// ------------------------------------------------------------
// Números
// ------------------------------------------------------------

/**
 * Número grande com rótulo. O tom `alerta` existe para um caso só: dinheiro
 * vencido. É o único número da tela que muda de cor, e é por isso que ele
 * chama atenção.
 */
export function Kpi({
  rotulo,
  valor,
  nota,
  tom = "normal",
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  tom?: "normal" | "alerta" | "marca";
}) {
  const cor = {
    normal: "text-ink",
    alerta: "text-danger",
    marca: "text-brand-deep",
  }[tom];

  return (
    <div className="flex flex-col gap-1 px-4 py-3.5">
      <p className="label text-muted">{rotulo}</p>
      <p data-nums className={`text-num font-semibold ${cor}`}>
        {valor}
      </p>
      {nota && <p className="text-caption leading-snug text-muted">{nota}</p>}
    </div>
  );
}

/** Faixa de KPIs. Divisória entre eles em vez de card por número. */
export function Kpis({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid grid-cols-2 divide-line rounded-lg border border-line bg-surface
        shadow-card sm:grid-cols-4 sm:divide-x [&>*]:border-b [&>*]:border-line
        sm:[&>*]:border-b-0 [&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(odd)]:border-r-0
        [&>*:nth-last-child(-n+2)]:border-b-0"
    >
      {children}
    </div>
  );
}

/**
 * Barra de progresso. Sempre acompanhada do número em texto: barra sozinha
 * comunica "mais ou menos", e cobrança não se faz com mais ou menos.
 *
 * Trilho em `line`, e não em `surface-2`. O tom anterior era quase invisível no
 * branco do card, então só o pedaço preenchido aparecia, e logo abaixo de um
 * número grande ele lia como sublinhado do número. Com o trilho à mostra, a
 * peça volta a ser medidor.
 */
export function Barra({
  parte,
  total,
  tom = "ink",
}: {
  parte: number;
  total: number;
  tom?: "ink" | "success";
}) {
  const p = pct(parte, total);
  const cor = tom === "success" ? "bg-success" : "bg-ink";

  return (
    <div
      role="progressbar"
      aria-valuenow={p}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progresso"
      className="h-1 w-full overflow-hidden rounded-full bg-line"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-slow ease-soft ${cor}`}
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

/** Dinheiro em coluna. Zero fica apagado, mas não some: some vira dúvida. */
export function Valor({
  centavos,
  tom = "normal",
}: {
  centavos: number;
  tom?: "normal" | "forte" | "alerta";
}) {
  const cor =
    centavos === 0
      ? "text-faint"
      : { normal: "text-ink-2", forte: "text-ink font-semibold", alerta: "text-danger font-semibold" }[
          tom
        ];

  return (
    <span data-nums className={`whitespace-nowrap tabular-nums ${cor}`}>
      {reais(centavos)}
    </span>
  );
}

// ------------------------------------------------------------
// Navegação de contexto
// ------------------------------------------------------------

/** Trilha. É ela que diz em que cliente e em que campanha a pessoa está. */
export function Migalha({
  itens,
}: {
  itens: { texto: string; href?: string }[];
}) {
  return (
    <nav aria-label="Trilha" className="flex flex-wrap items-center gap-1 text-caption">
      {itens.map((item, i) => (
        <span key={item.texto + i} className="flex items-center gap-1">
          {i > 0 && <Seta className="h-3 w-3 text-faint" />}
          {item.href ? (
            <Link
              href={item.href}
              className="text-muted transition-colors duration-fast ease-soft hover:text-ink"
            >
              {item.texto}
            </Link>
          ) : (
            <span className="font-medium text-ink-2">{item.texto}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/**
 * A busca é o único pedaço do painel que precisa de estado no navegador, então
 * mora sozinha em `busca.tsx`, atrás de `"use client"`. Reexportada aqui para
 * as telas continuarem importando tudo do mesmo lugar.
 */
export { Busca } from "./busca";

/**
 * Filtros como link, não como botão de estado.
 *
 * Cada filtro é uma URL. Mesmo motivo da busca: dá para mandar para alguém
 * "abre a lista dos atrasados da 3B" e a pessoa cai exatamente ali.
 */
export function Chips({
  opcoes,
}: {
  opcoes: { texto: string; href: string; ativo: boolean; contagem?: number }[];
}) {
  // Uma linha só, que rola de lado quando não cabe. Quebrar em duas fileiras
  // empurra a lista para baixo e faz a segunda linha parecer outro grupo de
  // filtros. Rolar é o gesto que o dedo já espera numa faixa de filtros.
  return (
    <div className="sem-barra -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
      {opcoes.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          scroll={false}
          aria-current={o.ativo ? "true" : undefined}
          className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border
            px-2.5 text-caption font-medium transition-colors duration-fast ease-soft
            ${
              o.ativo
                ? "border-ink bg-ink text-white"
                : "border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-surface-2"
            }`}
        >
          {o.texto}
          {o.contagem !== undefined && (
            <span
              data-nums
              className={o.ativo ? "text-white/70" : "text-muted"}
            >
              {o.contagem}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

/**
 * Abas de tela. O nível de cima da navegação dentro de uma página.
 *
 * Sublinhado, e não segmento em caixa cinza: esse desenho fica para as sub-abas
 * (`SubAbas`), um nível abaixo. Se os dois fossem iguais, a tela teria duas
 * fileiras de links parecidos e ninguém saberia qual manda em qual.
 *
 * Cada aba é uma URL, como todo filtro do painel: dá para mandar "olha as turmas
 * da Formatura 2026" e a pessoa cai exatamente ali, e o voltar do navegador
 * desfaz a troca.
 */
export function Abas({
  opcoes,
  acao,
  atraso,
}: {
  opcoes: { texto: string; href: string; ativo: boolean; contagem?: number }[];
  /** O que fica na ponta direita da faixa, normalmente uma busca. */
  acao?: React.ReactNode;
  atraso?: number;
}) {
  return (
    <div
      className="entra flex flex-wrap items-end justify-between gap-x-4 gap-y-2
        border-b border-line"
      style={atraso ? ({ "--atraso": `${atraso}ms` } as React.CSSProperties) : undefined}
    >
      <div className="sem-barra -mb-px flex w-full min-w-0 max-w-full items-center gap-1
        overflow-x-auto sm:w-auto">
        {opcoes.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            scroll={false}
            aria-current={o.ativo ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-body-sm
              transition-colors duration-fast ease-soft
              ${
                o.ativo
                  ? "border-ink font-semibold text-ink"
                  : "border-transparent font-medium text-muted hover:text-ink"
              }`}
          >
            {o.texto}
            {o.contagem !== undefined && (
              <span data-nums className="ml-2 text-caption text-faint">
                {o.contagem}
              </span>
            )}
          </Link>
        ))}
      </div>
      {acao && (
        <div className="mb-1.5 flex min-w-0 flex-1 items-center justify-end gap-2">{acao}</div>
      )}
    </div>
  );
}

/**
 * Sub-abas. Um nível abaixo das abas principais, e com desenho diferente.
 *
 * Aba principal é sublinhado; sub-aba é segmento dentro de uma caixa cinza.
 * Se as duas fossem iguais, a tela teria duas fileiras de links parecidos e
 * ninguém saberia qual manda em qual.
 */
export function SubAbas({
  opcoes,
}: {
  opcoes: { texto: string; href: string; ativo: boolean; contagem?: number }[];
}) {
  return (
    <div className="inline-flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-lg bg-surface-2 p-0.5">
      {opcoes.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          scroll={false}
          aria-current={o.ativo ? "page" : undefined}
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md
            px-3 text-caption transition-colors duration-fast ease-soft
            ${
              o.ativo
                ? "bg-surface font-semibold text-ink shadow-card"
                : "font-medium text-muted hover:text-ink"
            }`}
        >
          {o.texto}
          {o.contagem !== undefined && (
            <span data-nums className={o.ativo ? "text-muted" : "text-faint"}>
              {o.contagem}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

/**
 * Cabeçalho de tela. Título, trilha e ações na mesma linha no desktop.
 *
 * A seta de voltar é redundante com a trilha no desktop e não é no celular: lá
 * a trilha quebra em duas linhas de texto miúdo e ninguém acerta o alvo com o
 * dedo. A seta é um alvo de 40px, sempre no mesmo canto, e leva um nível acima.
 */
export function Topo({
  migalha,
  titulo,
  subtitulo,
  acoes,
  voltar,
}: {
  migalha?: { texto: string; href?: string }[];
  titulo: string;
  subtitulo?: React.ReactNode;
  acoes?: React.ReactNode;
  /** Um nível acima. Sem isto a seta não aparece. */
  voltar?: string;
}) {
  return (
    <header className="entra relative z-30 flex flex-col gap-3">
      {migalha && <Migalha itens={migalha} />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {voltar && (
            <Link
              href={voltar}
              aria-label="Voltar"
              className="-ml-2 mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md
                text-muted transition-colors duration-fast ease-soft hover:bg-surface-2
                hover:text-ink"
            >
              <SetaVoltar className="h-[18px] w-[18px]" />
            </Link>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <h1>{titulo}</h1>
            {subtitulo && <div className="text-body-sm text-muted">{subtitulo}</div>}
          </div>
        </div>
        {acoes && <div className="ml-auto flex flex-wrap items-center gap-2">{acoes}</div>}
      </div>
    </header>
  );
}

/**
 * Contagem com o percentual entre parênteses.
 *
 * "218 61%" grudados eram dois números do mesmo tamanho disputando quem é o
 * dado. O parêntese resolve na leitura: o que conta é a contagem, o percentual
 * é a qualificação dela, e vai menor e em `muted`.
 */
export function Quitados({ pagos, total }: { pagos: number; total: number }) {
  return (
    <span data-nums className="whitespace-nowrap">
      <span className="font-semibold text-ink">{pagos}</span>
      {total > 0 && (
        <span className="text-caption text-muted"> ({pct(pagos, total)}%)</span>
      )}
    </span>
  );
}

/**
 * Bloco que abre e fecha, com a mesma casca do `Bloco`.
 *
 * Serve para o que é consulta, não acompanhamento: o resumo de corte interessa
 * no dia do corte e atrapalha nos outros trinta. Fechado ele ocupa uma linha e
 * já entrega o número que responde de longe ("214 peças"); aberto entrega a
 * tabela inteira.
 *
 * `details` nativo: abre sem JavaScript, o navegador cuida do teclado, e o
 * triângulo padrão sai porque ele é a única coisa da tela que não obedece ao
 * design do resto.
 */
export function Retratil({
  titulo,
  resumo,
  aberto,
  children,
  atraso,
}: {
  titulo: string;
  /** O que se lê com o bloco fechado. */
  resumo?: React.ReactNode;
  aberto?: boolean;
  children: React.ReactNode;
  atraso?: number;
}) {
  return (
    <details
      open={aberto}
      className="entra group overflow-hidden rounded-lg border border-line bg-surface shadow-card"
      style={atraso ? ({ "--atraso": `${atraso}ms` } as React.CSSProperties) : undefined}
    >
      <summary
        className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5
          transition-colors duration-fast ease-soft hover:bg-surface-2
          group-open:border-b group-open:border-line [&::-webkit-details-marker]:hidden"
      >
        <Seta
          className="h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-base
            ease-soft group-open:rotate-90"
        />
        <h2 className="text-h3">{titulo}</h2>
        {resumo && (
          <span className="ml-auto truncate text-caption text-muted">{resumo}</span>
        )}
      </summary>
      {children}
    </details>
  );
}

/**
 * Quanto de cada produto foi pedido, e quanto disso está pago.
 *
 * É a pergunta que ninguém conseguia responder sem abrir turma por turma:
 * quantas camisas e quantos moletons a campanha vendeu. Peça e pedido são
 * contagens diferentes de propósito, quantidade maior que um faz os
 * dois números se descolarem, e quem vai comprar tecido precisa do de peças.
 */
export function ResumoProdutos({ linhas }: { linhas: ResumoProduto[] }) {
  return (
    <div>
      <div className="label hidden grid-cols-[minmax(0,1.5fr)_0.7fr_0.9fr_1fr] gap-5 border-b
        border-line bg-surface-2 px-4 py-2 text-center font-semibold text-muted md:grid">
        <span className="text-left">Produto</span>
        <span>Peças</span>
        <span>Quitados</span>
        <span>Em aberto</span>
      </div>
      <ul className="divide-y divide-line">
        {linhas.map((l) => (
          <li
            key={l.produto}
            className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1.5fr)_0.7fr_0.9fr_1fr]
              md:items-center md:gap-5"
          >
            <h3 className="col-span-2 min-w-0 truncate text-body-sm font-semibold md:col-span-1">
              {capitalizarNome(l.produto)}
            </h3>
            <div className="text-left md:text-center">
              <span className="label block text-muted md:hidden">Peças</span>
              <span data-nums className="text-body-sm font-semibold text-ink">{l.pecas}</span>
            </div>
            <div className="text-right md:text-center">
              <span className="label block text-muted md:hidden">Quitados</span>
              <span data-nums className="text-body-sm font-semibold text-ink">
                {l.pagos} de {l.pedidos}
              </span>
              {" "}
              <span data-nums className="text-caption text-muted">
                ({pct(l.pagos, l.pedidos)}%)
              </span>
            </div>
            <div className="col-span-2 flex items-baseline justify-between border-t border-line pt-2
              md:col-span-1 md:flex-col md:items-center md:border-0 md:pt-0">
              <span className="label text-muted md:hidden">Em aberto</span>
              <span data-nums className="text-body-sm">
                <span className="font-semibold text-ink">{l.faltando}</span>
                <span className="text-muted"> · </span>
                <Valor centavos={l.a_receber_centavos} tom="forte" />
              </span>
              {l.atrasados > 0 && (
                <span data-nums className="text-caption text-danger">
                  {l.atrasados} {l.atrasados === 1 ? "Pedido vencido" : "Pedidos vencidos"}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Card de seção. Título na borda, conteúdo colado nela. */
export function Bloco({
  titulo,
  acao,
  children,
  atraso,
}: {
  titulo: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
  atraso?: number;
}) {
  return (
    <section
      className="entra overflow-hidden rounded-lg border border-line bg-surface shadow-card"
      style={atraso ? ({ "--atraso": `${atraso}ms` } as React.CSSProperties) : undefined}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <h2 className="text-h3">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

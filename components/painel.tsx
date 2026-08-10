import Link from "next/link";
import { reais } from "@/lib/formato";
// De `lib/planilha`, não de `lib/painel`: `Valor` e `Barra` são usados também
// pela planilha, que roda no navegador, e `lib/painel` traz o cliente Supabase
// junto. Importar dali arrastaria o banco (e a chave de serviço) para o bundle.
import { pct } from "@/lib/planilha";
import { Seta } from "./icones";

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
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
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
 * Busca. Formulário GET puro, sem estado e sem JS.
 *
 * Custa uma tecla a mais (Enter) e ganha: funciona com o navegador desligado,
 * o resultado é uma URL que dá para mandar no WhatsApp, e o botão voltar
 * desfaz a busca. Busca ao vivo só compensaria se a lista fosse grande, e a
 * maior aqui tem algumas dezenas de linhas.
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
  escondidos?: Record<string, string | undefined>;
}) {
  return (
    <form className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs">
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
        defaultValue={valor ?? ""}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-body-sm
          text-ink outline-none transition-[border-color,box-shadow] duration-base ease-soft
          placeholder:text-faint focus:border-brand-deep
          focus:shadow-[0_0_0_3px_rgb(15_168_188_/_0.16)]"
      />
    </form>
  );
}

/*
 * `Chips` e `SubAbas` moraram aqui e foram para `planilha-cliente`. Lá eles
 * trocam a URL sem ir ao servidor, e eram os únicos dois lugares que usavam
 * esses controles. Manter uma cópia de servidor sem ninguém chamando só criaria
 * a dúvida de qual das duas está valendo.
 */

/** Cabeçalho de tela. Título, trilha e ações na mesma linha no desktop. */
export function Topo({
  migalha,
  titulo,
  subtitulo,
  acoes,
}: {
  migalha?: { texto: string; href?: string }[];
  titulo: string;
  subtitulo?: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  return (
    <header className="entra flex flex-col gap-3">
      {migalha && <Migalha itens={migalha} />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1>{titulo}</h1>
          {subtitulo && <div className="text-body-sm text-muted">{subtitulo}</div>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </div>
    </header>
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

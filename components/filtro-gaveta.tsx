import Link from "next/link";
import { PERIODOS, type Periodo } from "@/lib/contas";
import { Gaveta } from "./gaveta";

/**
 * Filtros do Financeiro, num botão só.
 *
 * A versão anterior espalhava período em fileira de chips, e chip é navegação:
 * lido como aba, competindo com as abas de verdade da tela. Filtro é escolha
 * ocasional, então mora atrás de um botão que mostra quantos estão ativos, e a
 * tela fica com espaço para o dado.
 *
 * Cascata sem JavaScript: cada opção é um link que recarrega a gaveta aberta. Ao
 * escolher a escola, a seção de turma aparece já com as turmas dela, porque o
 * servidor recebeu a escolha na URL. Trocar de escola limpa a turma, senão sobra
 * um filtro de turma que não pertence à escola escolhida.
 */

export type Opcao = { id: string; nome: string; extra?: string };

export function BotaoFiltros({ href, ativos }: { href: string; ativos: number }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`inline-flex h-10 items-center gap-2 rounded-md border px-3.5 text-body-sm
        font-medium transition-colors duration-fast ease-soft
        ${
          ativos > 0
            ? "border-ink bg-ink text-white hover:opacity-90"
            : "border-line-strong bg-surface text-ink-2 hover:border-ink hover:text-ink"
        }`}
    >
      Filtros
      {ativos > 0 && (
        <span
          data-nums
          className="flex size-5 items-center justify-center rounded-full bg-white/20 text-caption"
        >
          {ativos}
        </span>
      )}
    </Link>
  );
}

/** Uma seção da gaveta. Botão por opção, o escolhido em preto. */
function Secao({
  titulo,
  vazio,
  opcoes,
  escolhido,
  href,
  limpar,
}: {
  titulo: string;
  vazio?: string;
  opcoes: Opcao[];
  escolhido?: string;
  href: (id: string | undefined) => string;
  limpar?: string;
}) {
  return (
    <section className="flex flex-col gap-2 border-t border-line px-4 py-4 first:border-t-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="label text-muted">{titulo}</h3>
        {escolhido && limpar && (
          <Link
            href={href(undefined)}
            scroll={false}
            className="text-caption text-ink-2 underline-offset-2 hover:underline"
          >
            {limpar}
          </Link>
        )}
      </div>

      {opcoes.length === 0 ? (
        <p className="text-caption text-muted">{vazio}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {opcoes.map((o) => (
            <Link
              key={o.id}
              href={href(o.id === escolhido ? undefined : o.id)}
              scroll={false}
              aria-current={o.id === escolhido ? "true" : undefined}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5
                text-caption font-medium transition-colors duration-fast ease-soft
                ${
                  o.id === escolhido
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-surface-2"
                }`}
            >
              {o.nome}
              {o.extra && (
                <span data-nums className={o.id === escolhido ? "text-white/70" : "text-muted"}>
                  {o.extra}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function FiltroGaveta({
  fechar,
  periodo,
  clientes,
  campanhas,
  turmas,
  escolhido,
  url,
  comPeriodo = true,
}: {
  fechar: string;
  periodo: Periodo;
  clientes: Opcao[];
  /** Campanhas da escola escolhida. Vazio antes de escolher a escola. */
  campanhas: Opcao[];
  /** Turmas da campanha escolhida. */
  turmas: Opcao[];
  escolhido: { cliente?: string; campanha?: string; turma?: string };
  /** Monta o endereço com a gaveta ainda aberta. */
  url: (extra: {
    periodo?: Periodo;
    cliente?: string;
    campanha?: string;
    turma?: string;
  }) => string;
  /**
   * Dentro de uma campanha o período continua valendo, mas escola e campanha já
   * estão decididas pela rota, então só turma aparece.
   */
  comPeriodo?: boolean;
}) {
  return (
    <Gaveta
      rotulo="Filtros do financeiro"
      titulo="Filtros"
      subtitulo="Valem para os cartões, o gráfico e a lista."
      fechar={fechar}
    >
      <div className="flex flex-col">
        {comPeriodo && (
          <Secao
            titulo="Período"
            opcoes={Object.entries(PERIODOS).map(([id, o]) => ({ id, nome: o.texto }))}
            escolhido={periodo}
            href={(id) => url({ periodo: (id as Periodo) ?? "30" })}
          />
        )}

        {clientes.length > 0 && (
          <Secao
            titulo="Escola"
            opcoes={clientes}
            escolhido={escolhido.cliente}
            limpar="Todas"
            // Trocar de escola derruba campanha e turma: filtro de turma que não
            // pertence à escola escolhida devolveria lista vazia sem explicar.
            href={(id) => url({ cliente: id, campanha: undefined, turma: undefined })}
          />
        )}

        {escolhido.cliente && (
          <Secao
            titulo="Campanha"
            vazio="Esta escola não tem campanha cadastrada."
            opcoes={campanhas}
            escolhido={escolhido.campanha}
            limpar="Todas"
            href={(id) => url({ campanha: id, turma: undefined })}
          />
        )}

        {(escolhido.campanha || turmas.length > 0) && (
          <Secao
            titulo="Turma"
            vazio="Esta campanha não tem turma cadastrada."
            opcoes={turmas}
            escolhido={escolhido.turma}
            limpar="Todas"
            href={(id) => url({ turma: id })}
          />
        )}

        <div className="border-t border-line px-4 py-4">
          <Link
            href={fechar}
            scroll={false}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-ink
              px-3.5 text-body-sm font-medium text-white transition-opacity duration-fast
              ease-soft hover:opacity-90 active:scale-[0.99]"
          >
            Ver resultado
          </Link>
        </div>
      </div>
    </Gaveta>
  );
}

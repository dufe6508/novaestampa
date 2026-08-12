import Link from "next/link";
import {
  buscarClienteCadastro,
  campanhaEmDestaque,
  data,
  listarTodasCampanhas,
  listarClientes,
  pct,
  reais,
  type CampanhaResumo,
  type ClienteResumo,
} from "@/lib/painel";
import { Barra, Busca, Topo, Valor } from "@/components/painel";
import { SeloCampanha } from "@/components/selo";
import { Arquivar, Empresa, Lapis, Lixeira, Mais } from "@/components/icones";
import { Vazio } from "@/components/campos";
import { ClienteGaveta } from "@/components/cliente-gaveta";
import { Confirmar } from "@/components/confirmar";
import { ItemMenu, MenuAcoes } from "@/components/menu-acoes";
import { arquivarCliente, excluirCliente } from "@/app/painel/acoes";

/**
 * E1 · Clientes. Home da gestão.
 *
 * A tela responde três perguntas, nesta ordem, que é a ordem em que elas vêm:
 * com quem eu trabalho, o que está rolando com cada um, e onde tem dinheiro
 * parado. Por isso o card carrega a campanha em andamento junto: o clique entra
 * nela, e sem o nome ali a pessoa clica sem saber onde vai cair.
 *
 * A coluna da direita soma a empresa inteira. É a mesma forma que reaparece
 * dentro do cliente somando só a campanha, e dentro da turma somando só a
 * turma: o total muda de escopo, nunca de desenho.
 *
 * Criar cliente abre em gaveta (`?novo=1`), não em página. São cinco campos e
 * quem cadastra quer voltar para a lista, ou seguir direto para a campanha.
 */

const TIPO: Record<ClienteResumo["tipo"], string> = {
  escola: "Escola",
  faculdade: "Faculdade",
  empresa: "Empresa",
  outro: "Cliente",
};

/**
 * Contexto do cliente numa linha só: o que ele é, onde fica, e o que está
 * rolando com ele.
 *
 * O rótulo do grupo vem da campanha, não é fixo: a Metalúrgica Vega mostra
 * "3 setores" e a escola mostra "12 turmas". O schema já carrega
 * `label_grupo_plural` justamente para o sistema servir aos três mercados.
 *
 * Junta cinco fatos numa frase em vez de cinco blocos rotulados. Rótulo em
 * caixa alta para dizer "Pedidos" acima de um número é o vício que faz painel
 * parecer template: gasta uma linha inteira para nomear o que o próprio dado já
 * diz.
 */
function Contexto({
  cliente,
  campanha,
}: {
  cliente: ClienteResumo;
  campanha: CampanhaResumo | null;
}) {
  const partes = [TIPO[cliente.tipo], cliente.cidade].filter(Boolean);

  if (campanha) {
    partes.push(campanha.nome);
    // Espaço rígido entre o número e a unidade: sem ele a linha quebra em
    // "3" numa linha e "turmas" sozinho na outra, que é a quebra mais feia que
    // existe num card.
    partes.push(
      `${campanha.grupos} ${
        campanha.grupos === 1
          ? campanha.label_grupo.toLowerCase()
          : campanha.label_grupo_plural.toLowerCase()
      }`,
    );
  }

  return (
    <p className="text-caption leading-relaxed text-muted">
      {partes.join(" · ")}
      {!campanha && (partes.length ? " · " : "") + "sem campanha"}
    </p>
  );
}

/**
 * Cartão do cliente.
 *
 * Três decisões que tiram o ar de template:
 *
 * · **Um número manda.** Recebido em corpo grande, e o resto (percentual,
 *   total vendido, contagem de pedidos) desce para uma legenda. A versão
 *   anterior dizia a mesma coisa quatro vezes: valor, "de X", percentual e
 *   barra, todos do mesmo tamanho, e nenhum ganhava.
 *
 * · **Selo só na exceção.** Campanha aberta é o normal e não precisa de aviso;
 *   quem precisa aparecer é encerrada ou concluída. Assim
 *   some o ponto colorido de quatro em quatro cards e sobra atenção para o que
 *   é fora do padrão.
 *
 * · **Sem sombra.** É o que o token do projeto sempre mandou ("card em lista é
 *   borda, não sombra") e o que o card não fazia. Fica a borda de 1px, e o
 *   hover escurece o traço em vez de levantar a peça do papel.
 *
 * Vermelho continua sendo só do dinheiro vencido, que é a única coisa da tela
 * que exige alguém fazer algo hoje.
 */
function CartaoCliente({
  cliente,
  campanha,
  atraso,
  editar,
  arquivar,
  excluir,
}: {
  cliente: ClienteResumo;
  campanha: CampanhaResumo | null;
  atraso: number;
  /** Destinos já com a busca preservada. */
  editar: string;
  arquivar: string;
  excluir: string;
}) {
  const prazo = campanha?.status === "aberta" ? data(campanha.prazo_pedidos) : null;
  const vencido = cliente.atrasado_centavos > 0;

  return (
    /**
     * O cartão inteiro é clicável sem ser um `<a>` gigante: o link do nome se
     * estica por cima de tudo com `after:inset-0`. Isso resolve o problema que
     * o lápis criou, um link dentro de outro link é HTML inválido e o navegador
     * desmonta a página do jeito dele.
     *
     * O lápis fica acima da camada esticada (`z-10`) e continua clicável.
     */
    <li
      className="entra group relative flex flex-col gap-5 rounded-lg border border-line
        bg-surface p-5 transition-colors duration-base ease-soft
        focus-within:border-ink-2 hover:border-ink-2 has-[details[open]]:z-30"
      style={{ "--atraso": `${atraso}ms` } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-h3 leading-snug">
            <Link
              href={`/painel/cliente/${cliente.id}`}
              className="rounded-sm after:absolute after:inset-0 after:content-['']
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-brand-deep"
            >
              {cliente.nome}
            </Link>
          </h2>
          <Contexto cliente={cliente} campanha={campanha} />
        </div>

        <div className="relative z-10 -mr-1.5 -mt-1.5 flex shrink-0 items-center">
          <Link
            href={editar}
            scroll={false}
            aria-label={`Editar ${cliente.nome}`}
            className="flex size-9 items-center justify-center rounded-md border
              border-line-strong bg-surface text-ink-2 transition-colors duration-fast ease-soft
              hover:border-ink hover:bg-surface-2 hover:text-ink focus-visible:outline
              focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-brand-deep"
          >
            <Lapis className="h-4 w-4" />
          </Link>

          <MenuAcoes rotulo={`Mais ações de ${cliente.nome}`}>
            <ItemMenu href={arquivar} icone={<Arquivar className="h-4 w-4" />}>
              {cliente.arquivado_em ? "Desarquivar" : "Arquivar"}
            </ItemMenu>
            <ItemMenu
              href={excluir}
              icone={<Lixeira className="h-4 w-4" />}
              tom="perigo"
            >
              Excluir cliente
            </ItemMenu>
          </MenuAcoes>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <span data-nums className="text-num-lg font-semibold tracking-tight">
            {reais(cliente.recebido_centavos)}
          </span>
          <span data-nums className="text-body-sm text-muted">
            {pct(cliente.recebido_centavos, cliente.vendido_centavos)}%
          </span>
        </div>

        <Barra parte={cliente.recebido_centavos} total={cliente.vendido_centavos} />

        <p className="text-caption text-muted">
          <span data-nums>De {reais(cliente.vendido_centavos)}</span>
          {" · "}
          <span data-nums>{cliente.pedidos}</span>{" "}
          {cliente.pedidos === 1 ? "Pedido" : "Pedidos"}
          {prazo && (
            <>
              {" · "}
              <span data-nums>até {prazo}</span>
            </>
          )}
        </p>
      </div>

      {/*
        O selo desceu para cá quando o lápis ocupou o canto de cima. Estados
        encerrados ficam próximos do resumo financeiro, sem competir com o nome.
      */}
      <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
        <p className="text-body-sm">
          {vencido ? (
            <>
              <Valor centavos={cliente.atrasado_centavos} tom="alerta" />{" "}
              <span className="text-muted">em atraso</span>
            </>
          ) : (
            <span className="text-muted">Nada vencido</span>
          )}
        </p>
        {/* Aberta é o esperado, então não vira selo. Ver o comentário acima. */}
        {campanha && campanha.status !== "aberta" && (
          <SeloCampanha status={campanha.status} />
        )}
      </div>
    </li>
  );
}

/**
 * Bloco da coluna da direita. Um número grande e o que o explica embaixo.
 *
 * O bloco de atraso já teve fundo rosa e borda vermelha. Saiu: painel inteiro
 * pintado é decoração, e ainda competia com o vermelho dos cartões, que é o
 * que realmente aponta onde agir. Ficou o número na cor de alerta, dentro da
 * mesma caixa branca dos outros. A cor marca o dado, não a moldura.
 */
function Total({
  rotulo,
  valor,
  tom = "normal",
  children,
}: {
  rotulo: string;
  valor: string;
  tom?: "normal" | "alerta";
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-4">
      <p className="text-caption text-muted">{rotulo}</p>
      <p
        data-nums
        className={`text-num-lg font-semibold tracking-tight ${
          tom === "alerta" ? "text-danger" : "text-ink"
        }`}
      >
        {valor}
      </p>
      {children}
    </div>
  );
}

/** Linha miúda de apoio dentro do bloco de total. */
function Apoio({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-caption">
      <span className="text-muted">{rotulo}</span>
      <span data-nums className="font-medium text-ink-2">
        {valor}
      </span>
    </div>
  );
}

export default async function Clientes({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    novo?: string;
    editar?: string;
    arquivar?: string;
    excluir?: string;
    arquivados?: string;
  }>;
}) {
  const { q, novo, editar, arquivar, excluir, arquivados } = await searchParams;
  const vendoArquivados = arquivados === "1";

  // Uma consulta só serve as três gavetas: só uma delas abre por vez.
  const alvo = editar || arquivar || excluir;

  const [clientes, campanhas, emFoco] = await Promise.all([
    listarClientes(q, arquivados),
    listarTodasCampanhas(),
    alvo ? buscarClienteCadastro(alvo) : null,
  ]);

  // O resumo traz `arquivado_em`, que o cadastro não carrega.
  const naLista = alvo ? clientes.find((c) => c.id === alvo) : undefined;

  // Somas da empresa inteira. Vêm da lista já filtrada de propósito: buscar
  // "Cláudio" e ver o total do Brasil inteiro no lado seria o número mentindo
  // sobre o que está na tela.
  const total = clientes.reduce(
    (t, c) => ({
      vendido: t.vendido + c.vendido_centavos,
      recebido: t.recebido + c.recebido_centavos,
      aReceber: t.aReceber + c.a_receber_centavos,
      atrasado: t.atrasado + c.atrasado_centavos,
      pedidos: t.pedidos + c.pedidos,
    }),
    { vendido: 0, recebido: 0, aReceber: 0, atrasado: 0, pedidos: 0 },
  );

  const comAtraso = clientes.filter((c) => c.atrasado_centavos > 0).length;
  const abertas = clientes.reduce((n, c) => n + c.campanhas_abertas, 0);
  const grupos = campanhas.reduce((n, c) => n + c.grupos, 0);

  // A busca e a aba de arquivados sobrevivem a abrir e fechar gaveta: quem
  // procurou "Cláudio" e clicou no lápis não pode voltar para a lista inteira.
  const estado = [q ? `q=${encodeURIComponent(q)}` : "", vendoArquivados ? "arquivados=1" : ""]
    .filter(Boolean)
    .join("&");
  const comBusca = (extra: string) => `/painel?${[estado, extra].filter(Boolean).join("&")}`;
  const fechar = estado ? `/painel?${estado}` : "/painel";

  return (
    <>
      <Topo
        titulo={vendoArquivados ? "Clientes arquivados" : "Clientes"}
        subtitulo={
          clientes.length > 0
            ? `${clientes.length} ${clientes.length === 1 ? "cliente" : "clientes"} · ${abertas} ${
                abertas === 1 ? "campanha aberta" : "campanhas abertas"
              }${q ? ` · busca por "${q}"` : ""}`
            : undefined
        }
        acoes={
          <>
            <Busca valor={q} placeholder="Buscar cliente" />
            <Link
              href={vendoArquivados ? "/painel" : "/painel?arquivados=1"}
              className="inline-flex h-10 shrink-0 items-center rounded-lg border border-line
                px-3 text-body-sm font-medium text-ink-2 transition-colors duration-fast
                ease-soft hover:border-line-strong hover:text-ink"
            >
              {vendoArquivados ? "Ativos" : "Arquivados"}
            </Link>
            <Link
              href={comBusca("novo=1")}
              scroll={false}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-ink px-3.5
                text-body-sm font-semibold text-white transition-[opacity,transform] duration-fast
                ease-soft hover:opacity-90 active:scale-[0.985] motion-reduce:active:scale-100"
            >
              <Mais className="h-4 w-4" />
              Novo cliente
            </Link>
          </>
        }
      />

      {clientes.length === 0 ? (
        <Vazio
          icone={<Empresa className="h-8 w-8" />}
          titulo={q ? "Nenhum cliente com esse nome" : "Nenhum cliente ainda"}
          texto={
            q
              ? "Confira a escrita ou limpe a busca para ver todos."
              : "Cadastre a escola, faculdade ou empresa e depois crie a campanha dela."
          }
          acao={
            q ? (
              <Link href="/painel" className="text-caption font-semibold text-ink underline">
                Limpar busca
              </Link>
            ) : (
              <Link
                href="/painel?novo=1"
                scroll={false}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-3.5 text-body-sm
                  font-semibold text-white transition-opacity duration-fast ease-soft
                  hover:opacity-90"
              >
                <Mais className="h-4 w-4" />
                Novo cliente
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
          <ul className="grid gap-3 sm:grid-cols-2">
            {clientes.map((c, i) => (
              <CartaoCliente
                key={c.id}
                cliente={c}
                campanha={campanhaEmDestaque(campanhas, c.id)}
                atraso={i * 40}
                editar={comBusca(`editar=${c.id}`)}
                arquivar={comBusca(`arquivar=${c.id}`)}
                excluir={comBusca(`excluir=${c.id}`)}
              />
            ))}
          </ul>

          <aside
            aria-label="Totais da empresa"
            className="entra flex flex-col gap-3 lg:sticky lg:top-6"
            style={{ "--atraso": "120ms" } as React.CSSProperties}
          >
            <Total rotulo="Recebido" valor={reais(total.recebido)}>
              <Barra parte={total.recebido} total={total.vendido} />
              <Apoio
                rotulo={`de ${reais(total.vendido)}`}
                valor={`${pct(total.recebido, total.vendido)}%`}
              />
            </Total>

            <Total rotulo="Em atraso" valor={reais(total.atrasado)} tom="alerta">
              <Apoio
                rotulo="clientes afetados"
                valor={`${comAtraso} de ${clientes.length}`}
              />
            </Total>

            <Total rotulo="A receber" valor={reais(total.aReceber)}>
              <Apoio rotulo="Pedidos" valor={total.pedidos} />
              <Apoio rotulo="Turmas" valor={grupos} />
            </Total>
          </aside>
        </div>
      )}

      {/* Gaveta some se o id não existir: link velho não deixa a tela travada. */}
      {novo && !alvo && <ClienteGaveta fechar={fechar} />}
      {editar && emFoco && <ClienteGaveta cliente={emFoco} fechar={fechar} />}

      {arquivar && emFoco && (
        <Confirmar
          titulo={naLista?.arquivado_em ? "Desarquivar cliente" : "Arquivar cliente"}
          subtitulo={emFoco.nome}
          tom="atencao"
          consequencia={
            naLista?.arquivado_em
              ? "Volta para a lista de clientes. Nada mais muda."
              : "Sai da lista de clientes. Campanhas, pedidos e pagamentos continuam como estão, e dá para desarquivar depois."
          }
          acao={arquivarCliente}
          botao={naLista?.arquivado_em ? "Desarquivar" : "Arquivar"}
          pendenteTexto="Salvando…"
          ocultos={{
            cliente_id: emFoco.id,
            arquivar: naLista?.arquivado_em ? "0" : "1",
            voltar: fechar,
          }}
          fechar={fechar}
        />
      )}

      {excluir && emFoco && (
        <Confirmar
          titulo="Excluir cliente"
          subtitulo={emFoco.nome}
          consequencia={
            <>
              Apaga o cliente, as campanhas dele e as turmas dentro delas. Não tem
              como desfazer. Cliente com pedido não pode ser excluído.
            </>
          }
          acao={excluirCliente}
          botao="Excluir para sempre"
          pendenteTexto="Excluindo…"
          ocultos={{ cliente_id: emFoco.id }}
          fechar={fechar}
        />
      )}
    </>
  );
}

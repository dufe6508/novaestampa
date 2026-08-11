import { situacaoProduto } from "@/app/painel/acoes";
import { PREFIXO_BABY_LOOK, reais, type ProdutoCadastro } from "@/lib/painel";
import { imagemUrl } from "@/lib/supabase";
import { Camiseta, Lapis, Lixeira, OlhoCortado, Pausa, Play } from "./icones";
import { AcaoIcone, ItemMenu, MenuAcoes } from "./menu-acoes";
import { ItemMenuAcao } from "./menu-acao";
import { SeloProduto } from "./selo";

/**
 * E7 · os produtos da campanha, em lista.
 *
 * Lista e não grade de cartões: aqui a pergunta é operacional, "o que está à
 * venda, por quanto, em que grade", e lista compara linha a linha. A foto entra
 * pequena, só para reconhecer a peça; quem quer ver a foto grande abre a loja.
 *
 * O lápis fica à mostra porque editar é a ação de sempre. O resto mora nos três
 * pontos: pausar, ocultar e excluir são raros, e dois deles perigosos.
 */

const CLASSE: Record<ProdutoCadastro["classe"], string> = {
  camisa: "Camisa",
  moletom: "Moletom",
  polo: "Polo",
  outro: "Outro",
};

function Foto({ produto }: { produto: ProdutoCadastro }) {
  const capa = produto.imagens[0];

  return (
    <div
      className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md
        border border-line bg-surface-2"
    >
      {capa ? (
        <img src={imagemUrl(capa)} alt="" className="h-full w-full object-cover" />
      ) : (
        <Camiseta className="h-5 w-5 text-faint" />
      )}
    </div>
  );
}

/**
 * A grade, em faixa contínua e não em quadradinhos soltos.
 *
 * Tamanho é uma escala, não um punhado de etiquetas: PP → GG lê de uma olhada
 * quando as células se encostam, e cada uma com borda e canto próprios virava
 * confete na linha do produto. É a mesma faixa das quantidades de corte, então
 * grade e corte passam a se parecer, que é o que eles são.
 *
 * Baby look ganha faixa própria porque é outra modelagem, não outro tamanho:
 * junto na mesma régua, "M" e "M baby look" leriam como dois pontos da mesma
 * escala.
 */
function Faixa({ rotulo, tamanhos }: { rotulo?: string; tamanhos: string[] }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {rotulo && <span className="label shrink-0 text-faint">{rotulo}</span>}
      <ul className="flex flex-wrap overflow-hidden rounded-md bg-surface-2">
        {tamanhos.map((t) => (
          <li
            key={t}
            data-nums
            className="border-l border-line px-2 py-0.5 text-caption font-medium text-ink-2
              first:border-l-0"
          >
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Grade({ tamanhos }: { tamanhos: string[] }) {
  const babyLook = tamanhos.filter((t) => t.startsWith(PREFIXO_BABY_LOOK));
  const normais = tamanhos.filter((t) => !t.startsWith(PREFIXO_BABY_LOOK));

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {normais.length > 0 && <Faixa tamanhos={normais} />}
      {babyLook.length > 0 && (
        <Faixa
          rotulo="Baby look"
          tamanhos={babyLook.map((t) => t.slice(PREFIXO_BABY_LOOK.length))}
        />
      )}
    </div>
  );
}

function Linha({ produto, fechar }: { produto: ProdutoCadastro; fechar: string }) {
  const sep = fechar.includes("?") ? "&" : "?";
  const editar = `${fechar}${sep}produto=${produto.id}`;
  const excluir = `${fechar}${sep}excluir_produto=${produto.id}`;

  // As duas situações que ele ainda não está. Oferecer a atual seria um botão
  // que não faz nada.
  const outras = (["a_venda", "pausado", "oculto"] as const).filter(
    (s) => s !== produto.situacao,
  );

  const acaoDeSituacao = {
    a_venda: { texto: "Voltar a vender", icone: <Play className="h-4 w-4" /> },
    pausado: { texto: "Pausar venda", icone: <Pausa className="h-4 w-4" /> },
    oculto: { texto: "Ocultar da loja", icone: <OlhoCortado className="h-4 w-4" /> },
  };

  return (
    <li className="flex items-start gap-3 px-4 py-3.5">
      <Foto produto={produto} />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 className="text-body-sm font-semibold text-ink">{produto.nome}</h3>
          <span className="text-caption text-muted">{CLASSE[produto.classe]}</span>
          <SeloProduto situacao={produto.situacao} />
        </div>

        {produto.tamanhos.length > 0 && <Grade tamanhos={produto.tamanhos} />}

        <p className="text-caption text-muted">
          <span data-nums>{produto.pedidos}</span>{" "}
          {produto.pedidos === 1 ? "pedido" : "pedidos"}
          {produto.max_parcelas > 1 && (
            <>
              {" · até "}
              <span data-nums>{produto.max_parcelas}x</span>
            </>
          )}
          {!produto.exige_nome && " · sem nome bordado"}
          {produto.prazo_pedidos && " · prazo próprio"}
        </p>
      </div>

      <span
        data-nums
        className="shrink-0 self-center text-body-sm font-semibold tabular-nums text-ink"
      >
        {reais(produto.preco_centavos)}
      </span>

      <div className="flex shrink-0 items-center gap-1.5 self-center">
        <AcaoIcone href={editar} rotulo={`Editar ${produto.nome}`}>
          <Lapis className="h-4 w-4" />
        </AcaoIcone>

        <MenuAcoes rotulo={`Mais ações de ${produto.nome}`}>
          <ItemMenu href={editar} icone={<Lapis className="h-4 w-4" />}>
            Editar produto
          </ItemMenu>

          {outras.map((s) => (
            <ItemMenuAcao
              key={s}
              acao={situacaoProduto}
              ocultos={{ produto_id: produto.id, situacao: s, voltar: fechar }}
              icone={acaoDeSituacao[s].icone}
            >
              {acaoDeSituacao[s].texto}
            </ItemMenuAcao>
          ))}

          <ItemMenu href={excluir} icone={<Lixeira className="h-4 w-4" />} tom="perigo">
            Excluir produto
          </ItemMenu>
        </MenuAcoes>
      </div>
    </li>
  );
}

export function ListaProdutos({
  produtos,
  fechar,
}: {
  produtos: ProdutoCadastro[];
  fechar: string;
}) {
  return (
    <ul className="divide-y divide-line">
      {produtos.map((p) => (
        <Linha key={p.id} produto={p} fechar={fechar} />
      ))}
    </ul>
  );
}

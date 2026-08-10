import {
  buscarTurmaPainel,
  listarPedidosDaTurma,
  pecasParaProduzir,
  PREFIXO_BABY_LOOK,
} from "@/lib/painel";
import { planilha, type Aba, type Linha } from "@/lib/planilha/xlsx";
import { sessao } from "@/lib/sessao";

/**
 * Exportação da lista de produção, no modelo que a empresa já usa.
 *
 * Um arquivo, uma aba por tamanho. Tamanho que ninguém pediu não vira aba: a
 * planilha impressa é o papel que vai para a mesa de corte, e folha em branco
 * de um tamanho inexistente só atrapalha.
 *
 * Cada aba é o modelo da empresa: título na linha 1, cabeçalho na linha 2, e as
 * duas colunas de sempre.
 *
 * As duas colunas já vêm preenchidas, e é essa a diferença para a folha antiga.
 * A da esquerda é a assinatura, com o nome completo, que era o que a pessoa
 * escrevia à mão. A da direita é o apelido, o que vai bordado. Quem entrega
 * confere um contra o outro sem precisar perguntar de quem é a peça.
 */

/** Ordem da grade. Tamanho fora dela vai para o fim, na ordem alfabética. */
const ORDEM = ["PP", "P", "M", "G", "GG", "XG", "XGG", "EG"];

function posicao(tamanho: string) {
  const babyLook = tamanho.startsWith(PREFIXO_BABY_LOOK);
  const base = babyLook ? tamanho.slice(PREFIXO_BABY_LOOK.length) : tamanho;
  const i = ORDEM.indexOf(base.toUpperCase());
  // Baby look depois da grade tradicional inteira, na mesma ordem interna.
  return (babyLook ? 100 : 0) + (i === -1 ? 50 : i);
}

/** "BL M" vira "M Baby Look", que é como o modelo original nomeia a aba. */
function nomeDoTamanho(tamanho: string) {
  return tamanho.startsWith(PREFIXO_BABY_LOOK)
    ? `${tamanho.slice(PREFIXO_BABY_LOOK.length)} Baby Look`
    : tamanho;
}

export async function GET(
  pedido: Request,
  { params }: { params: Promise<{ grupoId: string }> },
) {
  const quem = await sessao();
  if (!quem?.id) return new Response("Não autorizado", { status: 404 });

  const { grupoId } = await params;
  const turma = await buscarTurmaPainel(grupoId);
  if (!turma) return new Response("Turma não encontrada", { status: 404 });

  const filtros = new URL(pedido.url).searchParams;
  const busca = filtros.get("q")?.trim().toLowerCase();
  // Um arquivo por produto. Camiseta e moletom são cortados em momentos
  // diferentes, então misturar os dois num papel só é pedir erro na mesa.
  const produto = filtros.get("produto")?.trim();

  const pedidos = await listarPedidosDaTurma(grupoId);
  const pecas = pecasParaProduzir(pedidos)
    .filter((p) => !busca || p.aluno_nome.toLowerCase().includes(busca))
    .filter((p) => !produto || p.produto === produto);

  // Uma aba por tamanho que alguém pediu, na ordem da grade.
  const porTamanho = new Map<string, Linha[]>();
  for (const peca of pecas) {
    const lista = porTamanho.get(peca.tamanho) ?? [];
    // Peça com quantidade maior que um ocupa uma linha por unidade: a lista
    // tem que bater com o número de peças que saem da mesa.
    for (let i = 0; i < peca.quantidade; i++) {
      lista.push({ assinatura: peca.aluno_nome, apelido: peca.nome_estampa });
    }
    porTamanho.set(peca.tamanho, lista);
  }

  const abas: Aba[] = [...porTamanho.entries()]
    .sort((a, b) => posicao(a[0]) - posicao(b[0]))
    .map(([tamanho, linhas]) => ({
      nome: nomeDoTamanho(tamanho),
      linhas: linhas.sort((a, b) => a.assinatura.localeCompare(b.assinatura, "pt-BR")),
    }));

  if (abas.length === 0) {
    return new Response("Nenhuma peça liberada para produção.", { status: 404 });
  }

  const etiqueta = produto ? produto.split(/[\s·,(]+/)[0].toLowerCase() : "producao";
  const arquivo = `${etiqueta}-${turma.grupo.nome}.xlsx`.replace(/[^a-zA-Z0-9.-]/g, "-");

  const bytes = planilha(abas);

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${arquivo}"`,
      "Content-Length": String(bytes.length),
    },
  });
}

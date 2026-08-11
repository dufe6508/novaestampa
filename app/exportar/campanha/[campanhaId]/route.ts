import {
  buscarCampanha,
  listarGrupos,
  listarPedidosDaCampanha,
  pecasParaProduzir,
  posicaoDoTamanho,
  PREFIXO_BABY_LOOK,
} from "@/lib/painel";
import { perfilEmpresa } from "@/lib/empresa";
import { planilha, type Aba, type Linha } from "@/lib/planilha/xlsx";

function nomeDoTamanho(tamanho: string) {
  return tamanho.startsWith(PREFIXO_BABY_LOOK)
    ? `${tamanho.slice(PREFIXO_BABY_LOOK.length)} Baby Look`
    : tamanho;
}

function nomeDeArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Uma planilha, com uma aba por turma, produto e tamanho selecionados. */
export async function GET(
  pedido: Request,
  { params }: { params: Promise<{ campanhaId: string }> },
) {
  if (!(await perfilEmpresa())) return new Response("Não autorizado", { status: 404 });

  const { campanhaId } = await params;
  const campanha = await buscarCampanha(campanhaId);
  if (!campanha) return new Response("Campanha não encontrada", { status: 404 });

  const [grupos, pedidos] = await Promise.all([
    listarGrupos(campanhaId),
    listarPedidosDaCampanha(campanhaId),
  ]);

  const permitidos = new Set(grupos.map((grupo) => grupo.id));
  const solicitados = new Set(
    new URL(pedido.url).searchParams.getAll("grupo").filter((id) => permitidos.has(id)),
  );
  const escolhidos = solicitados.size > 0 ? solicitados : permitidos;
  const abas: Aba[] = [];

  for (const grupo of grupos.filter((item) => escolhidos.has(item.id))) {
    const pecas = pecasParaProduzir(pedidos.filter((item) => item.grupo_id === grupo.id));
    const porProdutoETamanho = new Map<string, { produto: string; tamanho: string; linhas: Linha[] }>();

    for (const peca of pecas) {
      const chave = `${peca.produto}\u0000${peca.tamanho}`;
      const lista = porProdutoETamanho.get(chave) ?? {
        produto: peca.produto,
        tamanho: peca.tamanho,
        linhas: [],
      };

      for (let unidade = 0; unidade < peca.quantidade; unidade++) {
        lista.linhas.push({ assinatura: peca.aluno_nome, apelido: peca.nome_estampa });
      }
      porProdutoETamanho.set(chave, lista);
    }

    const listas = [...porProdutoETamanho.values()].sort(
      (a, b) =>
        a.produto.localeCompare(b.produto, "pt-BR") ||
        posicaoDoTamanho(a.tamanho) - posicaoDoTamanho(b.tamanho),
    );

    for (const lista of listas) {
      abas.push({
        nome: `${grupo.nome} · ${lista.produto} · ${nomeDoTamanho(lista.tamanho)}`,
        linhas: lista.linhas.sort((a, b) => a.assinatura.localeCompare(b.assinatura, "pt-BR")),
      });
    }
  }

  if (abas.length === 0) {
    return new Response("Nenhuma peça liberada nas turmas selecionadas.", { status: 404 });
  }

  const bytes = planilha(abas);
  const arquivo = `producao-${nomeDeArquivo(campanha.nome) || "campanha"}.xlsx`;

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${arquivo}"`,
      "Content-Length": String(bytes.length),
    },
  });
}

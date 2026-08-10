"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, mensagem } from "@/lib/supabase";
import { concederAcesso } from "@/lib/empresa";
import { sessao } from "@/lib/sessao";
import { capitalizarFrase, capitalizarNome } from "@/lib/formato";

/**
 * Escrita da área de gestão.
 *
 * Três regras que valem para tudo aqui:
 *
 * · `pagamento` é append-only. Baixar pagamento é INSERT, nunca UPDATE de valor.
 *   Corrigir um lançamento errado é apagar a linha e lançar de novo, e é a única
 *   coisa que apaga pagamento no sistema inteiro.
 * · Status de pagamento não é gravado em lugar nenhum. Ele é derivado das views.
 *   Marcar alguém como "pago" é inserir um pagamento do valor que falta.
 * · Toda ação devolve `string | undefined`. String é a mensagem de erro que a
 *   tela mostra; undefined é sucesso. Mesmo contrato do `FormAcao` do aluno.
 *
 * A sessão ainda é a provisória do aluno (CLAUDE.md §3.3, auth definitiva depois
 * da reunião), e é dela que sai o `registrado_por` de cada baixa.
 */

/**
 * Toda escrita exige sessão.
 *
 * Server Action é endpoint: quem souber o identificador dela consegue chamar
 * sem passar por tela nenhuma. Proteger só a rota deixaria a porta dos fundos
 * aberta, então a checagem mora aqui também.
 *
 * O nível exigido é "tem sessão", não "é empresa", porque a mesma baixa de
 * pagamento é feita da gestão da turma pelo representante. Quando o papel de
 * representante existir de verdade no banco, é esta função que passa a
 * distinguir os dois.
 */
async function semSessao() {
  const s = await sessao();
  return s?.id ? null : "Sessão expirada. Entre de novo para continuar.";
}

/** Mesma regra do lado do aluno: só a mensagem que nós escrevemos aparece. */
const erro = mensagem;

/**
 * Revalida tudo. Uma baixa de pagamento muda número em cinco telas ao mesmo
 * tempo: a planilha da turma, a gestão do representante, a campanha, o cliente,
 * e a carteira do próprio aluno. Listar essas rotas uma a uma seria uma lista
 * que envelhece; num protótipo desta escala, jogar o cache fora inteiro custa
 * menos que esquecer uma delas e mostrar valor errado.
 */
function atualizar() {
  revalidatePath("/", "layout");
}

const METODOS = ["pix", "cartao", "dinheiro", "transferencia", "outro"] as const;
type Metodo = (typeof METODOS)[number];

function metodoValido(v: unknown): Metodo {
  return METODOS.includes(v as Metodo) ? (v as Metodo) : "outro";
}

/**
 * Baixa manual numa parcela.
 *
 * Sem valor no formulário, quita o que falta: é o "marcar como paga" de um
 * clique, que é o caso comum quando o representante entrega o dinheiro. Com
 * valor, lança só aquilo, e a parcela fica parcial.
 */
export async function registrarPagamento(_estado: string | null, dados: FormData) {
  const barrado = await semSessao();
  if (barrado) return barrado;

  const quem = await sessao();
  const parcelaId = String(dados.get("parcela_id") ?? "");
  if (!parcelaId) return "Parcela não informada.";

  const metodo = metodoValido(dados.get("metodo"));
  const digitado = String(dados.get("valor") ?? "").trim();

  const { data: parcela, error: eLeitura } = await db()
    .from("vw_parcela")
    .select("saldo_centavos")
    .eq("id", parcelaId)
    .maybeSingle<{ saldo_centavos: number }>();

  if (eLeitura) return erro(eLeitura);
  if (!parcela) return "Parcela não encontrada.";
  if (parcela.saldo_centavos <= 0) return "Esta parcela já está quitada.";

  let valor = parcela.saldo_centavos;
  if (digitado) {
    // Aceita "60", "60,50" e "60.50". Vírgula é o que a pessoa digita no Brasil.
    const centavos = Math.round(Number(digitado.replace(/\./g, "").replace(",", ".")) * 100);
    if (!Number.isFinite(centavos) || centavos <= 0) return "Valor inválido.";
    if (centavos > parcela.saldo_centavos)
      return "O valor é maior que o saldo da parcela.";
    valor = centavos;
  }

  const { error } = await db().from("pagamento").insert({
    parcela_id: parcelaId,
    valor_centavos: valor,
    metodo,
    provider: "manual",
    // Quem deu a baixa. É o que permite, depois, perguntar de quem foi o erro
    // quando um valor não bate.
    registrado_por: quem?.id ?? null,
  });

  if (error) return erro(error);
  atualizar();
}

/**
 * Apaga um lançamento errado.
 *
 * É a exceção ao append-only, e existe porque digitar 600 no lugar de 60 é
 * questão de tempo. Sem isso, o jeito de corrigir seria mexer no banco à mão.
 * O trigger de produção não desfaz sozinho: se o pedido já foi liberado e o
 * pagamento sumiu, o admin volta o status na mão, e isso é proposital, peça
 * que já foi para a oficina não volta por causa de um estorno.
 */
export async function estornarPagamento(_estado: string | null, dados: FormData) {
  const barrado = await semSessao();
  if (barrado) return barrado;

  const id = String(dados.get("pagamento_id") ?? "");
  if (!id) return "Pagamento não informado.";

  const { error } = await db().from("pagamento").delete().eq("id", id);
  if (error) return erro(error);
  atualizar();
}

const STATUS_PRODUCAO = [
  "aguardando",
  "liberado",
  "em_producao",
  "pronto",
  "entregue",
] as const;

/**
 * Troca o estado de produção na mão.
 *
 * O caminho normal é o trigger: entrada paga vira `liberado` sozinho. Isto aqui
 * é para o resto do percurso, que nenhum evento do sistema conhece, a oficina
 * começou, a peça ficou pronta, o aluno recebeu.
 */
export async function mudarProducao(_estado: string | null, dados: FormData) {
  const barrado = await semSessao();
  if (barrado) return barrado;

  const pedidoId = String(dados.get("pedido_id") ?? "");
  const status = String(dados.get("status") ?? "");

  if (!pedidoId) return "Pedido não informado.";
  if (!STATUS_PRODUCAO.includes(status as (typeof STATUS_PRODUCAO)[number]))
    return "Status inválido.";

  const { error } = await db()
    .from("pedido")
    .update({ status_producao: status, atualizado_em: new Date().toISOString() })
    .eq("id", pedidoId);

  if (error) return erro(error);
  atualizar();
}

/**
 * Manda produzir sem o dinheiro ter entrado.
 *
 * O schema exige motivo (`liberacao_forcada_tem_motivo`), e a exigência é boa:
 * quem libera peça sem pagamento precisa deixar escrito por quê, senão a
 * cobrança depois não sabe se foi acordo ou engano.
 */
export async function liberarProducao(_estado: string | null, dados: FormData) {
  const barrado = await semSessao();
  if (barrado) return barrado;

  const pedidoId = String(dados.get("pedido_id") ?? "");
  const motivo = capitalizarFrase(String(dados.get("motivo") ?? ""));

  if (!pedidoId) return "Pedido não informado.";
  if (!motivo) return "Escreva o motivo da liberação sem pagamento.";

  const { error } = await db()
    .from("pedido")
    .update({
      producao_forcada: true,
      motivo_liberacao: motivo,
      status_producao: "liberado",
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", pedidoId);

  if (error) return erro(error);
  atualizar();
}

/**
 * Cancela o pedido. Não apaga: o histórico financeiro fica, e o pedido some das
 * duas listas porque toda consulta filtra por `status = 'ativo'`.
 */
export async function cancelarPedido(_estado: string | null, dados: FormData) {
  const barrado = await semSessao();
  if (barrado) return barrado;

  const pedidoId = String(dados.get("pedido_id") ?? "");
  if (!pedidoId) return "Pedido não informado.";

  const { error } = await db()
    .from("pedido")
    .update({ status: "cancelado", atualizado_em: new Date().toISOString() })
    .eq("id", pedidoId);

  if (error) return erro(error);
  atualizar();
}

/** Corrige o que sai bordado. Guarda o valor anterior em `alteracao`. */
export async function editarItem(_estado: string | null, dados: FormData) {
  const barrado = await semSessao();
  if (barrado) return barrado;

  const itemId = String(dados.get("item_id") ?? "");
  const tamanho = String(dados.get("tamanho") ?? "").trim();
  const nome = capitalizarNome(String(dados.get("nome_estampa") ?? ""));

  if (!itemId) return "Peça não informada.";
  if (!tamanho) return "Escolha um tamanho.";
  if (!nome) return "O nome da estampa não pode ficar vazio.";

  const { data: antes } = await db()
    .from("pedido_item")
    .select("tamanho,nome_estampa")
    .eq("id", itemId)
    .maybeSingle<{ tamanho: string; nome_estampa: string }>();

  if (!antes) return "Peça não encontrada.";

  const { error } = await db()
    .from("pedido_item")
    .update({ tamanho, nome_estampa: nome })
    .eq("id", itemId);

  if (error) return erro(error);

  const mudou = [
    antes.tamanho !== tamanho && { campo: "tamanho", de: antes.tamanho, para: tamanho },
    antes.nome_estampa !== nome && {
      campo: "nome_estampa",
      de: antes.nome_estampa,
      para: nome,
    },
  ].filter(Boolean) as { campo: string; de: string; para: string }[];

  if (mudou.length) {
    await db()
      .from("alteracao")
      .insert(
        mudou.map((m) => ({
          entidade: "pedido_item",
          entidade_id: itemId,
          campo: m.campo,
          valor_antes: m.de,
          valor_depois: m.para,
        })),
      );
  }

  atualizar();
}

/**
 * A porta da área da empresa.
 *
 * Exige uma conta já logada porque o acesso gruda no perfil, não no código:
 * `conceder_acesso_empresa` marca `perfil.tipo = 'empresa'` e registra a
 * entrada. Quem acerta o código passa a enxergar todos os clientes, e continua
 * enxergando mesmo depois que o código for trocado.
 *
 * O código não é comparado aqui. Ele vai inteiro para a função do banco, que
 * guarda só o hash e normaliza caixa e espaço antes de comparar: código
 * digitado no celular não pode falhar por causa de uma maiúscula.
 */
export async function entrarNaEmpresa(_estado: string | null, dados: FormData) {
  const quem = await sessao();
  if (!quem?.id) return "Entre com a sua conta antes de usar o código da empresa.";

  const codigo = String(dados.get("codigo") ?? "").trim();
  if (!codigo) return "Digite o código da empresa.";

  const { erro: falha } = await concederAcesso(quem.id, codigo);
  if (falha) return falha;

  revalidatePath("/painel", "layout");
  redirect("/painel");
}

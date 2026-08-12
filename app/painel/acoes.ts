"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, mensagem } from "@/lib/supabase";
import { concederAcesso, perfilEmpresa } from "@/lib/empresa";
import { abrirSessao, sessao } from "@/lib/sessao";
import { entrar as entrarComConta } from "@/lib/aluno";
import { invalidarPainel } from "@/lib/painel";
import {
  capitalizarFrase,
  capitalizarNome,
  centavosDe,
  mascaraCodigo,
  mascaraTelefone,
  nomeCompletoValido,
  telefoneValido,
} from "@/lib/formato";

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

/**
 * Escritas que alteram a estrutura comercial exigem perfil de empresa.
 * A proteção do layout não basta porque Server Actions também são endpoints.
 */
async function semEmpresa() {
  const perfil = await perfilEmpresa();
  return perfil?.id ? null : "Você não tem permissão para alterar clientes e campanhas.";
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
  invalidarPainel();
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

/**
 * Cancela vários pedidos de uma vez, a limpeza da fila de desistência.
 *
 * Existe porque a fila real tem dezenas de linhas: gente que fez o pedido, nunca
 * pagou nada e passou do vencimento. Ligar para todas gera uma lista de
 * cancelamentos, não um. Cancelado sai de todo relatório e de toda soma sozinho,
 * porque as consultas filtram `status = 'ativo'`, e o histórico fica no banco.
 *
 * **A trava é dura de propósito: pedido com qualquer pagamento não entra no
 * lote.** Cancelar quem já pôs dinheiro abre a conversa de devolução, e devolução
 * depende da decisão de estorno, que ficou para depois (FINANCEIRO.md §11). Um
 * cancelamento individual desses continua possível na gaveta do pedido, onde a
 * pessoa vê o valor pago antes de decidir.
 */
export async function cancelarPedidos(_estado: string | null, dados: FormData) {
  const barrado = await semSessao();
  if (barrado) return barrado;

  const ids = String(dados.get("pedidos") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) return "Nenhum pedido selecionado.";

  // Quem pagou algo fica fora. A conferência é no banco, não na tela: a tela
  // pode estar velha, e a lista de ids vem da URL.
  const { data: comPagamento, error: erroLeitura } = await db()
    .from("vw_pedido")
    .select("id,aluno_nome,pago_centavos")
    .in("id", ids)
    .gt("pago_centavos", 0)
    .returns<{ id: string; aluno_nome: string; pago_centavos: number }[]>();

  if (erroLeitura) return erro(erroLeitura);

  if (comPagamento?.length) {
    const nomes = comPagamento.map((p) => p.aluno_nome).join(", ");
    return comPagamento.length === 1
      ? `${nomes} já pagou parte do pedido. Cancele esse pedido pela gaveta dele, com o valor pago à vista.`
      : `${comPagamento.length} desses pedidos já têm pagamento (${nomes}). Desmarque e cancele um por um pela gaveta.`;
  }

  const { error } = await db()
    .from("pedido")
    .update({ status: "cancelado", atualizado_em: new Date().toISOString() })
    .in("id", ids)
    .eq("status", "ativo");

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

const TIPOS_CLIENTE = ["escola", "faculdade", "empresa", "outro"] as const;

/**
 * Lê e valida o formulário do cliente. Criar e editar mandam os mesmos campos,
 * então a validação mora num lugar só: acrescentar um campo depois é mexer aqui,
 * e as duas telas ganham juntas.
 *
 * Devolve string quando algo está errado, no mesmo contrato das ações.
 */
function lerCliente(dados: FormData) {
  const nome = capitalizarNome(String(dados.get("nome") ?? ""));
  if (nome.length < 2) return "Escreva o nome do cliente.";

  const telefone = String(dados.get("contato_telefone") ?? "").trim() || null;
  if (telefone && !telefoneValido(telefone))
    return "Digite o telefone com DDD, como em (31) 999848388.";

  const tipoBruto = String(dados.get("tipo") ?? "escola");

  const email = String(dados.get("contato_email") ?? "")
    .trim()
    .toLowerCase();
  if (email && !email.includes("@")) return "Digite um e-mail válido, com @.";

  return {
    nome,
    tipo: TIPOS_CLIENTE.includes(tipoBruto as (typeof TIPOS_CLIENTE)[number])
      ? tipoBruto
      : "escola",
    cidade: capitalizarNome(String(dados.get("cidade") ?? "")) || null,
    // Endereço não passa por `capitalizarNome`: "Rua Alagoas, 1270 - Savassi"
    // tem número e sigla, e subir inicial de tudo estraga mais do que arruma.
    endereco: String(dados.get("endereco") ?? "").trim() || null,
    contato_nome: capitalizarNome(String(dados.get("contato_nome") ?? "")) || null,
    contato_cargo: capitalizarNome(String(dados.get("contato_cargo") ?? "")) || null,
    contato_telefone: telefone,
    contato_email: email || null,
    observacoes: capitalizarFrase(String(dados.get("observacoes") ?? "")) || null,
  };
}

/**
 * Cadastra a escola, faculdade ou empresa.
 *
 * Só o nome é obrigatório. O resto ajuda a diferenciar dois clientes de nome
 * parecido (o banco tem duas "Cláudio Brandão"), mas exigir tudo na criação
 * trava quem só quer começar a campanha e busca o telefone depois.
 *
 * Termina dentro do cliente recém-criado, e não de volta na lista: quem acabou
 * de cadastrar a escola vai criar a campanha dela em seguida.
 */
export async function criarCliente(_estado: string | null, dados: FormData) {
  const barrado = await semEmpresa();
  if (barrado) return barrado;

  const valores = lerCliente(dados);
  if (typeof valores === "string") return valores;

  const { data, error } = await db()
    .from("cliente")
    .insert(valores)
    .select("id")
    .single<{ id: string }>();

  if (error) return erro(error);

  atualizar();
  redirect(`/painel/cliente/${data.id}`);
}

/**
 * Edita o cadastro do cliente.
 *
 * Fica na lista depois de salvar, ao contrário do criar: quem edita veio
 * corrigir uma coisa e quer ver a correção no lugar de onde saiu.
 */
export async function editarCliente(_estado: string | null, dados: FormData) {
  const barrado = await semEmpresa();
  if (barrado) return barrado;

  const id = String(dados.get("cliente_id") ?? "");
  if (!id) return "Cliente não informado.";

  const valores = lerCliente(dados);
  if (typeof valores === "string") return valores;

  const { error } = await db().from("cliente").update(valores).eq("id", id);
  if (error) return erro(error);

  atualizar();
  redirect(String(dados.get("voltar") || "/painel"));
}

/**
 * Tira o cliente da lista sem apagar nada. É o caminho normal para quem
 * terminou: a escola de 2025 não some do histórico, só para de aparecer.
 *
 * O mesmo botão desarquiva, porque a ação é uma só vista de dois lados.
 */
export async function arquivarCliente(_estado: string | null, dados: FormData) {
  const barrado = await semEmpresa();
  if (barrado) return barrado;

  const id = String(dados.get("cliente_id") ?? "");
  if (!id) return "Cliente não informado.";

  const arquivar = dados.get("arquivar") === "1";

  const { error } = await db()
    .from("cliente")
    .update({ arquivado_em: arquivar ? new Date().toISOString() : null })
    .eq("id", id);

  if (error) return erro(error);

  atualizar();
  redirect(String(dados.get("voltar") || "/painel"));
}

/**
 * Apaga o cliente de verdade, com campanhas e turmas junto.
 *
 * O banco já é a trava real: `pedido.grupo_id` é `ON DELETE RESTRICT`, então
 * cliente com um pedido sequer não sai de jeito nenhum, mesmo que este código
 * tenha um furo. A contagem aqui existe só para a tela dizer o motivo em
 * português, em vez de mostrar erro de chave estrangeira.
 */
export async function excluirCliente(_estado: string | null, dados: FormData) {
  const barrado = await semEmpresa();
  if (barrado) return barrado;

  const id = String(dados.get("cliente_id") ?? "");
  if (!id) return "Cliente não informado.";

  const { data: resumo } = await db()
    .from("vw_cliente_resumo")
    .select("pedidos")
    .eq("id", id)
    .maybeSingle<{ pedidos: number }>();

  if ((resumo?.pedidos ?? 0) > 0)
    return "Este cliente já tem pedidos. Arquive em vez de excluir, para não apagar histórico de pagamento.";

  const { error } = await db().from("cliente").delete().eq("id", id);
  if (error) return erro(error);

  atualizar();
  redirect("/painel");
}

// ------------------------------------------------------------
// Campanha
// ------------------------------------------------------------

const STATUS_CAMPANHA = ["aberta", "encerrada", "concluida"] as const;
const PLURAIS_GRUPO: Record<string, string> = {
  Turma: "Turmas",
  Sala: "Salas",
  Setor: "Setores",
};

/**
 * Lê e valida o formulário da campanha.
 *
 * Duas regras que o banco não impõe e a tela precisa:
 *
 * · Alteração não pode fechar antes do pedido. A produção começa quando as
 *   alterações fecham (§3.5), então a ordem invertida geraria peça sendo feita
 *   enquanto o aluno ainda pode pedir.
 * · Entrega não pode ser antes das alterações, pelo mesmo motivo.
 */
function lerCampanha(dados: FormData) {
  const nome = capitalizarNome(String(dados.get("nome") ?? ""));
  if (nome.length < 2) return "Escreva o nome da campanha.";

  const label = capitalizarNome(String(dados.get("label_grupo") ?? "")) || "Turma";
  const labelPlural =
    capitalizarNome(String(dados.get("label_grupo_plural") ?? "")) ||
    PLURAIS_GRUPO[label] ||
    `${label}s`;

  const prazoPedidos = String(dados.get("prazo_pedidos") ?? "") || null;
  const prazoAlteracoes = String(dados.get("prazo_alteracoes") ?? "") || null;
  const entrega = String(dados.get("entrega_prevista") ?? "") || null;

  if (prazoPedidos && prazoAlteracoes && prazoAlteracoes < prazoPedidos)
    return "O prazo de alterações não pode ser anterior ao de pedidos.";

  if (prazoAlteracoes && entrega && entrega < prazoAlteracoes)
    return "A entrega não pode ser antes do fim das alterações.";

  if (prazoPedidos && entrega && entrega < prazoPedidos)
    return "A entrega não pode ser antes do fim dos pedidos.";

  const entrada = Number(dados.get("percentual_entrada") ?? 50);
  if (!Number.isFinite(entrada) || entrada < 0 || entrada > 100)
    return "A entrada precisa ser um percentual entre 0 e 100.";

  const statusBruto = String(dados.get("status") ?? "aberta");

  return {
    nome,
    label_grupo: label,
    label_grupo_plural: labelPlural,
    prazo_pedidos: prazoPedidos,
    prazo_alteracoes: prazoAlteracoes,
    entrega_prevista: entrega,
    percentual_entrada: Math.round(entrada),
    status: STATUS_CAMPANHA.includes(statusBruto as (typeof STATUS_CAMPANHA)[number])
      ? statusBruto
      : "aberta",
  };
}

export async function criarCampanha(_estado: string | null, dados: FormData) {
  const barrado = await semEmpresa();
  if (barrado) return barrado;

  const clienteId = String(dados.get("cliente_id") ?? "");
  if (!clienteId) return "Cliente não informado.";

  const valores = lerCampanha(dados);
  if (typeof valores === "string") return valores;

  const { data, error } = await db()
    .from("campanha")
    .insert({ ...valores, cliente_id: clienteId })
    .select("id")
    .single<{ id: string }>();

  if (error) return erro(error);

  atualizar();
  redirect(`/painel/campanha/${data.id}`);
}

/**
 * Edita a campanha.
 *
 * Mudar o percentual de entrada **não** recalcula parcela já gerada, e isso é
 * proposital: pedido fechado é histórico financeiro. A tela avisa.
 */
export async function editarCampanha(_estado: string | null, dados: FormData) {
  const barrado = await semEmpresa();
  if (barrado) return barrado;

  const id = String(dados.get("campanha_id") ?? "");
  if (!id) return "Campanha não informada.";

  const valores = lerCampanha(dados);
  if (typeof valores === "string") return valores;

  const { error } = await db().from("campanha").update(valores).eq("id", id);
  if (error) return erro(error);

  atualizar();
  redirect(String(dados.get("voltar") || "/painel"));
}

/** Mesma trava do cliente: com pedido, o banco recusa e a tela explica antes. */
export async function excluirCampanha(_estado: string | null, dados: FormData) {
  const barrado = await semEmpresa();
  if (barrado) return barrado;

  const id = String(dados.get("campanha_id") ?? "");
  if (!id) return "Campanha não informada.";

  const { data: resumo } = await db()
    .from("vw_campanha_resumo")
    .select("pedidos")
    .eq("id", id)
    .maybeSingle<{ pedidos: number }>();

  if ((resumo?.pedidos ?? 0) > 0)
    return "Esta campanha já tem pedidos e não pode ser excluída. Encerre a campanha em vez disso.";

  const { error } = await db().from("campanha").delete().eq("id", id);
  if (error) return erro(error);

  atualizar();
  redirect(String(dados.get("voltar") || "/painel"));
}

// ------------------------------------------------------------
// Grupo (turma) · nasce dentro da campanha
// ------------------------------------------------------------

/**
 * Lê e valida o formulário da turma.
 *
 * O código é o que o aluno digita para achar a turma, então ele é normalizado
 * aqui do mesmo jeito que o campo normaliza no navegador: caixa alta e sem os
 * caracteres ambíguos. Sem isso, o mesmo código digitado com "O" no lugar do
 * zero cairia na constraint do banco e voltaria em inglês.
 */
function lerGrupo(dados: FormData) {
  const nome = capitalizarNome(String(dados.get("nome") ?? "")).trim();
  if (!nome) return "Escreva o nome da turma.";

  const codigo = mascaraCodigo(String(dados.get("codigo") ?? ""));
  if (codigo.length < 4)
    return "O código precisa ter de 4 a 10 caracteres, sem O, 0, I, 1 nem L.";

  return { nome, codigo };
}

/**
 * O código é único no sistema inteiro, não por campanha: ele é a única coisa
 * que o aluno digita, e duas turmas com o mesmo código não teriam como ser
 * separadas. A checagem aqui existe só para a tela dizer isso em português,
 * porque a violação de unicidade do Postgres volta em inglês falando de
 * constraint. O banco continua sendo a trava de verdade.
 */
async function codigoEmUso(codigo: string, exceto?: string) {
  let q = db().from("grupo").select("id").eq("codigo", codigo);
  if (exceto) q = q.neq("id", exceto);
  const { data } = await q.maybeSingle<{ id: string }>();
  return !!data;
}

export async function criarGrupo(_estado: string | null, dados: FormData) {
  const barrado = await semEmpresa();
  if (barrado) return barrado;

  const campanhaId = String(dados.get("campanha_id") ?? "");
  if (!campanhaId) return "Campanha não informada.";

  const valores = lerGrupo(dados);
  if (typeof valores === "string") return valores;

  if (await codigoEmUso(valores.codigo))
    return `O código ${valores.codigo} já é de outra turma. Escolha outro.`;

  const { error } = await db()
    .from("grupo")
    .insert({ ...valores, campanha_id: campanhaId });

  if (error) return erro(error);

  atualizar();
  redirect(String(dados.get("voltar") || `/painel/campanha/${campanhaId}?aba=turmas`));
}

/**
 * Edita a turma.
 *
 * Trocar o código é permitido e tem consequência: o link antigo (`/t/CB3A`)
 * deixa de achar a turma, e quem já entrou continua dentro, porque a sessão do
 * aluno guarda o grupo, não o código. A tela avisa em vez de proibir, porque
 * corrigir um código digitado errado no cadastro é o caso comum.
 */
export async function editarGrupo(_estado: string | null, dados: FormData) {
  const barrado = await semEmpresa();
  if (barrado) return barrado;

  const id = String(dados.get("grupo_id") ?? "");
  if (!id) return "Turma não informada.";

  const valores = lerGrupo(dados);
  if (typeof valores === "string") return valores;

  if (await codigoEmUso(valores.codigo, id))
    return `O código ${valores.codigo} já é de outra turma. Escolha outro.`;

  const { error } = await db().from("grupo").update(valores).eq("id", id);
  if (error) return erro(error);

  atualizar();
  redirect(String(dados.get("voltar") || "/painel"));
}

/** Mesma trava do cliente e da campanha: com pedido, não sai. */
export async function excluirGrupo(_estado: string | null, dados: FormData) {
  const barrado = await semEmpresa();
  if (barrado) return barrado;

  const id = String(dados.get("grupo_id") ?? "");
  if (!id) return "Turma não informada.";

  const { count } = await db()
    .from("pedido")
    .select("id", { count: "exact", head: true })
    .eq("grupo_id", id);

  if ((count ?? 0) > 0)
    return "Esta turma já tem pedidos e não pode ser excluída.";

  const { error } = await db().from("grupo").delete().eq("id", id);
  if (error) return erro(error);

  atualizar();
  redirect(String(dados.get("voltar") || "/painel"));
}

// ------------------------------------------------------------
// Produto · nasce dentro da campanha
// ------------------------------------------------------------

const CLASSES_PRODUTO = ["camisa", "moletom", "polo", "outro"] as const;
const SITUACOES_PRODUTO = ["a_venda", "pausado", "oculto"] as const;

/** "R$ 159,90" vira 15990. Lê só os dígitos, como a máscara do campo. */
const centavos = centavosDe;

function umDe<T extends readonly string[]>(lista: T, valor: unknown, padrao: T[number]) {
  return lista.includes(valor as T[number]) ? (valor as T[number]) : padrao;
}

/**
 * Lê e valida o formulário do produto, para criar e editar.
 *
 * Duas regras que o banco não impõe:
 *
 * · Produto simples precisa de pelo menos um tamanho. Sem grade não há o que
 *   escolher, e o pedido morreria na validação do banco depois do aluno já ter
 *   preenchido tudo.
 * · Alteração não pode fechar antes do pedido, pela mesma razão da campanha: a
 *   produção começa quando as alterações fecham.
 */
function lerProduto(dados: FormData) {
  const nome = capitalizarNome(String(dados.get("nome") ?? ""));
  if (nome.length < 2) return "Escreva o nome do produto.";

  const preco = centavos(String(dados.get("preco") ?? ""));
  if (!Number.isFinite(preco) || preco <= 0) return "Digite o preço do produto.";

  const tamanhos = dados
    .getAll("tamanhos")
    .map((t) => String(t).trim())
    .filter(Boolean);
  if (tamanhos.length === 0) return "Escolha pelo menos um tamanho da grade.";

  const parcelas = Number(dados.get("max_parcelas") ?? 2);
  if (!Number.isFinite(parcelas) || parcelas < 1 || parcelas > 12)
    return "O parcelamento precisa ser entre 1 e 12 vezes.";

  const prazoPedidos = String(dados.get("prazo_pedidos") ?? "") || null;
  const prazoAlteracoes = String(dados.get("prazo_alteracoes") ?? "") || null;
  if (prazoPedidos && prazoAlteracoes && prazoAlteracoes < prazoPedidos)
    return "O prazo de alterações não pode ser anterior ao de pedidos.";

  let imagens: string[] = [];
  try {
    const bruto = JSON.parse(String(dados.get("imagens") ?? "[]"));
    if (Array.isArray(bruto)) imagens = bruto.map(String).filter(Boolean);
  } catch {
    return "Não consegui ler as fotos. Recarregue a página e tente de novo.";
  }
  // Caminho vem do navegador, então nunca é confiável: só passa o que está
  // dentro da pasta de campanha do bucket.
  if (imagens.some((c) => !/^campanha\/[0-9a-f-]{36}\/[\w.-]+$/i.test(c)))
    return "Uma das fotos veio com caminho inválido. Suba de novo.";

  return {
    nome,
    descricao: capitalizarFrase(String(dados.get("descricao") ?? "")) || null,
    classe: umDe(CLASSES_PRODUTO, dados.get("classe"), "outro"),
    situacao: umDe(SITUACOES_PRODUTO, dados.get("situacao"), "a_venda"),
    preco_centavos: preco,
    tamanhos,
    imagens,
    exige_nome: dados.get("exige_nome") !== "0",
    max_parcelas: Math.round(parcelas),
    prazo_pedidos: prazoPedidos,
    prazo_alteracoes: prazoAlteracoes,
  };
}

/** Apaga do bucket as fotos que saíram do produto. Sem isso, o Storage vira depósito. */
async function apagarFotos(caminhos: string[]) {
  if (caminhos.length === 0) return;
  await db().storage.from("produtos").remove(caminhos);
}

export async function criarProduto(_estado: string | null, dados: FormData) {
  const barrado = await semEmpresa();
  if (barrado) return barrado;

  const campanhaId = String(dados.get("campanha_id") ?? "");
  if (!campanhaId) return "Campanha não informada.";

  const valores = lerProduto(dados);
  if (typeof valores === "string") return valores;

  const { error } = await db().from("produto").insert({
    ...valores,
    campanha_id: campanhaId,
    // O limite de caracteres do bordado está suspenso até a produção informar o
    // máximo real (CLAUDE.md §3.5). 60 é o teto do schema, e o preview comprime
    // o traço para o nome caber.
    max_caracteres_nome: 60,
  });

  if (error) return erro(error);

  atualizar();
  redirect(String(dados.get("voltar") || `/painel/campanha/${campanhaId}`));
}

export async function editarProduto(_estado: string | null, dados: FormData) {
  const barrado = await semEmpresa();
  if (barrado) return barrado;

  const id = String(dados.get("produto_id") ?? "");
  if (!id) return "Produto não informado.";

  const valores = lerProduto(dados);
  if (typeof valores === "string") return valores;

  const { data: antes } = await db()
    .from("produto")
    .select("imagens")
    .eq("id", id)
    .maybeSingle<{ imagens: string[] }>();

  const { error } = await db().from("produto").update(valores).eq("id", id);
  if (error) return erro(error);

  await apagarFotos((antes?.imagens ?? []).filter((c) => !valores.imagens.includes(c)));

  atualizar();
  redirect(String(dados.get("voltar") || "/painel"));
}

/**
 * Pausar, ocultar e voltar a vender, do menu de três pontos.
 *
 * São os três estados de uma coisa só, então é uma ação só: pausado continua na
 * vitrine sem botão de pedir, oculto some dela. Nenhum dos dois mexe em pedido
 * já feito, e é isso que os separa de excluir.
 */
export async function situacaoProduto(_estado: string | null, dados: FormData) {
  const barrado = await semEmpresa();
  if (barrado) return barrado;

  const id = String(dados.get("produto_id") ?? "");
  if (!id) return "Produto não informado.";

  const { error } = await db()
    .from("produto")
    .update({ situacao: umDe(SITUACOES_PRODUTO, dados.get("situacao"), "a_venda") })
    .eq("id", id);

  if (error) return erro(error);

  atualizar();
  redirect(String(dados.get("voltar") || "/painel"));
}

/**
 * Apaga o produto e as fotos dele.
 *
 * `pedido.produto_id` é `ON DELETE RESTRICT`, então o banco já é a trava real.
 * A contagem aqui existe para a tela dizer o motivo em português e oferecer
 * ocultar, que é o que a pessoa queria de verdade.
 */
export async function excluirProduto(_estado: string | null, dados: FormData) {
  const barrado = await semEmpresa();
  if (barrado) return barrado;

  const id = String(dados.get("produto_id") ?? "");
  if (!id) return "Produto não informado.";

  const { count } = await db()
    .from("pedido")
    .select("id", { count: "exact", head: true })
    .eq("produto_id", id);

  if ((count ?? 0) > 0)
    return "Este produto já tem pedidos. Oculte em vez de excluir, para não apagar histórico.";

  const { data: antes } = await db()
    .from("produto")
    .select("imagens")
    .eq("id", id)
    .maybeSingle<{ imagens: string[] }>();

  const { error } = await db().from("produto").delete().eq("id", id);
  if (error) return erro(error);

  await apagarFotos(antes?.imagens ?? []);

  atualizar();
  redirect(String(dados.get("voltar") || "/painel"));
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

/**
 * A mesma porta, para quem ainda não tem conta nenhuma.
 *
 * Cria (ou reencontra) o perfil pelo e-mail, abre a sessão e só então usa o
 * código. A ordem importa: o acesso gruda na conta, então a conta precisa
 * existir antes.
 *
 * O código é conferido **depois** de criar a conta, e isso é de propósito.
 * Conferir antes exigiria uma função nova no banco só para testar o código sem
 * conceder nada, e o efeito de errar seria idêntico: uma conta de aluno comum,
 * sem acesso a coisa nenhuma. Errar o código aqui não deixa lixo perigoso, só um
 * perfil que qualquer pessoa criaria entrando por uma turma.
 */
export async function entrarNaEmpresaComConta(_estado: string | null, dados: FormData) {
  const nome = capitalizarNome(String(dados.get("nome") ?? ""));
  const email = String(dados.get("email") ?? "").trim();
  const telefone = String(dados.get("telefone") ?? "").trim();
  const codigo = String(dados.get("codigo") ?? "").trim();

  if (!nomeCompletoValido(nome)) return "Digite seu nome e o sobrenome.";
  if (!email.includes("@")) return "Digite um e-mail válido, com @.";
  if (telefone && !telefoneValido(telefone))
    return "Digite o telefone com DDD, como em (31) 999848388.";
  if (!codigo) return "Digite o código da empresa.";

  const conta = await entrarComConta(nome, email, telefone ? mascaraTelefone(telefone) : null);
  if (conta.erro) return conta.erro;

  const { erro: falha } = await concederAcesso(conta.perfilId!, codigo);
  if (falha) return falha;

  // Só abre a sessão depois de o código passar. Errou o código, a pessoa
  // continua deslogada e a tela pede de novo, sem ter virado meio-usuário.
  await abrirSessao({ id: conta.perfilId!, nome });

  revalidatePath("/painel", "layout");
  redirect("/painel");
}

import { perfilEmpresa } from "@/lib/empresa";
import { hojeNoFuso } from "@/lib/data";
import {
  ehFaixa,
  ehGrupoCobranca,
  foraDoPrazo,
  listarContasReceber,
  type ContaReceber,
} from "@/lib/financeiro";

/**
 * Exportação das contas a receber, no filtro que está na tela.
 *
 * CSV e não xlsx: aqui a planilha vai para conferência de caixa, uma linha por
 * registro, sem estilo. O `.xlsx` deste projeto é outra coisa, é o modelo de papel
 * da produção, com formatação copiada do arquivo da empresa, e forçar o financeiro
 * naquele molde estragaria os dois.
 *
 * Rota, e não Server Action: download é uma resposta com corpo e cabeçalho, e o
 * link do navegador já faz isso sem JavaScript nenhum.
 */

/** Ponto e vírgula, que é o que o Excel em português espera como separador. */
const SEP = ";";

const COLUNAS = [
  "Aluno",
  "Telefone",
  "Escola",
  "Campanha",
  "Turma",
  "Produto",
  "Parcela",
  "Entrada",
  "Situacao",
  "Vencimento",
  "Dias de atraso",
  "Valor",
  "Pago",
  "Falta",
  "Producao",
] as const;

const SITUACAO: Record<ContaReceber["grupo_cobranca"], string> = {
  em_dia: "Em dia",
  atrasado: "Atrasado",
  sem_pagamento: "Vencido, sem pagamento",
};

/** Dinheiro com vírgula decimal: é assim que a planilha brasileira soma. */
function moeda(centavos: number) {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

/**
 * Escapa o campo. Nome com ponto e vírgula ou aspas quebraria a coluna, e nome de
 * aluno é texto que vem de gente digitando no celular.
 */
function campo(v: string | number | null) {
  const s = String(v ?? "");
  return /["\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(pedido: Request) {
  // Rota fora do layout protegido: a checagem mora aqui. Download de dado
  // financeiro da empresa inteira não pode depender de onde o link foi clicado.
  const perfil = await perfilEmpresa();
  if (!perfil?.id) return new Response("Não encontrado", { status: 404 });

  const p = new URL(pedido.url).searchParams;
  const modo = p.get("modo") ?? "tudo";
  const faixa = p.get("faixa") ?? undefined;
  const oficina = p.get("oficina");
  const termo = p.get("q")?.trim().toLowerCase();

  const contas = await listarContasReceber(
    p.get("cliente") ?? undefined,
    p.get("campanha") ?? undefined,
    p.get("turma") ?? undefined,
  );

  const doModo = ehGrupoCobranca(modo)
    ? foraDoPrazo(contas).filter((c) => c.grupo_cobranca === modo)
    : contas.filter((c) => c.saldo_centavos > 0);

  const linhas = doModo
    .filter((c) => !ehFaixa(faixa) || c.faixa_atraso === faixa)
    .filter((c) => oficina !== "1" || c.pode_produzir)
    .filter((c) => !termo || c.aluno_nome.toLowerCase().includes(termo))
    .sort((a, b) => (b.dias_atraso ?? 0) - (a.dias_atraso ?? 0) || b.saldo_centavos - a.saldo_centavos);

  const corpo = linhas.map((c) =>
    [
      c.aluno_nome,
      c.aluno_telefone ?? "",
      c.cliente_nome,
      c.campanha_nome,
      c.grupo_nome,
      c.produto,
      c.numero,
      c.eh_entrada ? "Sim" : "Nao",
      SITUACAO[c.grupo_cobranca],
      c.vencimento ?? "",
      c.dias_atraso ?? "",
      moeda(c.valor_centavos),
      moeda(c.pago_centavos),
      moeda(c.saldo_centavos),
      c.status_producao,
    ]
      .map(campo)
      .join(SEP),
  );

  const total = linhas.reduce((t, c) => t + c.saldo_centavos, 0);
  const rodape = [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    `${linhas.length} parcelas`,
    "",
    "",
    "",
    "",
    moeda(total),
    "",
  ].join(SEP);

  // BOM na frente: sem ele o Excel abre acento como caractere estranho.
  const csv = `﻿${[COLUNAS.join(SEP), ...corpo, rodape].join("\r\n")}\r\n`;
  const nome = `a-receber-${modo}${faixa ? `-${faixa}` : ""}-${hojeNoFuso()}.csv`;

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${nome}"`,
      "cache-control": "no-store",
    },
  });
}

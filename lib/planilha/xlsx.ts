import { crc32 } from "node:zlib";
import { ESTILOS_MODELO, TEMA_MODELO } from "./modelo";

/**
 * O modelo mais um estilo: célula de dado centralizada.
 *
 * O original alinha o conteúdo à esquerda (estilo 3), e a lista impressa pede
 * tudo centralizado. Em vez de reescrever o arquivo de estilos, o novo `xf` é
 * acrescentado ao fim da lista, então os quatro estilos originais continuam com
 * o mesmo índice e a mesma aparência. O acrescentado é o índice 4.
 */
const ESTILOS = ESTILOS_MODELO.replace(
  "</cellXfs>",
  '<xf numFmtId="0" fontId="3" fillId="0" borderId="1" applyAlignment="1" ' +
    'pivotButton="0" quotePrefix="0" xfId="0">' +
    '<alignment horizontal="center" vertical="center"/></xf></cellXfs>',
).replace('<cellXfs count="4">', '<cellXfs count="5">');

/**
 * Gerador de .xlsx sem biblioteca.
 *
 * Um .xlsx é um zip com uns poucos XML dentro. Escrever o zip à mão custa as
 * cinquenta linhas daqui e evita arrastar uma dependência de megabytes para
 * gerar duas colunas de texto. O CRC vem do `zlib` do próprio Node.
 *
 * Os arquivos são guardados sem compressão (método 0). O arquivo fica maior no
 * disco e some a única parte difícil do formato; para uma lista de turma, isso
 * são alguns kilobytes.
 *
 * O que NÃO é gerado aqui é o estilo: ele é copiado do modelo que a empresa já
 * usa. Ver `modelo.ts`.
 */

// ------------------------------------------------------------
// Zip
// ------------------------------------------------------------

type Arquivo = { nome: string; dados: Buffer };

function dataHoraDos(d: Date) {
  const hora =
    (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const data = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { hora, data };
}

function zip(arquivos: Arquivo[]): Buffer {
  const { hora, data } = dataHoraDos(new Date());
  const locais: Buffer[] = [];
  const central: Buffer[] = [];
  let deslocamento = 0;

  for (const arquivo of arquivos) {
    const nome = Buffer.from(arquivo.nome, "utf8");
    const soma = crc32(arquivo.dados);

    const cabecalho = Buffer.alloc(30);
    cabecalho.writeUInt32LE(0x04034b50, 0); // assinatura
    cabecalho.writeUInt16LE(20, 4); // versão necessária
    cabecalho.writeUInt16LE(0x0800, 6); // nome do arquivo em utf-8
    cabecalho.writeUInt16LE(0, 8); // método: guardado, sem compressão
    cabecalho.writeUInt16LE(hora, 10);
    cabecalho.writeUInt16LE(data, 12);
    cabecalho.writeUInt32LE(soma, 14);
    cabecalho.writeUInt32LE(arquivo.dados.length, 18);
    cabecalho.writeUInt32LE(arquivo.dados.length, 22);
    cabecalho.writeUInt16LE(nome.length, 26);
    cabecalho.writeUInt16LE(0, 28);

    locais.push(cabecalho, nome, arquivo.dados);

    const entrada = Buffer.alloc(46);
    entrada.writeUInt32LE(0x02014b50, 0);
    entrada.writeUInt16LE(20, 4); // versão de quem escreveu
    entrada.writeUInt16LE(20, 6);
    entrada.writeUInt16LE(0x0800, 8);
    entrada.writeUInt16LE(0, 10);
    entrada.writeUInt16LE(hora, 12);
    entrada.writeUInt16LE(data, 14);
    entrada.writeUInt32LE(soma, 16);
    entrada.writeUInt32LE(arquivo.dados.length, 20);
    entrada.writeUInt32LE(arquivo.dados.length, 24);
    entrada.writeUInt16LE(nome.length, 28);
    entrada.writeUInt32LE(deslocamento, 42);

    central.push(entrada, nome);
    deslocamento += cabecalho.length + nome.length + arquivo.dados.length;
  }

  const corpo = Buffer.concat(locais);
  const indice = Buffer.concat(central);

  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(arquivos.length, 8);
  fim.writeUInt16LE(arquivos.length, 10);
  fim.writeUInt32LE(indice.length, 12);
  fim.writeUInt32LE(corpo.length, 16);

  return Buffer.concat([corpo, indice, fim]);
}

// ------------------------------------------------------------
// Planilha
// ------------------------------------------------------------

const escapar = (t: string) =>
  t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Nome de aba do Excel: até 31 caracteres, sem `: \ / ? * [ ]`, e único no
 * arquivo. Nome inválido faz o Excel recusar o arquivo inteiro, sem dizer
 * qual aba está errada.
 */
function nomeDeAba(bruto: string, jaUsados: Set<string>) {
  let nome = bruto.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31) || "Lista";
  let n = 2;
  while (jaUsados.has(nome.toLowerCase())) {
    const sufixo = ` ${n++}`;
    nome = `${nome.slice(0, 31 - sufixo.length)}${sufixo}`;
  }
  jaUsados.add(nome.toLowerCase());
  return nome;
}

export type Linha = {
  /** Nome completo, o mesmo que a pessoa escrevia à mão na coluna da assinatura. */
  assinatura: string;
  /** O que vai bordado na peça. */
  apelido: string;
};

export type Aba = {
  /** Nome da guia embaixo, e também o título da linha 1. */
  nome: string;
  /** Uma linha por peça. */
  linhas: Linha[];
};

/**
 * Mínimo de linhas da folha impressa.
 *
 * A lista de papel sempre teve espaço sobrando no fim, e isso não é desperdício:
 * é onde entra quem chegou depois, quem trocou de tamanho e quem foi esquecido.
 * Uma folha que termina exatamente na última pessoa não deixa para onde escrever.
 */
const LINHAS_MINIMAS = 16;

/**
 * Uma aba no formato do modelo, dimensionada para preencher uma folha A4.
 *
 * Linha 1: título mesclado A1:B1, Times New Roman 22 sublinhado.
 * Linha 2: cabeçalho das duas colunas.
 * Linha 3 em diante: uma por peça, com um mínimo de LINHAS_MINIMAS.
 *
 * A ordem das colunas é assinatura primeiro, apelido depois. A assinatura já vem
 * preenchida com o nome completo, que é justamente o que a pessoa escrevia à mão
 * na folha antiga; o apelido é o que vai bordado, e serve de conferência na hora
 * de entregar a peça.
 *
 * As medidas existem para o papel, não para a tela: as duas colunas somam a
 * largura útil de um A4 em retrato com margem de meia polegada, e a altura das
 * linhas gasta a folha inteira. Sem isso o Excel imprime a tabela encolhida no
 * canto de cima.
 */
function folha(aba: Aba) {
  const total = Math.max(aba.linhas.length, LINHAS_MINIMAS);

  const dado = (ref: string, texto?: string) =>
    texto
      ? `<c r="${ref}" s="4" t="inlineStr"><is><t>${escapar(texto)}</t></is></c>`
      : `<c r="${ref}" s="4" t="inlineStr"></c>`;

  const linhas = [
    `<row r="1" ht="46" customHeight="1"><c r="A1" s="1" t="inlineStr"><is><t>${escapar(
      aba.nome,
    )}</t></is></c></row>`,
    `<row r="2" ht="34" customHeight="1">` +
      `<c r="A2" s="2" t="inlineStr"><is><t>Assinatura</t></is></c>` +
      `<c r="B2" s="2" t="inlineStr"><is><t>Nome ou Apelido</t></is></c></row>`,
    ...Array.from({ length: total }, (_, i) => {
      const linha = aba.linhas[i];
      const r = i + 3;
      return (
        `<row r="${r}" ht="38" customHeight="1">` +
        dado(`A${r}`, linha?.assinatura) +
        dado(`B${r}`, linha?.apelido) +
        `</row>`
      );
    }),
  ];

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetPr><outlinePr summaryBelow="1" summaryRight="1"/><pageSetUpPr fitToPage="1"/></sheetPr>` +
    `<dimension ref="A1:B${total + 2}"/>` +
    `<sheetViews><sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>` +
    `<sheetFormatPr baseColWidth="8" defaultRowHeight="15"/>` +
    // Duas colunas iguais, somando a largura útil do A4 em retrato com margem
    // de 0,5". Larguras diferentes deixavam a tabela torta na folha, e a
    // assinatura não precisa de mais espaço: ela é preenchida antes, não à mão.
    `<cols><col width="51" customWidth="1" min="1" max="1"/>` +
    `<col width="51" customWidth="1" min="2" max="2"/></cols>` +
    `<sheetData>${linhas.join("")}</sheetData>` +
    `<mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells>` +
    `<printOptions horizontalCentered="1"/>` +
    `<pageMargins left="0.5" right="0.5" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>` +
    // paperSize 9 é A4. `fitToWidth` com `fitToHeight` zerado deixa a tabela
    // ocupar a largura inteira sem estourar para uma segunda folha.
    `<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>` +
    `</worksheet>`
  );
}

/** Monta o arquivo inteiro: uma aba por tamanho, na ordem recebida. */
export function planilha(abas: Aba[]): Buffer {
  const usados = new Set<string>();
  const folhas = abas.map((aba, i) => ({
    ...aba,
    indice: i + 1,
    guia: nomeDeAba(aba.nome, usados),
  }));

  const conteudo =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `<Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>` +
    folhas
      .map(
        (f) =>
          `<Override PartName="/xl/worksheets/sheet${f.indice}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join("") +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `</Types>`;

  const raiz =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml" Id="rId1"/>` +
    `</Relationships>`;

  const livro =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<workbookPr/><bookViews><workbookView visibility="visible" activeTab="0"/></bookViews><sheets>` +
    folhas
      .map(
        (f) =>
          `<sheet name="${escapar(f.guia)}" sheetId="${f.indice}" state="visible" r:id="rId${f.indice}"/>`,
      )
      .join("") +
    `</sheets><definedNames/><calcPr calcId="124519" fullCalcOnLoad="1"/></workbook>`;

  const relacoes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    folhas
      .map(
        (f) =>
          `<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${f.indice}.xml" Id="rId${f.indice}"/>`,
      )
      .join("") +
    `<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml" Id="rIdEstilos"/>` +
    `<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml" Id="rIdTema"/>` +
    `</Relationships>`;

  const texto = (nome: string, dados: string) => ({
    nome,
    dados: Buffer.from(dados, "utf8"),
  });

  return zip([
    texto("[Content_Types].xml", conteudo),
    texto("_rels/.rels", raiz),
    texto("xl/workbook.xml", livro),
    texto("xl/_rels/workbook.xml.rels", relacoes),
    texto("xl/styles.xml", ESTILOS),
    texto("xl/theme/theme1.xml", TEMA_MODELO),
    ...folhas.map((f) => texto(`xl/worksheets/sheet${f.indice}.xml`, folha(f))),
  ]);
}

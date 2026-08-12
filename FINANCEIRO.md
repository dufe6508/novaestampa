# Financeiro · plano do módulo

Documento de planejamento. Nada foi construído. Escrito em 11/08/2026, calibrado com os
números que estão no banco hoje (447 pedidos ativos, R$ 57.867,40 vendidos).

**Precedência:** `CLAUDE.md` manda no produto, `DESIGN_SYSTEM.md` manda no visual, este
arquivo manda no módulo Financeiro. Onde este contrariar os outros dois, os outros dois
ganham.

---

## 1. A pergunta que o módulo existe para responder

A responsável abre o sistema pela manhã. Em menos de dez segundos ela precisa sair com uma
lista de ligações na mão. Nessa ordem:

1. Entrou dinheiro desde ontem?
2. Quanto está vencido agora, e há quanto tempo?
3. Quem eu ligo primeiro?
4. Tem peça na oficina que ainda não foi paga?
5. Alguma campanha vai chegar na entrega sem estar arrecadada?

Todo indicador deste documento serve uma dessas cinco perguntas ou vai para relatório.
O que não serve nenhuma delas foi cortado, com o motivo escrito.

---

## 2. Vocabulário · a decisão mais importante do módulo

Sem isso, dois lugares do sistema mostram números diferentes para a mesma coisa e o
Financeiro perde a confiança na primeira semana. Sete palavras, uma definição cada.

| Palavra | Definição | Fonte |
|---|---|---|
| **Vendido** | soma de `pedido.valor_centavos` dos pedidos ativos | `pedido` |
| **Recebido** | soma de `pagamento.valor_centavos` | `pagamento` |
| **A receber** | Vendido menos Recebido | derivado |
| **Atrasado** | saldo vencido de quem **já pagou alguma coisa** | `vw_parcela` + `vw_pedido` |
| **Vencido** | saldo vencido de quem **não pagou nada** | `vw_parcela` + `vw_pedido` |
| **A vencer** | saldo de parcelas com `vencimento >= hoje` ou sem vencimento | `vw_parcela` |
| **Arrecadado** | Recebido / Vendido, em percentual | derivado |

Três consequências que precisam ficar escritas:

- **"Faturamento bruto" e "total vendido" são a mesma coisa aqui, então só existe Vendido.**
  Duas palavras para um número é o começo de toda planilha que ninguém confia. Vale registrar
  que Vendido não é receita contábil, é valor contratado: a peça pode nem ter sido produzida.
- **"% pendente" não existe.** É 100 menos o arrecadado. Mostrar os dois é gastar espaço para
  dizer a mesma coisa duas vezes.
- **"Valor médio por pedido" e "ticket médio" são a mesma coisa, então só existe Ticket
  médio**, = Vendido / pedidos. O gasto médio por aluno (Vendido / alunos distintos) é outro
  número, útil na análise de campanha e não no topo.

### 2.1 Atrasado é quem pagou algo, Vencido é quem não pagou nada

**Decidido em 11/08/2026, corrigido em 12/08/2026.** Duas palavras para dois problemas, e o
critério é um só: entrou ou não entrou dinheiro daquele pedido.

| Estado | Nome | Conversa ao telefone |
|---|---|---|
| Pagou alguma parcela e deixou vencer o resto | **Atrasado** | "Falta a segunda parcela" |
| Nunca pagou nada e a entrada venceu | **Vencido** | "Você ainda quer a peça?" |

Isso já é o que `vw_pedido.status_pagamento` faz: `atrasado` exige pagamento, quem nunca pagou
cai em `pendente`. A régua nomeia o que o banco separa e conserta **o valor**, que estava
errado: `vw_grupo_resumo.atrasado_centavos` soma o saldo inteiro do pedido, incluindo parcela
que ainda não venceu, e ignora quem nunca pagou. As colunas novas somam só o saldo já vencido.

**Medido depois da limpeza do dado (12/08/2026):**

| Grupo | Valor | Pedidos |
|---|---|---|
| **Atrasado** | R$ 1.793,60 | 29 |
| **Vencido** | R$ 6.460,00 | 87 |
| Total fora do prazo | R$ 8.253,60 | 116 |

### 2.2 O caso do meio caiu · 12/08/2026

Existia um terceiro grupo, "Entrada incompleta", para quem pagou parte da entrada e travou
antes da produção. **Foi removido de tudo**, por decisão do usuário: o caso só existia porque
o seed inventava uma baixa de metade da entrada, e no fluxo real o aluno paga a parcela
inteira. Saiu do banco, do código, das telas e do CSV.

As 30 baixas parciais foram apagadas do banco de demonstração, e os pedidos voltaram a ser
"não pagou nada". Quem perdeu o único pagamento voltou de `liberado` para `aguardando`, porque
sem entrada quitada não existe peça liberada.

Pagamento parcial continua **possível**, quando o admin baixa um valor menor na mão. Ele cai em
**Atrasado**, que é onde pertence: entrou dinheiro daquele pedido.

### 2.3 Pagar atrasado libera a produção, e isso já funciona

Régua confirmada pelo usuário: **não existe porta que fecha no vencimento.** Passou a data, a
cobrança acontece, e se a pessoa pagar depois a peça sobe para a produção normalmente.

Verificado no banco, nada a construir: `aluno_pagar_pedido` não olha vencimento nem prazo, e o
trigger `trg_sync_status_producao` dispara em qualquer pagamento que quite a parcela de
entrada, atrasado ou não. Consequência para o Financeiro: **nenhum dos dois grupos é
definitivo.** Um pedido Vencido pode virar produção amanhã, então a tela nunca trata Vencido
como perda, só como pendência que precisa de uma ligação.

### 2.4 Régua de data

Todo corte de dia usa o dia de **America/Sao_Paulo**, nunca UTC. Pagamento registrado às 21h
em UTC cairia no dia seguinte, e o "recebido hoje" fecharia diferente do extrato. `vw_parcela`
já faz isso, e o resto do módulo copia.

---

## 3. Hierarquia dos indicadores

Cada linha diz onde o indicador vive. Três lugares possíveis: **topo** (aparece de entrada,
sem clique), **secundário** (bloco de apoio ou legenda de outro número), **relatório**
(existe, mas só quem foi procurar encontra).

### 3.1 Topo · posição da carteira

Três números, uma linha. Respondem "como está a empresa".

| Indicador | Pergunta | Forma |
|---|---|---|
| **Vendido** | tamanho da operação | valor, com contagem de pedidos em legenda |
| **Recebido** | quanto já é dinheiro | valor + percentual arrecadado na legenda |
| **A receber** | tamanho da carteira | valor, com quebra "fora do prazo / a vencer" na legenda |

Um número manda por cartão, o resto desce para `caption`. É a regra §5.1.1 do `CLAUDE.md`,
e ela já resolveu esse mesmo excesso no cartão de cliente.

### 3.1.1 Topo · o problema

Segunda linha, os dois grupos do §2.1, cada um com uma conversa diferente ao telefone. São
cartões separados porque geram duas listas de ligação diferentes, não porque somam.

| Indicador | Hoje | Ação |
|---|---|---|
| **Atrasado** | R$ 1.793,60 · 29 pedidos | peça na oficina, cobrar a segunda parcela |
| **Vencido** | R$ 6.460,00 · 87 pedidos | confirmar se ainda quer, ou cancelar (§6.1) |

Vermelho só em Atrasado e Vencido. Cada cartão leva a `/receber` já filtrado no próprio grupo,
e a legenda de cada um traz o atraso mais antigo em dias.

**Exposto em produção deixou de ser cartão próprio:** ele é o Atrasado com peça liberada, o
mesmo R$ 1.793,60. Dois cartões com o mesmo número, nomes diferentes, é a duplicação que este
documento passa o tempo inteiro cortando. O nome "peça na oficina" fica na legenda do cartão
Atrasado, que é onde a informação pesa.

### 3.2 Topo · movimento

Três números, segunda linha. Respondem "o que mudou desde que eu olhei".

| Indicador | Comparação | Por que fica no topo |
|---|---|---|
| **Recebido hoje** | contra ontem, mesmo horário | é a primeira pergunta da manhã |
| **Recebido no período** | contra o período anterior de igual duração | mede a tendência, não o dia |
| **Vence em 7 dias** | sem comparação | é a fila de amanhã, não de hoje |

### 3.3 Topo · o número que faltava na lista

Dois indicadores que não estavam no pedido e são, na minha leitura, os mais importantes do
negócio:

- **Peça na oficina com pagamento atrasado.** Saldo vencido de pedidos liberados ou em
  produção: **R$ 1.793,60 em 29 pedidos**. É tecido cortado e mão de obra gasta contra dinheiro
  que passou da data. Não é cartão próprio, é o cartão Atrasado do §3.1.1, e o "peça na
  oficina" vive na legenda dele.

  **Definição estreitada em 11/08/2026, por decisão do usuário.** A versão anterior contava o
  saldo aberto de toda peça liberada, R$ 10.037,45, e isso não é prejuízo: a segunda parcela
  da maioria vence na entrega, então o dinheiro está no prazo, não em risco. Prejuízo possível
  é peça pronta ou em produção com parcela **já vencida**. O resto é carteira normal e
  continua visível em A receber, que é onde pertence.
- **Dinheiro que entrou direto.** Percentual do Recebido com `provider` diferente de
  `manual`, ou seja, o aluno pagou pelo sistema em vez de entregar na mão do representante.
  Hoje são **87,6%** (R$ 31.022,15 de R$ 35.406,71). É a medida do objetivo número um do
  projeto, escrito no §1 do `CLAUDE.md`: o dinheiro passar a entrar direto na empresa. Sem
  esse indicador, o sistema realiza a tese e não consegue provar. Fica no topo como número
  único com legenda, ou no rodapé da visão geral, e ganha série mensal no relatório.

### 3.4 Secundários

Vivem em bloco de apoio, abaixo dos gráficos, ou como legenda de outro número. Não competem
com a carteira.

| Indicador | Onde | Por quê |
|---|---|---|
| Ticket médio | bloco de apoio e análise por produto | muda pouco, decide pouco no dia |
| Pedidos | legenda de Vendido | é a escala, não o valor |
| Alunos compradores | bloco de apoio | contagem por nome distinto, ver §3.2 do `CLAUDE.md` |
| Alunos pendentes | bloco de apoio, clicável | a lista importa mais que o número |
| Novas vendas hoje | série do gráfico Vendido x Recebido | como cartão, é ruído: campanha vende em picos, não todo dia |
| Pagamentos recebidos hoje (contagem) | legenda de Recebido hoje | o valor é que decide |
| Maior atraso em dias | legenda de Vencido | hoje 103 dias, vencimento de 30/04/2026 |
| Valor recuperado no período | Central de cobrança | mede se ligar funciona, e isso é semanal |
| Tempo médio até a entrada ser paga | relatório | mede a fricção do checkout, não o caixa |

### 3.5 Cortados, com motivo

| Cortado | Motivo |
|---|---|
| Faturamento bruto | mesmo número que Vendido, nome diferente |
| Percentual pendente | complemento do arrecadado |
| Valor médio por pedido | é o ticket médio |
| Valor previsto para recebimento (como cartão solto) | previsão sem prazo não decide nada; vira "vence em 7 dias" e "vence em 30 dias" |
| Inadimplência como cartão de topo | ver §3.6 |

### 3.6 Sobre a palavra inadimplência

Percentual de inadimplência precisa de denominador, e o denominador óbvio está errado.
Vencido sobre Vendido dá um número que cai sozinho conforme a campanha vende mais, mesmo sem
ninguém pagar nada. Com uma campanha por ano por escola, isso oscila por motivo que não é
comportamento de aluno.

**Definição adotada:** inadimplência = tudo que está fora do prazo, os três grupos do §2.1
somados / (soma das parcelas cujo vencimento já
passou). É "do que já era devido, quanto não entrou". Hoje isso é legível e comparável entre
turmas.

**Decisão:** o percentual não é cartão de topo, é coluna nas tabelas de posição (por escola,
por campanha, por turma), onde serve para ordenar e comparar. No topo fica o valor em reais,
que é o que se cobra. Percentual não se deposita.

---

## 4. Arquitetura de páginas

Quatro rotas. A regra que as separa é a **unidade da linha**: agregado, parcela, pagamento.
Toda vez que duas telas teriam a mesma unidade e a mesma tabela, elas viraram uma tela com
dois modos.

```
/painel/financeiro                    visão geral · nenhuma tabela longa, só posição e atenção
/painel/financeiro/receber            linha = PARCELA em aberto · quatro modos, ver §6
/painel/financeiro/recebimentos       linha = PAGAMENTO · o caixa, para conferência
/painel/financeiro/posicao            linha = AGREGADO · abas Escolas, Campanhas, Turmas, Produtos
```

Mais três abas dentro do que já existe:

```
/painel/cliente/[id]?aba=financeiro       posição do cliente e suas campanhas
/painel/campanha/[id]?aba=financeiro      já existe boa parte, ver §9
/painel/turma/[id]?aba=financeiro         nova aba, ver §10
```

### 4.1 Por que a Central de inadimplência não é uma rota

O pedido descreve Contas a receber e Central de inadimplência como duas áreas. Elas
compartilham a unidade da linha (parcela em aberto), a mesma tabela, os mesmos filtros e as
mesmas ações. A diferença é um filtro (`vencimento < hoje`) e um bloco de rankings.

Duas telas quase iguais produzem duas verdades: alguém vai comparar o total de uma com o
total da outra e achar um erro que não existe. **Decisão:** uma tela, `/receber`, com dois
modos no topo. O modo Vencido acrescenta a faixa de atraso e os três rankings. Nada se perde.

### 4.2 Por que não existe rota de relatórios

Ver §12. Os relatórios pedidos são, quase todos, a exportação das telas acima com outro
agrupamento. Uma rota `/relatorios` que refaz as mesmas tabelas seria um segundo lugar para
manter a mesma consulta.

---

## 5. Tela: visão geral · `/painel/financeiro`

Ordem vertical, do que decide hoje para o que explica o mês. A tela **não tem tabela longa**,
de propósito: quem chega aqui está diagnosticando, e a lista é o passo seguinte, com filtro.

**1. Filtro de período e escopo.** Barra fina, presets: Hoje, 7 dias, 30 dias, Este mês,
Campanha inteira. Escopo em cascata opcional (Escola, Campanha, Turma). Estado na URL.

**2. Posição da carteira.** Os três cartões do §3.1. Sem cor: aqui nada é problema.

**3. O problema.** Os três cartões do §3.1.1, Atrasado, Entrada incompleta e Vencido, cada um
com link para o próprio modo em `/receber`. Vermelho em Atrasado e Vencido.

**4. Movimento.** Os três do §3.2, com a variação contra o período anterior.

**5. Precisa de atenção.** Lista de no máximo cinco linhas, cada uma um problema com valor,
contagem e link. Vazio significa vazio de verdade, com estado próprio ("Nada exigindo ação
hoje"). As regras estão no §14.

**6. Gráfico: Vendido x Recebido.** Um só gráfico aqui. Ver §7.

**7. Concentração.** Cinco linhas: as escolas com maior valor vencido, com o percentual
arrecadado ao lado. Não é gráfico, é lista ordenada com link. Link para `/posicao`.

**8. Dinheiro que entrou direto.** Rodapé, número único com legenda.

Estados obrigatórios: sem nenhuma venda ainda (empresa nova), período sem movimento, período
com movimento e nada vencido. Os três textos precisam ser escritos, não podem ser cartão
zerado.

---

## 6. Tela: contas a receber · `/painel/financeiro/receber`

**A unidade da linha é a parcela.** Esta é a decisão estrutural da tela. Vencimento, dias de
atraso e faixa são atributos da parcela, não do pedido. Listar por pedido obrigaria a
inventar "o vencimento do pedido", que não existe quando uma parcela venceu e a outra não.
O pedido aparece como agrupador visual, nunca como unidade.

**Cabeçalho:** três modos, cada um com o valor no próprio botão, que é como a Produção já
mostra os tamanhos. São os três grupos do §2.1 mais a carteira inteira:

| Modo | Filtro |
|---|---|
| Tudo a receber | saldo em aberto, vencido ou não |
| Atrasado | pagou algo e tem parcela vencida |
| Vencido | nada pago e a entrada venceu (§6.1) |

Os três são exclusivos entre si nos dois últimos, e o primeiro contém todos: somar modos nunca
acontece na tela.

**Nos modos com atraso, acima da tabela:**

- Faixas de atraso: 1 a 7, 8 a 15, 16 a 30, 31 a 60, mais de 60 dias. Cinco botões que
  filtram, cada um com valor e contagem. É a distribuição e o filtro na mesma peça, sem
  gráfico separado.
- Três rankings, cinco linhas cada, retráteis: escolas, campanhas e turmas por valor vencido.
  Ordenados por **valor**, não por percentual: cobra-se reais.

**Colunas:**

| Coluna | Alinhamento | Observação |
|---|---|---|
| Aluno | esquerda | com o telefone em legenda, é com ele que se liga |
| Turma | esquerda | escola e campanha em legenda, e só quando o filtro é amplo |
| Produto | esquerda | qual peça, para a conversa fazer sentido |
| Parcela | centro | `1 de 2`, com marca de entrada |
| Valor | direita | valor da parcela |
| Pago | direita | some quando zero em toda a tela filtrada |
| Saldo | direita | é a coluna que se ordena por padrão |
| Vencimento | centro | data curta |
| Atraso | centro | em dias, vermelho acima de zero |
| Ações | direita | ver abaixo |

Dinheiro sempre à direita, contagem sempre ao centro. Já é a regra da tabela de turmas
(§5.1.2 do `CLAUDE.md`) e existe por um motivo: dinheiro centralizado desalinha a vírgula e
mata a comparação entre linhas. Abaixo de 768px a tabela vira lista empilhada, com aluno,
saldo e atraso na primeira linha.

**Ações por linha:** abrir o pedido na gaveta que já existe (`detalhe-pedido.tsx`), que já
sabe registrar pagamento; e copiar o telefone. Nada mais.

**Cortado desta tela:**

- **Última cobrança** e **enviar cobrança.** Não existe tabela de cobrança nem canal de envio,
  e WhatsApp está fora do MVP por decisão registrada. Coluna que mostraria sempre vazio é
  pior que coluna ausente. Se a cobrança virar registro, é uma tabela `cobranca` de quatro
  colunas e a coluna volta.
- **Marcar situação especial.** Precisa de campo novo e de uma definição de "especial" que
  ninguém deu. O campo `pedido.observacoes` já existe e resolve o caso real ("mãe pediu para
  dividir em três") sem inventar taxonomia.
- **Abrir aluno.** Não existe tela de aluno no painel: o aluno é dado do pedido, não entidade
  (§3.2.2 do `CLAUDE.md`). O agrupamento por nome dentro da tabela cobre a pergunta "essa
  pessoa deve mais alguma coisa?".

**Ordenação padrão:** maior atraso primeiro no modo Vencido, maior saldo primeiro no modo
Tudo. Quem abre a tela quer a fila já formada, não quer ordenar.

### 6.1 Possíveis desistências · decidido em 11/08/2026

São **61 pedidos, R$ 4.356,35**, que fizeram o pedido, nunca pagaram nada e já passaram do
vencimento da entrada. Parte disso não é dívida, é gente que desistiu, e enquanto esses
pedidos ficam ativos eles inflam a carteira, a previsão e a inadimplência com dinheiro que
nunca vai entrar.

**Cancelar é decisão de pessoa, nunca automática.** Vale registrar por causa do §2.3: pagar
atrasado continua liberando a produção, então o sistema não tem o direito de concluir que
alguém desistiu. A tela lista, alguém liga, e só então cancela.

**A tela precisa oferecer o cancelamento.** É o modo **Sem pagamento** em `/receber`, ordenado
do atraso mais antigo para o mais novo, cada linha com o telefone à mão e a ação de cancelar.
Seleção múltipla com cancelamento em lote, porque ligar para 61 pessoas gera uma lista de
cancelamentos, não um.

**Isso já funciona no banco e não precisa de nada novo.** `cancelarPedido` existe em
`app/painel/acoes.ts:228`, marca `status = 'cancelado'` e não apaga nada. Toda consulta do
painel filtra `status = 'ativo'`, então o pedido cancelado **sai sozinho de todos os
relatórios, de todos os totais e da produção**, e o histórico financeiro fica no lugar, junto
com o que a pessoa por acaso tenha pagado. Hoje existem 2 pedidos cancelados no banco, e eles
já não aparecem em nenhum número deste documento.

Três coisas que faltam, todas de tela:

- **Cancelamento em lote.** Hoje é um pedido por vez, dentro da gaveta.
- **Aviso quando há pagamento.** Cancelar pedido com dinheiro pago precisa dizer isso na
  confirmação, porque aí a conversa é devolução, e devolução depende da decisão de estorno
  (§11), que ficou para depois.
- **Onde ver o que foi cancelado.** Sair dos relatórios está certo, desaparecer do sistema
  não. Um filtro "incluir cancelados" na tela da turma resolve, e a pergunta "cancelei sem
  querer, e agora?" precisa de resposta: reativar é o mesmo `update` ao contrário, e vale
  fazer junto.

Registro de expectativa: cancelar os 61 derruba a carteira em R$ 4.356,35 e zera o cartão
Vencido, deixando fora do prazo só o que tem dinheiro dentro, R$ 3.205,05. Os números do painel
vão mudar muito no dia dessa limpeza, e isso é a limpeza funcionando, não erro.

---

## 7. Gráficos

Regra de admissão: um gráfico entra se responde uma pergunta que a tabela responde pior. Três
entraram, cinco foram cortados.

### 7.1 Vendido x Recebido · aprovado, visão geral

- **Pergunta:** estamos recebendo na mesma velocidade em que vendemos?
- **Dados:** por dia, o vendido (soma de `pedido.valor_centavos` por `criado_em`) e o recebido
  (soma de `pagamento.valor_centavos` por `pago_em`).
- **Forma:** duas linhas, acumuladas no período. Acumulado e não barra diária, porque a
  distância entre as curvas é a carteira, e é a distância que interessa. A janela real do
  banco vai de 12/04 a 10/08, o que dá quatro meses de série legível.
- **Filtros:** todos os globais.
- **Agrupamento:** dia até 60 dias de janela, semana até 180, mês acima. Automático pelo
  tamanho do período, sem controle na tela.
- **Comparação:** as duas séries já são a comparação. Sem período anterior sobreposto, que
  transformaria em quatro linhas.
- **Clique:** um ponto abre `/recebimentos` filtrado naquele dia ou semana.

### 7.2 Faixas de atraso · aprovado, dentro de `/receber`

- **Pergunta:** há quanto tempo o dinheiro está parado, e onde ataco primeiro?
- **Forma:** não é gráfico, são cinco botões com valor e contagem que filtram a tabela logo
  abaixo. Barra separada obrigaria olhar em um lugar e clicar em outro.
- **Clique:** filtra a tabela.

### 7.3 Previsto x Realizado por semana · aprovado, dentro de `/receber` ou visão geral

- **Pergunta:** estamos recebendo o que esperávamos, e o que vem pela frente?
- **Dados:** por semana, soma das parcelas com vencimento naquela semana, e quanto delas foi
  pago. Quatro semanas para trás e quatro para frente.
- **Forma:** barras pareadas. As semanas passadas mostram o buraco, as futuras mostram só o
  previsto.
- **Clique:** a semana abre `/receber` filtrado por aquele intervalo de vencimento.

### 7.4 Cortados

| Gráfico | Motivo |
|---|---|
| Recebimentos por período | é uma das séries do 7.1. Como gráfico próprio, é o mesmo dado plotado duas vezes na mesma tela |
| Evolução de contas a receber | é a distância entre as curvas do 7.1. Vira uma terceira linha ali se fizer falta, não uma peça nova |
| Inadimplência ao longo do tempo | é o único que exige série retroativa "como estava naquele dia", cara de calcular. Responde pergunta mensal, não diária. Vai para relatório, na fase 3 |
| Financeiro por escola | tabela ordenável com percentual arrecadado responde melhor que barra. Comparar 12 escolas em barra empilhada é pior em toda dimensão |
| Financeiro por produto | mesmo caso. `ResumoProdutos` já existe e faz isso em tabela |

Detalhe técnico registrado: nenhum destes precisa de biblioteca de gráfico. Duas linhas
acumuladas e barras semanais são `svg` de vinte linhas de código, e o projeto já escreve
`.xlsx` sem biblioteca. Uma dependência de charting para dois gráficos é peso que a Vercel
carrega em toda página.

---

## 8. Filtros

Um componente, usado nas quatro rotas, estado na URL. Combináveis.

**Correção da regra, 11/08/2026.** A versão anterior dizia que o filtro afeta cartão, gráfico
e tabela sem exceção. Está errado para metade dos números, e a diferença é o que separa fluxo
de posição:

| Natureza | Números | O período manda? |
|---|---|---|
| **Fluxo**, tem data | Vendido no período, Recebido no período, movimento, gráficos | sim |
| **Posição**, é foto de hoje | A receber, Atrasado, Entrada incompleta, Vencido | não |

Parcela em aberto não tem data de recebimento, então "vencido nos últimos 30 dias" não
significa nada. O escopo (escola, campanha, turma) manda nos dois; o período manda só no
fluxo, e o rótulo da seção diz "hoje" para ninguém comparar dois números que respondem
perguntas diferentes.

**Período padrão: 30 dias.** Cobre o ciclo de uma cobrança sem virar histórico. Presets: Hoje,
7, 30, 90 dias e Tudo. Em "Tudo" a comparação com período anterior desaparece da tela, porque
não existe período anterior a tudo.

O escopo continua valendo para tudo: cartão que ignora o filtro de escopo é o número mentindo
sobre o que está na tela, e isso já foi decidido na home (§4.2 do `CLAUDE.md`).

**Ficam:**

| Filtro | Forma | Nota |
|---|---|---|
| Período | presets + intervalo | define contra o que a comparação compara |
| Escola, Campanha, Turma | cascata, três seletores | selecionar campanha limita as turmas |
| Produto | seleção múltipla | por nome de snapshot, que é o que a linha carrega |
| Situação financeira | chips: pago, parcial, vencido, sem pagamento | os mesmos nomes das telas de cobrança |
| Faixa de atraso | os cinco botões do §7.2 | só faz sentido no modo Vencido |
| Método de pagamento | chips | só em `/recebimentos`, é atributo do pagamento e não da parcela |
| Aluno | campo de busca | não é seletor: são centenas de nomes |

**Cortados:**

- **Responsável ou representante da turma.** Não existe no banco. `grupo` não tem
  `representante_nome` nem `representante_telefone`, e isso já está registrado como pendência
  aguardando autorização (§4.1 do `CLAUDE.md`). Filtro sem coluna é promessa quebrada.
- **Status do pedido (operacional).** No Financeiro serve a uma pergunta só, "tem peça na
  oficina sem pagamento", e o modo Atrasado já responde. Filtro completo de
  `aguardando/liberado/em_producao/pronto/entregue` aqui é ruído.
- **Situação da campanha.** Vira uma opção do seletor de campanha ("incluir encerradas"),
  não um filtro próprio. Campanha encerrada com saldo em aberto tem que aparecer na cobrança
  por padrão, senão a dívida desaparece junto com a campanha.
- **Faixa de valor.** Ordenar por saldo resolve a mesma coisa em um clique.

---

## 9. Previsão de recebimentos · não "fluxo de caixa"

**Crítica ao pedido:** o sistema não conhece nenhuma saída. Não há custo de tecido, de mão de
obra, de frete nem imposto. Chamar de fluxo de caixa cria a expectativa de saldo projetado, e
a primeira pergunta da responsável vai ser "por que não desconta o custo?". O nome honesto é
**Previsão de recebimentos**, e ele cabe dentro de `/receber`, não em rota própria.

**Realizado** já é `/recebimentos`. **Previsto** é a soma das parcelas por vencimento futuro.

Números que a tela mostra, todos derivados de `vw_parcela`:

- Recebido hoje, na semana, no mês (com o mês anterior ao lado)
- Vence em 7 dias, vence em 30 dias
- Vencido, com o mais antigo em dias
- Tabela de próximos vencimentos, agrupada por semana, com valor, contagem de parcelas e
  link para a lista daquela semana

O gráfico Previsto x Realizado (§7.3) mora aqui.

Registro de risco: a segunda parcela vence na entrega prevista da campanha, então a previsão
tem picos, não fluxo contínuo. Ela vale para saber "a semana da entrega da Cláudio Brandão
traz R$ X", não para média mensal. Isso muda como a tela agrupa: por semana e por campanha,
nunca só por mês.

---

## 10. Financeiro por escola, campanha e turma

### 10.1 `/painel/financeiro/posicao`

Uma tabela, quatro abas: Escolas, Campanhas, Turmas, Produtos. Mesmas colunas nas três
primeiras, o que muda é a linha. Isso substitui cinco dos nove relatórios pedidos.

| Coluna | Nota |
|---|---|
| Nome | escola, campanha ou turma. Campanha mostra a escola em legenda |
| Vendido | direita |
| Recebido | direita, com % arrecadado em legenda |
| A receber | direita |
| Vencido | direita, vermelho quando maior que zero |
| Inadimplência | direita, pela definição do §3.6 |
| Pedidos | centro |
| Alunos | centro, por nome distinto |

Ordenável por qualquer coluna, padrão em Vencido desc. Escolas e Campanhas expandem uma
linha para mostrar o nível abaixo, sem sair da tela. Clicar no nome vai para a página da
entidade.

A aba Produtos troca Alunos por Peças e acrescenta Ticket médio, e é o `ResumoProdutos` que
já existe, com as colunas financeiras completas.

### 10.2 Aba Financeiro do cliente

Hoje o cliente já mostra uma coluna de totais. A aba acrescenta:

- Os quatro cartões da carteira, no escopo do cliente
- Campanhas do cliente na tabela do §10.1, uma linha cada
- Turmas com maior saldo em aberto, cinco linhas
- Próximos vencimentos por semana
- Link para `/receber` já filtrado nesse cliente

Sem gráfico. Uma escola tem uma campanha viva por vez, e série temporal de uma campanha é o
gráfico da campanha.

### 10.3 Aba Financeiro da campanha

A campanha já tem quase tudo: financeiro, quitados, três filas de cobrança e a lista de
turmas. O que falta:

- **Vencido pela régua certa**, substituindo o `atrasado_centavos` de hoje (§2.1)
- **Arrecadado contra o prazo:** "62% arrecadado, entrega em 23 dias". É o alerta mais útil
  da campanha e não existe. Uma linha, não um cartão
- **Próximos vencimentos** da campanha, por semana
- **Gráfico Vendido x Recebido** da campanha, o mesmo componente do §7.1
- **Exposto em produção** da campanha

Nada aqui é rota nova. É a aba que já existe recebendo cinco blocos.

### 10.4 Aba Financeiro da turma

Nova aba na turma, ao lado de Pedidos e Produção. Escopo da turma e nada mais.

- Cartões: Vendido, Recebido com percentual, A receber, Vencido
- Contagem: pedidos, alunos, alunos quitados, alunos com saldo
- Tabela com a unidade **parcela**, igual à do §6 sem as colunas de escola e campanha, que
  são constantes aqui
- Filtros: situação, busca por aluno. Ordenação por saldo e por atraso
- Ações: abrir pedido, registrar pagamento, exportar

Uma turma quitada mostra estado próprio, não uma tabela vazia: "As 31 pessoas desta turma
estão quitadas". É o estado que a representante quer ver.

---

## 11. Status e badges

O schema já separa o que o pedido pede para separar, e em três eixos, não dois:

| Eixo | Coluna | Valores |
|---|---|---|
| Existência | `pedido.status` | `ativo`, `cancelado` |
| Operação | `pedido.status_producao` | `aguardando`, `liberado`, `em_producao`, `pronto`, `entregue` |
| Dinheiro | derivado, `vw_pedido.status_pagamento` | `pago`, `parcial`, `atrasado`, `pendente` |

As palavras do §2.1 são a leitura desse eixo na tela, não valores novos no banco: **Atrasado**
é `atrasado`, **Entrada incompleta** é `atrasado` ou `parcial` sem `entrada_paga`, **Vencido** é
`pendente` com parcela vencida. Nenhum enum muda.

Sobre a lista do pedido: `novo` e `confirmado` são `aguardando` e `liberado`, e os nomes atuais
são melhores, porque dizem o que a oficina pode fazer. `cancelado` não é estado de produção,
é `pedido.status`, e misturar traria de volta a confusão que a separação resolve.

**`estornado` não existe e é uma lacuna real.** `pagamento.valor_centavos` tem
`check (> 0)` e a tabela é append-only. Hoje, baixa lançada errada não tem desfazer: só um
`delete` direto no banco, que quebra a promessa de append-only e não deixa rastro. Numa
operação que registra dinheiro na mão, isso vai acontecer na primeira semana.

Proposta, e é decisão pendente: manter append-only e permitir valor negativo com motivo
obrigatório, ou seja, trocar o check por `valor_centavos <> 0` mais um
`check (valor_centavos > 0 or motivo is not null)`. Todo cálculo do sistema é soma, então
saldo, status e liberação continuam certos sem tocar em nenhuma view. O trigger de produção
não reage a estorno de propósito: peça que já foi para a oficina não volta.

**Forma visual:** chip tom sobre tom, sem bolinha, com texto obrigatório. Já decidido em
§5.1.2 do `CLAUDE.md` e o Financeiro não abre exceção. Mais duas regras para tabela densa:

- **Selo só na exceção.** Na tabela de parcelas em aberto, "pendente" é o normal e não leva
  selo. Vencido leva. Uma coluna com 136 chips coloridos é confete, não informação.
- **Coluna Status morre quando a coluna Atraso existe.** `18 dias` em vermelho já diz vencido.
  Duas colunas para o mesmo fato é a mesma redundância dos quatro números do cartão antigo.

---

## 12. Relatórios e exportação

Nove relatórios foram pedidos. Cinco deles são a mesma tabela do §10.1 com outro agrupamento,
e três são a tabela do §6 com outro filtro. Manter nove significa nove consultas para manter
e nove chances de dois números discordarem.

**Decisão: cinco relatórios, e três deles são o botão Exportar de uma tela que já existe.**

| Relatório | Linha | Onde vive | Cobre o que foi pedido |
|---|---|---|---|
| Contas a receber | parcela | exportar de `/receber` | contas a receber, inadimplência, alunos pendentes |
| Recebimentos | pagamento | exportar de `/recebimentos` | relatório de recebimentos |
| Posição | agregado | exportar de `/posicao`, por aba | por escola, por campanha, por turma, por produto |
| Vendas por período | dia, semana ou mês | exportar da visão geral | vendas por período |
| Inadimplência histórica | mês | fase 3, ver §7.4 | inadimplência ao longo do tempo |

**Toda exportação respeita o filtro da tela.** Sem exceção, e o nome do arquivo carrega o
escopo e a data, como a exportação de produção já faz.

**Formato:** CSV, uma linha por registro, sem estilo. É o formato que a conciliação pede,
abre no Excel e no Sheets, e o projeto não precisa de biblioteca nova.

Sobre os outros dois formatos:

- **XLSX** já existe em `lib/planilha/`, mas aquilo é o modelo de papel da produção, com
  estilo copiado byte a byte do arquivo da empresa. Relatório financeiro não é aquele modelo.
  Se precisar de abas, `xlsx.ts` serve de base, e é fase 2.
- **PDF** fica fora. Exige biblioteca ou renderização, e o mesmo resultado sai de uma folha
  de estilo de impressão na própria tela, que dá layout melhor por custo quase zero.
  Registrado como fase 3.
- **Resumido x detalhado** vira uma coisa só: o resumido é a exportação de `/posicao`, o
  detalhado é a de `/receber`. Não é uma opção dentro do mesmo relatório.

---

## 13. Drill-down · mapa de destinos

A regra é dura: **todo número em reais na tela é um link**, e o destino é sempre uma lista de
linhas cuja soma é exatamente aquele número. Se a soma não fecha, o link está errado.

| Número | Destino |
|---|---|
| Atrasado, em qualquer escopo | `/receber?modo=atrasado` com o escopo aplicado |
| Entrada incompleta | `/receber?modo=entrada_incompleta` |
| Vencido | `/receber?modo=sem_pagamento` |
| A receber | `/receber?modo=tudo` |
| Recebido, e Recebido hoje | `/recebimentos` com o período |
| Peça na oficina com atraso | `/receber?modo=atrasado&producao=liberado` |
| Faixa de atraso | a própria tabela filtrada |
| Ponto do gráfico Vendido x Recebido | `/recebimentos` naquele intervalo |
| Semana de Previsto x Realizado | `/receber?vencimento=<semana>` |
| Linha de escola, campanha ou turma | a página da entidade, aba Financeiro |
| Inadimplência de uma turma | `/receber?modo=atrasado&turma=<id>` |

Cada linha da lista de destino abre a gaveta do pedido, que é onde a baixa acontece. É o
caminho completo, do número agregado até a ação, sem sair para uma tela morta.

---

## 14. Alertas

Sem notificação, sem push, sem sino. Um bloco na visão geral, chamado **Precisa de atenção**,
com no máximo cinco linhas, cada uma com valor, contagem e link. Aparecer ali é o alerta.

**Regras que ficam:**

| Regra | Por que exige ação hoje |
|---|---|
| Parcelas vencendo hoje | é a ligação preventiva, a mais barata que existe |
| Atrasado há mais de 30 dias | passou do lembrete, virou risco |
| Campanha com arrecadação baixa perto da entrega | é a única que ainda dá tempo de corrigir. Régua: menos de 80% arrecadado a menos de 30 dias da entrega prevista |
| Turma com atraso acima do dobro da média da campanha | aponta problema local, quase sempre de representante |
| Peça na oficina com parcela vencida | dinheiro exposto contra tecido já cortado |
| Entrada incompleta | é a ligação de maior conversão da lista, §2.2 |
| Pedidos sem pagamento vencidos há mais de 30 dias | fila de possíveis desistências, §6.1. Cada um deles infla a carteira até ser cancelado |

**Inconsistência financeira** merece definição, porque o pedido usa o termo sem dizer o que é.
Três checagens concretas, todas em SQL simples, todas coisas que quebram confiança se
passarem:

1. Soma das parcelas diferente de `pedido.valor_centavos`
2. Pagamento maior que o valor da parcela
3. Pedido liberado sem entrada paga e sem `producao_forcada`

Isso não é alerta de rotina, é checagem de integridade. Vive em `/painel/config`, com botão
para rodar, e não polui a visão geral. Se algum dia der resultado diferente de zero, aparece
no topo do Financeiro em vermelho.

**Cortados:** aumento de inadimplência (precisa da série histórica, fase 3) e pagamento sem
conciliação (não existe gateway, então não existe o que conciliar. Volta junto com o gateway,
e aí a régua é `provider_status` divergente).

---

## 15. Histórico e auditoria

Metade já existe e não está sendo mostrada. `pagamento` é append-only, guarda `registrado_por`,
`pago_em`, `criado_em`, `metodo`, `provider` e `comprovante_url`, e `acoes.ts` já preenche o
`registrado_por` de cada baixa. Isso é a trilha de "pagamento criado" e "pagamento registrado
manualmente", pronta e invisível.

O que falta:

- **Mostrar.** Aba Histórico na gaveta do pedido: cada pagamento com valor, método, data e
  quem lançou. Hoje a gaveta lista pagamentos por parcela, sem quem lançou.
- **Escrever em `alteracao`** nas ações financeiras. A tabela existe (`entidade`, `campo`,
  `valor_antes`, `valor_depois`, `por`, `em`), é usada para alteração de pedido e não para
  dinheiro. As ações que precisam registrar: vencimento alterado, desconto aplicado, pedido
  cancelado, estorno lançado, liberação forçada com motivo.
- **Desconto não existe como conceito.** Alterar `pedido.valor_centavos` depois de criado
  quebra o snapshot, que é o que protege o histórico. A forma correta é uma parcela de valor
  ajustado ou um lançamento negativo, e isso depende da mesma decisão de estorno do §11.
  Enquanto não houver decisão, desconto se faz baixando a parcela com valor menor e
  escrevendo em `pedido.observacoes`.
- **Auditoria global** é relatório, não tela: linha do tempo de todos os lançamentos com
  filtro por pessoa e período. Fase 3, e a consulta é trivial.

Toda linha de histórico responde três coisas e nada mais: o que aconteceu, quando, quem fez.

---

## 16. Trabalho de banco

**Autorizado em 11/08/2026:** três views e três colunas novas nas views de resumo. Nenhuma
tabela nova, nenhuma alteração destrutiva, nada que quebre tela existente.

**`vw_conta_receber`** · linha = parcela, com o caminho inteiro já resolvido.

```
parcela_id, pedido_id, numero, eh_entrada,
valor_centavos, pago_centavos, saldo_centavos, status,
vencimento, dias_atraso, faixa_atraso,
aluno_nome, aluno_telefone, produto,
grupo_id, grupo_nome, campanha_id, campanha_nome, cliente_id, cliente_nome,
status_producao, pode_produzir, origem
```

Ela sozinha alimenta `/receber`, as faixas, os rankings, a previsão, as três abas de
Financeiro por entidade e três dos cinco relatórios. É a peça central do módulo. Sem ela,
cada tela junta parcela com grupo, campanha e cliente na aplicação, e cada uma junta de um
jeito ligeiramente diferente.

**`vw_recebimento`** · linha = pagamento, com o mesmo caminho, mais `metodo`, `provider`,
`registrado_por` e o nome de quem registrou. Alimenta `/recebimentos`, o indicador de dinheiro
direto e o relatório de recebimentos.

**`vw_movimento_dia`** · linha = dia, com `vendido_centavos` e `recebido_centavos`. Duas
agregações unidas por dia. Alimenta o gráfico do §7.1 e o relatório de vendas por período.
Alternativa mais barata: agregar na aplicação a partir das duas views acima, já que a janela
inteira do banco tem quatro meses e algumas centenas de linhas. Decidir na hora de construir.

**Três colunas nas views de resumo**, em `vw_grupo_resumo`, `vw_campanha_resumo` e
`vw_cliente_resumo`, uma por grupo do §2.1, todas com a régua da parcela:

```
atrasado_vencido_centavos     pagou algo, saldo já vencido
entrada_incompleta_centavos   pagou parte da entrada, não liberado, vencido
vencido_centavos              nunca pagou nada, entrada vencida
```

`atrasado_centavos` fica exatamente como está, sem toque. Assim a campanha, o cliente e a
turma migram uma tela por vez, e nenhuma quebra no caminho. Quando todas tiverem migrado, a
coluna antiga sai numa migration de uma linha.

**Sobre `dias_atraso` em `vw_conta_receber`:** é da parcela, contado do vencimento até hoje em
São Paulo, e é o que alimenta as faixas. Parcela quitada tem `dias_atraso` nulo, não zero:
zero significaria "vence hoje", que é outra coisa e aparece no alerta preventivo.

**Desempenho.** São ~600 pedidos por campanha e ~1.200 parcelas, e o banco responde em
milissegundos. O custo real é a viagem até ele, que o `emCache` já resolve com a tag
`painel`. Nada de view materializada agora. Se um dia a série diária passar de alguns milhares
de linhas, o candidato é `vw_movimento_dia`, e só ela.

**Armadilha registrada:** `emCache` serializa o retorno, então nenhuma dessas leituras pode
devolver `Map`. Já está escrito no `CLAUDE.md` e o Financeiro é justamente onde a tentação de
devolver mapa agrupado vai aparecer.

---

## 17. Fases

Aviso honesto: o protótipo é amanhã, 12/08/2026, e este módulo inteiro não cabe em um dia.
O que cabe é a fase 1, e ela é suficiente para a demonstração responder as cinco perguntas
do §1.

**Fase 1 · o que demonstra**

1. `vw_conta_receber` e `vencido_centavos` nas views de resumo
2. Visão geral: posição, movimento, exposto em produção, atenção, concentração
3. `/receber` completo, com os quatro modos (Tudo, Atrasado, Entrada incompleta, Sem
   pagamento), faixas, rankings e drill para a gaveta
4. Cancelamento em lote no modo Sem pagamento, com aviso quando há dinheiro pago (§6.1)
5. Aba Financeiro na turma
6. Exportar CSV das duas telas
7. Gráfico Vendido x Recebido, com `Delta`, sparkline nos três cartões de posição e o feed de
   últimas entradas (§19.8)

**Fase 2 · o que a operação vai pedir na primeira semana**

8. `/recebimentos` e `vw_recebimento`
9. `/posicao` com as quatro abas
10. Previsão de recebimentos e o gráfico Previsto x Realizado
11. Abas Financeiro em cliente e campanha
12. Indicador de dinheiro que entrou direto
13. Aba Histórico na gaveta do pedido
14. Ver e reativar pedido cancelado (§6.1)

**Fase 3 · o que depende de decisão ou de dado que não existe**

15. Estorno e desconto, junto com a escrita em `alteracao`
16. Inadimplência histórica e seu relatório
17. Checagem de integridade em `/config`
18. Registro de cobrança, que devolve "última cobrança" à tabela
19. Impressão em PDF

---

## 18. Decisões

### Fechadas em 11/08/2026

| # | Decisão | Efeito |
|---|---|---|
| 1 | **Atrasado é quem pagou algo, Vencido é quem não pagou nada**, os dois pela régua da parcela | R$ 3.205,05 atrasado e R$ 4.356,35 vencido, no lugar de um R$ 4.619,10 que errava para os dois lados |
| 2 | **Migration autorizada:** três views mais três colunas de resumo | fase 1 liberada para começar |
| 3 | **Peça na oficina com pagamento vencido é o número de risco**, R$ 1.793,60 em 29 pedidos | deixou de ser cartão próprio, é a legenda do cartão Atrasado |
| 4 | **Entrada incompleta ganhou nome e fila própria**, o caso do meio que ninguém previu | R$ 1.411,45 em 28 pedidos, §2.2 |
| 5 | **Pagar atrasado continua liberando a produção**, sem porta que fecha no vencimento | já funciona no banco, nada a construir, §2.3 |
| 6 | **Pedido sem pagamento e vencido pode ser cancelado**, inclusive em lote, e sai dos relatórios | §6.1, modo Sem pagamento em `/receber` |

### Ainda em aberto

1. **Estorno.** Ficou para depois, por decisão do usuário. Consequência aceita: baixa lançada
   errada só sai com `delete` direto no banco, sem rastro, e cancelar pedido com dinheiro pago
   não tem como devolver dentro do sistema. A conversa volta quando aparecer o primeiro caso
   real, e a proposta continua sendo lançamento negativo com motivo, mantendo append-only.
2. **Nome das sub-rotas.** Ficou decidido que o nome sai do que a tela pede, na hora de
   construir cada uma, e não agora. Os nomes deste documento são provisórios.

---

## 19. Direção visual · o que sai das referências

Vinte e cinco imagens em `referencias adm/`, três famílias: **Shopify** (cartão com delta e
sparkline, tema claro), **dashboards SaaS escuros** (grid de widgets, gauge, donut) e **Power BI
financeiro brasileiro** (fluxo de caixa, aging, ranking, previsão). O que segue separa o que
adoto, o que adapto e o que não copio, com o motivo em cada caso.

### 19.1 O padrão que as referências boas repetem

Cinco coisas aparecem em quase todas, e as cinco entram:

1. **Cartão de um número.** Rótulo pequeno em cima, número grande, uma linha de apoio embaixo.
   O Shopify Finance Overview faz isso 16 vezes seguidas e nunca mistura dois números no mesmo
   cartão. É a regra §5.1.1 do `CLAUDE.md` já validada por quem vive disso.
2. **Delta contra o período anterior, dentro do cartão.** Seta, percentual e a frase do que
   está sendo comparado ("vs ontem", "vs mês anterior", ou a data exata, como o Shopify faz
   com "Dec 31 vs Dec 24"). É o que transforma número em notícia.
3. **Sparkline no cartão.** Linha miúda, sem eixo, sem rótulo, só a forma. Diz "está subindo"
   sem gastar um gráfico inteiro.
4. **Aging em faixas.** O dashboard de Financial Management usa exatamente `Current, 1-30,
   31-60, 61-90, 91+` em barras. É o vocabulário padrão de contas a receber no mundo inteiro,
   e valida as faixas do §7.2. Ajuste: as nossas começam em 1 a 7 dias, porque aqui a entrada
   vence sete dias depois do pedido e a primeira semana é onde a cobrança funciona.
5. **Ranking com barra.** "Best sellers", "Cancellation reason", "Ranking de faturamento por
   pacote": lista curta, nome à esquerda, número à direita, barra proporcional atrás ou
   embaixo. É a forma dos nossos rankings de escola, campanha e turma.

Duas peças que eu não tinha proposto e que saem das referências:

6. **Feed de últimas entradas.** O painel escuro tem "Transaction history" na coluna da
   direita, e o ACRU também. Para nós, é a resposta em lista para "entrou dinheiro desde
   ontem?": as últimas dez baixas com aluno, valor, método e hora. Um cartão diz o total, o
   feed diz de quem veio. Entra na visão geral.
7. **Meta com progresso.** O "Goal tracker" e o "Monthly spending limit" mostram alvo e
   quanto falta. Nosso alvo natural é **arrecadar 100% antes da entrega**, que já está no §10.3
   como "62% arrecadado, entrega em 23 dias". A referência mostra a forma: barra com marca de
   onde deveria estar, não só onde está.

### 19.2 O que não copio, e por quê

| Da referência | Decisão | Motivo |
|---|---|---|
| Tema escuro (metade das imagens) | não | tema claro nos dois lados, decidido no `CLAUDE.md`. As imagens escuras servem pela estrutura, não pela cor |
| Gauge, o velocímetro (AOV, DSO, Current Ratio) | não | ocupa a área de um gráfico para mostrar um número e uma régua que ninguém sabe ler. O número sozinho diz mais |
| Donut e pizza (despesas por categoria, sessões por device) | não | onde eu usaria donut é composição do recebido por método, e são três fatias. Barra empilhada de uma linha responde igual e cabe em qualquer largura |
| Waterfall de fluxo mensal, entradas contra saídas | não | não existe saída no sistema. Já é o motivo de não chamar nada aqui de fluxo de caixa (§9) |
| Contas a pagar, saldo por banco, DRE, margem | não | a empresa não lança despesa aqui. Prometer isso na tela é prometer um ERP |
| Célula pintada tipo heatmap (Shopify inventory) | não | vira planilha, e planilha não tem hierarquia: tudo grita junto. No lugar, uma barra fina na coluna que importa |
| Grid de 16 indicadores iguais (Finance Overview) | parcial | como home é ruim, nada se destaca. Vira uma faixa secundária de no máximo seis, abaixo do que decide |
| Mapa | não | uma cidade |
| Trilha lateral de filtros (Eletronic Vendas) | adapto | filtro em barra horizontal no topo, que é o que sobrevive no celular. O que copio é o botão "limpar filtros", que essas telas têm e a nossa precisa |
| Notificações e atividades na coluna direita | não | é o nosso bloco "Precisa de atenção" (§14), e não precisa de coluna própria |

### 19.3 Componentes

**Já existem e são reaproveitados:** `Kpi`, `Kpis`, `Barra`, `Valor`, `Chips`, `Abas`,
`SubAbas`, `Topo`, `Retratil`, `Bloco`, `Quitados`, `Selo`, `Busca`, `Gaveta`,
`DetalhePedido`, `MenuAcoes`, `ResumoProdutos`.

**Novos, sete, todos pequenos:**

| Componente | O que faz | Nota |
|---|---|---|
| `Delta` | seta, percentual e a frase da comparação | verde e vermelho vêm de `success` e `danger`, que já existem em `globals.css`. Seta e sinal junto com a cor, nunca só cor |
| `Linha` | gráfico de linha em `svg`, uma ou duas séries | pontilhado para a série de comparação, como o Shopify faz |
| `Faixa` | sparkline de cartão, sem eixo nem rótulo | mesma função do `Linha`, com altura de 32px e nenhum texto |
| `Barras` | barras pareadas por semana | Previsto x Realizado (§7.3) e o aging |
| `Ranking` | lista curta com nome, valor e barra proporcional | escolas, campanhas, turmas |
| `Modos` | botões de filtro com o valor dentro | os quatro modos de `/receber`, mesma ideia dos tamanhos na Produção |
| `Entradas` | feed das últimas baixas | aluno, valor, método, hora, link para o pedido |

Nenhum precisa de biblioteca de gráfico. Linha, sparkline e barras são `svg` escrito à mão,
como a planilha `.xlsx` já é escrita à mão neste projeto. Uma dependência de charting para
três formas é peso em toda página do painel.

### 19.4 Wireframe · visão geral

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Financeiro                    [30 dias ▾] [Escola ▾] [Campanha ▾]  limpar    │
├──────────────────────────────────────────────────────────────────────────────┤
│ POSIÇÃO                                                                      │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                     │
│ │ Vendido        │ │ Recebido       │ │ A receber      │                      │
│ │ R$ 57.867,40   │ │ R$ 35.406,71   │ │ R$ 22.460,69   │                      │
│ │ 447 pedidos    │ │ 61% arrecadado │ │ 7.561 fora do  │                      │
│ │ ▁▂▄▆█▆▄        │ │ ▁▂▃▅▆▇█        │ │ prazo          │                      │
│ └────────────────┘ └────────────────┘ └────────────────┘                      │
│                                                                              │
│ PRECISA DE COBRANÇA                                                          │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                     │
│ │ Atrasado       │ │ Entrada        │ │ Vencido        │                      │
│ │ R$ 1.793,60 ▲  │ │ incompleta     │ │ R$ 4.356,35    │                      │
│ │ 29 pedidos     │ │ R$ 1.411,45    │ │ 61 pedidos     │                      │
│ │ peça na oficina│ │ 28 pedidos     │ │ há 103 dias    │                      │
│ └────────────────┘ └────────────────┘ └────────────────┘                      │
│                                                                              │
│ MOVIMENTO                                                                    │
│ Recebido hoje R$ 840,00 ▲ 12% vs ontem  ·  no mês R$ 6.230,00 ▼ 4% vs julho  │
│ Vence em 7 dias R$ 2.100,00                                                  │
│                                                                              │
│ ┌ Precisa de atenção ─────────────────────────────────────────────────────┐  │
│ │ 4 parcelas vencem hoje                              R$ 320,00        →  │  │
│ │ Cláudio Brandão · 62% arrecadado, entrega em 23 dias                  →  │  │
│ │ Turma 3B · atraso 2,4x a média da campanha          R$ 890,00        →  │  │
│ └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│ ┌ Vendido x Recebido ───────────────────┐ ┌ Últimas entradas ─────────────┐  │
│ │                              ╱╱       │ │ Ana Paula   R$ 79,90  pix 14h │  │
│ │                        ╱╱╱╱╱╱  vendido│ │ Lucas M.    R$ 79,90  pix 13h │  │
│ │              ╱╱╱╱╱╱╱╱ ┄┄┄┄┄┄  recebido│ │ Bruno S.    R$ 40,00  din 11h │  │
│ │ abr    mai    jun    jul    ago       │ │ ...                        →  │  │
│ └───────────────────────────────────────┘ └───────────────────────────────┘  │
│                                                                              │
│ ┌ Onde está concentrado ────────────────────────────────────────────────────┐│
│ │ Cláudio Brandão   ████████████████  R$ 5.120,30   58% arrecadado       → ││
│ │ Vega Log          ██████            R$ 1.740,00   71% arrecadado       → ││
│ └───────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│ 87,6% do recebido entrou direto pelo sistema, sem passar pelo representante   │
└──────────────────────────────────────────────────────────────────────────────┘
```

No celular tudo empilha na mesma ordem, os cartões viram dois por linha, e o gráfico mantém a
largura da tela com altura menor. Nada de scroll horizontal na página.

### 19.5 Wireframe · a receber

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← A receber              [Escola ▾] [Campanha ▾] [Turma ▾]  buscar aluno ⌕    │
├──────────────────────────────────────────────────────────────────────────────┤
│ [ Tudo 22.460,69 ] [ Atrasado 3.205,05 ] [ Entrada incompleta 1.411,45 ]      │
│ [ Sem pagamento 4.356,35 ]                                                   │
│                                                                              │
│ Atraso  [1-7d 420,00] [8-15d 610,00] [16-30d 980,00] [31-60d 1.190,00] [+60d]│
│                                                                              │
│ ▸ Escolas com mais atraso   ▸ Campanhas   ▸ Turmas          (retráteis)      │
│                                                                              │
│ Aluno              Turma   Produto    Parc.  Valor    Pago    Falta   Atraso │
│ ─────────────────────────────────────────────────────────────────────────────│
│ Ana Paula Souza    3B      Camiseta   2 de 2  39,95    0,00    39,95   34 d ⋮│
│ (31) 9 8888-1234                                                             │
│ Bruno Silva        3A      Moletom    1 de 2  64,95   30,00    34,95   12 d ⋮│
│ (31) 9 7777-0000                                                             │
│ ─────────────────────────────────────────────────────────────────────────────│
│ 136 parcelas                                             Total  R$ 7.561,40  │
│                                                              [ Exportar CSV ]│
└──────────────────────────────────────────────────────────────────────────────┘
```

No modo Sem pagamento, a tabela ganha caixa de seleção na primeira coluna e o rodapé ganha
`Cancelar selecionados`, com confirmação que diz quantos e quanto (§6.1). Abaixo de 768px cada
linha vira um bloco com aluno e telefone em cima, falta e atraso na segunda linha, e as ações
no canto.

### 19.6 Wireframe · posição

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Posição            [ Escolas ] [ Campanhas ] [ Turmas ] [ Produtos ]        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Escola             Vendido    Recebido   A receber  Fora do prazo  Ped. Alunos│
│ ──────────────────────────────────────────────────────────────────────────────│
│ ▸ Cláudio Brandão  45.986,40  28.120,00  17.866,40      5.120,30   355    291 │
│                               61% ▁▃▅                                        │
│ ▸ Vega Log         11.880,00   7.286,71   4.593,29      1.740,00    92     78 │
│                               71% ▁▄▆                                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

Ordenável por qualquer coluna, `▸` abre o nível de baixo na própria linha. Dinheiro à direita,
contagem ao centro, percentual como legenda do recebido com a barra fina. Sem célula pintada.

### 19.7 Vocabulário de tela, em português

As referências brasileiras trazem palavras que a responsável já conhece, e elas valem mais que
tradução literal de dashboard: **Entradas** para pagamentos recebidos, **Previsão** para o que
vence adiante, **Ranking** para as listas de concentração, **Fora do prazo** para o conjunto do
que venceu. "Aging", "AOV", "DSO", "MER" e "churn" não aparecem em nenhuma tela.

Uma palavra da referência internacional que vale adaptar: **DSO**, dias médios para receber. É
útil e não existe no plano. Nome na tela: **"leva X dias, em média, entre o pedido e o
pagamento da entrada"**. Frase, não sigla, e vive no relatório, não no topo.

### 19.8 Decisões visuais · fechadas em 11/08/2026

| Decisão | Regra |
|---|---|
| **Verde só no delta** | seta para cima em `success`, para baixo em `danger`, e **apenas dentro do delta de variação**. Botão, moldura, seleção e estado ativo continuam pretos. A seta acompanha a cor sempre, então a informação nunca depende só dela |
| **Sparkline só nos três cartões de posição** | Vendido, Recebido e A receber. Os três cartões de cobrança ficam sem: ali o que decide é o valor e a lista, não a tendência |
| **Feed de últimas entradas na visão geral** | dez últimas baixas, ao lado do gráfico, com aluno, valor, método e hora, cada linha abrindo o pedido |
| **Barra de meta com marca do esperado** | a barra mostra o arrecadado e um traço no percentual esperado para o dia, calculado pelo caminho entre a abertura da campanha e a entrega prevista. É o que deixa o atraso de arrecadação visível de longe |

### 19.9 Tokens de série · definidos em 11/08/2026

Quatro, em `app/globals.css`, ao lado dos outros. Duas séries e nada mais: no financeiro, uma
linha é o que aconteceu e a outra é a referência.

```
--color-serie        #0e1416   realizado, recebido · a série que manda
--color-serie-2      #4a5658   previsto, período anterior · sempre tracejada
--color-serie-fundo  #edf0f0   preenchimento sob a linha principal
--color-serie-eixo   #e4e8e8   linha de base e guias horizontais
```

Nem verde nem azul entram em série. Os dois já significam estado em todo o painel, e cor de
série que também significa situação faz o leitor perguntar se a linha está boa ou ruim. O
ciano fica fora da série e volta só quando o gráfico precisa apontar um ponto, que é o uso
restrito da marca.

No gráfico Vendido x Recebido, o **recebido** é a série sólida com preenchimento e o
**vendido** é a tracejada. É proposital: o vendido é o teto a alcançar, o recebido é o que
existe de verdade, e é a distância entre os dois que a tela está mostrando.

**Nomes de componente que mudaram** do plano para o código, para não colidir com nomes já
usados: `Faixa` virou `Fio` (a sparkline; `Faixa` já era o tipo da faixa de atraso) e `Linha`
virou `Curvas` (duas curvas acumuladas; `Linha` já é item de navegação).

Consequência da barra de meta, e vale registrar porque é regra de negócio disfarçada de
visual: o esperado assume arrecadação linear no tempo, o que não é verdade, campanha vende em
pico no começo. Então a marca é referência, não meta contratual, e o texto ao lado nunca diz
"atrasado", diz o percentual e os dias que faltam. Se isso incomodar na tela pronta, a marca
sai e a barra continua.

---

## 20. O que já está construído · 11/08/2026

Fase 1 no ar, exceto a barra de meta e a previsão semanal, que são da campanha e da fase 2.

**Banco**, migration `financeiro_views`, aplicada e conferida contra a medição manual:

| Objeto | Linha | Serve |
|---|---|---|
| `vw_conta_receber` | parcela | cobrança, faixas, rankings, previsão, aba da turma, CSV |
| `vw_recebimento` | pagamento | feed de entradas e o percentual que entrou direto |
| `vw_movimento_dia` | dia | gráfico Vendido x Recebido e o movimento do período |
| `atrasado_vencido_centavos`, `entrada_incompleta_centavos`, `vencido_centavos` | coluna | as três colunas nas views de resumo de grupo, campanha e cliente |

`atrasado_centavos` não foi tocada. As telas antigas migram uma por vez.

**Código**

| Arquivo | O que é |
|---|---|
| `lib/contas.ts` | as contas, puro, sem banco. Toda régua do módulo mora aqui |
| `lib/contas.test.mts` | 40 asserções: janela, os três grupos, faixas, ranking, previsão, série, variação |
| `lib/financeiro.ts` | só consulta, quatro leituras com `emCache` |
| `lib/data.ts` | ganhou `hojeNoFuso`, `somarDias`, `diasEntre`, `segundaDe` |
| `components/financeiro.tsx` | `Delta`, `Fio`, `Curvas`, `Modos`, `Ranking`, `Entradas`, `FaixasAtraso` |
| `components/financeiro-turma.tsx` | a aba Financeiro da turma |
| `app/painel/(area)/financeiro/page.tsx` | a visão geral |
| `app/painel/(area)/financeiro/receber/page.tsx` | contas a receber, quatro modos |
| `app/painel/(area)/financeiro/receber/csv/route.ts` | exportação, respeitando o filtro |
| `app/painel/acoes.ts` | `cancelarPedidos`, o lote |

Nenhuma dependência nova. Os três gráficos são `svg` de servidor, e o `package.json` continua
com as mesmas oito.

**Decisões que o código fechou, e que valem como registro:**

- **Cancelamento em lote recusa pedido com pagamento**, e a conferência é no banco, não na
  tela: a lista de ids vem da URL e pode estar velha. Quem já pôs dinheiro só é cancelado um a
  um, pela gaveta, onde a pessoa vê o valor pago antes de decidir.
- **A seleção do lote é formulário nativo em `GET`.** Marcar as caixas e enviar recoloca a
  seleção na URL, e a confirmação abre em cima. Sem estado no cliente, sem JavaScript, e a
  seleção sobrevive ao recarregar.
- **A aba Financeiro da turma é uma `prop`, não uma rota.** Só o painel da empresa a liga; a
  gestão do representante em `/t/[codigo]/gestao` usa a mesma `PlanilhaTurma` sem ela. Quando o
  papel de representante existir no banco, isso volta a ser permissão em vez de `prop`.
- **A rota do CSV checa `perfilEmpresa` por conta própria.** Ela está fora do grupo protegido, e
  download de dado financeiro da empresa inteira não pode depender de onde o link foi clicado.

**O que a fase 2 pega em seguida:** `/recebimentos`, `/posicao`, previsão semanal com o gráfico
Previsto x Realizado, as abas de cliente e campanha, e a barra de meta.

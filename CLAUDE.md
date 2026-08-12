# Nova Estampa · Sistema de Campanhas de Uniformes

Documento vivo. Registra o que **já está decidido**, o que está **em aberto** e o que está
**explicitamente adiado**. Atualizar a cada decisão nova.

---

## 1. Contexto

**Nova Estampa** é uma empresa de uniformes personalizados (camiseta de formatura, moletom,
outros). Atende escolas, faculdades e empresas. A produção é interna.

**Problema atual, tudo no papel.** A empresa distribui listas físicas nas salas. Cada turma
tem várias folhas com aluno, produto, tamanho, nome personalizado e pagamento. Resulta em:
aluno ausente no dia da lista, nome escrito errado, letra ilegível, dado incompleto,
alteração manual, lista perdida, dificuldade de consolidar várias turmas.

**Problema mais caro, o dinheiro.** Hoje o pagamento passa pelo representante de turma ou
pela comissão antes de chegar à empresa. Gera pagamento espalhado, pagamento parcial não
registrado, inadimplência, divergência de valor e conferência manual.

**O maior valor do sistema é o dinheiro passar a entrar direto na empresa.** O resto é
consequência. Isso é decisão de negócio da empresa, não só funcionalidade, e já foi
confirmada pelo usuário como o ponto mais importante do projeto.

**Entrega do protótipo: quarta-feira, 12/08/2026.**

---

## 2. Regras de trabalho

> ### PROIBIDO: travessão
>
> **Nunca usar o sinal de travessão em nenhuma parte deste projeto.** Nem em documento, nem
> em comentário de código, nem em texto de interface, nem em commit, nem em resposta ao
> usuário. Sem exceção.
>
> No lugar dele: vírgula, dois-pontos, ponto final, parênteses, ou `·` em títulos e listas de
> metadados.
>
> Motivo: é a assinatura mais reconhecível de texto gerado por IA, e este projeto inteiro
> depende de não parecer isso.

- **Etapa de UI liberada** (era travada até o usuário autorizar). A direção visual parte do
  **material e das referências dele**, nunca de proposta solta minha. **Perguntar antes de
  montar**, ele pediu isso explicitamente. Ver §5.
- Todos os documentos do projeto vivem **nesta pasta**.
- Postura esperada: parceiro de produto. Questionar decisão, apontar falha, simplificar,
  identificar funcionalidade desnecessária. Não concordar por concordar.
- Sempre separar: **essencial para o MVP** · **interessante** · **versão futura**.

---

## 3. Decisões travadas

### 3.1 Escopo e arquitetura geral

| Tema | Decisão |
|---|---|
| Tenancy | **Single-tenant.** Sistema exclusivo da Nova Estampa. Não é SaaS para outras estamparias. Sem `organizacao_id` no schema · adicionar depois é uma migration. |
| Produção | Interna, feita pela própria empresa |
| Gateway de pagamento | **Não integrar agora.** MVP terá tela realista que **simula** o pagamento |
| Cadastro de aluno | **Não existe cadastro prévio.** O pedido cria o aluno |

### 3.2 Modelo de domínio

A entidade "Escola" foi descartada como nome, a empresa atende escolas, faculdades e
empresas.

```
Cliente        (escola / faculdade / empresa)
  └─ Campanha  (ex. "Formatura 2026", prazos, produtos, preços, regras)
       └─ Grupo (turma 3B / turma ADM-4 / setor Logística)
            └─ Pedido → Itens
                       └─ Cobrança → Parcelas → Pagamentos
```

- `Grupo` tem **label configurável por campanha** ("Turma", "Sala", "Setor"), para servir aos
  três mercados sem mudar schema.
- **Campanha é a unidade de operação, não o cliente.** A mesma escola faz formatura em 2026 e
  2027, com produtos e preços diferentes. Cliente é cadastro; campanha é onde tudo acontece.
- **`grupo.alunos_esperados`** (int, opcional): a coluna existe no schema mas **saiu da
  interface em 10/08/2026**. Ela sustentava a métrica de adesão, e adesão exigia alguém
  informar quantos alunos a turma tem, o que ninguém fez. No lugar entrou **pedidos
  quitados**, que os próprios pedidos respondem. Contagem de alunos é por nome distinto:
  quem fez dois pedidos conta como uma pessoa.

**Volume de referência:** uma escola gerou ~420 pedidos de camisa + ~170 de moletom,
12 turmas. Ordem de grandeza: ~600 pedidos por campanha.

### 3.2.1 Catálogo, carrinho e produto casado

- **Preço não varia por tamanho.** Preço é do produto, ponto.
- **A grade inclui baby look.** Vem na mesma lista `tamanhos`, prefixada com `BL ` (`BL M`).
  Na escolha, a tela separa em dois blocos rotulados; em texto corrido vira "M baby look".
  Prefixo em vez de coluna nova: não muda schema e a produção lê o tamanho literal.
- **Personalização é por produto** (mudou em 11/08/2026; antes era obrigatória em todo
  produto). O moletom é o caso real: sai sem nome. O produto tem `exige_nome`, e quando ele
  é falso a tela de personalização some do fluxo, junto com a dupla digitação do apelido.
  **Resolvido em 11/08/2026:** o `CHECK length(trim()) > 0` de `pedido_item.nome_estampa`
  caiu e esses produtos gravam string vazia. Nulo obrigaria tratar a ausência em dez telas
  (planilha, gaveta, editar, revisão, carteira); vazio já cai bem em todas, e a coluna "Nome
  ou Apelido" da planilha (§3.8) sai em branco, que é o que o modelo de papel pede.
- **Produto tem situação, não um liga-desliga** (11/08/2026). São três estados:
  `a_venda` aparece na loja e vende, `pausado` aparece sem botão de pedir,
  `oculto` some da vitrine. `produto.ativo` continua existindo como **coluna
  gerada** (`situacao = 'a_venda'`), então todo código que já pergunta por ele
  segue valendo e a fonte da verdade continua sendo uma só.
- **Produto tem classe** (`camisa`, `moletom`, `polo`, `outro`), como `text` com
  `check` e não `enum`: acrescentar "boné" depois é trocar a constraint, não
  alterar tipo. Serve para agrupar e filtrar, nunca muda regra de negócio.
- **Parcelamento é do produto** (`max_parcelas`, 1 a 12). A campanha continua
  dona do percentual de entrada; o produto diz em quantas vezes o resto pode
  ser dividido, e o aluno escolhe na revisão, até esse teto. A primeira parcela
  é sempre a entrada, que é a que libera produção; `1` quer dizer à vista.
  Intermediárias vencem de 30 em 30 dias, a última na entrega prevista e
  **absorve a sobra de centavos**, porque a soma tem que bater com o total.
- **Produto pode ter prazos próprios** (`prazo_pedidos`, `prazo_alteracoes`).
  Nulos herdam os da campanha. Existe para fechar a camisa antes do moletom sem
  encerrar a campanha inteira, e é `coalesce(produto, campanha)` em toda regra,
  no banco e na tela.
- **Não existe carrinho com vários produtos.** Um pedido = um produto.
- **O aluno pode fazer quantos pedidos quiser**, várias camisetas, vários moletons. Não há
  limite por aluno nem por grupo.
- **Produto pertence à campanha.** Cadastrou dentro da campanha do Cláudio Brandão, existe só
  ali. Não há catálogo global. (Reaproveitar entre campanhas será resolvido por "duplicar
  campanha", que clona produtos e preços, v2.)
- **Existe "produto casado" (kit).** O admin cadastra camisa e moletom separadamente e depois
  cria um produto que inclui os dois, com preço próprio.

**Consequência de modelagem, o kit obriga `pedido → itens`:**

```
Pedido = 1 produto (simples ou kit)
Item   = 1 peça física  →  tamanho + nome_estampa próprios
```

Produto simples gera 1 item; kit gera N itens. O aluno precisa escolher tamanho por peça
(camisa M, moletom G) e o nome vai bordado em cada uma.

Ganho: **a lista de produção opera em itens, não em pedidos**, que é exatamente o que a
oficina consome. O resumo de corte sai de um `GROUP BY` nos itens.

UX prevista: o aluno digita o nome uma vez e ele se aplica a todas as peças do kit, com opção
de alterar por peça.

### 3.2.2 Pedido lançado pelo admin

O admin pode **criar pedido manualmente** pelo painel, digitando o nome do aluno. Existe
porque tem gente que paga em dinheiro na mão do representante ou não usa o sistema.

Consequência de modelagem: **o aluno é dado do pedido, não da conta de login.**

```
pedido.aluno_nome      not null   ← fonte da verdade em toda lista
pedido.aluno_telefone
pedido.perfil_id       nullable   ← null = lançado pelo admin
pedido.origem          'aluno' | 'admin'
pedido.criado_por      quem lançou
```

Efeito colateral bom: a lista de produção **não depende da auth**, que é provisória (§3.3).
Se a autenticação mudar depois da reunião, nada de produção quebra.

### 3.3 Autenticação e permissões · PROVISÓRIO

Auth definitiva e comportamento multi-tenant serão redefinidos após a reunião. **Não tratar
o que está abaixo como arquitetura final.**

**Duas portas de entrada do aluno. As duas terminam na vitrine:**

```
com link:   /t/[codigo]  → confirma turma → login → vitrine
sem link:   digita código → confirma turma → login → vitrine
```

O **login vem depois da confirmação de turma e antes da vitrine**. (Foi avaliada a variante
de deixar o login só no checkout, para reduzir fricção; o usuário optou por manter o login
antes da vitrine.)

- Login com **Google ou e-mail/senha**.
- Sessão persiste no dispositivo. Ao logar em outro aparelho com a mesma conta, cai direto
  na turma dele, com o pedido já feito.
- Código do grupo é **escolhido pelo admin** ao criar o grupo; o sistema valida se já existe.
- A confirmação mostra Cliente + Grupo + Campanha ("é essa sua turma?").
**Acesso à área da empresa: código da empresa, redefinível pela própria empresa.**

```
login normal → /painel pede o código → acertou → perfil.tipo = 'empresa' PERMANENTE
```

- O código fica na tabela `empresa_config` (linha única), **guardado só como hash**
  (`pgcrypto`/bcrypt), nunca em texto puro. Código do protótipo: **`NE2026`**, trocado em
  10/08/2026. O anterior (`NOVAESTAMPA2026`) era longo demais: 15 caracteres não cabiam no
  campo, que é centralizado e com espaçamento de letra. Código digitado no celular tem que
  ser curto.
- Comparação normalizada (`upper(trim())`), código digitado no celular não pode falhar por
  maiúscula ou espaço sobrando.
- **O acesso gruda na conta, não no código.** Trocar o código invalida apenas para quem ainda
  não entrou; quem já tem acesso continua tendo. Sem isso, rotacionar expulsaria a própria
  dona e ninguém rotacionaria nunca.
- `acesso_empresa` registra quem entrou e quando. É o que dá sentido a trocar o código: a
  empresa vê "7 contas com acesso", reconhece 5, e as outras 2 são o motivo da troca.
- Funções: `conceder_acesso_empresa(perfil_id, codigo)` e
  `redefinir_codigo_empresa(novo, por)`. Ambas `security definer`, sem permissão para
  `anon`/`authenticated`, só o servidor chama.

**Ressalva registrada:** código compartilhado vaza por natureza (alguém repassa "só pra ver").
O desenho acima limita o dano e torna a rotação viável, mas não substitui papéis reais, que
vêm com a auth definitiva.

**A empresa entra pela mesma tela do aluno** (decidido em 10/08/2026). Em `/entrar`, o
código digitado é procurado primeiro como turma; não sendo turma, e havendo sessão, é
tentado como código da empresa, e acertar leva ao painel. Quem ainda não tem conta usa o
link "Área da empresa" embaixo do card, e `/painel/entrar` sem sessão pede nome, e-mail e
código de uma vez, cria a conta e concede o acesso no mesmo envio.

O 404 de `/painel/entrar` sem sessão **caiu junto**. A partir do momento em que o código
abre a porta na tela pública, esconder o endereço não protegia mais nada, e o preço era a
dona não conseguir entrar sem alguém digitar a URL por ela. O que protege é o código.

**Depende da service role.** `conceder_acesso_empresa` não tem grant para `anon`, então a
porta só funciona com `SUPABASE_SERVICE_ROLE_KEY` preenchida no `.env.local`. Sem ela o
`db()` cai na chave pública e o erro é `42501 permission denied for function`, que a tela
mostra como "Não consegui completar agora".

- **Níveis de permissão dentro da empresa ainda não existem.** Quem entra com o código é
  admin/representante no mesmo nível.

Separação de rota para não misturar aluno e empresa:

```
perfil.tipo = 'aluno' | 'empresa'   -- definido pela porta de entrada
/t/[codigo]  → aluno via link (caminho principal)
/entrar      → aluno sem link (digita o código)
/painel      → empresa
```

**Dívida conhecida e aceita:** sem separação real de papéis, dado financeiro do grupo fica
visível a quem alcançar o painel. Aceitável só no protótipo.

**Papéis previstos no produto final:** Admin (empresa) · Representante de turma
(vê quem já comprou e quem falta pagar, para cobrar, sem editar pedido nem baixar
pagamento) · Aluno.

### 3.4 Pagamento e produção

- Modelo atual da empresa: **50/50**, 50% no pedido, 50% no dia da entrega.
- **O aluno pode quitar tudo de uma vez.** A tela de pagamento oferece as duas opções, e
  `aluno_pagar_pedido` insere um pagamento por parcela em aberto (segue append-only).
- **Existe "pagar depois"**, saída explícita na tela de pagamento. O pedido fica guardado,
  com o aviso de que o uniforme só é confirmado depois do pagamento. Sem essa saída o aluno
  fecha a aba do mesmo jeito e o pedido some da cabeça dele.
- **O pedido entra na lista de produção assim que a entrada (1ª parcela) é paga.** Não espera
  quitação.
- Inadimplência é controlada **operacionalmente**: o painel mostra quem não quitou, o
  representante cobra, e o uniforme **não é entregue** sem a segunda parcela.
- Consequência de UI, cada grupo tem **duas listas**:
  - **Pedidos**, todos, inclusive não pagos (visão comercial / cobrança)
  - **Produção**, só os com entrada paga (visão oficina; é a que exporta)

**Modelagem já preparada para gateway futuro** (sem integrar agora):

```
pagamento  -- append-only, nunca sobrescreve; saldo = soma
  parcela_id, valor, metodo,
  provider, provider_payment_id, provider_status,
  pago_em, registrado_por, comprovante_url
```

Registro manual usa `provider = 'manual'`. Status de pagamento é **derivado**, nunca digitado:
`pendente | parcial | pago | atrasado`.

### 3.5 Personalização e prazos

- Nome da estampa digitado **duas vezes** (confirmação tipo senha). **Decidido.**
- **Mais** um preview visual do produto com o nome aplicado. **Como** será feito (SVG, HTML,
  estilo de estampa, fonte) fica para depois, parte da etapa de UI.
- Normalização do nome: **`trim`, colapso de espaços duplos e inicial maiúscula.** A caixa
  alta automática que estava aqui **caiu**, a foto das costas da polo mostra o nome bordado
  como `Fernandes`, não `FERNANDES`. Forçar maiúscula produziria uma peça diferente da que o
  aluno viu na tela. Subir só a primeira letra de cada palavra arruma o `fernandes` digitado
  no celular sem esse efeito, mantém partícula minúscula ("Ana de Sá") e não mexe no resto
  das letras, para não estragar `MacHado`. Vale para o nome da conta e para o da estampa,
  no navegador e no servidor (`capitalizarNome`, em `lib/formato.ts`).
- **Limite de caracteres suspenso** (09/08/2026). `max_caracteres_nome` está em 60, que é o
  teto do schema, e a tela não mostra contador. Volta quando a produção informar o máximo
  real do bordado. Enquanto isso o preview comprime o traço para o nome caber na peça.
- **Tamanho e nome ficam na mesma tela**, a de personalização. A tela do produto só decide
  SE quer. Assim existe um lugar único para onde o lápis da revisão volta, em vez de
  espalhar a mesma decisão em duas telas.
- Tela de revisão do pedido inteiro antes de confirmar, com **lápis no nome e no tamanho**
  que voltam para a personalização já preenchida, com o campo em foco.

**Dois prazos separados, editáveis pelo admin:**

```
campanha.prazo_pedidos      até quando aceita novos pedidos
campanha.prazo_alteracoes   até quando o aluno edita tamanho / nome
```

**Regra corrigida em 09/08/2026.** A versão anterior travava a edição assim que o pedido
virava `liberado`, o que na prática tornava a edição impossível: pagar a entrada dispara o
trigger e a tela dizia "já entrou na produção" no mesmo segundo. Pior, era mentira,
`liberado` quer dizer liberado para produzir, não sendo produzido.

```
editável = dentro_do_prazo_alteracoes E status_producao in ('aguardando', 'liberado')
```

`aguardando` e `liberado` são estados de fila. A partir de `em_producao` a peça existe no
mundo físico e trava. **A produção começa quando as alterações fecham**, então
`prazo_alteracoes` é a data que a tela mostra nas duas frases ("altera até X", "produção
começa depois de X"). Não existe campo separado de início de produção, e não deve existir:
dois campos permitiriam configurar produção começando antes do fim das alterações.

Quando travado, mostrar o pedido em modo leitura com aviso claro ("Alterações encerradas -
fale com seu representante"). Nunca sumir com a tela.

Toda alteração registrada: campo, valor anterior, valor novo, quando, por quem.

### 3.6 Responsividade · filosofia central do projeto

- **Área do aluno: mobile-first, sem concessão.** A maioria pede pelo celular.
- **Área da empresa: otimizada para desktop, mas deve funcionar 100% no celular.** Não é
  aceitável painel que quebra no telefone, o representante cobra pelo celular e a
  responsável vai abrir o protótipo no aparelho dela.
- Na prática: tabela densa no desktop vira card/lista empilhada no mobile; ações em massa
  continuam alcançáveis; nunca scroll horizontal na página.

### 3.6.1 Modelo de dados

**Banco já criado e populado.** Projeto Supabase `nova-estampa`,
ref `iuqsjpqyxmpauwoexmgv`, região `sa-east-1` (São Paulo).

- Schema: **[SCHEMA.sql](SCHEMA.sql)**, aplicado como migration `schema_inicial`
- Dados de demo: **[SEED.sql](SEED.sql)**, reexecutável; apaga e recria

Turma de demonstração: **3A, código `CB3A`**, 35 pedidos de 31 alunos, com mistura de
quitado, parcial, atrasado e sem pagamento nenhum, e gente com dois pedidos.

O seed tem uma sujeira conhecida: duas escolas quase iguais ("Cláudio Brandão" e "Professor
Cláudio Brandão"), a segunda quase vazia. O usuário foi avisado e não pediu limpeza.

**Kit desativado** (`produto.ativo = false`): o usuário tirou a venda casada por enquanto. O
código do fluxo de kit continua de pé.

Convenções que valem para todo o código:

- **Dinheiro em centavos** (`integer`). Nunca float, nunca `numeric` (vira string no JS).
- **`pagamento` é append-only.** Saldo = soma dos pagamentos. Nunca dar `UPDATE` em valor pago.
- **Status de pagamento é derivado**, nunca digitado. Vem das views.
- **Snapshot de nome e preço** no pedido e no item: alterar o produto depois não pode
  reescrever histórico financeiro.
- **RLS DESLIGADA em todas as tabelas** (migration `rls_off_e_agregados_do_painel`), por
  decisão do usuário: protótipo fora do ar, auth definitiva só depois da reunião. **Não
  propor religar.** Reverter é `enable row level security` nas mesmas tabelas, e nada do
  código quebra.

**Como o aluno lê sem service role.** As tabelas continuam fechadas; o que abre são três
views que rodam como dono e expõem só as colunas necessárias:

| View | Serve |
|---|---|
| `vw_turma_publica` | código, turma, campanha, cliente, prazos. Sem telefone de contato |
| `vw_produto_publico` | produtos ativos: nome, preço, tamanhos, imagens |
| `vw_kit_publico` | peças que compõem cada kit |

`grant select` só para `anon` e `authenticated`, nas views. **Por que view e não policy:**
policy libera a linha inteira, com todas as colunas; view escolhe coluna por coluna. Telefone,
dado financeiro e pedido de terceiro não estão em nenhuma delas.

Verificado: `vw_turma_publica` responde pela chave pública, e `pedido` (447 linhas) volta
vazio pela mesma chave.

**A service role só vira necessária no painel da empresa**, que lê pedido e pagamento. Até lá
a auth definitiva pode mudar essa conta inteira (§3.3).

Views que as telas consomem (não montar esses cálculos na aplicação):

| View | Serve |
|---|---|
| `vw_pedido` | pedido + aluno + pago/saldo + `status_pagamento` + `pode_produzir` |
| `vw_parcela` | parcela + pago/saldo + status |
| `vw_producao` | uma linha por **peça liberada** · é a lista que exporta |
| `vw_resumo_corte` | "Camiseta M: 40" agrupado por grupo/produto/tamanho |
| `vw_grupo_resumo` | pedidos, alunos, quitados, financeiro e atraso por grupo |
| `vw_campanha_resumo` | o mesmo somado por campanha |
| `vw_cliente_resumo` | o mesmo somado por cliente · alimenta a home do painel |

Um trigger em `pagamento` move `status_producao` de `aguardando` para `liberado` quando a
parcela de entrada é quitada. O admin também pode forçar liberação (`producao_forcada`),
mas o schema exige `motivo_liberacao`.

### 3.7 Stack

```
Next.js 15 (App Router) + TypeScript
Tailwind v4
shadcn/ui , apenas como base headless (comportamento + acessibilidade)
Supabase (Postgres + Auth + Storage), acesso via MCP, já disponível
Vercel
```

Fora do MVP por decisão: RLS complexa, multi-tenant, testes E2E, state manager, monorepo.
Server Components + Server Actions cobrem o necessário.

### 3.8 Exportação

**Resolvido em 10/08/2026.** Exporta `.xlsx` no **modelo de papel que a empresa já usa**
(o usuário mandou o arquivo original). Regra: não alterar nenhum campo do modelo.

- Um arquivo por produto, uma **aba por tamanho**. Tamanho que ninguém pediu não vira aba
- Ordem da grade (PP, P, M, G, GG, XG), baby look inteira depois. `BL M` vira "M Baby Look"
- Coluna A **Assinatura** com o nome completo, coluna B **Nome ou Apelido** com o que vai
  bordado. As duas já saem preenchidas
- Mínimo de **16 linhas**, mesmo em branco: é onde entra quem chegou depois
- A4 retrato, colunas de largura igual, tabela centralizada, dimensionada para preencher a
  folha impressa
- Sem biblioteca: `lib/planilha/xlsx.ts` escreve o zip à mão. Os estilos vivem em
  `lib/planilha/modelo.ts`, copiados byte a byte do arquivo do usuário. **Não editar**

Conteúdo previsto da lista de produção: nome completo, produto, tamanho, nome personalizado,
quantidade, observações, status do pagamento. Cabeçalho com cliente, grupo, campanha e data.

Ideia adicional a validar: **resumo de corte** ("Camiseta P: 12 · M: 40 · G: 22"), é o que a
produção realmente consome.

---

## 4. Mapa de telas

**O mapa cresce durante o projeto.** Não vale tentar fechar tudo agora.
**Ordem de construção: primeiro a área do aluno, depois a da empresa.**

### 4.1 Aluno · mobile-first

| # | Tela | Função |
|---|---|---|
| A0 | Porta · `/t/[codigo]` (link) ou `/entrar` (digita código) | achar o grupo |
| A1 | Confirmação de turma | evitar pedido na turma errada |
| A2 | Login | Google / e-mail |
| A3 | Vitrine | produtos e preços da campanha |
| A4 | Produto | tamanho + nome 2× + preview · kit pede tamanho por peça |
| A5 | Revisão | último olhar antes de confirmar |
| A6 | Pagamento simulado | entrada de 50% |
| A7 | Confirmado | comprovante + o que acontece agora |
| A8 | **Meu pedido** | home de quem volta: status, saldo, pagar 2ª parcela, editar no prazo |

**A8 é a tela que faz o dinheiro entrar sem passar pelo representante**, o objetivo nº 1 do
projeto. Não tratar como tela secundária.

#### 4.1.1 Navegação do aluno · decidido

Quatro abas. Barra inferior no mobile, lateral no desktop. Header fixo em todas, com o logo
e o contexto da turma (`3A · Formatura 2026`), para o aluno nunca perder de vista onde está.

| Aba | Ícone | Responde |
|---|---|---|
| **Loja** | `Storefront` | o que dá para comprar |
| **Pedidos** | `Package` | cadê minha camisa |
| **Carteira** | `Wallet` | quanto eu devo |
| **Conta** | `User` | meus dados |

**A regra que separa Pedidos de Carteira:**

> **Pedidos é a peça. Carteira é o dinheiro.**

Os dois listam os mesmos pedidos e identificam cada um igual (foto, produto, tamanho, nome da
estampa). O que muda é o que respondem e o que deixam fazer:

- **Pedidos:** status de produção, entrega prevista, prazo de alteração, botão **editar**.
  Sem valor em reais.
- **Carteira:** saldo em aberto e próximo vencimento no topo, parcela a parcela dentro do
  card, botão **pagar**, recibo do que já foi pago. Sem botão editar.

O **badge com o valor em aberto fica na Carteira**, é a cobrança passiva que substitui o
representante. Sem push e sem WhatsApp no MVP.

**Home ao voltar:** tem saldo em aberto, abre na Carteira. Está quitado, abre na Loja.

**Editar pedido** sai do card de Pedidos, e vale a regra já travada
(`dentro_do_prazo E status_producao == 'aguardando'`). Quando trava, o botão **não some**,
vira texto explicando. Edita tamanho e nome da estampa, o nome com a mesma dupla digitação
da criação.

**Conta** contém: nome (leitura), telefone (editável), turma atual, contato do
representante, trocar de turma, sair.

Três consequências registradas:

- **Nome na Conta é leitura.** O nome bordado é `pedido.aluno_nome`, snapshot. Se a Conta
  deixasse editar, o aluno trocaria ali achando que corrigiu a peça, e a peça sairia errada.
  A tela manda editar pelo pedido.
- **Editar telefone atualiza perfil e pedidos ativos.** `pedido.aluno_telefone` também é
  snapshot; se só o perfil mudasse, a lista que o representante usa para cobrar ficaria com
  o telefone velho e o campo mentiria para o aluno.
- **Trocar de turma não leva os pedidos junto.** Pedido pertence ao grupo, o que está certo
  para a produção. A tela precisa avisar isso em texto.

**Pendência de banco:** `grupo` não tem campo de representante. Para a Conta mostrar o
contato, faltam `grupo.representante_nome` e `grupo.representante_telefone`, mais expor numa
view pública. Aguardando autorização para mexer no schema.

### 4.2 Empresa · desktop-first, obrigatoriamente usável no celular

**Home = tela de clientes**, com busca.

| # | Tela | Função | Estado |
|---|---|---|---|
| E1 | **Clientes (home)** | cards + busca + coluna de totais + criar | pronta |
| E2 | Cliente | campanha ativa aberta, com as turmas dentro | pronta (turmas a fazer) |
| E3 | Campanha | financeiro, quitados, três listas de cobrança, lista de grupos | pronta |
| E4 | Grupo | abas **Pedidos** e **Produção** | pronta |
| E5 | Pedido | detalhe, registrar pagamento, liberar produção | pronta, painel lateral sobre a E4 |
| E6 | Novo pedido manual | quem pagou em dinheiro | **falta** |
| E7 | Produtos da campanha | cadastro com foto | pronta, aba da E3 |
| E8 | Grupos da campanha | código de acesso | pronta, gaveta da E3 |
| E9 | Exportar | xlsx no modelo de papel da empresa | pronta |
| E10 | Criar cliente · criar campanha | prazos, entrada, labels | cliente pronto, campanha **falta** |

**Estrutura do painel, decidida em 10/08/2026** (o painel anterior foi mantido como
base e reorganizado, não descartado):

```
/painel                          Clientes, um card por escola     ← home
/painel/cliente/[id]             campanha ativa já aberta + turmas
/painel/campanha/[id]            visão geral · turmas · pedidos · produção · produtos
/painel/campanha/[id]/cobranca   fila de cobrança, filtro por turma  (?s=atrasado)
/painel/turma/[id]               pedidos · produção · exportar
/painel/produtos                 leitura dos produtos entre campanhas
/painel/arquivados               clientes arquivados · campanhas encerradas
/painel/config                   configurações gerais da empresa
/painel/financeiro               relatório financeiro reservado para planejamento
```

- **Home é Clientes**, não campanhas: é assim que a dona pensa. Cada card carrega a
  campanha em andamento com nome e prazo, porque o clique entra nela.
- **Ao abrir a escola, a campanha ativa já vem aberta**, com as turmas listadas. As outras
  campanhas ficam num seletor no topo. Uma escola tem uma campanha viva por vez, então o
  passo do meio some sem sumir do modelo. Entre duas abertas, ganha a de prazo mais próximo.
- **Turma pertence à campanha.** Não é destino solto do menu.
- **Tudo que cria abre em painel lateral** (`components/gaveta.tsx`), com o que está aberto
  na URL (`?novo=1`). O detalhe do pedido, que inventou o padrão, passou a usar a mesma casca.
- **A coluna da direita é a mesma forma nos três níveis**, trocando só o escopo do total:
  empresa inteira na home, campanha no cliente, turma na turma.
- Rótulo do grupo sai da campanha (`label_grupo_plural`): a Vega mostra "3 setores", a
  escola mostra "12 turmas".
- Status da campanha aparece **em palavra**, não só em cor: Aberta, Encerrada, Concluída.
- Os totais da home somam **a lista filtrada**: buscar "Cláudio" e ver o total geral no
  lado seria o número mentindo sobre o que está na tela.

**Armadilha registrada:** `emCache` (`unstable_cache`) serializa o retorno. Devolver `Map`
funciona na primeira leitura e volta objeto vazio na segunda. Só estrutura que passa por
JSON.

**O que falta é tudo que cria alguma coisa.** Leitura e cobrança estão de pé; a jornada da
demo (§6) começa em "admin cria cliente", e hoje ela só roda porque o seed criou tudo à mão.
É esse o próximo passo do projeto.

**Navegação ampliada em 11/08/2026.** O menu lateral ganhou Financeiro, Produtos,
Arquivados e Configurações. Financeiro fica apenas como destino reservado até a conversa
dedicada ao relatório completo. Produtos é uma leitura entre campanhas, sem criar catálogo
global. Arquivados preserva histórico, e Configurações começa como mapa dos controles gerais.
**Produtos só a Nova Estampa edita**, não a comissão nem o representante, o que exige um
papel que ainda não existe no banco.

**Três níveis de acesso, já implementados** (ver §3.3): empresa vê tudo em `/painel`,
representante vê só a turma dele em `/t/[codigo]/gestao`, aluno não vê nada disso. Quem não
é empresa recebe **404** em `/painel`, nunca uma tela de "sem permissão": negativa confirma
que o endereço existe. A porta é `/painel/entrar`, fora do grupo protegido.

**Busca em vários lugares é requisito explícito:** procurar clientes, campanhas e, dentro
delas, alunos, turmas e o que mais fizer sentido. Não é uma busca só, são várias.

Seções que ainda vão surgir (relatórios, etc.) ficam concentradas na navbar.

### 4.3 Navegação

- **Desktop: navbar lateral.**
- **Mobile: `details` nativo**, menu que desliza sem JavaScript, com a mesma navegação.

---

## 5. Direção visual

Etapa liberada pelo usuário. A direção parte **do material e das referências dele**, nada de
proposta solta. **Perguntar antes de montar.** Referências ficam em `referencias/`
(`aluno`, `admin`, `produtos`, `marca`).

**Princípio central:**

> A área do aluno **não pode parecer um sistema**, tem que parecer que ele está comprando
> algo real. A área da empresa deve parecer **profissional**.

| | Aluno | Empresa |
|---|---|---|
| Referências | Apple Store · Nike/Adidas · e-commerce de moda · checkout mobile · Stripe · Attio | Shopify · Stripe · Attio |
| Sensação | vitrine, produto, compra | ferramenta de trabalho |
| Tom | moderno e minimalista, **sem exagerar** | preciso, organizado |

- **Tema claro nos dois lados. Sem dark theme.** Claro de verdade e **sem visual pesado** -
  respiro, nada carregado.
- No painel, usar **a melhor parte de cada referência conforme o contexto**. Para financeiro
  e qualquer coisa com números, o que Stripe/Attio/Shopify fazem de melhor: alinhamento,
  números tabulares, densidade legível.
- **Fotos de produto existem**, e o admin sobe ao cadastrar o produto (§5.1.4). É isso que
  sustenta a vitrine. `produto.imagens` é `text[]`, e `imagens[1]` é a capa.

### 5.1 Decisões visuais tomadas

| Tema | Decisão |
|---|---|
| Tema | **Claro nos dois lados.** Sem dark theme. Claro de verdade, sem visual pesado |
| Cor de ação | **Preto.** Decidido comparando as duas versões em tela. O ciano do logo fica reservado para a marca, o estado de foco e um número que mereça atenção · nunca como cor de botão |
| Fotos de produto | **Galeria: várias por produto.** Capa + extras. Produto sozinho *e* pessoa vestindo. Admin sobe as fotos e escolhe a capa. Frente, costas e detalhe da estampa · as costas importam, é onde vai o nome |
| Preview da estampa | **Ilustração SVG da peça** com o nome aplicado. Não é foto. **Só o nome** · nada de turma, ano ou qualquer outro texto. Nome **pequeno**, posicionado na **parte inferior** da peça, dentro do contorno. **Traço neutro, sem bordô**: o preview mostra onde o nome cai, não a cor da peça, que muda de campanha para campanha |
| Movimento | Entrada de conteúdo (`entra`, com atraso por item em lista) e resposta ao toque (`active:scale`). Nada em loop, nada decorativo. Tokens em `globals.css`, e a regra global de `prefers-reduced-motion` zera todos |
| Navegação · desktop | Barra lateral |
| Navegação · mobile (admin) | **Menu lateral que desliza.** Mesma navegação do desktop, sem duplicar; cabe seção nova (relatórios etc.) e deixa a altura inteira para a tabela |

### 5.1.1 Cartão de lista no painel · minimalismo, decidido em 11/08/2026

O cartão do cliente estava com cara de template. Quatro regras saíram dali e valem para
todo cartão de lista do painel (cliente, campanha, turma):

- **Um número manda.** O valor principal em corpo grande; percentual, total e contagem
  descem para uma legenda em `caption`. A versão anterior dizia a mesma coisa quatro vezes
  (valor, "de X", percentual e barra) no mesmo tamanho, e nenhuma ganhava.
- **Sem rótulo em caixa alta acima de número.** `PEDIDOS` sobre `355` gasta uma linha para
  nomear o que o dado já diz. Vira frase corrida: "de R$ 45.986,40 · 355 pedidos".
- **Selo só na exceção.** Campanha aberta é o normal. Estados encerrados recebem o selo
  quando o contexto precisa diferenciá-los, sem competir com o valor principal do cartão.
- **Sem sombra em cartão de lista.** Já era o que o token mandava (`elevação: card em lista
  é borda, não sombra`) e o código não cumpria. Ficou borda de 1px, e o hover escurece o
  traço em vez de levantar a peça.

Também: bloco de total não tem fundo colorido. O vermelho marca o número vencido, nunca a
moldura, senão o painel inteiro pintado compete com o dado que pede ação.

O trilho da `Barra` é `line`, não `surface-2`: no branco do cartão o tom antigo sumia, só o
pedaço preenchido aparecia, e embaixo de um número grande ele lia como sublinhado.

### 5.1.2 Painel · segunda rodada, 11/08/2026

Sete mudanças, todas nascidas de olhar a tela pronta:

- **Cobrança virou tela, não legenda.** Os três cartões (`Em atraso`, `Pagou só a
  entrada`, `Sem pagamento nenhum`) são clicáveis e levam a
  `/painel/campanha/[id]/cobranca?s=`, com filtro por turma, busca por nome e a mesma
  gaveta de pedido da turma. Caiu o rodapé "e mais 65, abra a turma para ver a lista
  inteira": o cartão sabia o tamanho do problema e mandava a dona procurar turma por
  turma. Os dois últimos títulos foram reescritos para descrever a pessoa, não a régua.
- **Selo de status é chip tom sobre tom**, sem bolinha. O ponto colorido virava uma
  coluna de confete em lista longa. Agora informa a área de cor (`*-soft` de fundo, cor
  forte no texto), e o texto continua obrigatório.
- **Resumo de corte é retrátil** (`Retratil`, `details` nativo), fechado por padrão, com
  a contagem de peças na linha fechada. Aberto, os tamanhos viram grade de caixinhas
  (rótulo em cima, número embaixo) em vez de texto corrido "M 40 · G 22".
- **"Saldo" virou "Falta pagar"** na tabela da turma.
- **`Quitados`** é um componente: contagem em corpo normal, percentual entre parênteses
  em `caption`. Sem os dois números do mesmo tamanho brigando.
- **Seta de voltar** (`Topo voltar=`) em campanha, turma e cobrança. Redundante com a
  trilha no desktop, essencial no celular, onde a trilha é texto miúdo.
- **Tabela de turmas enxuta.** Vendido e Recebido saíram (já estão somados nos KPIs
  acima). Contagem centraliza, dinheiro alinha à direita, sempre: dinheiro centralizado
  desalinha a vírgula e mata a comparação entre linhas. Abaixo de 768px vira lista.

Mais três, na lista e no detalhe:

- **Produção ganhou filtro de tamanho**, dentro do card, colado na lista. É também o
  resumo de corte da turma: a contagem no botão é quantas peças daquele tamanho saem da
  mesa. A tabela apertou (linha de 2, não 2.5), e `Tam.` e `Qtd` ganharam largura própria
  com o número centralizado.
- **Exportar pergunta os tamanhos** numa gaveta (`ExportarGaveta`), formulário `GET` puro
  sem JavaScript. Nada marcado sai a grade inteira, que é o padrão antigo. O tamanho
  escolhido entra no nome do arquivo.
- **Baixa de pagamento reorganizada.** Três degraus por parcela: título com o selo,
  histórico do que já foi pago, e a baixa isolada numa caixa no rodapé. Os campos se
  nomeiam ("Valor recebido" com o saldo de sugestão, botões sob "Forma de pagamento"), e
  por isso o parágrafo "Sem valor, a baixa quita a parcela inteira" caiu.
- **`ResumoProdutos`** responde "quantas camisas e quantos moletons": pedidos, peças,
  quitados e a receber por produto. Aparece na campanha como bloco e na turma como
  retrátil. Pedido e peça são contagens diferentes de propósito, kit e quantidade maior
  que um descolam as duas, e quem compra tecido precisa da de peças.

### 5.1.3 Campanha e produção · terceira rodada, 11/08/2026

- **Rascunho deixou de ser um estado da campanha.** Campanhas novas começam abertas e o
  formulário oferece somente Aberta, Encerrada e Concluída. Schema, seed, ações e selos
  seguem o mesmo contrato.
- **Cobrança virou um único bloco compacto.** Em atraso, Entrada recebida e Pagamento
  pendente são linhas de acompanhamento com descrições formais, totais e uma prévia curta
  dos pedidos, preservando a informação sem multiplicar cartões.
- **Vendas por produto virou resumo tabular.** Produto, peças, quitados e valor em aberto
  ficam alinhados para comparação, com atraso destacado apenas quando existe.
- **Cartões de turma têm uma hierarquia única.** A receber é o valor principal; vencido,
  pedidos, quitados e quantidade vencida permanecem visíveis em uma base compacta.
- **Produção usa o título Quantidades para corte.** Cada produto ocupa uma linha e os
  tamanhos formam uma faixa contínua, reduzindo caixas e mantendo a leitura operacional.
- **Exportação consolidada por campanha.** A produção permite selecionar turmas e baixar
  uma única planilha, separada internamente por turma, produto e tamanho. Nenhuma seleção
  significa exportar todas as turmas com peças liberadas.

Também caiu o texto "Quem pediu duas peças conta como um aluno e dois pedidos".

### 5.1.4 Cadastro de produto · 11/08/2026

A loja do aluno passou a nascer do painel. O produto é cadastrado dentro da
campanha, na aba **Produtos** da E3, e a vitrine é consequência: salvar derruba
o cache (`invalidarPainel`) e o produto aparece na loja no mesmo segundo.

- **É aba, não rota nova.** `/painel/campanha/[id]?aba=produtos`, e o cadastro
  abre na gaveta com `?produto=novo` ou `?produto=<id>`, o mesmo padrão de
  cliente e campanha. Produto fora da campanha não teria onde pousar.
- **Lista, não grade de cartões.** A pergunta aqui é operacional ("o que está à
  venda, por quanto, em que grade"), e lista compara linha a linha. A foto entra
  pequena, só para reconhecer a peça.
- **Lápis à mostra, o resto nos três pontos.** Editar é a ação de sempre.
  Pausar venda, ocultar da loja e excluir são raras, e duas delas perigosas.
  Pausar e ocultar **não passam por confirmação**: desfazem num clique, e mandar
  as duas para uma tela de "tem certeza?" ensina a confirmar sem ler, que é o
  que estraga a confirmação de excluir, essa sim definitiva.
- **Excluir só sem pedido.** `pedido.produto_id` é `ON DELETE RESTRICT`, então o
  banco é a trava real; a tela conta antes para dizer o motivo em português e
  oferecer ocultar, que costuma ser o que a pessoa queria. Excluir apaga as
  fotos do bucket junto.
- **Lápis e três pontos ganharam moldura** (o par era `text-faint` sem borda e
  sumia no branco do cartão). Borda de 1px, texto em `ink-2`, alvo de 36px.
- **Preço com máscara de dinheiro.** "15990" vira "R$ 159,90" enquanto digita.
  Quem cadastra faz isso no celular, com teclado numérico, e sem máscara
  precisaria achar a vírgula e escolher entre ponto e vírgula, que é onde nasce
  o produto cadastrado por dez vezes o preço. O servidor lê só os dígitos
  (`centavosDe`), então o valor chega igual com ou sem JavaScript.
- **Upload: comprime no navegador, sobe por rota, não por Server Action.**
  Redimensiona para 1600 px e converte para webp no aparelho; cada foto vai
  numa requisição para `POST /painel/foto`, que valida acesso de empresa, tipo e
  tamanho e grava com a chave de serviço. Server Action aceita 1 MB de corpo por
  padrão na Vercel, e subir direto do navegador exigiria abrir escrita do bucket
  para `anon`. A capa é `imagens[1]`, trocada por botão, não arrastando.
- **Sem formulário de kit nesta rodada.** O kit está desligado
  (`situacao = 'oculto'`) por decisão do usuário, e a tela de componentes é
  outra tela inteira.

### 5.1.5 Cadastro de turma · 11/08/2026

E8 nasceu junto do cadastro de produto e no mesmo padrão: aba **Turmas** da E3,
gaveta em `?turma=nova` ou `?turma=<id>`, lápis à mostra no cartão e excluir nos
três pontos.

- **O código é campo de primeira classe, não detalhe gerado.** Ele é a única
  coisa que o aluno digita para achar a turma, então tem campo próprio, alfabeto
  próprio e lugar próprio no cartão, numa linha com as letras afastadas.
- **Alfabeto sem ambíguo, o mesmo do schema** (`grupo_codigo_formato`): caixa
  alta, sem `O`, `0`, `I`, `1` e `L`. O código é escrito no quadro e digitado
  por trinta pessoas, e é aí que "O" vira zero. `mascaraCodigo` descarta o
  caractere na hora, então o formato errado nem chega a ser digitado.
- **O código se sugere a partir do nome.** "3A" na campanha do Cláudio Brandão
  preenche "CB3A", que é o formato do papel. Para de sugerir assim que alguém
  escreve no campo. Doze turmas com código inventado à mão é onde nasce o código
  repetido.
- **Código repetido é recusado em português** antes de o Postgres reclamar de
  constraint em inglês. O `unique` do banco continua sendo a trava real.
- **Trocar o código ao editar é permitido**, com aviso: derruba o link antigo, e
  quem já entrou continua dentro, porque a sessão guarda o grupo, não o código.
- **A visão geral avisa o que falta**, na ordem da jornada do §6: primeiro turma,
  depois produto. Cada aviso some sozinho quando a peça existe.

### 5.1.6 Quarta rodada · 12/08/2026

Rodada de densidade e hierarquia, nas duas áreas.

- **Status deixou de ser pílula.** `selo.tsx` virou ponto de 5px mais a palavra, sem fundo,
  sem borda e sem caixa. Chip colorido em lista de duzentas linhas produzia uma coluna de
  retângulos que competia com nome e dinheiro. Só `Em atraso` tinge o texto; o resto fica em
  `ink-2`, para o vermelho continuar significando alguma coisa. Vale em todas as telas, do
  aluno e da empresa, porque todas passam pelo mesmo componente.
- **Tamanho subiu para a tela do produto.** O aluno escolhe a peça e o tamanho juntos, num
  `form method="get"` sem JavaScript, e a personalização ficou só com o nome, dois campos e a
  prévia. Peça sem bordado pula a personalização e vai direto para a revisão. Nenhuma tela
  nova: o lápis do tamanho na revisão volta para o produto, o do nome volta para a
  personalização, os dois já preenchidos.
- **Carrossel para de foto em foto.** `snap-always` nos dois trilhos da galeria. Com sete
  fotos, a inércia atravessava três e parava no meio da quarta.
- **A coluna Pago saiu da lista de pedidos.** Valor menos falta pagar é a mesma informação
  duas vezes, e as três colunas de dinheiro espremiam nome, produto e tamanho.
- **`BL` no lugar de `Baby Look` em lista e tabela.** `tamanhoLegivel` devolve "M BL": a
  coluna fica comparável linha a linha. Por extenso continua onde é título de grupo, no
  seletor de tamanho e na grade do cadastro. As abas do `.xlsx` **não mudaram**, elas seguem o
  modelo de papel (§3.8).
- **Grade e turmas já vêm marcadas.** Produto novo nasce com a grade inteira; a exportação de
  produção e a de campanha abrem com tudo selecionado. Desmarcar o que não vai é menos
  trabalho que marcar doze caixas no celular. A rota continua tratando "nada marcado" como
  tudo, para endereço antigo seguir valendo.
- **Cartões de cliente e de turma encolheram** (`p-4`, `gap-3`, valor principal em `text-num`).
  Menos espaço morto, mesma informação.
- **Parcelas em aberto viraram bloco retrátil**, fechado, com quantidade, total e vencido na
  linha fechada. Numa campanha são mais de duzentas linhas.
- **Financeiro por campanha.** `FinanceiroDaTurma` virou `FinanceiroDoEscopo` e serve turma e
  campanha com o mesmo desenho, trocando só a coluna que filtra. Entrou como aba da E3.
- **Cliente virou aba no Financeiro, não filtro.** A faixa de abas é "Visão geral" mais uma por
  escola com pedido, ordenadas pelo que têm a receber. A seção "Escolas" saiu por repetir a
  navegação. Dentro da escola aparece a lista de campanhas dela, que é o nível seguinte.
- **Filtro do Financeiro é só data inicial e data final** (`janelaEntre`), atrás de um botão
  com ícone de funil. A lista de "há quanto tempo" decidia por quem estava olhando: quem
  fecha o mês quer 1 a 31 de julho, não "últimos 30 dias". Em `/financeiro/receber` o filtro
  saiu inteiro, o escopo chega pela navegação e sobrou "Ver a empresa inteira".
- **Produtos do admin em linha compacta**, com miniatura de 40px, grade em texto e a contagem
  de pedidos no lugar onde ficava o selo de kit.

**Kit removido do produto.** Saíram badge, filtro, rótulo, o formulário, `listarPecas`,
`vw_kit_publico` e o kit do seed; pedido e revisão passaram a tratar uma peça só.
`produto.tipo` tem default `'simples'`, então nada quebra sem migration. **A tabela
`produto_componente` e o enum `tipo_produto` continuam no banco**, e derrubá-los é decisão
separada, com migration.

**Por que foto na vitrine e SVG no preview** (a combinação é proposital): a foto vende e
mostra caimento; o SVG garante que o nome apareça sempre na mesma posição, com o mesmo
tamanho, independente da qualidade da foto que o admin subiu. Precisão onde erro custa caro,
desejo onde o aluno decide.

**Upload de foto: comprimir no navegador, antes de subir.** Decidido.

A foto é redimensionada e convertida para `webp` no próprio aparelho, e só então sobe.
O servidor apenas valida tipo e tamanho antes de aceitar.

Motivo principal não é o Storage, é o **upload**: quem cadastra produto sobe do celular, no
4G da escola. Sete fotos de 3 MB fazem a pessoa desistir. Referência do ganho real: as fotos
da polo saíram de 13,8 MB para 0,68 MB (−95%) a 1600 px de largura, sem perda visível.

Descartados e por quê:
- **Comprimir no servidor com `sharp`**, o arquivo cru ainda sobe pelo 4G, e Server Action
  na Vercel aceita só 1 MB de corpo por padrão: foto de celular estoura e falha com erro
  obscuro.
- **Transformação de imagem do Supabase**, recurso de plano pago.

**Estado atual das fotos:** só existe a **polo de formatura**, em
`produtos/polo-formatura/` (webp numerados, `01` é a capa; originais em `originais/`).
Moletom fica para depois, por decisão do usuário. **Nada foi subido para o Storage ainda.**

**Prova visual aprovada:** https://claude.ai/code/artifact/bd048d31-228f-4b61-8438-40b7aefb827b
Tela de produto do aluno, tela de personalização com o SVG e amostra do painel, com os
números reais do banco. Serve de referência ao construir as telas.

**Ainda em aberto:** tipografia (três direções apresentadas: Geist · Switzer · Inter Tight)
e as fotos de produto, que o usuário vai subir.

### 5.2 Fluxo do aluno · confirmado

```
código → confirma turma → login / dados → vitrine
  → produto (foto grande, preço, tamanhos, descrição)
  → personalização (tela própria: nome 2× + preview + aviso)
  → revisão → pagamento → sucesso
```

Personalização em **tela separada** foi decisão do usuário e substitui a versão anterior
(que a colocava dentro da tela do produto). No celular, uma decisão por tela.

A tela **"meu pedido"** (§4.1 A8) continua valendo, ela não faz parte do fluxo de compra,
é a home de quem volta para pagar a 2ª parcela.

---

## 6. Escopo do protótipo (12/08/2026)

O protótipo precisa **parecer sistema real** e permitir demonstrar a jornada completa ponta a
ponta, não telas soltas.

**Jornada da demo:**

```
admin cria cliente → cria campanha → cria grupos → cadastra produtos
  → aluno entra (login + código) → faz pedido com confirmação de nome
  → pedido aparece no painel
  → pagamento simulado (entrada 50%)
  → pedido entra na lista de produção
  → admin abre o grupo → exporta a lista
```

**Fora do MVP:** integração real de gateway, WhatsApp real, notificações, permissões
granulares, tabela de medidas, painel dedicado do representante, histórico visual de
alterações, relatórios avançados.

**Dados de seed são metade do sucesso.** Um cliente realista com ~12 turmas e centenas de
pedidos em estados variados (quitado, só entrada paga, em atraso, sem pedido). Painel vazio
não vende.

---

## 7. Em aberto

| # | Questão | Impacto |
|---|---|---|
| 1 | Métodos de pagamento reais (Pix à vista, cartão parcelado) e qual gateway | Decidir com a empresa |
| 2 | Quem absorve a taxa do gateway · hoje é dinheiro, custo zero; Pix ~1%, cartão 4–5%. Precisa suportar preço diferente por método | Margem da empresa; **levantar na reunião** |
| 3 | Auth definitiva e comportamento multi-tenant | Redefine §3.3 |
| 4 | Como o representante é cadastrado e o que ele enxerga | Papel existe no produto, não no MVP |
| 5 | Tabela de medidas por produto | Adiado pelo usuário, mas **tamanho errado é o erro mais caro** do negócio |
| 6 | Formato do preview da estampa | Etapa de UI |
| 7 | Identidade visual e design system | Etapa de UI, sob liberação do usuário |

---

## 8. Riscos identificados

- **Tamanho errado** é mais caro que nome errado: vira retrabalho, custo de produção e peça
  encalhada. Adiado, mas registrado.
- **Mudança do fluxo do dinheiro é política, não técnica.** O representante hoje tem poder.
  Mitigação de produto: não eliminá-lo, promovê-lo a motor de adesão, com painel de cobrança
  e sem tocar em dinheiro.
- **LGPD:** boa parte dos titulares é menor de idade. Coletar o mínimo (nome, telefone,
  grupo). Não bloqueia o MVP, mas a decisão precisa ficar registrada.

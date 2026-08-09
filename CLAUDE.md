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
- **`grupo.alunos_esperados`** (int, opcional): sem cadastro prévio o sistema não sabe quem
  *falta* pedir. O admin informa quantos alunos o grupo tem e isso devolve a métrica de
  adesão ("3B: 28 de 34 · 82%"). Um campo, alto valor.

**Volume de referência:** uma escola gerou ~420 pedidos de camisa + ~170 de moletom,
12 turmas. Ordem de grandeza: ~600 pedidos por campanha.

### 3.2.1 Catálogo, carrinho e produto casado

- **Preço não varia por tamanho.** Preço é do produto, ponto.
- **A grade inclui baby look.** Vem na mesma lista `tamanhos`, prefixada com `BL ` (`BL M`).
  Na escolha, a tela separa em dois blocos rotulados; em texto corrido vira "M baby look".
  Prefixo em vez de coluna nova: não muda schema e a produção lê o tamanho literal.
- **Personalização é obrigatória**: todo produto leva nome estampado.
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
  (`pgcrypto`/bcrypt), nunca em texto puro. Código inicial do protótipo: `NOVAESTAMPA2026`.
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
- Normalização do nome: **`trim` e colapso de espaços duplos, só isso.** A caixa alta
  automática que estava aqui **caiu**, a foto das costas da polo mostra o nome bordado como
  `Fernandes`, não `FERNANDES`. Forçar maiúscula produziria uma peça diferente da que o aluno
  viu na tela.
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

Estado atual do seed: 3 clientes · 3 campanhas · 18 grupos · 9 produtos · 447 pedidos ·
540 itens · 894 parcelas · 560 pagamentos. Distribuição de pagamento: 189 pagos, 182 parciais,
65 atrasados, 11 pendentes. Adesão por turma variando de 57% a 93%.

Convenções que valem para todo o código:

- **Dinheiro em centavos** (`integer`). Nunca float, nunca `numeric` (vira string no JS).
- **`pagamento` é append-only.** Saldo = soma dos pagamentos. Nunca dar `UPDATE` em valor pago.
- **Status de pagamento é derivado**, nunca digitado. Vem das views.
- **Snapshot de nome e preço** no pedido e no item: alterar o produto depois não pode
  reescrever histórico financeiro.
- **RLS ligada em todas as tabelas, sem policies.** Nenhuma tabela é legível pela chave
  pública.

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
| `vw_grupo_resumo` | pedidos, adesão e financeiro por grupo · alimenta os cards do painel |

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

Formato escolhido **no momento da exportação**: `xlsx`, `PDF` ou `CSV`. Detalhes do layout
serão definidos depois.

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

| # | Tela | Função |
|---|---|---|
| E1 | **Clientes (home)** | grade de cards + busca |
| E2 | Cliente | campanhas daquele cliente |
| E3 | Campanha | adesão, financeiro, alertas, lista de grupos |
| E4 | Grupo | abas **Pedidos** e **Produção** |
| E5 | Pedido | detalhe, registrar pagamento, liberar produção |
| E6 | Novo pedido manual | quem pagou em dinheiro |
| E7 | Produtos da campanha | inclui montar kit |
| E8 | Grupos da campanha | código, alunos esperados |
| E9 | Exportar | formato + conteúdo |

**Configurações** é uma aba, não uma tela solta. Dentro dela: **Acesso da empresa** (trocar o
código, ver contas com acesso, revogar) e o que mais for surgindo.

**Busca em vários lugares é requisito explícito:** procurar clientes, campanhas e, dentro
delas, alunos, turmas e o que mais fizer sentido. Não é uma busca só, são várias.

Seções que ainda vão surgir (relatórios, etc.) ficam concentradas na navbar.

### 4.3 Navegação

- **Desktop: navbar lateral.**
- **Mobile: ainda não decidido**, menu suspenso ou barra inferior. Fica para a etapa de UI.

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
- **Fotos de produto vão existir**, o admin faz upload ao criar o produto. É isso que
  sustenta a vitrine. **Pendência:** o schema ainda não tem campo de imagem; adicionar
  quando o usuário autorizar mexer no banco.

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

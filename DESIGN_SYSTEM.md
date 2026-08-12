# Design System · Nova Estampa

Fecha o que faltava: escala tipográfica, espaçamento, botões, inputs, cards, tabela, badges,
ícones, estados de tela e motion. Cada escolha vem com o porquê, se o porquê não convence,
o item cai.

**Precedência:** este arquivo manda no visual. `CLAUDE.md` manda no produto.
Quando os dois falarem do mesmo assunto, `CLAUDE.md` vence.

**Fonte da verdade em código:** [app/globals.css](app/globals.css). O que está aqui e não
está lá é rascunho.

---

## 0. As duas regras que explicam todas as outras

**1. Preto age, ciano marca.** Botão, item selecionado e estado ativo são pretos. O ciano
aparece em três lugares e só: o logo, o anel de foco do teclado e um número que precisa ser
notado. Se o ciano estiver em toda tela, ele parou de significar alguma coisa.

**2. O aluno está comprando, a empresa está trabalhando.** Mesmos tokens, densidades
diferentes. No aluno, respiro e uma decisão por tela. Na empresa, informação por centímetro.

---

## 1. Cor

Neutros levemente frios, puxados para o ciano. Cinza puro parece herdado; estes parecem
escolhidos.

### Superfície

| Token | Hex | Onde |
|---|---|---|
| `ground` | `#F5F6F6` | fundo da página |
| `surface` | `#FFFFFF` | card, input, linha de tabela |
| `surface-2` | `#EDF0F0` | preenchimento sutil: cabeçalho de tabela, campo desabilitado, hover de linha |

### Texto e ação

| Token | Hex | Onde |
|---|---|---|
| `ink` | `#0E1416` | texto principal **e cor de ação** |
| `ink-2` | `#4A5658` | texto secundário, rótulo de campo |
| `muted` | `#7C878A` | apoio, legenda, placeholder de ajuda |
| `faint` | `#B7C0C1` | placeholder de input, tamanho esgotado |

Quatro níveis bastam. Um quinto vira decisão sem critério.

### Traço

| Token | Hex | Onde |
|---|---|---|
| `line` | `#E4E8E8` | borda padrão |
| `line-strong` | `#D3DADA` | divisória de seção, hover de card |

### Marca · uso restrito

| Token | Hex | Onde |
|---|---|---|
| `brand` | `#0FA8BC` | o "E" do logo |
| `brand-deep` | `#0C8A9B` | anel de foco, link de texto |
| `brand-soft` | `#E4F4F6` | fundo de destaque raro |

`brand` nunca é fundo de botão. Ele não tem contraste para texto branco sem escurecer tanto
que deixa de ser a cor do logo, foi por isso que a ação virou preta.

### Estado

| Token | Texto | Fundo |
|---|---|---|
| `success` | `#0E7C4A` | `#E7F4EE` |
| `warning` | `#8A5A00` | `#FFF4E2` |
| `danger` | `#B13326` | `#FCEBE9` |

Cor de estado nunca é cor de marca. E **nunca informa sozinha**, sempre acompanha texto.

---

## 2. Tipografia

**Geist**, uma família só. `Geist Mono` aparece em um lugar: o código da turma, onde
confundir `5` com `S` custa caro.

### Pesos · três, não mais

`400` corpo · `500` ênfase e rótulo · `600` título, número e botão.

Contraste tipográfico se faz com tamanho e cor, não com sete pesos.

### Escala

| Papel | Tamanho / altura | Peso | Tracking | Onde |
|---|---|---|---|---|
| `display` | 32 / 1.1 | 600 | −0.024em | topo da campanha para o aluno |
| `h1` | 26 / 1.15 | 600 | −0.02em | título de tela |
| `h2` | 21 / 1.25 | 600 | −0.018em | título de seção, nome do produto |
| `h3` | 17 / 1.35 | 600 | −0.012em | título de card |
| `body` | 15 / 1.55 | 400 | 0 | texto corrido |
| `body-sm` | 13.5 / 1.5 | 400 | 0 | texto denso, célula de tabela |
| `caption` | 12.5 / 1.45 | 400 | 0 | apoio, sempre em `muted` |
| `label` | 11 / 1.2 | 600 | +0.09em | rótulo em caixa alta, cabeçalho de tabela |
| `num` | 21 / 1.1 | 600 | −0.02em | preço, valor |
| `num-lg` | 28 / 1.05 | 600 | −0.026em | KPI do painel |

**Números sempre tabulares.** `font-variant-numeric: tabular-nums` em toda tabela e em todo
valor. Sem isso a coluna de dinheiro dança quando o número muda, e o painel parece amador.

**Linha de leitura no máximo 68 caracteres.** Vale para texto corrido, não para tabela.

---

## 3. Espaçamento

Base **4**. Escala: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`.

Valor fora da escala é bug, não estilo.

| Situação | Aluno | Empresa |
|---|---|---|
| Padding de card | 20 | 16 |
| Padding lateral da tela | 20 | 24 |
| Gap dentro de um grupo | 8 | 8 |
| Gap entre campos | 16 | 12 |
| Gap entre blocos | 24 | 16 |
| Entre seções | 40 | 32 |

A empresa é mais apertada de propósito: cabe mais aluno na tela sem rolar.

---

## 4. Forma

| Token | Valor | Onde |
|---|---|---|
| `radius-sm` | 8 | badge, chip, miniatura |
| `radius-md` | 12 | pílula de tamanho, elemento pequeno |
| `radius-lg` | 16 | **botão, input** e card |
| `radius-xl` | 24 | foto de produto, folha deslizante, modal |
| `radius-full` | 999 | avatar, badge de status, indicador |

Escala em dobro, fácil de lembrar. Arredondar mais que isso infantiliza uma marca que tem
serifa fina no logo.

---

## 5. Elevação

Dois níveis. Card é **borda**, não sombra, sombra empilhada em tudo é o visual pesado que
ficou proibido.

| Token | Valor | Onde |
|---|---|---|
| `shadow-card` | `0 1px 2px rgb(14 20 22 / .05)` | card em lista, junto da borda |
| `shadow-lift` | `0 2px 4px rgb(14 20 22 / .06), 0 12px 28px -14px rgb(14 20 22 / .2)` | card clicável em hover, folha, modal |
| `shadow-float` | três camadas, a maior com 56px de desfoque | card sozinho no meio da tela |

`shadow-float` existe porque um card branco sozinho sobre fundo claro some. Em lista, a borda
já resolve; isolado, ele precisa flutuar. Três camadas em vez de uma: uma rente para definir a
borda, uma média para o volume, e uma larga e difusa para o ambiente.

Sombra é neutra, sem cor nenhuma. Cheguei a tingir de ciano e ficou sujo: sombra colorida
chama atenção para si mesma, e sombra boa é a que ninguém percebe.

---

## 6. Motion

| Token | Duração | Onde |
|---|---|---|
| `fast` | 120ms | hover, saída, troca de cor |
| `base` | 180ms | entrada, mudança de estado, foco |
| `slow` | 280ms | folha deslizante, menu do mobile |

Curva única: `cubic-bezier(.2, .8, .2, 1)`, sai rápido, chega devagar.

Regras: toda mudança de cor ou posição tem transição; nada pisca. Nenhuma animação decorativa
- movimento existe para explicar de onde veio a coisa. `prefers-reduced-motion` desliga tudo.

---

## 7. Botão

Altura mínima **44px** onde o dedo toca. Raio `lg` (16). Peso 600. Nunca dois botões pretos
na mesma tela, se tem dois, um deles não é o principal.

Testado em tela: raio 12 ficou quadrado demais e raio 24 virou cápsula numa caixa de 48px.
16 é o ponto em que a forma fica macia sem parecer botão de brinquedo.

| Variante | Repouso | Hover | Ativo | Onde |
|---|---|---|---|---|
| **primário** | fundo `ink`, texto branco | opacidade .90 | opacidade .80 | a ação da tela. Um por tela |
| **secundário** | fundo `surface`, borda `line`, texto `ink` | borda `line-strong`, fundo `surface-2` | fundo `surface-2` | ação alternativa |
| **fantasma** | sem fundo, texto `ink-2` | texto `ink`, fundo `surface-2` | fundo `surface-2` | ação terciária, voltar, cancelar |
| **perigo** | fundo `danger`, texto branco | opacidade .90 | opacidade .80 | excluir, cancelar pedido |

| Tamanho | Altura | Padding | Texto |
|---|---|---|---|
| `sm` | 36 | 12 | 13.5 |
| `md` | 44 | 16 | 15 |
| `lg` | 52 | 20 | 15 |

`lg` em largura cheia é o CTA do aluno no celular.

**Estados:** desabilitado é opacidade `.35` e cursor bloqueado, nunca some da tela, senão o
aluno acha que quebrou. Carregando troca o texto por um verbo no gerúndio ("Enviando…"),
mantém a largura e bloqueia clique repetido.

**Foco:** anel de 2px em `brand-deep`, 2px de folga. É o único lugar da UI onde o ciano
aparece sozinho, e é de propósito: quem navega por teclado precisa achar rápido.

---

## 8. Input

Altura 48 no aluno, 40 na empresa. Raio `lg` (16). Fundo `surface`, borda `line`.

| Estado | Aparência |
|---|---|
| foco | borda `brand-deep` + anel 3px `brand` a 18% |
| erro | borda `danger` + mensagem em `danger` abaixo |
| desabilitado | fundo `surface-2`, texto `muted`, sem borda de foco |
| preenchido | igual ao repouso · sem "sucesso verde", que vira ruído |

**Rótulo sempre visível acima do campo**, nunca só placeholder. Placeholder some quando digita
e leva a informação embora, no celular, é a causa número um de campo preenchido errado.

Texto de ajuda ocupa o mesmo espaço da mensagem de erro. Assim o layout não pula quando o erro
aparece.

**Campo de código da turma:** `Geist Mono`, centralizado, 26px, tracking `0.22em`, caixa alta
automática. O código não tem `O`, `I`, `L`, `0` nem `1`, o campo descarta esses caracteres
enquanto a pessoa digita.

---

## 9. Card

Fundo `surface`, borda 1px `line`, raio `lg`, `shadow-card`, padding conforme §3.

Card clicável ganha, em `base`: borda `line-strong` e `shadow-lift`. Sem deslocar em Y, card
que pula move a página inteira no celular.

Card com foto (vitrine): a foto encosta nas bordas de cima, raio `xl` no recorte, proporção
**3:4**, a peça é mais alta que larga.

---

## 10. Tabela

Só na empresa, e só a partir de 768px. Abaixo disso vira lista de cards (§13).

- Cabeçalho: `label`, cor `muted`, fundo `surface-2`, não rola junto
- Linha: 44px, borda inferior `line`
- Hover de linha: fundo `surface-2` em `fast`
- Número: alinhado à direita, tabular
- Texto: alinhado à esquerda
- Sem zebra, a borda já separa; zebra mais borda vira grade

Coluna de ação fica na direita, e **a ação mais usada é botão visível**, não item escondido em
menu. No painel, essa ação é "registrar pagamento".

Tabela larga rola dentro do próprio container. **A página nunca rola de lado.**

---

## 11. Badge de status

Pílula: raio `full`, 11.5px, peso 600, padding `3 · 9`, com um ponto de 5px antes do texto.

O ponto ajuda a bater o olho; **o texto é obrigatório**. Ninguém decide cobrança lendo cor.

### Pagamento

| Status | Cor | Quando |
|---|---|---|
| Pendente | `surface-2` / `ink-2` | nada pago, dentro do prazo |
| Parcial | `warning` | pagou parte |
| Pago | `success` | quitado |
| Em atraso | `danger` | venceu e não pagou |

### Produção

| Status | Cor |
|---|---|
| Aguardando | `surface-2` / `ink-2` |
| Liberado | `brand-soft` / `brand-deep` |
| Em produção | `warning` |
| Pronto | `success` |
| Entregue | `surface-2` / `muted` |

"Liberado" é o único badge com ciano em todo o sistema. É o momento em que o dinheiro entrou
e a peça virou trabalho, o evento mais importante do produto.

### Campanha

Aberta `success` · Encerrada `ink-2` · Concluída `muted`

---

## 12. Ícones

**Phosphor Icons**, peso `regular`, tamanho 20 (18 em tabela densa). Um pack só, sem misturar.

Cópia local em `~/.claude/phosphor-icons/`; no projeto, `@phosphor-icons/react`.

Por quê: Lucide é o padrão do shadcn e está em metade dos painéis da internet, foi você quem
apontou isso. Phosphor tem traço mais fino, que conversa com a serifa fina do logo, e tem
variação de peso se um dia precisar.

Ícone decorativo é escondido de leitor de tela. Ícone que é o único conteúdo de um botão
precisa de rótulo acessível. **Ícone nunca substitui texto numa ação importante**, no painel,
lixeira sozinha já apagou pedido de gente demais por aí.

---

## 13. Responsivo

Cortes: `640` · `768` · `1024` · `1280`.

| | Aluno | Empresa |
|---|---|---|
| Base | celular | desktop |
| Largura de conteúdo | máx. 480 centralizado | máx. 1280 |
| Navegação | sem barra; voltar no topo | lateral fixa ≥1024, menu deslizante abaixo |
| Tabela | não existe | vira card empilhado abaixo de 768 |

**Tabela virando card no mobile**, regra fixa: nome em cima com o badge de status na mesma
linha; dois a três dados por card, nunca todas as colunas; ação principal como botão de
largura cheia embaixo.

Nada de rolagem horizontal na página, em nenhuma largura.

---

## 14. Estados de tela

Toda tela que busca dado tem os quatro. Entregar só o caso feliz não conta como entregue.

**Carregando**, blocos cinza (`surface-2`) no formato do conteúdo final, sem pulsar forte.
Nunca um spinner solto no meio da tela: ele não diz nada sobre o que vem.

**Vazio**, título curto dizendo o que ainda não existe, uma linha explicando, e a ação que
resolve. Sem ilustração. Exemplo: *"Nenhum pedido ainda · Assim que alguém da 3B pedir, ele
aparece aqui · Lançar pedido manual"*.

**Erro**, o que falhou em linguagem de gente, e o botão de tentar de novo. Nada de código de
erro na cara do aluno.

**Sucesso**, confirmação visível, com o que fazer em seguida. Depois do pedido: número do
pedido, quanto falta pagar, e o caminho para acompanhar.

---

## 15. Acessibilidade · não é opcional

- Contraste mínimo AA. `muted` sobre `ground` é o par mais apertado do sistema: só para texto
  de apoio, nunca para informação que decide alguma coisa
- Foco visível em tudo que recebe teclado (§7)
- `button` é botão e `a` é link. `div` clicável só com `role` e teclado tratado
- Alvo de toque mínimo 44×44
- Informação nunca só por cor, badge sempre com texto
- Campo sempre com `label` ligado por `id`
- Erro anunciado com `role="alert"`

---

## 16. Logo

Cinco arquivos em `logo svg/`. Em fundo claro:

| Situação | Arquivo | Como |
|---|---|---|
| Cabeçalho, rodapé, PDF | `NE-preto.svg` | monograma em `ink`, "E" em `brand` |
| Favicon, avatar | `NE-PRETO-CIRCULO.svg` | versão com contorno |
| Marca protagonista (entrar, pedido confirmado) | `NE-preto.svg` | maior, com o "E" em `brand` |

As versões brancas ficam para material impresso sobre foto escura. Não entram na UI.

---

## 17. Preview da estampa

Ilustração **SVG** da peça, não foto. Foto vende; SVG garante que o nome caia sempre no mesmo
lugar, do mesmo tamanho, independente da foto que o admin subiu.

O que as fotos do produto mostraram:

- É **polo**: gola e punho com listra bordô, dois botões, brasão no peito
- O nome é bordado em **script (cursiva), cor bordô**, não é caixa alta em bloco
- Fica **pequeno, na parte inferior das costas**
- Aparece também na manga esquerda

**Consequência direta:** o nome **não** pode ser forçado para caixa alta. Fica `Fernandes`,
como a pessoa escreveu, só `trim` e colapso de espaço duplo.

**Fonte do preview: a mesma da interface (Geist). Nada de cursiva.**

Cheguei a propor `Pinyon Script` para imitar o bordado. Foi descartado, e o motivo é bom:
**fonte cursiva no preview promete uma fonte.** O aluno olharia e concluiria que a peça sai
naquela letra, e a letra do bordado é decisão da produção, não dele. O preview responde
"onde e de que tamanho meu nome vai ficar", não "com que desenho de letra".

Especificação: texto pequeno, dentro do contorno, na parte inferior das costas. Proporção de
referência: a largura do nome ocupa cerca de **um terço** da largura da peça, foi o que a foto
`produtos/polo-formatura/02-costas-nome.webp` mostrou. Cor bordô `#7B2233`, tirada da própria
peça, porque essa a produção usa mesmo.

---

## 18. O que este documento não decide

- Layout de exportação em PDF e xlsx
- Ilustração do moletom (não há foto ainda)
- Qualquer coisa da auth definitiva
- Gráficos do painel, quando existirem, entram aqui


---

## Texto de interface · capitalização

**Toda palavra que abre um texto de interface começa com maiúscula, inclusive depois de
número.** Vale para rótulo, legenda, `caption`, chip, cabeçalho de tabela e contagem montada
em template.

| Errado | Certo |
|---|---|
| `0 Turmas · 0 alunos · entrada de 50%` | `0 Turmas · 0 Alunos · Entrada de 50%` |
| `355 pedidos` | `355 Pedidos` |
| `12 d de atraso` | `12 D de atraso` |
| `sem data` | `Sem data` |

Decidido em 12/08/2026, olhando a tela pronta. Minúscula depois de número lê como frase
cortada no meio, e a tela inteira fica com cara de rascunho. Onde a contagem cai no meio de uma
frase corrida, a frase é reescrita para a contagem abrir a oração, em vez de deixar a
maiúscula no meio do caminho.

Dado que vem do banco não entra nessa regra: nome de aluno e de produto passam por
`capitalizarNome`, que é outra decisão.

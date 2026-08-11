# Funções da área da empresa · levantamento

Documento de trabalho, escrito em 11/08/2026. Lista o que o admin precisa poder fazer, o
que o banco já aguenta, o que exige mexer no schema, e o que ainda depende de decisão.

Regra do projeto: separar **essencial para o MVP** · **interessante** · **versão futura**.

---

## 1. O que o banco já aguenta, sem migration nenhuma

Conferido coluna por coluna no dia 11/08/2026.

| Tabela | Campos que já existem e ninguém edita pela interface |
|---|---|
| `cliente` | nome, tipo, cidade, contato_nome, contato_telefone, **observacoes**, **arquivado_em** |
| `campanha` | nome, status, label_grupo, label_grupo_plural, prazo_pedidos, prazo_alteracoes, **entrega_prevista**, **percentual_entrada** |
| `grupo` | nome, codigo, alunos_esperados |
| `produto` | nome, descricao, tipo, preco_centavos, tamanhos[], max_caracteres_nome, ativo, **ordem**, **imagens[]** |
| `produto_componente` | kit_id, componente_id, quantidade |

Três descobertas que corrigem o CLAUDE.md:

- **`produto.imagens` (text[]) já existe.** O §5 diz que o schema não tem campo de imagem.
  Diz errado desde alguma migration que ninguém registrou aqui.
- **O bucket `produtos` existe, é público, e tem 7 arquivos dentro**, já ligados a
  `Polo de Formatura` e a `Camiseta de Formatura`. O §5 diz que nada foi subido.
- **`percentual_entrada` e `entrega_prevista` são configuráveis por campanha.** O 50/50 do
  §3.4 é o default da coluna, não uma regra fixa no código.

Regras do banco que a interface precisa respeitar:

```
grupo.codigo        UNIQUE, e CHECK ~ '^[A-Z0-9]{4,10}$'
produto.max_caracteres_nome   CHECK entre 1 e 60
produto (simples)   CHECK cardinality(tamanhos) > 0
campanha.percentual_entrada   CHECK entre 0 e 100
produto_componente  kit não contém a si mesmo, quantidade > 0
```

---

## 2. O que exige mexer no schema

Nada aqui está autorizado. Cada linha é uma pergunta, não um plano.

| # | Mudança | Por que | Risco |
|---|---|---|---|
| M1 | `cliente.endereco text` | Pedido direto: endereço opcional no cadastro | Nenhum, coluna nova opcional |
| M2 | `grupo.representante_nome`, `grupo.representante_telefone` | Pendência antiga do §4.1.1: a tela Conta do aluno promete mostrar o contato do representante e não tem de onde tirar | Nenhum, mas precisa entrar na view pública |
| M3 | `produto.exige_nome boolean default true` | Pedido direto: produto que não leva nome bordado | **Contraria o §3.2.1**, ver seção 6 |
| M4 | `atualizado_em` em cliente, campanha, grupo, produto | Hoje não dá para saber quando alguém mexeu num prazo | Nenhum |
| M5 | `cliente.arquivado_em` já existe, falta usar | Cliente antigo polui a home | Nenhum, é só interface |

---

## 3. Funções por tela

### 3.1 Cliente

| # | Função | Estado | Faixa |
|---|---|---|---|
| C1 | Criar cliente | **pronto** (11/08) | MVP |
| C2 | **Editar cliente** · nome, tipo, cidade, contato, telefone, endereço, observações | falta | MVP |
| C3 | Arquivar cliente, e filtro "mostrar arquivados" | falta | interessante |
| C4 | Excluir cliente | não fazer | futuro |

Sobre C4: excluir cliente com campanha derruba pedido e pagamento junto. Arquivar resolve o
problema real (tirar da lista) sem risco de apagar histórico financeiro.

### 3.2 Campanha · é o buraco maior

Hoje não existe **nenhuma** tela que cria ou edita campanha. A jornada da demo trava aqui:
o admin cria o cliente e não consegue dar o próximo passo.

| # | Função | Campos | Faixa |
|---|---|---|---|
| K1 | **Criar campanha** | nome, rótulo do grupo (singular e plural), prazo de pedidos, prazo de alterações, entrega prevista, percentual de entrada | MVP |
| K2 | **Editar campanha** (o lápis) | os mesmos | MVP |
| K3 | **Mudar status** · aberta · encerrada · concluída | com o efeito explicado em texto | MVP |
| K4 | Duplicar campanha, clonando produtos e preços | já previsto no §3.2.1 | futuro |

Detalhes que a tela precisa resolver, não são enfeite:

- **Rótulo do grupo** é o que faz o sistema servir escola, faculdade e empresa. Oferecer
  atalhos (Turma/Turmas · Sala/Salas · Setor/Setores) e deixar digitar.
- **Prazo de alterações não pode ser anterior ao prazo de pedidos.** A tela valida; o banco
  hoje não impede.
- **Percentual de entrada** muda o valor das parcelas. Alterar depois de existir pedido
  **não** recalcula o que já foi gerado, e a tela precisa dizer isso.
- **Campanha nova já nasce aberta.** Encerrar interrompe novos pedidos, e concluir registra
  que a operação foi finalizada.

### 3.3 Turma

| # | Função | Estado | Faixa |
|---|---|---|---|
| T1 | Criar turma · nome + código | falta | MVP |
| T2 | **Editar turma** (o lápis) · nome, código, representante | falta | MVP |
| T3 | Criar várias turmas de uma vez | falta | interessante |
| T4 | Excluir turma, só quando não tem pedido | falta | interessante |
| T5 | Copiar o link da turma, e QR code | falta | interessante |

Sobre T3: a escola do seed tem 12 turmas. Cadastrar uma a uma na frente da cliente é ruim de
ver. Um campo que aceita `3A, 3B, 3C` e cria as três, com código gerado a partir de um prefixo
(`CB` + nome = `CB3A`), resolve em um envio.

Sobre T2, um aviso obrigatório: **trocar o código quebra o link que já foi distribuído.** Quem
tem o link antigo cai em página inexistente. A tela precisa dizer isso antes de salvar.

### 3.4 Produtos · a loja

| # | Função | Estado | Faixa |
|---|---|---|---|
| P1 | **Criar produto** · nome, descrição, preço, tamanhos, imagens | falta | MVP |
| P2 | **Upload de imagem com compressão no navegador** | falta | MVP |
| P3 | Escolher a capa e reordenar as fotos | falta | MVP |
| P4 | **Editar produto** | falta | MVP |
| P5 | Ativar e desativar | falta | MVP |
| P6 | Ordem na vitrine | falta | interessante |
| P7 | Montar kit a partir de produtos existentes | falta | interessante |
| P8 | Limite de caracteres do nome bordado | falta | interessante |
| P9 | Produto sem nome bordado | **decisão pendente**, ver seção 6 | ? |

Pontos de atenção:

- **Grade de tamanhos.** Marcar os que existem, em dois blocos: tradicional e baby look. O
  prefixo `BL ` é convenção do §3.2.1 e a tela nunca deve pedir para digitar isso na mão.
- **Preço é snapshot.** Mudar o preço não altera pedido já feito, e isso está certo. A tela
  de edição precisa avisar, senão a dona acha que corrigiu o passado.
- **Compressão no navegador** já foi decidida no §5.1, com o motivo: quem cadastra sobe do
  celular no 4G da escola. Redimensionar para 1600 px e converter para webp antes de subir.
- **P8 depende da produção** informar o máximo real do bordado (§3.5, suspenso desde 09/08).

### 3.5 Pedido manual (E6)

| # | Função | Estado | Faixa |
|---|---|---|---|
| M1 | Lançar pedido pelo painel · nome do aluno, telefone, produto, tamanho, nome da estampa | falta | MVP |
| M2 | Já lançar com pagamento registrado | falta | interessante |

O modelo já está pronto para isso: `pedido.origem = 'admin'`, `perfil_id` nulo,
`criado_por` preenchido (§3.2.2). Falta só a tela.

M2 existe porque o caso real é esse: o aluno pagou em dinheiro na mão do representante. Lançar
o pedido e depois procurar ele na lista para dar baixa são dois passos para uma coisa só.

### 3.6 Configurações da empresa

| # | Função | Estado | Faixa |
|---|---|---|---|
| E1 | Trocar o código da empresa | função existe no banco, **sem tela** | interessante |
| E2 | Ver quem tem acesso, e revogar | `acesso_empresa` registra, **sem tela** | interessante |

O §3.3 justifica os dois: a empresa vê "7 contas com acesso", reconhece 5, e as outras 2 são o
motivo de trocar o código. Sem a tela E2, trocar o código é um ato às cegas.

Revogar acesso não existe nem no banco. Precisaria de uma função nova.

---

## 4. Padrões que valem para todas essas telas

Decididos e já em uso, não reabrir:

- **Tudo que cria ou edita abre em painel lateral** (`components/gaveta.tsx`), com o estado na
  URL. O detalhe do pedido e o novo cliente já seguem isso.
- **Nada de `select` nativo.** Escolha é botão de rádio ou o componente `Escolha`.
- **Validação com mensagem em português**, escrita por nós, via `Campo`/`Entrada`.
- **Toda ação devolve `string | undefined`.** String é o erro que a tela mostra.
- **Toda escrita chama `atualizar()`**, que derruba o cache do painel.
- **Dinheiro em centavos.** Campo de preço aceita `60`, `60,50` e `60.50`.
- **Nomes passam por `capitalizarNome`.**

---

## 5. Ordem sugerida de construção

A ordem é a da jornada da demo (§6 do CLAUDE.md), porque é ela que precisa rodar inteira.

```
1. Campanha: criar + editar + status        ← destrava a jornada, hoje ela para aqui
2. Turma: criar + editar (+ criar em lote)
3. Produto: criar + editar + imagens        ← maior das quatro, tem upload
4. Cliente: editar
5. Pedido manual
6. Configurações da empresa
```

Cliente vem depois de produto de propósito: editar cliente é conforto, e sem campanha,
turma e produto a demonstração não anda.

---

## 6. Decisões · respondidas em 11/08/2026

- **6.1 Produto sem nome bordado: vai existir.** O moletom é o caso real. Quando o produto
  não leva bordado, some também a confirmação do apelido (a dupla digitação). Registrado no
  §3.2.1 do CLAUDE.md, que dizia o contrário.
- **6.2 Endereço: informação de cadastro da escola**, não entrega. Coluna `cliente.endereco`,
  aplicada. **Feito.**
- **6.3 Representante na turma: ainda em aberto.** Não mexer.
- **6.4 Histórico de alteração: sem resposta ainda.**

O texto original de cada uma segue abaixo.

---

## 6 (original). Decisões pendentes

### 6.1 Produto sem nome bordado · conflita com regra travada

O §3.2.1 diz, em letra travada: **"Personalização é obrigatória: todo produto leva nome
estampado."** A ideia de um produto sem nome bordado desfaz isso.

Não é só uma coluna. O efeito atravessa o sistema:

- **Fluxo do aluno:** a tela de personalização deixa de fazer sentido para esse produto, e o
  aluno passa a escolher só o tamanho. É uma bifurcação nova no caminho de compra.
- **Banco:** `pedido_item.nome_estampa` é `NOT NULL` com `CHECK length(trim()) > 0`. Um item
  sem nome não entra hoje. Ou a coluna aceita nulo, ou o item guarda o nome do aluno mesmo
  sem bordar, que é mentira no dado.
- **Produção:** a planilha exportada tem a coluna "Nome ou Apelido", copiada do papel da
  empresa (§3.8). Para produto sem nome, ela sai vazia.

Vale a pena? Provavelmente sim, porque existe uniforme sem personalização no mundo real. Mas é
mudança de regra, não ajuste de tela, e precisa da sua confirmação.

### 6.2 Endereço do cliente

Coluna nova, sem risco. Serve para quê, exatamente: entrega, nota fiscal, ou só cadastro? Se
for entrega, o endereço talvez pertença à **campanha**, não ao cliente: a mesma escola pode
receber em lugares diferentes em anos diferentes.

### 6.3 Representante na turma

Pendência registrada no §4.1.1 desde antes. A tela Conta do aluno promete mostrar o contato do
representante e não tem de onde tirar. Duas colunas em `grupo` e uma view pública resolvem.

### 6.4 Histórico de alteração

A tabela `alteracao` existe e só o `editarItem` grava nela. Mudar prazo de campanha e preço de
produto são decisões com efeito financeiro. Gravar essas duas, ou deixar para depois?

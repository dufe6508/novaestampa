-- ============================================================
-- Nova Estampa · schema do MVP (Supabase / Postgres 17)
--
-- Convenções:
--   * Dinheiro em CENTAVOS (integer). Evita float e evita numeric-como-string no JS.
--   * Status de pagamento é DERIVADO (view vw_pedido), nunca digitado.
--   * pagamento é append-only: saldo = soma. Nunca dar UPDATE em valor pago.
--   * RLS ligada em tudo, SEM policies: nada acessível pela anon key.
--     Todo acesso passa pelo servidor (Server Actions / Route Handlers) com service role.
--     Quando a auth definitiva for decidida, escrevemos as policies.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
create type tipo_perfil        as enum ('aluno', 'empresa');
create type tipo_cliente       as enum ('escola', 'faculdade', 'empresa', 'outro');
create type status_campanha    as enum ('aberta', 'encerrada', 'concluida');
create type tipo_produto       as enum ('simples', 'kit');
create type situacao_produto   as enum ('a_venda', 'pausado', 'oculto');
create type status_pedido      as enum ('ativo', 'cancelado');
create type status_producao    as enum ('aguardando', 'liberado', 'em_producao', 'pronto', 'entregue');
create type metodo_pagamento   as enum ('pix', 'cartao', 'dinheiro', 'transferencia', 'outro');
create type origem_pedido      as enum ('aluno', 'admin');

-- ------------------------------------------------------------
-- Perfil · espelha auth.users
-- ------------------------------------------------------------
create table perfil (
  id          uuid primary key references auth.users(id) on delete cascade,
  tipo        tipo_perfil not null default 'aluno',  -- definido pela porta de entrada
  nome        text not null,
  email       text not null,
  telefone    text,
  criado_em   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Cliente · escola / faculdade / empresa atendida
-- ------------------------------------------------------------
create table cliente (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  tipo        tipo_cliente not null default 'escola',
  cidade      text,
  contato_nome     text,
  contato_telefone text,
  observacoes text,
  criado_em   timestamptz not null default now(),
  arquivado_em timestamptz
);

-- ------------------------------------------------------------
-- Campanha · a unidade de operação. Preços e prazos vivem aqui.
-- ------------------------------------------------------------
create table campanha (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references cliente(id) on delete cascade,
  nome          text not null,                    -- "Formatura 2026"
  status        status_campanha not null default 'aberta',

  -- label do agrupamento, para servir escola/faculdade/empresa sem mudar schema
  label_grupo         text not null default 'Turma',   -- "Turma" | "Sala" | "Setor"
  label_grupo_plural  text not null default 'Turmas',

  prazo_pedidos       date,   -- até quando aceita novo pedido
  prazo_alteracoes    date,   -- até quando o aluno edita tamanho / nome
  entrega_prevista    date,   -- vencimento da 2ª parcela

  percentual_entrada  smallint not null default 50
    check (percentual_entrada between 0 and 100),

  criado_em     timestamptz not null default now()
);

create index on campanha (cliente_id);

-- ------------------------------------------------------------
-- Grupo · turma / sala / setor
-- ------------------------------------------------------------
create table grupo (
  id              uuid primary key default gen_random_uuid(),
  campanha_id     uuid not null references campanha(id) on delete cascade,
  nome            text not null,                       -- "3B"
  codigo          text not null unique,                -- código de acesso do aluno
  alunos_esperados int check (alunos_esperados > 0),   -- alimenta o % de adesão
  criado_em       timestamptz not null default now()
);

create index on grupo (campanha_id);

-- Código sempre em caixa alta, sem caracteres ambíguos (O 0 I 1 L).
alter table grupo add constraint grupo_codigo_formato
  check (codigo ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4,10}$');

-- ------------------------------------------------------------
-- Produto · pertence à campanha (preço/produto variam por campanha)
--
-- Preço NÃO varia por tamanho (decisão do usuário).
-- Nome bordado é POR PRODUTO: o moletom sai sem (exige_nome).
--
-- As colunas abaixo do bloco original chegaram em duas migrations:
--   galeria_de_imagens_do_produto  →  imagens
--   cadastro_de_produto            →  situacao, classe, exige_nome,
--                                     max_parcelas, prazo_pedidos,
--                                     prazo_alteracoes, e `ativo` virou gerada
-- ------------------------------------------------------------
create table produto (
  id            uuid primary key default gen_random_uuid(),
  campanha_id   uuid not null references campanha(id) on delete cascade,
  nome          text not null,                 -- "Camiseta de formatura" | "Kit Formatura"
  descricao     text,
  tipo          tipo_produto not null default 'simples',
  classe        text not null default 'outro'
    check (classe in ('camisa', 'moletom', 'polo', 'outro')),
  preco_centavos integer not null check (preco_centavos >= 0),

  -- grade de tamanhos, na ordem de exibição. Só para tipo 'simples'.
  tamanhos      text[] not null default '{}',

  -- galeria. imagens[1] é a capa: é ela que aparece na vitrine.
  imagens       text[] not null default '{}',

  -- limite de caracteres do bordado
  max_caracteres_nome smallint not null default 20 check (max_caracteres_nome between 1 and 60),

  -- false = a peça sai sem bordado, e a tela de personalização some do fluxo
  exige_nome    boolean not null default true,

  -- teto de vezes que o aluno pode escolher. A 1ª parcela é sempre a entrada.
  max_parcelas  smallint not null default 2 check (max_parcelas between 1 and 12),

  -- prazos próprios. Nulos herdam os da campanha.
  prazo_pedidos    date,
  prazo_alteracoes date,

  -- a_venda aparece e vende · pausado aparece sem botão · oculto some da loja
  situacao      situacao_produto not null default 'a_venda',

  -- derivada de `situacao`: uma fonte da verdade só, e todo código antigo que
  -- pergunta por `ativo` continua valendo.
  ativo         boolean generated always as (situacao = 'a_venda') stored,

  ordem         smallint not null default 0,
  criado_em     timestamptz not null default now(),

  constraint produto_simples_tem_tamanhos
    check (tipo <> 'simples' or cardinality(tamanhos) > 0)
);

create index on produto (campanha_id);

-- Componentes de um kit. "Kit Formatura" = 1 camisa + 1 moletom.
-- O preço do kit está no produto pai; o preço dos componentes é ignorado.
create table produto_componente (
  id             uuid primary key default gen_random_uuid(),
  kit_id         uuid not null references produto(id) on delete cascade,
  componente_id  uuid not null references produto(id) on delete restrict,
  quantidade     smallint not null default 1 check (quantidade > 0),
  ordem          smallint not null default 0,

  unique (kit_id, componente_id),
  constraint kit_nao_contem_a_si_mesmo check (kit_id <> componente_id)
);

create index on produto_componente (kit_id);

-- ------------------------------------------------------------
-- Pedido · 1 pedido = 1 produto (simples ou kit). Sem carrinho misto.
-- O aluno pode fazer quantos pedidos quiser no mesmo grupo.
--
-- O ALUNO É DADO DO PEDIDO, NÃO DA CONTA DE LOGIN.
-- O admin lança pedido manualmente (quem paga em dinheiro na mão) e essa pessoa
-- não tem conta. Por isso aluno_nome/telefone ficam aqui e perfil_id é opcional.
-- Efeito colateral bom: a lista de produção não depende da auth · que é provisória.
-- ------------------------------------------------------------
create table pedido (
  id            uuid primary key default gen_random_uuid(),
  grupo_id      uuid not null references grupo(id) on delete restrict,
  produto_id    uuid not null references produto(id) on delete restrict,

  aluno_nome     text not null check (length(trim(aluno_nome)) > 0),
  aluno_telefone text,
  perfil_id      uuid references perfil(id) on delete set null,  -- null = lançado pelo admin
  origem         origem_pedido not null default 'aluno',
  criado_por     uuid references perfil(id),                     -- quem lançou

  -- snapshot: nome e preço no momento do pedido. Mudar o produto depois
  -- não pode reescrever o histórico financeiro.
  produto_nome_snapshot text not null,
  valor_centavos        integer not null check (valor_centavos >= 0),

  status           status_pedido not null default 'ativo',
  status_producao  status_producao not null default 'aguardando',
  producao_forcada boolean not null default false,   -- admin liberou sem pagamento
  motivo_liberacao text,

  observacoes   text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint liberacao_forcada_tem_motivo
    check (not producao_forcada or motivo_liberacao is not null)
);

create index on pedido (grupo_id);
create index on pedido (perfil_id);

-- ------------------------------------------------------------
-- Item · 1 peça física. Produto simples gera 1; kit gera N.
-- É aqui que a produção trabalha.
-- ------------------------------------------------------------
create table pedido_item (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references pedido(id) on delete cascade,
  produto_id     uuid not null references produto(id) on delete restrict,  -- o componente

  produto_nome_snapshot text not null,
  tamanho        text not null,
  -- Vazio quando o produto não leva bordado (produto.exige_nome = false). O
  -- check de tamanho mínimo caiu na migration cadastro_de_produto: nulo
  -- obrigaria tratar a ausência em dez telas, e string vazia já cai bem em
  -- todas, inclusive na coluna "Nome ou Apelido" da planilha, que sai em branco.
  nome_estampa   text not null,
  quantidade     smallint not null default 1 check (quantidade > 0),
  observacoes    text,

  criado_em      timestamptz not null default now()
);

create index on pedido_item (pedido_id);
create index on pedido_item (produto_id);

-- ------------------------------------------------------------
-- Parcela · o pedido É a cobrança. 50/50 gera 2 parcelas.
-- ------------------------------------------------------------
create table parcela (
  id            uuid primary key default gen_random_uuid(),
  pedido_id     uuid not null references pedido(id) on delete cascade,
  numero        smallint not null check (numero > 0),
  valor_centavos integer not null check (valor_centavos >= 0),
  vencimento    date,
  eh_entrada    boolean not null default false,   -- a que libera produção

  unique (pedido_id, numero)
);

create index on parcela (pedido_id);

-- ------------------------------------------------------------
-- Pagamento · APPEND-ONLY. Nunca sobrescrever.
-- Estrutura já preparada para gateway; no MVP, provider = 'manual' ou 'simulado'.
-- ------------------------------------------------------------
create table pagamento (
  id             uuid primary key default gen_random_uuid(),
  parcela_id     uuid not null references parcela(id) on delete cascade,
  valor_centavos integer not null check (valor_centavos > 0),
  metodo         metodo_pagamento not null default 'pix',

  provider            text not null default 'manual',  -- 'manual' | 'simulado' | 'mercadopago' | ...
  provider_payment_id text,
  provider_status     text,

  comprovante_url text,
  registrado_por  uuid references perfil(id),
  pago_em         timestamptz not null default now(),
  criado_em       timestamptz not null default now(),

  unique (provider, provider_payment_id)   -- webhook idempotente
);

create index on pagamento (parcela_id);

-- ------------------------------------------------------------
-- Log de alterações · quem mudou o quê, quando
-- ------------------------------------------------------------
create table alteracao (
  id           uuid primary key default gen_random_uuid(),
  entidade     text not null,      -- 'pedido_item' | 'pedido' | ...
  entidade_id  uuid not null,
  campo        text not null,
  valor_antes  text,
  valor_depois text,
  por          uuid references perfil(id),
  em           timestamptz not null default now()
);

create index on alteracao (entidade, entidade_id);

-- ============================================================
-- Views · status derivado. Todas as telas consomem daqui.
-- ============================================================

create view vw_parcela with (security_invoker = on) as
select
  p.*,
  coalesce(sum(g.valor_centavos), 0)::integer                as pago_centavos,
  (p.valor_centavos - coalesce(sum(g.valor_centavos), 0))::integer as saldo_centavos,
  case
    when coalesce(sum(g.valor_centavos), 0) >= p.valor_centavos then 'pago'
    when coalesce(sum(g.valor_centavos), 0) > 0                 then 'parcial'
    when p.vencimento is not null
      and p.vencimento < (now() at time zone 'America/Sao_Paulo')::date then 'atrasado'
    else 'pendente'
  end as status
from parcela p
left join pagamento g on g.parcela_id = p.id
group by p.id;

create view vw_pedido with (security_invoker = on) as
select
  ped.id,
  ped.grupo_id,
  ped.perfil_id,
  ped.produto_id,
  ped.produto_nome_snapshot,
  ped.valor_centavos,
  ped.status,
  ped.status_producao,
  ped.producao_forcada,
  ped.observacoes,
  ped.criado_em,
  ped.origem,
  ped.aluno_nome,
  ped.aluno_telefone,

  coalesce(sum(vp.pago_centavos), 0)::integer                    as pago_centavos,
  (ped.valor_centavos - coalesce(sum(vp.pago_centavos), 0))::integer as saldo_centavos,

  -- "Em atraso" significa uma coisa só: pagou a entrada e deixou vencer o resto.
  -- Quem nunca pagou nada cai em 'pendente', vencido ou não, porque a cobrança é
  -- outra: um é lembrete de segunda parcela, o outro é pedido que nunca entrou na
  -- produção. Por isso o teste de pagamento vem antes do teste de vencimento.
  case
    when coalesce(sum(vp.pago_centavos), 0) >= ped.valor_centavos then 'pago'
    when coalesce(sum(vp.pago_centavos), 0) > 0
     and bool_or(vp.status = 'atrasado')                          then 'atrasado'
    when coalesce(sum(vp.pago_centavos), 0) > 0                   then 'parcial'
    else 'pendente'
  end as status_pagamento,

  -- entrada quitada?  → é o que libera produção
  coalesce(bool_and(vp.status = 'pago') filter (where vp.eh_entrada), false) as entrada_paga,

  (ped.producao_forcada
   or coalesce(bool_and(vp.status = 'pago') filter (where vp.eh_entrada), false)) as pode_produzir

from pedido ped
left join vw_parcela vp on vp.pedido_id = ped.id
group by ped.id;

-- Lista de produção: uma linha por peça liberada.
create view vw_producao with (security_invoker = on) as
select
  i.id           as item_id,
  i.pedido_id,
  g.id           as grupo_id,
  g.nome         as grupo_nome,
  c.id           as campanha_id,
  c.nome         as campanha_nome,
  cli.nome       as cliente_nome,
  v.aluno_nome,
  v.aluno_telefone,
  i.produto_nome_snapshot as produto,
  i.tamanho,
  i.nome_estampa,
  i.quantidade,
  i.observacoes,
  v.status_pagamento,
  v.saldo_centavos,
  v.status_producao
from pedido_item i
join vw_pedido v on v.id = i.pedido_id
join pedido ped  on ped.id = i.pedido_id
join grupo g     on g.id = ped.grupo_id
join campanha c  on c.id = g.campanha_id
join cliente cli on cli.id = c.cliente_id
where v.pode_produzir and v.status = 'ativo';

-- Resumo de corte: o que a oficina realmente consome.
create view vw_resumo_corte with (security_invoker = on) as
select grupo_id, grupo_nome, campanha_id, produto, tamanho,
       sum(quantidade)::integer as total
from vw_producao
group by grupo_id, grupo_nome, campanha_id, produto, tamanho;

-- Adesão por grupo · depende de grupo.alunos_esperados.
create view vw_grupo_resumo with (security_invoker = on) as
select
  g.id, g.campanha_id, g.nome, g.codigo, g.alunos_esperados,
  count(distinct v.id) filter (where v.status = 'ativo')         as pedidos,
  -- conta por nome, não por perfil: pedido lançado pelo admin não tem conta
  count(distinct v.aluno_nome) filter (where v.status = 'ativo') as alunos_com_pedido,
  coalesce(sum(v.valor_centavos) filter (where v.status = 'ativo'), 0)::integer as vendido_centavos,
  coalesce(sum(v.pago_centavos)  filter (where v.status = 'ativo'), 0)::integer as recebido_centavos,
  coalesce(sum(v.saldo_centavos) filter (where v.status = 'ativo'), 0)::integer as a_receber_centavos
from grupo g
left join pedido ped on ped.grupo_id = g.id
left join vw_pedido v on v.id = ped.id
group by g.id;

-- ============================================================
-- Regra: quando a entrada é paga, o pedido entra na produção.
-- ============================================================
create or replace function sync_status_producao() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_pode boolean;
begin
  select p.pedido_id into v_pedido_id from parcela p where p.id = new.parcela_id;
  select pode_produzir into v_pode from vw_pedido where id = v_pedido_id;

  if v_pode then
    update pedido
       set status_producao = 'liberado', atualizado_em = now()
     where id = v_pedido_id and status_producao = 'aguardando';
  end if;

  return new;
end $$;

create trigger trg_sync_status_producao
after insert on pagamento
for each row execute function sync_status_producao();

-- ============================================================
-- RLS: ligada em todas as tabelas, sem policies.
-- Nada é acessível pela anon key. Acesso só via servidor (service role).
-- Policies serão escritas quando a auth definitiva for decidida.
-- ============================================================
alter table perfil             enable row level security;
alter table cliente            enable row level security;
alter table campanha           enable row level security;
alter table grupo              enable row level security;
alter table produto            enable row level security;
alter table produto_componente enable row level security;
alter table pedido             enable row level security;
alter table pedido_item        enable row level security;
alter table parcela            enable row level security;
alter table pagamento          enable row level security;
alter table alteracao          enable row level security;

-- ============================================================
-- Acesso à área da empresa por código, redefinível pela empresa.
-- (migrations: acesso_empresa_por_codigo, codigo_empresa_case_insensitive)
--
-- O código nunca é guardado em texto puro · só o hash bcrypt.
-- Acertar o código promove a CONTA de forma permanente; trocar o código
-- invalida apenas para quem ainda não entrou. Sem isso, rotacionar o
-- código expulsaria a própria dona e ninguém rotacionaria nunca.
-- ============================================================

create table empresa_config (
  id                boolean primary key default true check (id),  -- linha única
  codigo_hash       text not null,
  atualizado_em     timestamptz not null default now(),
  atualizado_por    uuid references perfil(id)
);

insert into empresa_config (codigo_hash)
values (crypt('NOVAESTAMPA2026', gen_salt('bf')));

alter table empresa_config enable row level security;

create table acesso_empresa (
  id           uuid primary key default gen_random_uuid(),
  perfil_id    uuid not null references perfil(id) on delete cascade,
  concedido_em timestamptz not null default now(),
  revogado_em  timestamptz,
  ip           text,
  user_agent   text,
  unique (perfil_id)
);

create index on acesso_empresa (concedido_em desc);
alter table acesso_empresa enable row level security;

-- Normaliza com upper(trim()): código digitado no celular não pode falhar
-- por maiúscula ou espaço sobrando.
create or replace function conceder_acesso_empresa(p_perfil_id uuid, p_codigo text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_ok boolean;
begin
  select codigo_hash = crypt(upper(trim(p_codigo)), codigo_hash) into v_ok
    from empresa_config where id;

  if not coalesce(v_ok, false) then
    return false;
  end if;

  update perfil set tipo = 'empresa' where id = p_perfil_id;

  insert into acesso_empresa (perfil_id) values (p_perfil_id)
  on conflict (perfil_id) do update set revogado_em = null;

  return true;
end $$;

create or replace function redefinir_codigo_empresa(p_novo text, p_por uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(trim(p_novo)) < 6 then
    raise exception 'Código precisa ter pelo menos 6 caracteres';
  end if;

  update empresa_config
     set codigo_hash = crypt(upper(trim(p_novo)), gen_salt('bf')),
         atualizado_em = now(),
         atualizado_por = p_por
   where id;
end $$;

revoke all on function conceder_acesso_empresa(uuid, text) from public, anon, authenticated;
revoke all on function redefinir_codigo_empresa(text, uuid) from public, anon, authenticated;

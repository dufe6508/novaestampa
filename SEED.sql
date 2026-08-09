-- ============================================================
-- Nova Estampa · dados de demonstração
--
-- Gera 3 clientes com perfis diferentes (escola / faculdade / empresa),
-- para a tela de clientes não parecer vazia, e uma campanha principal
-- no volume real informado pelo usuário (~12 turmas, ~600 pedidos).
--
-- Estados de pagamento distribuídos de propósito: quitado, só entrada,
-- pendente e atrasado · o painel precisa mostrar problema, não só sucesso.
--
-- Idempotente: apaga os dados de demo antes de recriar.
-- ============================================================

begin;

-- pedido → grupo/produto é ON DELETE RESTRICT (histórico financeiro não some por acidente),
-- então limpar pedidos primeiro. O resto cai por cascata a partir de cliente.
delete from pedido;
delete from cliente;

-- ------------------------------------------------------------
-- Gerador
-- ------------------------------------------------------------
create or replace function seed_campanha(
  p_campanha_id uuid,
  p_prefixo     text,          -- prefixo do código do grupo
  p_grupos      text[],
  p_esp_min     int,
  p_esp_max     int,
  p_adesao_min  numeric,       -- fração dos esperados que já pediu
  p_adesao_max  numeric,
  p_dias_janela int            -- há quantos dias a campanha vem recebendo pedidos
) returns void
language plpgsql
set search_path = public
as $$
declare
  nomes    text[] := array['Ana','Beatriz','Bruno','Caio','Camila','Carlos','Clara','Daniel','Débora','Diego',
                           'Eduarda','Enzo','Felipe','Fernanda','Gabriel','Giovana','Guilherme','Helena','Igor','Isabela',
                           'João','Júlia','Kaique','Larissa','Leonardo','Letícia','Lucas','Luiza','Marcos','Mariana',
                           'Matheus','Nicole','Otávio','Paula','Pedro','Rafael','Rebeca','Rodrigo','Sofia','Thiago',
                           'Vanessa','Vinícius','Vitória','Yasmin'];
  sobren   text[] := array['Almeida','Alves','Andrade','Barbosa','Barros','Batista','Cardoso','Carvalho','Castro','Costa',
                           'Cunha','Dias','Duarte','Ferreira','Fernandes','Gomes','Gonçalves','Lima','Lopes','Machado',
                           'Martins','Melo','Mendes','Moraes','Moreira','Nascimento','Neves','Nunes','Oliveira','Pereira',
                           'Pinto','Ramos','Ribeiro','Rocha','Rodrigues','Santos','Silva','Souza','Teixeira','Vieira'];

  v_camiseta uuid;
  v_moletom  uuid;
  v_kit      uuid;

  v_grupo_id uuid;
  v_pedido_id uuid;
  v_parcela1 uuid;
  v_parcela2 uuid;

  g            text;
  v_esperados  int;
  v_com_pedido int;
  i            int;
  j            int;
  v_nome       text;
  v_estampa    text;
  v_tel        text;
  v_produto    uuid;
  v_pnome      text;
  v_preco      int;
  v_criado     timestamptz;
  v_entrada    int;
  v_resto      int;
  v_pct        int;
  v_venc1      date;
  v_venc2      date;
  v_sorte      numeric;
  v_codigo     text;
begin
  select percentual_entrada, entrega_prevista into v_pct, v_venc2
    from campanha where id = p_campanha_id;

  -- Produtos da campanha (produto pertence à campanha, nunca é catálogo global)
  insert into produto (campanha_id, nome, descricao, tipo, preco_centavos, tamanhos, max_caracteres_nome, ordem)
  values (p_campanha_id, 'Camiseta de Formatura', 'Malha penteada 30.1, estampa frente e costas, nome nas costas',
          'simples', 8990, array['PP','P','M','G','GG','XG'], 18, 1)
  returning id into v_camiseta;

  insert into produto (campanha_id, nome, descricao, tipo, preco_centavos, tamanhos, max_caracteres_nome, ordem)
  values (p_campanha_id, 'Moletom Canguru', 'Moletom flanelado com capuz e bolso, nome bordado no peito',
          'simples', 15990, array['P','M','G','GG','XG'], 18, 2)
  returning id into v_moletom;

  insert into produto (campanha_id, nome, descricao, tipo, preco_centavos, tamanhos, max_caracteres_nome, ordem)
  values (p_campanha_id, 'Kit Formatura (Camiseta + Moletom)', 'Os dois produtos com desconto',
          'kit', 21990, '{}', 18, 3)
  returning id into v_kit;

  insert into produto_componente (kit_id, componente_id, quantidade, ordem)
  values (v_kit, v_camiseta, 1, 1), (v_kit, v_moletom, 1, 2);

  -- Grupos
  foreach g in array p_grupos loop
    v_codigo := p_prefixo || regexp_replace(upper(unaccent_simple(g)), '[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]', '', 'g');
    while length(v_codigo) < 4 loop
      v_codigo := v_codigo || substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random()*31)::int, 1);
    end loop;
    v_codigo := left(v_codigo, 10);

    v_esperados := p_esp_min + floor(random() * (p_esp_max - p_esp_min + 1))::int;

    insert into grupo (campanha_id, nome, codigo, alunos_esperados)
    values (p_campanha_id, g, v_codigo, v_esperados)
    returning id into v_grupo_id;

    v_com_pedido := round(v_esperados * (p_adesao_min + random() * (p_adesao_max - p_adesao_min)))::int;

    for i in 1..v_com_pedido loop
      v_nome := nomes[1 + floor(random()*array_length(nomes,1))::int] || ' ' ||
                sobren[1 + floor(random()*array_length(sobren,1))::int] || ' ' ||
                sobren[1 + floor(random()*array_length(sobren,1))::int];
      v_estampa := upper(split_part(v_nome, ' ', case when random() < 0.65 then 3 else 1 end));
      v_tel := '(31) 9' || lpad(floor(random()*10000)::text, 4, '0') || '-' || lpad(floor(random()*10000)::text, 4, '0');

      -- 18% dos alunos fazem mais de um pedido (ex.: camiseta e moletom separados)
      for j in 1..(case when random() < 0.18 then 2 else 1 end) loop
        v_sorte := random();
        if v_sorte < 0.55 then
          v_produto := v_camiseta;
        elsif v_sorte < 0.78 then
          v_produto := v_kit;
        else
          v_produto := v_moletom;
        end if;

        select nome, preco_centavos into v_pnome, v_preco from produto where id = v_produto;

        v_criado := now() - (random() * p_dias_janela || ' days')::interval;
        v_entrada := round(v_preco * v_pct / 100.0);
        v_resto   := v_preco - v_entrada;
        v_venc1   := (v_criado + interval '7 days')::date;

        insert into pedido (grupo_id, produto_id, aluno_nome, aluno_telefone,
                            origem, produto_nome_snapshot, valor_centavos, criado_em, atualizado_em)
        values (v_grupo_id, v_produto, v_nome, v_tel,
                case when random() < 0.12 then 'admin' else 'aluno' end::origem_pedido,
                v_pnome, v_preco, v_criado, v_criado)
        returning id into v_pedido_id;

        -- Itens: kit gera uma peça por componente; produto simples gera uma.
        if v_produto = v_kit then
          insert into pedido_item (pedido_id, produto_id, produto_nome_snapshot, tamanho, nome_estampa, criado_em)
          select v_pedido_id, pc.componente_id, pr.nome,
                 pr.tamanhos[1 + floor(random()*cardinality(pr.tamanhos))::int],
                 v_estampa, v_criado
          from produto_componente pc join produto pr on pr.id = pc.componente_id
          where pc.kit_id = v_kit;
        else
          insert into pedido_item (pedido_id, produto_id, produto_nome_snapshot, tamanho, nome_estampa, criado_em)
          select v_pedido_id, pr.id, pr.nome,
                 pr.tamanhos[1 + floor(random()*cardinality(pr.tamanhos))::int],
                 v_estampa, v_criado
          from produto pr where pr.id = v_produto;
        end if;

        -- Parcelas 50/50
        insert into parcela (pedido_id, numero, valor_centavos, vencimento, eh_entrada)
        values (v_pedido_id, 1, v_entrada, v_venc1, true) returning id into v_parcela1;
        insert into parcela (pedido_id, numero, valor_centavos, vencimento, eh_entrada)
        values (v_pedido_id, 2, v_resto, v_venc2, false) returning id into v_parcela2;

        -- Estado financeiro
        v_sorte := random();
        if v_sorte < 0.42 then
          -- quitado
          insert into pagamento (parcela_id, valor_centavos, metodo, provider, pago_em)
          values (v_parcela1, v_entrada, 'pix', 'simulado', v_criado + interval '1 day');
          insert into pagamento (parcela_id, valor_centavos, metodo, provider, pago_em)
          values (v_parcela2, v_resto, 'pix', 'simulado', v_criado + interval '9 days');
        elsif v_sorte < 0.75 then
          -- só a entrada (já libera produção)
          insert into pagamento (parcela_id, valor_centavos, metodo, provider, pago_em)
          values (v_parcela1, v_entrada,
                  (array['pix','dinheiro','cartao'])[1 + floor(random()*3)::int]::metodo_pagamento,
                  case when random() < 0.3 then 'manual' else 'simulado' end,
                  v_criado + interval '1 day');
        elsif v_sorte < 0.83 then
          -- pagou parte da entrada
          insert into pagamento (parcela_id, valor_centavos, metodo, provider, pago_em)
          values (v_parcela1, round(v_entrada * 0.5), 'dinheiro', 'manual', v_criado + interval '2 days');
        else
          -- nada pago (vira 'atrasado' sozinho quando o vencimento passa)
          null;
        end if;
      end loop;
    end loop;
  end loop;

  -- Alguns pedidos já avançaram na oficina
  update pedido set status_producao = 'em_producao'
  where status_producao = 'liberado'
    and grupo_id in (select id from grupo where campanha_id = p_campanha_id)
    and random() < 0.25;

  update pedido set status_producao = 'pronto'
  where status_producao = 'em_producao'
    and grupo_id in (select id from grupo where campanha_id = p_campanha_id)
    and random() < 0.3;
end $$;

-- helper: remove acento sem depender da extensão unaccent
create or replace function unaccent_simple(t text) returns text
language sql immutable
set search_path = public
as $$ select translate($1, 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç',
                            'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc') $$;

-- ------------------------------------------------------------
-- Cliente 1 · escola. É a campanha do volume real.
-- ------------------------------------------------------------
with c as (
  insert into cliente (nome, tipo, cidade, contato_nome, contato_telefone)
  values ('Escola Estadual Cláudio Brandão', 'escola', 'Belo Horizonte', 'Márcia D''Ávila', '(31) 98812-4470')
  returning id
)
insert into campanha (cliente_id, nome, status, label_grupo, label_grupo_plural,
                      prazo_pedidos, prazo_alteracoes, entrega_prevista, percentual_entrada)
select id, 'Formatura 2026', 'aberta', 'Turma', 'Turmas',
       current_date + 45, current_date + 52, current_date + 100, 50
from c;

select seed_campanha(
  (select id from campanha where nome = 'Formatura 2026'),
  'CB',
  array['3A','3B','3C','3D','3E','3F','2A','2B','2C','2D','9A','9B'],
  28, 38, 0.55, 0.95, 50
);

-- ------------------------------------------------------------
-- Cliente 2 · faculdade, campanha já encerrada (para o painel ter histórico)
-- ------------------------------------------------------------
with c as (
  insert into cliente (nome, tipo, cidade, contato_nome, contato_telefone)
  values ('Faculdade Meridiano', 'faculdade', 'Contagem', 'Rogério Paiva', '(31) 99640-2213')
  returning id
)
insert into campanha (cliente_id, nome, status, label_grupo, label_grupo_plural,
                      prazo_pedidos, prazo_alteracoes, entrega_prevista, percentual_entrada)
select id, 'Formandos ADM/DIR 2025', 'encerrada', 'Turma', 'Turmas',
       current_date - 60, current_date - 55, current_date - 20, 50
from c;

select seed_campanha(
  (select id from campanha where nome = 'Formandos ADM/DIR 2025'),
  'MR',
  array['ADM4','DIR5','CTB3'],
  22, 30, 0.70, 0.98, 120
);

-- ------------------------------------------------------------
-- Cliente 3 · empresa, campanha em rascunho (grupo se chama "Setor")
-- ------------------------------------------------------------
with c as (
  insert into cliente (nome, tipo, cidade, contato_nome, contato_telefone)
  values ('Metalúrgica Vega', 'empresa', 'Betim', 'Simone Tavares', '(31) 98155-9032')
  returning id
)
insert into campanha (cliente_id, nome, status, label_grupo, label_grupo_plural,
                      prazo_pedidos, prazo_alteracoes, entrega_prevista, percentual_entrada)
select id, 'Uniformes 2026', 'rascunho', 'Setor', 'Setores',
       current_date + 30, current_date + 35, current_date + 80, 50
from c;

select seed_campanha(
  (select id from campanha where nome = 'Uniformes 2026'),
  'VG',
  array['Logística','Produção','Manutenção'],
  14, 22, 0.15, 0.40, 12
);

drop function seed_campanha(uuid, text, text[], int, int, numeric, numeric, int);

commit;

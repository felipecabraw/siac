-- MODELO DE SINCRONIZACAO COMPLETA DO ALMOXARIFADO
-- Espelha a planilha no banco: atualiza/inclui os itens enviados e remove o que nao estiver presente.
-- Antes de executar, substitua os VALUES pelos dados reais.

begin;

with dados(nome, categoria, unidade_medida, local_estoque, estoque_atual, estoque_minimo, observacao, criado_por, atualizado_por) as (
  values
    ('PREENCHER_NOME', 'PREENCHER_CATEGORIA', 'un', 'SEAP/ALMOXARIFADO', 0, 0, 'PREENCHER_OBSERVACAO', 'carga_inicial', 'carga_inicial')
), dados_normalizados as (
  select
    trim(nome) as nome,
    nullif(trim(categoria), '') as categoria,
    public.assert_almox_unidade_valida(unidade_medida) as unidade_medida,
    coalesce(nullif(trim(local_estoque), ''), 'SEAP/ALMOXARIFADO') as local_estoque,
    greatest(coalesce(estoque_atual, 0), 0) as estoque_atual,
    greatest(coalesce(estoque_minimo, 0), 0) as estoque_minimo,
    nullif(trim(observacao), '') as observacao,
    coalesce(nullif(trim(criado_por), ''), 'carga_inicial') as criado_por,
    coalesce(nullif(trim(atualizado_por), ''), coalesce(nullif(trim(criado_por), ''), 'carga_inicial')) as atualizado_por
  from dados
), atualizados as (
  update public.almox_itens ai
     set categoria = dn.categoria,
         unidade_medida = dn.unidade_medida,
         estoque_atual = dn.estoque_atual,
         estoque_minimo = dn.estoque_minimo,
         observacao = dn.observacao,
         atualizado_por = dn.atualizado_por,
         atualizado_em = now()
    from dados_normalizados dn
   where lower(ai.nome) = lower(dn.nome)
     and lower(ai.local_estoque) = lower(dn.local_estoque)
  returning ai.id, ai.nome, ai.local_estoque, ai.estoque_atual, ai.unidade_medida, ai.criado_por, ai.criado_em
), inseridos as (
  insert into public.almox_itens (
    nome, categoria, unidade_medida, local_estoque, estoque_atual, estoque_minimo, observacao, criado_por, atualizado_por
  )
  select
    dn.nome, dn.categoria, dn.unidade_medida, dn.local_estoque, dn.estoque_atual, dn.estoque_minimo, dn.observacao, dn.criado_por, dn.atualizado_por
  from dados_normalizados dn
  where not exists (
    select 1 from public.almox_itens ai where lower(ai.nome) = lower(dn.nome) and lower(ai.local_estoque) = lower(dn.local_estoque)
  )
  returning id, nome, local_estoque, estoque_atual, unidade_medida, criado_por, criado_em
), itens_processados as (
  select * from atualizados
  union all
  select * from inseridos
), itens_removidos as (
  select ai.*
    from public.almox_itens ai
   where lower(ai.local_estoque) = 'seap/almoxarifado'
     and not exists (
       select 1 from dados_normalizados dn where lower(dn.nome) = lower(ai.nome) and lower(dn.local_estoque) = lower(ai.local_estoque)
     )
), log_exclusoes as (
  insert into public.almox_exclusoes (item_id, item_nome, quantidade_no_momento, unidade_medida, local_estoque, excluido_por)
  select id, nome, estoque_atual, unidade_medida, local_estoque, 'sincronizacao_completa'
    from itens_removidos
  returning item_id
), remove_mov as (
  delete from public.almox_movimentacoes am
   using itens_removidos ir
   where am.item_id = ir.id
  returning am.item_id
)
delete from public.almox_itens ai
 using itens_removidos ir
 where ai.id = ir.id;

insert into public.almox_movimentacoes (item_id, tipo, quantidade, motivo, saldo_resultante, criado_por, criado_em)
select
  ip.id,
  'entrada',
  ip.estoque_atual,
  'Carga inicial do almoxarifado',
  ip.estoque_atual,
  coalesce(nullif(ip.criado_por, ''), 'carga_inicial'),
  coalesce(ip.criado_em, now())
from itens_processados ip
where ip.estoque_atual > 0
  and not exists (
    select 1 from public.almox_movimentacoes am where am.item_id = ip.id
  );

commit;

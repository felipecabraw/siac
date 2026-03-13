-- Hardening do almoxarifado
-- Objetivo: validar unidades e disponibilizar operacoes atomicas via RPC.

create or replace function public.normalize_almox_unidade(p_value text)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(p_value, '')));
$$;

create or replace function public.assert_almox_unidade_valida(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v_unit text := public.normalize_almox_unidade(p_value);
begin
  if v_unit not in ('un', 'cx', 'pct', 'resma', 'lt', 'kg') then
    raise exception 'Unidade de medida invalida: %', coalesce(p_value, '<vazio>');
  end if;
  return v_unit;
end;
$$;

alter table if exists public.almox_itens
  drop constraint if exists ck_almox_unidade_medida;

alter table if exists public.almox_itens
  add constraint ck_almox_unidade_medida
  check (public.normalize_almox_unidade(unidade_medida) in ('un', 'cx', 'pct', 'resma', 'lt', 'kg'));

create or replace function public.almox_add_item(
  p_nome text,
  p_categoria text default null,
  p_unidade_medida text default 'un',
  p_local_estoque text default 'SEAP/ALMOXARIFADO',
  p_estoque_atual integer default 0,
  p_estoque_minimo integer default 0,
  p_observacao text default null,
  p_usuario text default null
)
returns public.almox_itens
language plpgsql
as $$
declare
  v_item public.almox_itens;
  v_nome text := trim(coalesce(p_nome, ''));
  v_categoria text := nullif(trim(coalesce(p_categoria, '')), '');
  v_unidade text := public.assert_almox_unidade_valida(p_unidade_medida);
  v_local text := coalesce(nullif(trim(coalesce(p_local_estoque, '')), ''), 'SEAP/ALMOXARIFADO');
  v_observacao text := nullif(trim(coalesce(p_observacao, '')), '');
  v_usuario text := coalesce(nullif(trim(coalesce(p_usuario, '')), ''), auth.jwt()->>'email', auth.uid()::text, 'sistema');
  v_estoque_atual integer := greatest(coalesce(p_estoque_atual, 0), 0);
  v_estoque_minimo integer := greatest(coalesce(p_estoque_minimo, 0), 0);
begin
  if v_nome = '' then
    raise exception 'Informe o nome do item.';
  end if;

  if exists (
    select 1
      from public.almox_itens ai
     where lower(ai.nome) = lower(v_nome)
       and lower(ai.local_estoque) = lower(v_local)
  ) then
    raise exception 'Ja existe item cadastrado com este nome neste local.';
  end if;

  insert into public.almox_itens (
    nome, categoria, unidade_medida, local_estoque, estoque_atual, estoque_minimo, observacao, criado_por, atualizado_por
  ) values (
    v_nome, v_categoria, v_unidade, v_local, v_estoque_atual, v_estoque_minimo, v_observacao, v_usuario, v_usuario
  )
  returning * into v_item;

  if v_estoque_atual > 0 then
    insert into public.almox_movimentacoes (
      item_id, tipo, quantidade, motivo, saldo_resultante, criado_por
    ) values (
      v_item.id, 'entrada', v_estoque_atual, 'Saldo inicial no cadastro', v_estoque_atual, v_usuario
    );
  end if;

  return v_item;
end;
$$;

create or replace function public.almox_move_item(
  p_item_id uuid,
  p_tipo text,
  p_quantidade integer,
  p_motivo text,
  p_usuario text default null
)
returns public.almox_itens
language plpgsql
as $$
declare
  v_item public.almox_itens;
  v_tipo text := lower(trim(coalesce(p_tipo, '')));
  v_quantidade integer := coalesce(p_quantidade, 0);
  v_motivo text := trim(coalesce(p_motivo, ''));
  v_usuario text := coalesce(nullif(trim(coalesce(p_usuario, '')), ''), auth.jwt()->>'email', auth.uid()::text, 'sistema');
  v_novo_estoque integer;
begin
  if p_item_id is null then
    raise exception 'Selecione o item.';
  end if;
  if v_tipo not in ('entrada', 'saida') then
    raise exception 'Tipo de movimentacao invalido.';
  end if;
  if v_quantidade <= 0 then
    raise exception 'Quantidade invalida.';
  end if;
  if v_motivo = '' then
    raise exception 'Informe o motivo da movimentacao.';
  end if;

  select *
    into v_item
    from public.almox_itens
   where id = p_item_id
   for update;

  if not found then
    raise exception 'Item nao encontrado.';
  end if;

  if v_tipo = 'saida' and v_quantidade > coalesce(v_item.estoque_atual, 0) then
    raise exception 'Quantidade de saida maior que o estoque disponivel.';
  end if;

  v_novo_estoque := case
    when v_tipo = 'entrada' then coalesce(v_item.estoque_atual, 0) + v_quantidade
    else coalesce(v_item.estoque_atual, 0) - v_quantidade
  end;

  update public.almox_itens
     set estoque_atual = v_novo_estoque,
         atualizado_por = v_usuario,
         atualizado_em = now()
   where id = v_item.id
  returning * into v_item;

  insert into public.almox_movimentacoes (
    item_id, tipo, quantidade, motivo, saldo_resultante, criado_por
  ) values (
    v_item.id, v_tipo, v_quantidade, v_motivo, v_novo_estoque, v_usuario
  );

  return v_item;
end;
$$;

create or replace function public.almox_delete_item(
  p_item_id uuid,
  p_usuario text default null
)
returns boolean
language plpgsql
as $$
declare
  v_item public.almox_itens;
  v_usuario text := coalesce(nullif(trim(coalesce(p_usuario, '')), ''), auth.jwt()->>'email', auth.uid()::text, 'sistema');
begin
  if p_item_id is null then
    raise exception 'Item invalido para exclusao.';
  end if;

  select *
    into v_item
    from public.almox_itens
   where id = p_item_id
   for update;

  if not found then
    raise exception 'Item nao encontrado para exclusao.';
  end if;

  insert into public.almox_exclusoes (
    item_id, item_nome, quantidade_no_momento, unidade_medida, local_estoque, excluido_por
  ) values (
    v_item.id, v_item.nome, coalesce(v_item.estoque_atual, 0), v_item.unidade_medida, v_item.local_estoque, v_usuario
  );

  delete from public.almox_movimentacoes where item_id = v_item.id;
  delete from public.almox_itens where id = v_item.id;

  return true;
end;
$$;

notify pgrst, 'reload schema';

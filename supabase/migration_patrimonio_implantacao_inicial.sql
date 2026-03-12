create extension if not exists pgcrypto;

create table if not exists public.patrimonio_bens (
  id uuid primary key default gen_random_uuid(),
  numero_tombamento text not null,
  descricao_bem text not null,
  categoria_patrimonial text not null,
  natureza_bem text not null check (natureza_bem in ('permanente', 'controlado', 'imovel')),
  quantidade integer not null default 1 check (quantidade > 0),
  unidade_medida text not null,
  marca text,
  modelo text,
  numero_serie text,
  valor_aquisicao numeric(14,2),
  data_aquisicao date,
  forma_ingresso text,
  documento_origem text,
  localizacao_principal text not null,
  setor_localizacao text not null,
  local_detalhado text,
  responsavel_bem text,
  matricula_responsavel text,
  situacao_bem text not null check (situacao_bem in ('em_uso', 'reserva', 'manutencao', 'inventario_pendente', 'extraviado', 'inservivel', 'baixado')),
  estado_fisico text not null check (estado_fisico in ('novo', 'bom', 'regular', 'ruim', 'irrecuperavel')),
  observacoes text,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_por text,
  atualizado_em timestamptz not null default now()
);

create unique index if not exists ux_patrimonio_bens_tombamento
  on public.patrimonio_bens (lower(numero_tombamento));

create index if not exists ix_patrimonio_bens_categoria
  on public.patrimonio_bens (categoria_patrimonial);

create index if not exists ix_patrimonio_bens_situacao
  on public.patrimonio_bens (situacao_bem);

create index if not exists ix_patrimonio_bens_localizacao
  on public.patrimonio_bens (lower(localizacao_principal), lower(setor_localizacao));

create table if not exists public.patrimonio_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  bem_id uuid not null references public.patrimonio_bens(id) on delete restrict,
  numero_tombamento text not null,
  descricao_bem text not null,
  tipo_movimentacao text not null check (tipo_movimentacao in ('incorporacao', 'transferencia', 'redistribuicao', 'recolhimento', 'manutencao', 'retorno_operacional')),
  localizacao_origem text,
  setor_origem text,
  responsavel_origem text,
  localizacao_destino text not null,
  setor_destino text not null,
  local_detalhado_destino text,
  responsavel_destino text,
  matricula_destino text,
  situacao_destino text not null check (situacao_destino in ('em_uso', 'reserva', 'manutencao', 'inventario_pendente', 'extraviado', 'inservivel', 'baixado')),
  motivo text not null,
  usuario text,
  data_hora timestamptz not null default now()
);

create index if not exists ix_patrimonio_movimentacoes_bem
  on public.patrimonio_movimentacoes (bem_id, data_hora desc);

drop trigger if exists trg_patrimonio_bens_updated_at on public.patrimonio_bens;
create trigger trg_patrimonio_bens_updated_at
before update on public.patrimonio_bens
for each row execute procedure public.set_updated_at();

alter table public.patrimonio_bens enable row level security;
alter table public.patrimonio_movimentacoes enable row level security;

drop policy if exists p_patrimonio_bens_rw on public.patrimonio_bens;
create policy p_patrimonio_bens_rw on public.patrimonio_bens
for all to authenticated using (true) with check (true);

drop policy if exists p_patrimonio_movimentacoes_rw on public.patrimonio_movimentacoes;
create policy p_patrimonio_movimentacoes_rw on public.patrimonio_movimentacoes
for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
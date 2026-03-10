-- SIGA - Schema inicial para ambiente institucional (Supabase/PostgreSQL)
-- Executar no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.usuarios_perfil (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null unique,
  nome_completo text,
  cpf text,
  matricula text,
  funcao text,
  foto_url text,
  status_acesso text not null default 'pendente' check (status_acesso in ('pendente', 'ativo', 'bloqueado')),
  role text not null default 'usuario' check (role in ('usuario', 'senior_admin')),
  aprovado_por text,
  aprovado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.processos_contratos (
  id uuid primary key default gen_random_uuid(),
  numero_processo text not null unique,
  numero_contrato text not null unique,
  inicio_vigencia date not null,
  termino_vigencia date not null,
  gestor_contrato text not null,
  fiscal_contrato text not null,
  fonte_recurso text not null,
  data_assinatura date not null,
  data_publicacao date not null,
  valor_contrato numeric(14,2) not null check (valor_contrato >= 0),
  objeto_contrato text not null,
  fundamentacao_contrato text not null,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_por text,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.almox_itens (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text,
  unidade_medida text not null,
  local_estoque text not null default 'SEAP/ALMOXARIFADO',
  estoque_atual integer not null default 0,
  estoque_minimo integer not null default 0,
  observacao text,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_por text,
  atualizado_em timestamptz not null default now()
);

create unique index if not exists ux_almox_itens_nome_local on public.almox_itens (lower(nome), lower(local_estoque));

create table if not exists public.almox_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.almox_itens(id) on delete restrict,
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade integer not null check (quantidade > 0),
  motivo text not null,
  saldo_resultante integer,
  criado_por text,
  criado_em timestamptz not null default now()
);

create table if not exists public.almox_exclusoes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid,
  item_nome text not null,
  quantidade_no_momento integer not null,
  unidade_medida text,
  local_estoque text,
  excluido_por text,
  excluido_em timestamptz not null default now()
);

create table if not exists public.auditoria_eventos (
  id uuid primary key default gen_random_uuid(),
  modulo text not null,
  acao text not null,
  entidade text not null,
  entidade_id text,
  payload jsonb,
  usuario_id text,
  criado_em timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_usuarios_perfil_updated_at on public.usuarios_perfil;
create trigger trg_usuarios_perfil_updated_at
before update on public.usuarios_perfil
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_processos_updated_at on public.processos_contratos;
create trigger trg_processos_updated_at
before update on public.processos_contratos
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_almox_itens_updated_at on public.almox_itens;
create trigger trg_almox_itens_updated_at
before update on public.almox_itens
for each row execute procedure public.set_updated_at();

alter table public.usuarios_perfil enable row level security;
alter table public.processos_contratos enable row level security;
alter table public.almox_itens enable row level security;
alter table public.almox_movimentacoes enable row level security;
alter table public.almox_exclusoes enable row level security;
alter table public.auditoria_eventos enable row level security;

-- Fase inicial: usuários autenticados podem gerir dados institucionais.
drop policy if exists p_usuarios_perfil_rw on public.usuarios_perfil;
create policy p_usuarios_perfil_rw on public.usuarios_perfil
for all to authenticated using (true) with check (true);

drop policy if exists p_processos_rw on public.processos_contratos;
create policy p_processos_rw on public.processos_contratos
for all to authenticated using (true) with check (true);

drop policy if exists p_almox_itens_rw on public.almox_itens;
create policy p_almox_itens_rw on public.almox_itens
for all to authenticated using (true) with check (true);

drop policy if exists p_almox_mov_rw on public.almox_movimentacoes;
create policy p_almox_mov_rw on public.almox_movimentacoes
for all to authenticated using (true) with check (true);

drop policy if exists p_almox_exclusoes_rw on public.almox_exclusoes;
create policy p_almox_exclusoes_rw on public.almox_exclusoes
for all to authenticated using (true) with check (true);

drop policy if exists p_auditoria_rw on public.auditoria_eventos;
create policy p_auditoria_rw on public.auditoria_eventos
for all to authenticated using (true) with check (true);





create extension if not exists pgcrypto;

create table if not exists public.solicitacoes_acesso (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  nome_completo text not null,
  cpf text not null,
  matricula text not null,
  status text not null default 'pendente',
  aprovado_por text,
  aprovado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint ck_solicitacoes_status check (status in ('pendente', 'aprovado', 'negado'))
);

create or replace function public.set_solicitacoes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_solicitacoes_acesso_updated_at on public.solicitacoes_acesso;
create trigger trg_solicitacoes_acesso_updated_at
before update on public.solicitacoes_acesso
for each row execute procedure public.set_solicitacoes_updated_at();

alter table public.solicitacoes_acesso enable row level security;

drop policy if exists p_solicitacoes_insert on public.solicitacoes_acesso;
drop policy if exists p_solicitacoes_select_admin on public.solicitacoes_acesso;
drop policy if exists p_solicitacoes_select_owner on public.solicitacoes_acesso;
drop policy if exists p_solicitacoes_update_admin on public.solicitacoes_acesso;

create policy p_solicitacoes_insert on public.solicitacoes_acesso
for insert to anon, authenticated
with check (
  status = 'pendente'
  and aprovado_por is null
  and aprovado_em is null
);

create policy p_solicitacoes_select_admin on public.solicitacoes_acesso
for select to authenticated
using (public.is_current_user_senior_admin());

create policy p_solicitacoes_select_owner on public.solicitacoes_acesso
for select to authenticated
using (auth.uid() = auth_user_id);

create policy p_solicitacoes_update_admin on public.solicitacoes_acesso
for update to authenticated
using (public.is_current_user_senior_admin())
with check (public.is_current_user_senior_admin());

notify pgrst, 'reload schema';


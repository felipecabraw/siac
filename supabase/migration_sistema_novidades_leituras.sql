create table if not exists public.sistema_novidades_leituras (
  id uuid primary key default gen_random_uuid(),
  novidade_id uuid not null references public.sistema_novidades(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  lida_em timestamptz not null default now(),
  constraint ux_sistema_novidades_leituras unique (novidade_id, auth_user_id)
);

alter table public.sistema_novidades_leituras enable row level security;

drop policy if exists p_sistema_novidades_leituras_select on public.sistema_novidades_leituras;
drop policy if exists p_sistema_novidades_leituras_insert on public.sistema_novidades_leituras;
drop policy if exists p_sistema_novidades_leituras_delete on public.sistema_novidades_leituras;

create policy p_sistema_novidades_leituras_select on public.sistema_novidades_leituras
for select to authenticated
using (auth.uid() = auth_user_id);

create policy p_sistema_novidades_leituras_insert on public.sistema_novidades_leituras
for insert to authenticated
with check (auth.uid() = auth_user_id);

create policy p_sistema_novidades_leituras_delete on public.sistema_novidades_leituras
for delete to authenticated
using (auth.uid() = auth_user_id);

notify pgrst, 'reload schema';
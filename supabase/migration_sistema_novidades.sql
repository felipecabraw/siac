create table if not exists public.sistema_novidades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'aviso',
  conteudo text not null,
  publicado boolean not null default true,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_por text,
  atualizado_em timestamptz not null default now(),
  constraint ck_sistema_novidades_tipo check (tipo in ('aviso', 'alerta', 'novidade'))
);

alter table public.sistema_novidades enable row level security;

drop trigger if exists trg_sistema_novidades_updated_at on public.sistema_novidades;
create trigger trg_sistema_novidades_updated_at
before update on public.sistema_novidades
for each row execute procedure public.set_updated_at();

drop policy if exists p_sistema_novidades_select on public.sistema_novidades;
drop policy if exists p_sistema_novidades_insert on public.sistema_novidades;
drop policy if exists p_sistema_novidades_update on public.sistema_novidades;
drop policy if exists p_sistema_novidades_delete on public.sistema_novidades;

create policy p_sistema_novidades_select on public.sistema_novidades
for select to authenticated
using (true);

create policy p_sistema_novidades_insert on public.sistema_novidades
for insert to authenticated
with check (public.is_current_user_senior_admin());

create policy p_sistema_novidades_update on public.sistema_novidades
for update to authenticated
using (public.is_current_user_senior_admin())
with check (public.is_current_user_senior_admin());

create policy p_sistema_novidades_delete on public.sistema_novidades
for delete to authenticated
using (public.is_current_user_senior_admin());

notify pgrst, 'reload schema';

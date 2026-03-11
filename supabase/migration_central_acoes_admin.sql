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

alter table public.auditoria_eventos enable row level security;

drop policy if exists p_auditoria_rw on public.auditoria_eventos;
drop policy if exists p_auditoria_select_admin on public.auditoria_eventos;
drop policy if exists p_auditoria_insert_authenticated on public.auditoria_eventos;

create policy p_auditoria_select_admin on public.auditoria_eventos
for select to authenticated
using (public.is_current_user_senior_admin());

create policy p_auditoria_insert_authenticated on public.auditoria_eventos
for insert to authenticated
with check (true);

notify pgrst, 'reload schema';

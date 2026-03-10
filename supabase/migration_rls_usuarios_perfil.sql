-- Hardening de seguranca para usuarios_perfil
-- Objetivo: impedir elevacao de privilegio (role/status) por usuarios comuns

create or replace function public.is_current_user_senior_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.usuarios_perfil up
    where up.auth_user_id = auth.uid()
      and up.role = 'senior_admin'
      and up.status_acesso = 'ativo'
  );
$$;

create or replace function public.enforce_usuarios_perfil_update_guard()
returns trigger
language plpgsql
as $$
begin
  -- Senior admin pode editar qualquer linha.
  if public.is_current_user_senior_admin() then
    return new;
  end if;

  -- Usuario comum so pode editar seu proprio cadastro.
  if old.auth_user_id <> auth.uid() then
    raise exception 'Sem permissao para alterar este perfil.';
  end if;

  -- Campos de controle de acesso nao podem ser alterados por usuario comum.
  if new.role is distinct from old.role
     or new.status_acesso is distinct from old.status_acesso
     or new.aprovado_por is distinct from old.aprovado_por
     or new.aprovado_em is distinct from old.aprovado_em
     or new.auth_user_id is distinct from old.auth_user_id
     or new.username is distinct from old.username then
    raise exception 'Sem permissao para alterar campos de acesso.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_usuarios_perfil_update_guard on public.usuarios_perfil;
create trigger trg_usuarios_perfil_update_guard
before update on public.usuarios_perfil
for each row execute procedure public.enforce_usuarios_perfil_update_guard();

-- Substitui politica ampla por politicas granulares.
drop policy if exists p_usuarios_perfil_rw on public.usuarios_perfil;
drop policy if exists p_usuarios_perfil_select on public.usuarios_perfil;
drop policy if exists p_usuarios_perfil_insert on public.usuarios_perfil;
drop policy if exists p_usuarios_perfil_update on public.usuarios_perfil;
drop policy if exists p_usuarios_perfil_delete on public.usuarios_perfil;

create policy p_usuarios_perfil_select on public.usuarios_perfil
for select to authenticated
using (true);

create policy p_usuarios_perfil_insert on public.usuarios_perfil
for insert to authenticated
with check (
  auth.uid() = auth_user_id
  and role = 'usuario'
  and status_acesso = 'pendente'
  and aprovado_por is null
  and aprovado_em is null
);

create policy p_usuarios_perfil_update on public.usuarios_perfil
for update to authenticated
using (
  auth.uid() = auth_user_id
  or public.is_current_user_senior_admin()
)
with check (
  auth.uid() = auth_user_id
  or public.is_current_user_senior_admin()
);

create policy p_usuarios_perfil_delete on public.usuarios_perfil
for delete to authenticated
using (public.is_current_user_senior_admin());

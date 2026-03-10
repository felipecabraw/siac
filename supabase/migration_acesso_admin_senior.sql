-- Migracao: controle de acesso por aprovacao do Administrador Senior
-- Bootstrap inicial do perfil senior_admin (ajuste conforme o administrador atual)

alter table if exists public.usuarios_perfil
  add column if not exists status_acesso text not null default 'pendente';

alter table if exists public.usuarios_perfil
  add column if not exists role text not null default 'usuario';

alter table if exists public.usuarios_perfil
  add column if not exists aprovado_por text;

alter table if exists public.usuarios_perfil
  add column if not exists aprovado_em timestamptz;

-- Restricoes sem bloquear quem ja possui dados
alter table if exists public.usuarios_perfil
  drop constraint if exists ck_usuarios_status_acesso;

alter table if exists public.usuarios_perfil
  add constraint ck_usuarios_status_acesso
  check (status_acesso in ('pendente', 'ativo', 'bloqueado'));

alter table if exists public.usuarios_perfil
  drop constraint if exists ck_usuarios_role;

alter table if exists public.usuarios_perfil
  add constraint ck_usuarios_role
  check (role in ('usuario', 'senior_admin'));

update public.usuarios_perfil
  set status_acesso = 'ativo',
      role = 'senior_admin',
      aprovado_por = 'felipecabraw@gmail.com',
      aprovado_em = now()
where lower(username) = 'felipecabraw@gmail.com';


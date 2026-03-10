-- Permitir registro de solicitacao pendente em usuarios_perfil apos signUp
-- Mantem bloqueio de elevacao de privilegio.

drop policy if exists p_usuarios_perfil_insert on public.usuarios_perfil;

create policy p_usuarios_perfil_insert on public.usuarios_perfil
for insert to anon, authenticated
with check (
  (
    role = 'usuario'
    and status_acesso = 'pendente'
    and aprovado_por is null
    and aprovado_em is null
    and auth_user_id is not null
    and coalesce(username, '') <> ''
  )
  or (
    lower(username) = 'felipecabraw@gmail.com'
    and role = 'senior_admin'
    and status_acesso = 'ativo'
  )
);

notify pgrst, 'reload schema';

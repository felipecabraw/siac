-- Bootstrap controlado do Administrador Sênior inicial
-- Aplica promoção do admin principal e mantém proteção para os demais usuários.

update public.usuarios_perfil
set role = 'senior_admin',
    status_acesso = 'ativo',
    aprovado_por = coalesce(aprovado_por, 'bootstrap-system'),
    aprovado_em = coalesce(aprovado_em, now())
where lower(username) = 'felipecabraw@gmail.com';

create or replace function public.enforce_usuarios_perfil_update_guard()
returns trigger
language plpgsql
as $$
begin
  -- Senior admin pode editar qualquer linha.
  if public.is_current_user_senior_admin() then
    return new;
  end if;

  -- Usuário comum só pode editar o próprio cadastro.
  if old.auth_user_id <> auth.uid() then
    raise exception 'Sem permissao para alterar este perfil.';
  end if;

  -- Exceção de bootstrap: permite ao admin inicial, autenticado com seu próprio usuário,
  -- ser promovido para senior_admin/ativo quando necessário.
  if lower(coalesce(old.username, '')) = 'felipecabraw@gmail.com'
     and lower(coalesce(new.username, '')) = 'felipecabraw@gmail.com'
     and new.role = 'senior_admin'
     and new.status_acesso = 'ativo' then
    return new;
  end if;

  -- Campos de controle de acesso não podem ser alterados por usuário comum.
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

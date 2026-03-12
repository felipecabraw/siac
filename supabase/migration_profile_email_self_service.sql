-- Permite a troca segura do proprio e-mail/login pelo perfil

create or replace function public.enforce_usuarios_perfil_update_guard()
returns trigger
language plpgsql
as $$
begin
  if public.is_current_user_senior_admin() then
    return new;
  end if;

  if old.auth_user_id <> auth.uid() then
    raise exception 'Sem permissao para alterar este perfil.';
  end if;

  if coalesce(current_setting('app.allow_self_username_change', true), 'off') = 'on'
     and new.auth_user_id is not distinct from old.auth_user_id
     and new.role is not distinct from old.role
     and new.status_acesso is not distinct from old.status_acesso
     and new.aprovado_por is not distinct from old.aprovado_por
     and new.aprovado_em is not distinct from old.aprovado_em then
    return new;
  end if;

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

create or replace function public.atualizar_email_proprio(
  p_novo_email text,
  p_nome text default null,
  p_cpf text default null,
  p_matricula text default null
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_new_email text := lower(trim(coalesce(p_novo_email, '')));
  v_nome text := trim(coalesce(p_nome, ''));
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_matricula text := upper(trim(coalesce(p_matricula, '')));
  v_current_email text;
begin
  if v_user_id is null then
    raise exception 'Sessao invalida para atualizar o e-mail.';
  end if;

  if v_new_email = '' or v_new_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'Informe um e-mail valido para usar como login.';
  end if;

  select lower(au.email)
    into v_current_email
  from auth.users au
  where au.id = v_user_id
  limit 1;

  if v_current_email is null then
    raise exception 'Usuario autenticado nao encontrado.';
  end if;

  if v_new_email = v_current_email then
    return v_current_email;
  end if;

  if exists (
    select 1
    from auth.users au
    where lower(au.email) = v_new_email
      and au.id <> v_user_id
  ) then
    raise exception 'Ja existe outro usuario utilizando este e-mail.';
  end if;

  if exists (
    select 1
    from public.usuarios_perfil up
    where lower(up.username) = v_new_email
      and up.auth_user_id <> v_user_id
  ) then
    raise exception 'Ja existe outro usuario utilizando este e-mail.';
  end if;

  if exists (
    select 1
    from public.solicitacoes_acesso sa
    where lower(sa.email) = v_new_email
      and coalesce(sa.auth_user_id, '00000000-0000-0000-0000-000000000000'::uuid) <> v_user_id
  ) then
    raise exception 'Ja existe outro usuario utilizando este e-mail.';
  end if;

  perform set_config('app.allow_self_username_change', 'on', true);

  update auth.users
     set email = v_new_email,
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
           'nome', nullif(v_nome, ''),
           'cpf', nullif(v_cpf, ''),
           'matricula', nullif(v_matricula, '')
         )),
         updated_at = now()
   where id = v_user_id;

  update auth.identities
     set identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object(
           'sub', v_user_id::text,
           'email', v_new_email,
           'email_verified', true
         ),
         updated_at = now()
   where user_id = v_user_id
     and provider = 'email';

  update public.usuarios_perfil
     set username = v_new_email,
         atualizado_em = now()
   where auth_user_id = v_user_id;

  update public.solicitacoes_acesso
     set email = v_new_email,
         auth_user_id = coalesce(auth_user_id, v_user_id),
         atualizado_em = now()
   where auth_user_id = v_user_id
      or lower(email) = v_current_email;

  return v_new_email;
end;
$$;

revoke all on function public.atualizar_email_proprio(text, text, text, text) from public;
grant execute on function public.atualizar_email_proprio(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';

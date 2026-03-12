create extension if not exists pgcrypto;

-- Novo senior_admin: Jose Salatiel Dantas Nascimento
-- Login na tela: CPF 05977729405
-- Senha inicial: Mudar@1234
-- Email tecnico interno usado pelo Supabase para autenticacao:
-- 05977729405@siac.example.com

do $$
declare
  v_email text := '05977729405@siac.example.com';
  v_cpf text := '05977729405';
  v_nome text := 'Jose Salatiel Dantas Nascimento';
  v_matricula text := '243.325-7';
  v_funcao text := 'Administrador Senior';
  v_password_hash text := crypt('Mudar@1234', gen_salt('bf'));
  v_user_id uuid;
  v_profile_id uuid;
begin
  select up.auth_user_id, up.id
    into v_user_id, v_profile_id
  from public.usuarios_perfil up
  where regexp_replace(coalesce(up.cpf, ''), '\D', '', 'g') = v_cpf
     or lower(up.username) = lower(v_email)
  order by case
             when regexp_replace(coalesce(up.cpf, ''), '\D', '', 'g') = v_cpf then 0
             else 1
           end
  limit 1;

  if v_user_id is null then
    select au.id
      into v_user_id
    from auth.users au
    where lower(au.email) = lower(v_email)
    limit 1;
  end if;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      lower(v_email),
      v_password_hash,
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome', v_nome, 'cpf', v_cpf, 'matricula', v_matricula),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  else
    update auth.users
       set email = lower(v_email),
           encrypted_password = v_password_hash,
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           raw_user_meta_data = jsonb_build_object('nome', v_nome, 'cpf', v_cpf, 'matricula', v_matricula),
           raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
           updated_at = now()
     where id = v_user_id;
  end if;

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  select
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(v_email)),
    'email',
    now(),
    now(),
    now()
  where not exists (
    select 1
    from auth.identities ai
    where ai.user_id = v_user_id
      and ai.provider = 'email'
  );

  if v_profile_id is not null then
    update public.usuarios_perfil
       set auth_user_id = v_user_id,
           username = lower(v_email),
           nome_completo = v_nome,
           cpf = v_cpf,
           matricula = v_matricula,
           funcao = v_funcao,
           status_acesso = 'ativo',
           role = 'senior_admin',
           aprovado_por = 'migration-system',
           aprovado_em = now(),
           atualizado_em = now()
     where id = v_profile_id;
  else
    insert into public.usuarios_perfil (
      auth_user_id,
      username,
      nome_completo,
      cpf,
      matricula,
      funcao,
      foto_url,
      status_acesso,
      role,
      aprovado_por,
      aprovado_em
    ) values (
      v_user_id,
      lower(v_email),
      v_nome,
      v_cpf,
      v_matricula,
      v_funcao,
      '',
      'ativo',
      'senior_admin',
      'migration-system',
      now()
    )
    on conflict (auth_user_id) do update
      set username = excluded.username,
          nome_completo = excluded.nome_completo,
          cpf = excluded.cpf,
          matricula = excluded.matricula,
          funcao = excluded.funcao,
          status_acesso = 'ativo',
          role = 'senior_admin',
          aprovado_por = excluded.aprovado_por,
          aprovado_em = excluded.aprovado_em,
          atualizado_em = now();
  end if;

  update public.solicitacoes_acesso
     set auth_user_id = v_user_id,
         status = 'aprovado',
         aprovado_por = 'migration-system',
         aprovado_em = now(),
         atualizado_em = now()
   where regexp_replace(coalesce(cpf, ''), '\D', '', 'g') = v_cpf
      or lower(email) = lower(v_email);
end;
$$;

notify pgrst, 'reload schema';

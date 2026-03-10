create extension if not exists pgcrypto;

create table if not exists public.solicitacoes_acesso (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  nome_completo text not null,
  cpf text not null,
  matricula text not null,
  senha_hash text,
  status text not null default 'pendente',
  aprovado_por text,
  aprovado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint ck_solicitacoes_acesso_status check (status in ('pendente', 'aprovado', 'negado'))
);

alter table public.solicitacoes_acesso
  add column if not exists auth_user_id uuid unique;

alter table public.solicitacoes_acesso
  add column if not exists senha_hash text;

alter table public.solicitacoes_acesso
  add column if not exists aprovado_por text;

alter table public.solicitacoes_acesso
  add column if not exists aprovado_em timestamptz;

alter table public.solicitacoes_acesso
  add column if not exists criado_em timestamptz not null default now();

alter table public.solicitacoes_acesso
  add column if not exists atualizado_em timestamptz not null default now();

create or replace function public.set_solicitacoes_acesso_updated_at()
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
for each row execute procedure public.set_solicitacoes_acesso_updated_at();

alter table public.solicitacoes_acesso enable row level security;

drop policy if exists p_solicitacoes_insert on public.solicitacoes_acesso;
drop policy if exists p_solicitacoes_select_admin on public.solicitacoes_acesso;
drop policy if exists p_solicitacoes_select_owner on public.solicitacoes_acesso;
drop policy if exists p_solicitacoes_update_admin on public.solicitacoes_acesso;

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

create or replace function public.resolver_login_identificador(p_identificador text)
returns table(email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_identificador text := lower(trim(coalesce(p_identificador, '')));
  v_cpf text := regexp_replace(v_identificador, '\D', '', 'g');
begin
  return query
  select up.username::text
  from public.usuarios_perfil up
  where lower(up.username) = v_identificador
     or regexp_replace(coalesce(up.cpf, ''), '\D', '', 'g') = v_cpf
  order by case when lower(up.username) = v_identificador then 0 else 1 end
  limit 1;
end;
$$;

revoke all on function public.resolver_login_identificador(text) from public;
grant execute on function public.resolver_login_identificador(text) to anon, authenticated;

create or replace function public.solicitar_acesso(
  p_nome text,
  p_cpf text,
  p_matricula text,
  p_email text,
  p_senha text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_nome text := trim(coalesce(p_nome, ''));
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_matricula text := upper(trim(coalesce(p_matricula, '')));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_senha text := coalesce(p_senha, '');
  v_auth_user_id uuid;
  v_request_id uuid;
begin
  if v_nome = '' or v_cpf = '' or v_matricula = '' or v_email = '' or v_senha = '' then
    raise exception 'Preencha todos os campos obrigatorios para solicitar acesso.';
  end if;

  if length(v_senha) < 8 then
    raise exception 'A senha deve possuir no minimo 8 caracteres.';
  end if;

  if v_email = 'felipecabraw@gmail.com' then
    raise exception 'Este e-mail esta reservado ao Administrador Senior do sistema.';
  end if;

  if exists (
    select 1
    from public.usuarios_perfil up
    where lower(up.username) = v_email
       or regexp_replace(coalesce(up.cpf, ''), '\D', '', 'g') = v_cpf
  ) then
    raise exception 'Ja existe um usuario ativo ou em analise com este CPF ou e-mail.';
  end if;

  select au.id
    into v_auth_user_id
  from auth.users au
  where lower(au.email) = v_email
  limit 1;

  insert into public.solicitacoes_acesso (
    auth_user_id,
    email,
    nome_completo,
    cpf,
    matricula,
    senha_hash,
    status,
    aprovado_por,
    aprovado_em
  ) values (
    v_auth_user_id,
    v_email,
    v_nome,
    v_cpf,
    v_matricula,
    crypt(v_senha, gen_salt('bf')),
    'pendente',
    null,
    null
  )
  on conflict (email) do update
    set nome_completo = excluded.nome_completo,
        cpf = excluded.cpf,
        matricula = excluded.matricula,
        senha_hash = excluded.senha_hash,
        status = 'pendente',
        auth_user_id = excluded.auth_user_id,
        aprovado_por = null,
        aprovado_em = null,
        atualizado_em = now()
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.solicitar_acesso(text, text, text, text, text) from public;
grant execute on function public.solicitar_acesso(text, text, text, text, text) to anon, authenticated;

create or replace function public.aprovar_solicitacao_acesso(
  p_solicitacao_id uuid,
  p_admin_email text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin_email text := lower(trim(coalesce(p_admin_email, '')));
  v_request public.solicitacoes_acesso%rowtype;
  v_user_id uuid;
begin
  if not exists (
    select 1
    from public.usuarios_perfil up
    where lower(up.username) = v_admin_email
      and up.role = 'senior_admin'
      and up.status_acesso = 'ativo'
  ) then
    raise exception 'Apenas o Administrador Senior pode aprovar solicitacoes.';
  end if;

  select *
    into v_request
  from public.solicitacoes_acesso
  where id = p_solicitacao_id
    and status = 'pendente'
  for update;

  if not found then
    raise exception 'Solicitacao pendente nao encontrada.';
  end if;

  select coalesce(v_request.auth_user_id, au.id)
    into v_user_id
  from auth.users au
  where lower(au.email) = lower(v_request.email)
  limit 1;

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
      lower(v_request.email),
      v_request.senha_hash,
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome', v_request.nome_completo, 'cpf', v_request.cpf, 'matricula', v_request.matricula),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  else
    update auth.users
       set email = lower(v_request.email),
           encrypted_password = v_request.senha_hash,
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           raw_user_meta_data = jsonb_build_object('nome', v_request.nome_completo, 'cpf', v_request.cpf, 'matricula', v_request.matricula),
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
    jsonb_build_object('sub', v_user_id::text, 'email', lower(v_request.email)),
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
    lower(v_request.email),
    v_request.nome_completo,
    v_request.cpf,
    v_request.matricula,
    '',
    '',
    'ativo',
    'usuario',
    v_admin_email,
    now()
  )
  on conflict (auth_user_id) do update
    set username = excluded.username,
        nome_completo = excluded.nome_completo,
        cpf = excluded.cpf,
        matricula = excluded.matricula,
        status_acesso = 'ativo',
        role = 'usuario',
        aprovado_por = excluded.aprovado_por,
        aprovado_em = excluded.aprovado_em,
        atualizado_em = now();

  update public.solicitacoes_acesso
     set auth_user_id = v_user_id,
         status = 'aprovado',
         aprovado_por = v_admin_email,
         aprovado_em = now(),
         atualizado_em = now()
   where id = v_request.id;

  return v_user_id;
end;
$$;

revoke all on function public.aprovar_solicitacao_acesso(uuid, text) from public;
grant execute on function public.aprovar_solicitacao_acesso(uuid, text) to authenticated;

update public.usuarios_perfil
   set role = 'usuario'
 where role = 'senior_admin'
   and lower(username) <> 'felipecabraw@gmail.com';

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
)
select
  au.id,
  lower(au.email),
  coalesce(nullif(au.raw_user_meta_data ->> 'nome', ''), 'Administrador Senior'),
  coalesce(au.raw_user_meta_data ->> 'cpf', ''),
  coalesce(au.raw_user_meta_data ->> 'matricula', ''),
  coalesce((select up.funcao from public.usuarios_perfil up where up.auth_user_id = au.id limit 1), ''),
  coalesce((select up.foto_url from public.usuarios_perfil up where up.auth_user_id = au.id limit 1), ''),
  'ativo',
  'senior_admin',
  'bootstrap-system',
  now()
from auth.users au
where lower(au.email) = 'felipecabraw@gmail.com'
on conflict (auth_user_id) do update
  set username = excluded.username,
      status_acesso = 'ativo',
      role = 'senior_admin',
      aprovado_por = 'bootstrap-system',
      aprovado_em = now(),
      atualizado_em = now();

notify pgrst, 'reload schema';

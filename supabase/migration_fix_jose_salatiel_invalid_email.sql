begin;

-- Corrige o e-mail tecnico inicial do senior_admin Jose Salatiel
-- Motivo: o dominio .local nao e aceito pelo Supabase Auth para operacoes de alteracao de e-mail

update auth.users
set email = '05977729405@siac.example.com',
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now(),
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'nome', 'Jose Salatiel Dantas Nascimento',
      'cpf', '05977729405',
      'matricula', '243.325-7'
    )
where lower(email) = '05977729405@siac.local'
   or id in (
     select up.auth_user_id
     from public.usuarios_perfil up
     where regexp_replace(coalesce(up.cpf, ''), '\D', '', 'g') = '05977729405'
   );

alter table public.usuarios_perfil disable trigger trg_usuarios_perfil_update_guard;

update public.usuarios_perfil
set username = '05977729405@siac.example.com',
    atualizado_em = now()
where regexp_replace(coalesce(cpf, ''), '\D', '', 'g') = '05977729405'
   or lower(username) = '05977729405@siac.local';

alter table public.usuarios_perfil enable trigger trg_usuarios_perfil_update_guard;

update public.solicitacoes_acesso
set email = '05977729405@siac.example.com',
    atualizado_em = now()
where regexp_replace(coalesce(cpf, ''), '\D', '', 'g') = '05977729405'
   or lower(email) = '05977729405@siac.local';

update auth.identities
set identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object(
      'email', '05977729405@siac.example.com'
    ),
    updated_at = now()
where user_id in (
    select up.auth_user_id
    from public.usuarios_perfil up
    where regexp_replace(coalesce(up.cpf, ''), '\D', '', 'g') = '05977729405'
)
  and provider = 'email';

commit;

notify pgrst, 'reload schema';

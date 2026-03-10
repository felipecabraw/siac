# Migração para Supabase (Status Atual)

## O que já está pronto
- Login com suporte ao Supabase Auth.
- Sessão e logout integrados ao backend.
- Processos/contratos integrados ao Supabase (cadastro, listagem, exclusão, duplicidade).
- Perfil do usuário integrado ao Supabase.
- Almoxarifado integrado ao Supabase (itens, movimentações, exclusões).
- Validação de senha para exclusão de item no almoxarifado.
- Fallback local automático quando `provider: 'local'`.

## 1) Criar projeto no Supabase
- Acesse https://supabase.com
- Crie um novo projeto.

## 2) Executar schema SQL
- Abra o SQL Editor.
- Execute o conteúdo de `supabase/schema.sql`.

## 3) Habilitar usuários
- Em Authentication > Providers, mantenha Email habilitado.
- Crie os usuários em Authentication > Users.

## 4) Configurar frontend
Edite `backend-config.js`:

```js
window.SIGA_BACKEND_CONFIG = {
  provider: 'supabase',
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabaseAnonKey: 'SUA_CHAVE_ANON_PUBLICA'
};
```

## 5) Login
- No modo Supabase, o campo `Usuário/E-mail` deve receber o e-mail do usuário cadastrado no Supabase Auth.

## 6) Deploy para teste
- Publique o frontend (Netlify/Vercel) após configurar `backend-config.js`.

## Controle de acesso (Administrador Sênior)
- Execute também: `supabase/migration_acesso_admin_senior.sql`.
- A aprovação de novos usuários é feita por perfil (`role = senior_admin`).
- No bootstrap inicial, promova o administrador principal para `senior_admin` na tabela `usuarios_perfil`.

## Hardening de segurança (obrigatório)
- Execute: `supabase/migration_rls_usuarios_perfil.sql`.
- Essa migração impede que usuários comuns promovam o próprio perfil para `senior_admin` ou alterem `status_acesso`.

## Próxima fase sugerida
- Auditoria institucional automática (triggers com payload detalhado).
- Relatórios consolidados (contratos e almoxarifado).
- RLS por unidade/setor quando houver expansão além de SEAP/ALMOXARIFADO.


# Migra��o para Supabase (Status Atual)

## O que j� est� pronto
- Login com suporte ao Supabase Auth.
- Sess�o e logout integrados ao backend.
- Processos/contratos integrados ao Supabase (cadastro, listagem, exclus�o, duplicidade).
- Perfil do usu�rio integrado ao Supabase.
- Almoxarifado integrado ao Supabase (itens, movimenta��es, exclus�es).
- Valida��o de senha para exclus�o de item no almoxarifado.
- Fallback local autom�tico quando `provider: 'local'`.

## 1) Criar projeto no Supabase
- Acesse https://supabase.com
- Crie um novo projeto.

## 2) Executar schema SQL
- Abra o SQL Editor.
- Execute o conte�do de `supabase/schema.sql`.

## 3) Habilitar usu�rios
- Em Authentication > Providers, mantenha Email habilitado.
- Crie os usu�rios em Authentication > Users.

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
- No modo Supabase, o campo `Usu�rio/E-mail` deve receber o e-mail do usu�rio cadastrado no Supabase Auth.

## 6) Deploy para teste
- Publique o frontend (Netlify/Vercel) ap�s configurar `backend-config.js`.

## Controle de acesso (Administrador S�nior)
- Execute tamb�m: `supabase/migration_acesso_admin_senior.sql`.
- A aprova��o de novos usu�rios � feita por perfil (`role = senior_admin`).
- No bootstrap inicial, promova o administrador principal para `senior_admin` na tabela `usuarios_perfil`.

## Hardening de seguran�a (obrigat�rio)
- Execute: `supabase/migration_rls_usuarios_perfil.sql`.
- Essa migra��o impede que usu�rios comuns promovam o pr�prio perfil para `senior_admin` ou alterem `status_acesso`.

## Pr�xima fase sugerida
- Auditoria institucional autom�tica (triggers com payload detalhado).
- Relat�rios consolidados (contratos e almoxarifado).
- RLS por unidade/setor quando houver expans�o al�m de SEAP/ALMOXARIFADO.


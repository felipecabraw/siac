# Migracao para Supabase (Status Atual)
## O que ja esta pronto
- Login com suporte ao Supabase Auth.
- Sessao e logout integrados ao backend.
- Processos/contratos integrados ao Supabase.
- Perfil do usuario integrado ao Supabase.
- Almoxarifado integrado ao Supabase (itens, movimentacoes, exclusoes).
- Validacao de senha para exclusao de item no almoxarifado.
- Fallback local automatico quando provider: 'local'.
- Hardening do almoxarifado com validacao de unidade e RPCs atomicas.
## 1) Criar projeto no Supabase
- Acesse https://supabase.com
- Crie um novo projeto.
## 2) Executar schema SQL
- Abra o SQL Editor.
- Execute o conteudo de supabase/schema.sql.
## 3) Executar migracoes obrigatorias
- supabase/migration_acesso_admin_senior.sql
- supabase/migration_rls_usuarios_perfil.sql
- supabase/migration_almox_hardening.sql
## 4) Habilitar usuarios
- Em Authentication > Providers, mantenha Email habilitado.
- Crie os usuarios em Authentication > Users.
## 5) Configurar frontend
Edite ackend-config.js:
`js
window.SIGA_BACKEND_CONFIG = {
  provider: 'supabase',
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabaseAnonKey: 'SUA_CHAVE_ANON_PUBLICA'
};
`
## 6) Login
- No modo Supabase, o campo Usuario/E-mail deve receber o e-mail do usuario cadastrado no Supabase Auth.
## 7) Almoxarifado
- Para carga inicial, use supabase/modelo_importacao_almox_itens.sql.
- Para espelhamento completo da planilha, use supabase/modelo_sincronizacao_completa_almox_itens.sql.
- As operacoes da tela ficam protegidas pelas funcoes RPC da migracao migration_almox_hardening.sql.
## 8) Deploy para teste
- Publique o frontend (Netlify/Vercel) apos configurar ackend-config.js.
## Controle de acesso (Administrador Senior)
- A aprovacao de novos usuarios e feita por perfil (ole = senior_admin).
- No bootstrap inicial, promova o administrador principal para senior_admin na tabela usuarios_perfil.
## Proxima fase sugerida
- Auditoria institucional automatica com payload mais detalhado.
- Relatorios consolidados de contratos e almoxarifado.
- RLS por unidade/setor quando houver expansao alem de SEAP/ALMOXARIFADO.

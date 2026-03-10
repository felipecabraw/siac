# Checklist de Homologação do SIGA

## Pré-requisito
- `backend-config.js` em modo `supabase`.
- Migrações executadas:
  - `supabase/schema.sql`
  - `supabase/migration_acesso_admin_senior.sql`
  - `supabase/migration_rls_usuarios_perfil.sql`

## Fluxo de autenticação e acesso
1. Acesse `index.html` sem sessão ativa.
- Resultado esperado: tela de login exibida.

2. Clique em `Solicitar Acesso` e cadastre um novo usuário.
- Resultado esperado: mensagem de sucesso e retorno ao login.

3. Tente logar com esse novo usuário antes da aprovação.
- Resultado esperado: login negado por acesso pendente.

4. Logue com perfil `senior_admin`.
- Resultado esperado: acesso ao dashboard e painel de aprovação no Perfil.

5. No menu `Perfil`, aprove o usuário pendente.
- Resultado esperado: status alterado para ativo e remoção da fila pendente.

6. Faça login com o usuário aprovado.
- Resultado esperado: acesso liberado ao dashboard.

## Fluxo de recuperação de senha
1. Clique em `Esqueci minha senha`.
2. Informe e-mail cadastrado.
- Resultado esperado: mensagem de envio e e-mail de recuperação no Supabase.

## Fluxo de contratos
1. Em `Cadastro de contratos`, cadastre contrato com valor e vigência.
- Resultado esperado: cadastro concluído.

2. Em `Contratos cadastrados`, valide exibição do registro.
- Resultado esperado: dados completos e status de vigência coerente.

3. Em `Início`, valide atualização dos gráficos.
- Resultado esperado: indicadores refletindo os dados cadastrados.

## Fluxo de almoxarifado
1. Cadastre item no almoxarifado.
2. Registre entrada e saída.
3. Tente excluir item com senha incorreta.
- Resultado esperado: exclusão bloqueada.

4. Exclua item com senha correta.
- Resultado esperado: item removido e trilha de exclusão registrada.

## Segurança (RLS)
1. Com usuário comum ativo, tente alterar `role` para `senior_admin` no banco.
- Resultado esperado: operação negada pela policy/trigger.

2. Com usuário comum, tente alterar `status_acesso` de outro usuário.
- Resultado esperado: operação negada.

3. Com usuário `senior_admin`, aprove novo usuário pela aplicação.
- Resultado esperado: operação permitida.


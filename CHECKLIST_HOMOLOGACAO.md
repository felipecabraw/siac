# Checklist de Homologaï¿½ï¿½o do SIGA

## Prï¿½-requisito
- `backend-config.js` em modo `supabase`.
- Migraï¿½ï¿½es executadas:
  - `supabase/schema.sql`
  - `supabase/migration_acesso_admin_senior.sql`
  - `supabase/migration_rls_usuarios_perfil.sql`

## Fluxo de autenticaï¿½ï¿½o e acesso
1. Acesse `index.html` sem sessão ativa.
- Resultado esperado: tela de login exibida.

2. Clique em `Solicitar Acesso` e cadastre um novo usuário.
- Resultado esperado: mensagem de sucesso e retorno ao login.

3. Tente logar com esse novo usuário antes da aprovaï¿½ï¿½o.
- Resultado esperado: login negado por acesso pendente.

4. Logue com perfil `senior_admin`.
- Resultado esperado: acesso ao dashboard e painel de aprovaï¿½ï¿½o no Perfil.

5. No menu `Perfil`, aprove o usuário pendente.
- Resultado esperado: status alterado para ativo e remoï¿½ï¿½o da fila pendente.

6. Faï¿½a login com o usuário aprovado.
- Resultado esperado: acesso liberado ao dashboard.

## Fluxo de recuperaï¿½ï¿½o de senha
1. Clique em `Esqueci minha senha`.
2. Informe e-mail cadastrado.
- Resultado esperado: mensagem de envio e e-mail de recuperaï¿½ï¿½o no Supabase.

## Fluxo de contratos
1. Em `Cadastro de contratos`, cadastre contrato com valor e vigência.
- Resultado esperado: cadastro concluï¿½do.

2. Em `Contratos cadastrados`, valide exibiï¿½ï¿½o do registro.
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
- Resultado esperado: operaï¿½ï¿½o negada pela policy/trigger.

2. Com usuário comum, tente alterar `status_acesso` de outro usuário.
- Resultado esperado: operaï¿½ï¿½o negada.

3. Com usuário `senior_admin`, aprove novo usuário pela aplicaï¿½ï¿½o.
- Resultado esperado: operaï¿½ï¿½o permitida.


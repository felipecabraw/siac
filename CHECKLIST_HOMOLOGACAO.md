# Checklist de Homologacao do SIGA
## Pre-requisito
- ackend-config.js em modo supabase.
- Migracoes executadas:
  - supabase/schema.sql
  - supabase/migration_acesso_admin_senior.sql
  - supabase/migration_rls_usuarios_perfil.sql
  - supabase/migration_almox_hardening.sql
## Fluxo de autenticacao e acesso
1. Acesse index.html sem sessao ativa.
- Resultado esperado: tela de login exibida.
2. Clique em Solicitar Acesso e cadastre um novo usuario.
- Resultado esperado: mensagem de sucesso e retorno ao login.
3. Tente logar com esse novo usuario antes da aprovacao.
- Resultado esperado: login negado por acesso pendente.
4. Logue com perfil senior_admin.
- Resultado esperado: acesso ao dashboard e painel de aprovacao no Perfil.
5. No menu Perfil, aprove o usuario pendente.
- Resultado esperado: status alterado para ativo e remocao da fila pendente.
6. Faca login com o usuario aprovado.
- Resultado esperado: acesso liberado ao dashboard.
## Fluxo de recuperacao de senha
1. Clique em Esqueci minha senha.
2. Informe e-mail cadastrado.
- Resultado esperado: mensagem de envio e e-mail de recuperacao no Supabase.
## Fluxo de contratos
1. Em Cadastro de contratos, cadastre contrato com valor e vigencia.
- Resultado esperado: cadastro concluido.
2. Em Contratos cadastrados, valide exibicao do registro.
- Resultado esperado: dados completos e status de vigencia coerente.
3. Em Inicio, valide atualizacao dos graficos.
- Resultado esperado: indicadores refletindo os dados cadastrados.
## Fluxo de almoxarifado
1. Cadastre item no almoxarifado com unidade valida.
- Resultado esperado: item salvo e, se houver saldo inicial, historico inicial criado.
2. Registre entrada e saida do item.
- Resultado esperado: estoque atualizado e historico consistente.
3. Tente cadastrar item com unidade fora do padrao.
- Resultado esperado: operacao bloqueada.
4. Tente excluir item com senha incorreta.
- Resultado esperado: exclusao bloqueada.
5. Exclua item com senha correta.
- Resultado esperado: item removido e trilha de exclusao registrada.
6. Execute uma carga inicial por SQL e recarregue a tela.
- Resultado esperado: KPIs, tabela e historico refletindo a carga.
## Seguranca (RLS)
1. Com usuario comum ativo, tente alterar ole para senior_admin no banco.
- Resultado esperado: operacao negada pela policy/trigger.
2. Com usuario comum, tente alterar status_acesso de outro usuario.
- Resultado esperado: operacao negada.
3. Com usuario senior_admin, aprove novo usuario pela aplicacao.
- Resultado esperado: operacao permitida.

# Guia de Importacao do Almoxarifado
## Estrutura real usada pelo sistema
Tabela principal: public.almox_itens
Tabela de historico: public.almox_movimentacoes
Tabela de exclusoes: public.almox_exclusoes
## Pre-requisitos obrigatorios antes de importar
1. Executar supabase/schema.sql.
2. Executar supabase/migration_acesso_admin_senior.sql.
3. Executar supabase/migration_rls_usuarios_perfil.sql.
4. Executar supabase/migration_almox_hardening.sql.
Sem a migracao de hardening, o sistema continua funcionando, mas fica sem as operacoes atomicas via RPC e sem a validacao forte de unidade de medida.
## Campos obrigatorios para a carga inicial
- 
ome
- unidade_medida
- local_estoque
- estoque_atual
- estoque_minimo
## Campos opcionais
- categoria
- observacao
- criado_por
- tualizado_por
## Valores aceitos
- local_estoque: use SEAP/ALMOXARIFADO
- unidade_medida: use apenas
  - un
  - cx
  - pct
  - esma
  - lt
  - kg
- estoque_atual: numero inteiro maior ou igual a 0
- estoque_minimo: numero inteiro maior ou igual a 0
## Arquivos disponiveis
- modelo_importacao_almox_itens.csv
  - modelo simples para preencher os itens
- modelo_importacao_almox_itens.sql
  - carga incremental segura: insere novos itens e atualiza existentes
- modelo_sincronizacao_completa_almox_itens.sql
  - sincronizacao completa: espelha a planilha e remove do banco o que nao estiver mais na carga
- modelo_google_planilhas_almoxarifado.tsv
  - modelo pronto para colar no Google Planilhas
## Escolha correta do processo
### 1. Carga incremental
Use quando voce quer incluir novos itens ou atualizar itens existentes sem apagar itens antigos.
Arquivo: modelo_importacao_almox_itens.sql
### 2. Sincronizacao completa
Use quando a planilha deve ser a fonte oficial e o banco precisa ficar exatamente igual a ela.
Arquivo: modelo_sincronizacao_completa_almox_itens.sql
## Fluxo recomendado
1. Preencha a planilha ou o CSV.
2. Escolha se a operacao sera incremental ou sincronizacao completa.
3. Converta as linhas para o bloco alues do SQL escolhido.
4. Rode o SQL no Supabase.
5. Valide na tela do almoxarifado:
   - itens cadastrados
   - estoque atual
   - estoque minimo
   - KPIs
   - historico de movimentacoes
   - historico de exclusoes, se houve sincronizacao completa com remocao
## Observacao importante
Se voce importar direto apenas em public.almox_itens, o sistema pode ficar sem historico inicial coerente. Os modelos SQL existem justamente para manter rastreabilidade.

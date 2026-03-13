# Guia de Importacao do Almoxarifado

## Estrutura real usada pelo sistema
Tabela principal: `public.almox_itens`
Tabela de historico: `public.almox_movimentacoes`
Tabela de exclusoes: `public.almox_exclusoes`

## Campos obrigatorios para a carga inicial
- `nome`
- `unidade_medida`
- `local_estoque`
- `estoque_atual`
- `estoque_minimo`

## Campos opcionais
- `categoria`
- `observacao`
- `criado_por`
- `atualizado_por`

## Valores esperados
- `local_estoque`: use `SEAP/ALMOXARIFADO`
- `unidade_medida`: prefira apenas estes codigos usados na tela
  - `un`
  - `cx`
  - `pct`
  - `resma`
  - `lt`
  - `kg`
- `estoque_atual`: numero inteiro maior ou igual a 0
- `estoque_minimo`: numero inteiro maior ou igual a 0

## Arquivos criados
- `modelo_importacao_almox_itens.csv`
  - modelo de planilha/CSV para voce preencher
- `modelo_importacao_almox_itens.sql`
  - script pronto para inserir os itens e gerar o historico inicial de entrada

## Melhor forma de alimentar o sistema corretamente
1. Preencha o CSV usando as colunas do modelo.
2. Converta cada linha para o bloco `values` do SQL, ou me chame que eu converto para voce.
3. Rode o SQL no Supabase.
4. O sistema passara a exibir:
   - itens cadastrados
   - estoque atual
   - estoque minimo
   - KPIs
   - historico inicial de movimentacao

## Observacao importante
Se voce importar apenas direto em `public.almox_itens`, o sistema funciona, mas o historico de movimentacoes pode ficar vazio para a carga inicial. Por isso o SQL criado ja gera as entradas iniciais automaticamente.
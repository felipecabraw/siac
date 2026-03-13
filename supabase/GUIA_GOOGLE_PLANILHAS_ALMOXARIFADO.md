# Modelo para Google Planilhas - Almoxarifado

## Arquivo principal
- `modelo_google_planilhas_almoxarifado.tsv`

## Como usar no Google Planilhas
1. Abra uma planilha em branco.
2. Copie todo o conteudo do arquivo `.tsv`.
3. Cole diretamente na celula `A1`.
4. O Google Planilhas vai separar automaticamente em colunas.
5. Apague as linhas de exemplo e preencha com os itens reais.

## Colunas
- `nome`: obrigatorio
- `categoria`: opcional
- `unidade_medida`: obrigatorio
- `local_estoque`: obrigatorio
- `estoque_atual`: obrigatorio
- `estoque_minimo`: obrigatorio
- `observacao`: opcional
- `criado_por`: opcional
- `atualizado_por`: opcional

## Valores recomendados
- `local_estoque`: `SEAP/ALMOXARIFADO`
- `unidade_medida`: use apenas
  - `un`
  - `cx`
  - `pct`
  - `resma`
  - `lt`
  - `kg`
- `criado_por`: `carga_inicial`
- `atualizado_por`: `carga_inicial`

## Cuidados
- nao repita o mesmo `nome` no mesmo `local_estoque`
- use apenas numeros inteiros em `estoque_atual` e `estoque_minimo`
- nao deixe `nome`, `unidade_medida`, `local_estoque`, `estoque_atual` e `estoque_minimo` vazios

## Proximo passo
Quando a planilha estiver preenchida, eu posso converter o conteudo para o SQL final de carga no Supabase.
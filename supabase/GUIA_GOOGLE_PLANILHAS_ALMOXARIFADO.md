# Modelo para Google Planilhas - Almoxarifado
## Arquivo principal
- modelo_google_planilhas_almoxarifado.tsv
## Como usar no Google Planilhas
1. Abra uma planilha em branco.
2. Copie todo o conteudo do arquivo .tsv.
3. Cole diretamente na celula A1.
4. O Google Planilhas vai separar automaticamente em colunas.
5. Apague as linhas de exemplo e preencha com os itens reais.
## Colunas
- 
ome: obrigatorio
- categoria: opcional
- unidade_medida: obrigatorio
- local_estoque: obrigatorio
- estoque_atual: obrigatorio
- estoque_minimo: obrigatorio
- observacao: opcional
- criado_por: opcional
- tualizado_por: opcional
## Valores aceitos
- local_estoque: SEAP/ALMOXARIFADO
- unidade_medida: use apenas
  - un
  - cx
  - pct
  - esma
  - lt
  - kg
- criado_por: carga_inicial
- tualizado_por: carga_inicial
## Cuidados
- nao repita o mesmo 
ome no mesmo local_estoque
- use apenas numeros inteiros em estoque_atual e estoque_minimo
- nao deixe 
ome, unidade_medida, local_estoque, estoque_atual e estoque_minimo vazios
- execute antes a migracao supabase/migration_almox_hardening.sql
## Proximo passo
Quando a planilha estiver preenchida, escolha entre carga incremental e sincronizacao completa. Depois converta o conteudo para o SQL correspondente.

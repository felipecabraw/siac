alter table if exists public.processos_contratos
  add column if not exists processo_sei text;

alter table if exists public.processos_contratos
  add column if not exists objeto text;

alter table if exists public.processos_contratos
  add column if not exists fundamentacao_legal text;

alter table if exists public.processos_contratos
  add column if not exists empresa_contratada text;

alter table if exists public.processos_contratos
  add column if not exists valor_global numeric(14,2);

alter table if exists public.processos_contratos
  add column if not exists fonte text;

alter table if exists public.processos_contratos
  add column if not exists fiscais_contrato text;

alter table if exists public.processos_contratos
  add column if not exists fim_vigencia date;

alter table if exists public.processos_contratos
  add column if not exists status_contrato text default 'vigente';

alter table if exists public.processos_contratos
  drop column if exists alerta_prazo;

update public.processos_contratos
set processo_sei = coalesce(processo_sei, numero_processo),
    objeto = coalesce(objeto, objeto_contrato),
    fundamentacao_legal = coalesce(fundamentacao_legal, fundamentacao_contrato),
    empresa_contratada = coalesce(empresa_contratada, ''),
    valor_global = coalesce(valor_global, valor_contrato, 0),
    fonte = coalesce(fonte, fonte_recurso),
    fiscais_contrato = coalesce(fiscais_contrato, fiscal_contrato),
    fim_vigencia = coalesce(fim_vigencia, termino_vigencia),
    status_contrato = coalesce(status_contrato,
      case
        when coalesce(fim_vigencia, termino_vigencia) < current_date then 'vencido'
        else 'vigente'
      end
    );

alter table if exists public.processos_contratos
  alter column processo_sei set not null;

alter table if exists public.processos_contratos
  alter column objeto set not null;

alter table if exists public.processos_contratos
  alter column fundamentacao_legal set not null;

alter table if exists public.processos_contratos
  alter column empresa_contratada set not null;

alter table if exists public.processos_contratos
  alter column valor_global set default 0;

alter table if exists public.processos_contratos
  alter column valor_global set not null;

alter table if exists public.processos_contratos
  alter column fonte set not null;

alter table if exists public.processos_contratos
  alter column fiscais_contrato set not null;

alter table if exists public.processos_contratos
  alter column fim_vigencia set not null;

alter table if exists public.processos_contratos
  alter column status_contrato set default 'vigente';

alter table if exists public.processos_contratos
  alter column status_contrato set not null;

alter table if exists public.processos_contratos
  drop constraint if exists ck_processos_status_contrato;

alter table if exists public.processos_contratos
  add constraint ck_processos_status_contrato
  check (status_contrato in ('vigente', 'nao_vigente', 'vencido'));

alter table if exists public.processos_contratos
  alter column data_assinatura drop not null;

alter table if exists public.processos_contratos
  alter column data_publicacao drop not null;

alter table if exists public.processos_contratos
  alter column fundamentacao_contrato drop not null;

notify pgrst, 'reload schema';

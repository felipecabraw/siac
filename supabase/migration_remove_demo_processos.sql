delete from public.processos_contratos
where numero_processo in ('SEI-2026-001', 'SEI-2026-014', 'SEI-2025-223')
   or processo_sei in ('SEI-2026-001', 'SEI-2026-014', 'SEI-2025-223')
   or numero_contrato in ('CT-001/2026', 'CT-014/2026', 'CT-223/2025');
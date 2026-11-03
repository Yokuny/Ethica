# Rotina do serviço — Tasks

| Task | O quê | Gate | Status |
| --- | --- | --- | --- |
| T1 | RSV-01, RSV-02, RSV-06: partes do último despacho, última nomeação, sem prazo do PDF, detalhe sem bloco trabalhista e sem repetição, nomes das seções | `pnpm vitest run apps/api/src/modules/case/import` | feito |
| T2 | RSV-03: status único (contrato, model + conversão, API, PDFs, web) | `pnpm vitest run` | feito |
| T3 | RSV-04: planilha de qualquer modelo (sinônimos, colunas, importação com `?fields=`, tela de conferência) | `pnpm vitest run apps/api/src/modules/case/import apps/web` | feito |
| T4 | RSV-05: base de varas e comarcas dos 24 TRTs para todo escritório | — | pendente |

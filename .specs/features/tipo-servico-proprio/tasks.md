# Tipo de serviço próprio — Tasks

- [x] T1 Contrato e banco: `role: 'other'`, `status: 'custom'`, `roleName`, `statusName`, `contractor`, `fixedFeesCents`/`payment` no cadastro, `validOwnType` (`packages/contracts`, `packages/db`).
- [x] T2 API `case`: validação, limpeza ao virar judicial, prazo "Entrega do serviço", evento com categoria e recebimento, `service-types` com `roleName`/`statuses`, 403 do pagamento sem financeiro. Testes e2e.
- [x] T3 API `finance`: `postFixedFees` lança o recebimento. Documentos: atuação e status digitados no PDF.
- [x] T4 Web: rótulos, campos de atuação/status abertos, seções do tipo próprio, pagamento, detalhe e lista com contratante.
- [x] T5 Gate (`pnpm run check`, build), `feature.md`, AD-176, commit.

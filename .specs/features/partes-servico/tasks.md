# Partes do serviço — Tasks

**Spec**: `.specs/features/partes-servico/spec.md`

Gate: `pnpm run check` + `(cd apps/web && pnpm run build)`.

- [x] **T1** Contrato e banco: `crea`, `email`/`phone` na parte do serviço, `nameKey`, perícia com data/hora opcionais.
- [x] **T2** API: reaproveitamento por nome normalizado, juntar repetidos, leitura de contatos no PDF, local da perícia, tipo do laudo pelo modelo. Testes.
- [x] **T3** Web: partes agrupadas com advogados, sem bloco trabalhista, modelos de todos os tipos, Partes com CREA, contatos e "Juntar repetidos".
- [x] **T4** Registro: `feature.md`, AD, `pnpm docs:sync`, commit e push.

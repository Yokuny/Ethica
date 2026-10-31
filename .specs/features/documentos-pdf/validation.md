# Base de documentos — Validation

**Data**: 2026-10-31 · **Branch**: `feat/documentos-pdf` (a partir de `main` em `a0382fa`) · **Veredito**: **PASS**

Verificação em modo standalone (sem sub-agente): releitura dos critérios da spec contra os testes e UAT no navegador.

## Gate

| Comando | Resultado |
| --- | --- |
| `pnpm run check` (tsc + biome + vitest unit/structural/integration/e2e, Mongo Atlas Local) | 85 arquivos, 432 testes, todos passando |
| `(cd apps/web && pnpm run build)` | ok, sem avisos |
| `node .agents/skills/ethica-item-typography/scripts/scan.mjs --summary` | 0 texto cru |
| `docker compose up --build -d --renew-anon-volumes api web` | Chromium 156 na imagem; `s3` (RustFS) e `s3-init` criam o bucket |

## Critérios × evidência

| Critério | Evidência |
| --- | --- |
| DOC-01.1 logo guardado e usado nos documentos | `apps/api/src/modules/identity/office.router.e2e.test.ts` "logo PNG vai para o storage, conta na cota…"; UAT: logo enviado em `/office` aparece no cabeçalho dos PDFs |
| DOC-01.2 cabeçalho/rodapé com marcadores em todos os PDFs | `office.router.e2e.test.ts` "só admin lê e edita…"; `documentos.templates.unit.test.ts` (marcadores, escape, logo ausente); UAT: PDFs com "Admin Demo · Página 1 de 3" |
| DOC-01.3 CPF, registro e formação na conta | `account.router.e2e.test.ts` "GET/PATCH /me/profile keeps professional data…"; UAT `/account` |
| DOC-02.1 ficha com processo, partes, prazos, compromissos e financeiro só admin/manager | `documentos.router.e2e.test.ts` "ficha: PDF para qualquer papel…"; UAT: ficha do operador sem "Resumo financeiro" nem valores |
| DOC-02.2 checklist com participantes/assinatura, agentes Sim/Não, divergências, documentos e anotações | `documentos.templates.unit.test.ts`; UAT: `checklist-<número>.pdf` (3 páginas) |
| DOC-03.1 cronograma com "faltam N dias" e "vence em breve" até 15 dias | `documentos.templates.unit.test.ts`, `documentos.router.e2e.test.ts` "cronograma…" |
| DOC-03.2 financeiro do período só admin/manager com recebido, pago, saldos e tabelas | `documentos.router.e2e.test.ts` "relatório financeiro: operador 403…"; UAT: totais do mês conferidos com o seed |
| DOC-03.3 perícias paradas há mais de 60 dias | `documentos.router.e2e.test.ts` "movimentações entram e saem…"; UAT: as duas do seed (95 e 70 dias) |
| DOC-04.1 ZIP com um CSV por entidade, usuários sem senha | `documentos.router.e2e.test.ts` "exportação: só admin…" |
| DOC-04.2 registra quem e quando | idem (`Tenant.dataExports`); UAT: "31 out 2026 · 15:36 · Admin Demo" em `/office` |
| Edge: seções vazias identificadas; logo ausente; operador sem valores | `documentos.templates.unit.test.ts` |

## UAT (navegador, http://localhost:15173, API docker :18080)

- **Admin, desktop**: envio do logo, exportação ZIP, ficha e checklist pelo menu "…" do detalhe, movimentação lançada, cronograma, paradas e financeiro em `/relatorios`, dados profissionais em `/account`.
- **Operador, desktop**: `/relatorios` sem o painel financeiro; `/office` volta para o início; ficha sem resumo financeiro; navegação sem "Escritório".
- **Celular (390 px)**: `/relatorios`, detalhe da perícia, `/account` (operador) e `/office` (admin) sem rolagem horizontal.
- Corrigido durante a UAT: o nome do arquivo chegava como `documento.pdf` porque o CORS não expunha o `Content-Disposition` (`apps/api/src/app.ts`); a caixa de anotações quebrava entre páginas; o uso do armazenamento mostrava "0 MB" para arquivos pequenos.

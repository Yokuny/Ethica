---
feature: Contatos das varas
slug: contatos-varas
descricao: Agenda de contatos das varas do trabalho e cíveis do escritório, filtrável por estado e cidade, com importação por planilha
data: 2026-11-01
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-054, AD-118, AD-134, AD-137, AD-151]
spec: [.specs/features/contatos-varas]
---

# Contatos das varas

**Status**: concluido · **Atualizado**: 2026-11-01 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), o código é a fonte da verdade.
> Correlação com o git: `git log --oneline -i --grep='contatos-varas'`.

## O que foi feito

- **Varas** (menu Trabalho, `/court-divisions`): agenda de contatos das varas do trabalho, cíveis e federais do escritório, com filtro por UF, cidade e justiça e busca pelo nome. Telefone, e-mail e balcão virtual abrem direto.
- Cadastro e edição em diálogo, exclusão com confirmação e **importação de planilha** (modelo para baixar; vara já cadastrada na mesma cidade é ignorada; linha inválida é recusada com a coluna).
- **Contato da vara no detalhe da perícia** quando a comarca é uma cidade cadastrada e o nome da vara cadastrada contém a vara da perícia.
- Permissão própria na matriz (`court_divisions`): admin e gestor editam, operador consulta.

## Por que

Pedido da perita (2026-11-01). Não há fonte oficial única com os contatos de todas as varas, então a agenda é do escritório (AD-151). A busca pelo nome é feita na tela sobre a lista já filtrada por UF e cidade, sem índice de busca novo (AD-054).

## Como

### `apps/api`

- `apps/api/src/modules/case/court-division.{router,controller,service,repository,schema}.ts` — lista, cidades, criar, editar, excluir e importar (`parseCsv` de `import.service.ts`). Montado em `apps/api/src/app.ts`.
- `apps/api/src/middlewares/activityLog.middleware.ts` — `/court-divisions` entra no diário de bordo.

### `apps/web`

- `apps/web/src/routes/_private/court-divisions/` — página, filtros, cartão, formulário e importação; `apps/web/src/query/court-division.ts`.
- `apps/web/src/components/court-division-contacts.tsx` — linhas de contato, usadas na página e em `apps/web/src/routes/_private/expert-cases/details/@components/case-court-division.tsx`.
- `apps/web/src/components/csv-import-report.tsx` e `apps/web/src/lib/helpers/csvTemplate.helper.ts` — agora compartilhados com a importação de perícias.

### `packages`

- `packages/contracts/src/schemas/court-division.schema.ts` — UFs, campos, colunas e exemplo da planilha; módulo `court_divisions` em `permission.schema.ts` e `activityLog.schema.ts`.
- `packages/db/src/models/court-division.model.ts` — índice único por escritório, UF, cidade e nome, sem diferença de maiúscula e acento.

## Como testar

```
pnpm vitest run apps/api/src/modules/case/court-division packages/contracts
pnpm run check && (cd apps/web && pnpm run build)
```

- UAT: admin → Varas → Importar planilha (modelo) e Adicionar; filtrar UF e cidade; abrir uma perícia da mesma vara e cidade e ver "Contato da vara". Operador vê sem os botões. Evidências em `.specs/features/contatos-varas/validation.md`.

## Pendências

- [ ] Membro com matriz de permissões já salva antes desta feature não vê "Varas" até o admin liberar em Usuários → Permissões (o seed de demonstração já vem com o acesso).
- [ ] Base inicial de varas por planilha, quando a perita tiver uma.

## Histórico

- 2026-11-01 — Implementado VAR-01 a VAR-03; validação em `.specs/features/contatos-varas/validation.md`. A justiça reaproveita a da perícia (trabalho, cível e federal) em vez de um tipo novo.
- 2026-11-01 — Spec criada (`.specs/features/contatos-varas/spec.md`).

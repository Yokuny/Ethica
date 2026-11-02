# Contatos das varas — Design

Spec: `.specs/features/contatos-varas/spec.md`. Defaults confirmados pela perita em 2026-11-01 ("segue").

## Modelo

`CourtDivision` (glossário: **Vara**), collection `court_divisions`, dono `case` (vara já é dado da perícia):

| Campo | Regra |
| --- | --- |
| `courtType` | `COURTTYPES` (trabalho, cível, federal) — reaproveita a justiça da perícia, sem enum novo |
| `name` | obrigatório, até 200 (ex.: "1ª Vara do Trabalho de Campinas") |
| `court` | opcional, até 20 (ex.: TRT15) |
| `state` | UF, `BRAZILIAN_STATES` |
| `city` | obrigatório, até 120 |
| `address`, `phones`, `email`, `virtualDesk` (link http/https), `notes` | opcionais |

Índice único `{ Tenant, state, city, name }` com collation `pt` força 1 (sem diferença de maiúscula e acento): é a regra de "já cadastrada" da importação.

## API (`apps/api/src/modules/case/court-division.*`)

| Rota | Permissão |
| --- | --- |
| `GET /court-divisions?state&city&courtType` | `court_divisions` `view` — devolve tudo o que casa (até 500, por estado, cidade e nome), sem paginação: o filtro por estado e cidade já reduz a poucas dezenas |
| `GET /court-divisions/cities?state` | `view` — cidades já cadastradas, para o filtro |
| `POST /court-divisions`, `PATCH/DELETE /court-divisions/:id` | `create`/`update`/`delete`; repetida → 409 `already_exists` |
| `POST /court-divisions/import` (CSV no corpo, como AD-118) | `create`; relatório criadas/ignoradas/recusadas |

Busca por nome é feita na tela sobre a lista já filtrada: não há índice Atlas Search novo (AD-054 proíbe regex no servidor, e o volume por cidade é pequeno).

## Permissão

Módulo novo `court_divisions` na matriz (AD-137): gestor com tudo, operador só ver. Diário de bordo registra pelo prefixo `/court-divisions` (AD-134).

## Web

- `apps/web/src/routes/_private/court-divisions/`: filtros de estado, cidade e justiça, busca por nome, lista em cartões com telefone, e-mail, endereço e balcão virtual (links clicáveis), `FormDialog` para criar/editar, `ConfirmDialog` para excluir, diálogo "Importar planilha" com modelo para baixar e relatório.
- Entrada "Varas" no grupo Trabalho.
- Detalhe da perícia: painel "Contato da vara" quando a comarca da perícia é uma cidade cadastrada e o nome da vara cadastrada contém a vara da perícia (comparação sem maiúscula e acento).

## Tasks

| # | Task | Verificação |
| --- | --- | --- |
| T1 | Contrato, model, permissão, API (CRUD, cidades, importação), diário | e2e da rota; unit do CSV; structural |
| T2 | Tela de varas, menu, importação | tela com admin e operador |
| T3 | Contato da vara no detalhe da perícia | tela |
| T4 | Glossário, `feature.md`, validação | `pnpm docs:check` |

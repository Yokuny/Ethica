# Busca de processos no Datajud — Tasks

## Execution Protocol

Escopo de execução desta melhoria, seguindo `tlc-spec-driven` e AD-105.

**Design**: `.specs/features/prospeccao-datajud/design.md`
**Status**: In Progress

## Execution Plan

### Phase 1: Contract and query

```
T1 → T2
```

### Phase 2: TRT subject filter and search screen

```
T3 (after T1, T2)
```

## Task Breakdown

### T1: Define validated Datajud filters

**What**: Add optional normalized process number, positive class/judging-body codes, and the approved technical-subject values to the shared search contract.
**Where**: `packages/contracts/src/schemas/prospeccao.schema.ts`
**Depends on**: None
**Requirement**: DAT-01
**Done when**: Schema accepts valid formatted/unformatted CNJ numbers and positive codes, and restricts technical subjects to the three available options.
**Tests**: none requested for this task
**Gate**: none

### T2: Build Datajud filters

**What**: Add exact filter clauses and an OR group for selected subject names to the provider query while retaining the cursor sort and allowing for slow CNJ responses.
**Where**: `apps/api/src/providers/datajudClient.ts`
**Depends on**: T1
**Requirement**: DAT-01
**Done when**: Every populated exact filter maps to a `bool.must` clause, any selected subject may match `assuntos.nome`, pagination retains all filters, and requests have a 30-second default timeout.
**Tests**: none requested for this task
**Gate**: none

### T3: Expose filters in Datajud search

**What**: Add the TRT-only technical-subject multi-select with three defaults, describe all filter types, and preserve criteria in the search hook across pages.
**Where**: `apps/web/src/routes/_private/prospeccao/busca/`
**Depends on**: T1, T2
**Requirement**: DAT-01, DAT-02
**Done when**: Users can submit the new filters, subject criteria are only sent for TRT searches, save a result using only fields accepted by the opportunity contract, and see saved opportunities in the existing paginated opportunities page.
**Tests**: none requested for this task
**Gate**: none

## Notes

The user did not request test execution. The implementation will not add or run tests in this task.

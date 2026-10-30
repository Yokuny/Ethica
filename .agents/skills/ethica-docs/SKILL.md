---
name: ethica-docs
description: Fluxo de documentação do repo Ethica — descoberta do que já foi feito/planejado antes de qualquer tarefa, e registro de alterações, ajustes, decisões e planos ao concluí-la. Use no início de TODA tarefa (ler docs/index.md, feature.md e planos anteriores relacionados) e obrigatoriamente ao terminar uma implementação ou ajuste, antes de considerá-lo pronto. Trigger em "documentar", "registrar", "terminei", "feature concluída", "atualizar docs", "salvar plano", "arquivar plano", "o que já foi feito sobre X", "onde fica a doc de X", "retomar", "continuar de onde parou".
---

# Documentação do Ethica — descoberta e registro

O resumo normativo está em `AGENTS.md` ("Protocolo de documentação"). Aqui está o detalhe dos dois momentos: **descoberta** (antes do código) e **registro** (ao concluir). Formato de `spec.md`/`design.md`/`tasks.md`: skill `ethica-spec-driven`.

## Vivo × congelado

| Documento | Responde | Muda depois? |
| --- | --- | --- |
| `docs/features/<slug>/feature.md` | o que é verdade agora e onde mexer | **Sim**, sempre que o código muda |
| `.specs/features/<slug>/{spec,design,tasks,validation,context}.md` | o que decidimos e provamos naquele dia | Não |
| `.specs/features/<slug>/plans/*.md` | como planejamos executar naquele dia | Não |
| `.specs/STATE.md` (`AD-NNN`) | que restrição vale para o projeto todo | Append-only; supersede, não edita |
| `docs/index.md` / `docs/index.json` | gateway | Só via `pnpm docs:sync` |

O `slug` (kebab-case, curto) é a identidade da feature: pasta em `docs/features/` e em `.specs/features/`, e scope do commit.

## Descoberta

1. `pnpm docs:context` ou `docs/index.md` (no Claude Code o hook `SessionStart` já injeta o resumo).
2. Ache as features relacionadas: tabela "Por área" do índice, `grep -ril '<termo>' docs/features .specs/features` e `git log --oneline -i --grep='<slug>'`.
3. Leia o `feature.md` inteiro de cada uma, inclusive "Pendências" e "Histórico". Se a tarefa estende algo, leia também `spec.md`, `design.md` e os planos da feature.
4. Plano em `.specs/plans/` sobre o mesmo assunto = trabalho em andamento: continue dele.
5. Releia as ADs ativas de `.specs/STATE.md` que tocam a área.
6. Diga ao usuário em uma ou duas linhas o que encontrou. Nada relacionado? Siga.

## Durante

- Plano sempre em arquivo: o plan mode do Claude já grava em `.specs/plans/`; outros agentes salvam em `.specs/plans/<YYYY-MM-DD>-<assunto>.md` com `# Título` na primeira linha.
- Execução divergiu do plano? Não reescreva o plano: anote no "Histórico" do `feature.md` (ou no `tasks.md`, se a feature roda pelo `tlc-spec-driven`).

## Registro

Só depois do aceite do gate único do `AGENTS.md` (passo 3: documentação, commit e PR). Trabalho parcial é registrado com `status: em-andamento` e as pendências listadas.

### 1. Criar ou atualizar

| Situação | O que fazer |
| --- | --- |
| Funcionalidade nova | Cria `docs/features/<slug>/feature.md` a partir de `docs/templates/feature-doc.md` |
| Ajuste ou correção em algo documentado | Atualiza as seções afetadas e adiciona uma linha datada no topo do "Histórico" |
| Ajuste transversal sem feature dona | Usa o `feature.md` da área (`infra`, `harness`, `apps/web`…); sem nenhum, cria um curto |
| Mudança desfeita | `status: revertido` + linha no "Histórico" com o motivo; não apaga o doc |

Antes de criar, procure o slug em `docs/index.json` (`features[].slug`) e por `areas` + descrição parecida. Nunca duplique.

### 2. Frontmatter

`feature`, `slug` (= nome da pasta), `descricao` (≤140 chars), `data` (hoje, YYYY-MM-DD), `status` (`planejado | em-andamento | parcial | concluido | revertido`), `areas` (`apps/x`, `packages/x` ou `infra | docs | evals | tests | harness`), `decisoes` (`AD-NNN` existentes), `spec` (pasta em `.specs/features/`, se houver), `branches` (opcional). Sem SHA de commit: ele morre em rebase/squash. O gerador valida tudo.

### 3. Arquivar planos

```
mkdir -p .specs/features/<slug>/plans
git mv .specs/plans/<auto-nome>.md .specs/features/<slug>/plans/<YYYY-MM-DD>-<assunto>.md
```

(`mv` se ainda não está no git.) Sempre renomeie. Plano abandonado também é arquivado, com uma linha no "Histórico" dizendo por quê.

### 4. Decisões

Decisão não-óbvia → `AD-NNN` no `.specs/STATE.md` (próximo número, formato Decision / Reason / Trade-off / Scope / Date / Status). Direção de produto com alternativas que valem registro longo → também `docs/adr/<NNNN>-<slug>.md` + linha em `docs/adr/README.md`. Contradiz AD ativa → a nova declara "Supersede AD-XXX" e a antiga vira `Status: superseded by AD-NNN` (única edição permitida).

### 5. Docs afetados

Em `docs/index.json`, abra os `features[]` cujas `areas` cruzam com as tocadas e confirme que nada descrito mudou. Revise também `docs/architecture.md`, `docs/glossary.md`, `docs/roadmap.md`, `PRODUCT.md`, `RUN_BOOK.md` e o `CLAUDE.md` do app quando a mudança os afetar.

### 6. Gerar e validar

```
pnpm docs:sync    # regrava docs/index.md e docs/index.json; falha com erro de validação
pnpm docs:check   # o que o CI roda
```

A documentação vai no commit `docs(<slug>): registra <assunto>`, na mesma branch e no mesmo PR do código (skill `ethica-commit-standards`).

## O que NÃO entra no `feature.md`

| Fica em | Nunca copiar |
| --- | --- |
| `spec.md` | IDs `FR-`/`AC-`/`<PREFIXO>-NN` com texto completo |
| `design.md` | Tabelas de alternativas, componentes, modelos de dados |
| `validation.md` | Tabela critério↔evidência, saída do gate |
| código | Enums, chaves de tradução, roles, valores de status — aponte o arquivo |

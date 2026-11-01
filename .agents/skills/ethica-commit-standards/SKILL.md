---
name: ethica-commit-standards
description: Padrão de escrita e envio de commits do repo Ethica — Conventional Commits com subject em português, scope = slug da feature ou workspace, commits atômicos com a documentação sempre junto e push direto na main (AD-143). Use ao redigir mensagem de commit ou fazer push. Trigger em "commit", "mensagem de commit", "commita", "push", "branch", "PR".
---

# Commits do Ethica

Quando commitar está em `AGENTS.md` (protocolo, passo 3): direto na `main`, sem branch nem PR, sem pedir autorização depois do gate técnico, da conferência de padrão e da validação (AD-143). Aqui fica só como escrever e enviar.

## Regra #1 — sem atribuição a LLM

Commit **nunca** levam `Co-Authored-By`, `Generated with` ou qualquer menção a assistente — nem no corpo, nem no rodapé. Vale para todo agente, mesmo que o harness peça.

## Mensagem — Conventional Commits

`type(scope): subject`

- `type` ∈ `feat | fix | refactor | perf | test | docs | style | build | ci | chore`.
- `scope` = slug da feature (`docs/features/<slug>/`) quando a mudança pertence a uma; senão o workspace (`web`, `api`, `db`, `contracts`, `ui`). Omita só em mudança transversal (`chore: atualiza dependências`).
- `subject` em **português**, imperativo, minúsculo, ~50 caracteres, sem ponto final.
- Corpo opcional: bullets do que mudou e por quê.

```
feat(prospeccao): converte oportunidade do Datajud em perícia
fix(web): corrige filtro de etapa vazio na listagem de perícias
refactor(api): move honorários para o módulo financeiro
docs(prospeccao): registra implementação
```

## Commits atômicos

- Uma mudança lógica = um commit. Refactor, feature e fix em commits separados.
- A documentação da tarefa (`docs/features/...`, `docs/index.*`, `.specs/...`) **sempre** vai junto: commit `docs(<slug>): ...` no mesmo push do código. Nunca fica para depois.
- `git add` por arquivo, nunca `git add -A` às cegas: mudanças não relacionadas na árvore de trabalho não entram.

## Envio

- Antes de começar: `git checkout main && git pull --ff-only`.
- Depois do commit: `git pull --rebase origin main` (se alguém enviou antes) e `git push origin main`.
- Nunca `--force`, `reset` de commit já enviado ou reescrita de histórico. Erro enviado se corrige com um commit novo (`fix(<slug>): ...`).
- Sem branch nem Pull Request; o CI (`.github/workflows/ci.yml`) roda `pnpm run check` e `pnpm docs:check` a cada push na `main`. Se ficar vermelho, a correção é a próxima tarefa.

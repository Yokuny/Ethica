---

feature: <Título curto, em português>
slug: <idêntico ao nome da pasta docs/features/<slug>/>
descricao: <uma frase, ≤140 caracteres, o que a feature FAZ — vai literal no índice>
data: <YYYY-MM-DD da última atualização deste doc>
status: <planejado | em-andamento | parcial | concluido | revertido>
areas: [<apps/web>, <apps/api>, <packages/contracts>]
decisoes: [<AD-NNN>, <AD-NNN>]
spec: [.specs/features/<slug>]
branches: [<branch>]
---

# <Título>

**Status**: <status> · **Atualizado**: <YYYY-MM-DD> · **Áreas**: `<apps/x>`, `<packages/y>`

> Documento vivo. Responde "o que é verdade agora e onde mexer". Onde divergir de
> `spec.md`/`design.md`/planos (escritos ANTES da implementação e congelados), **o código é a
> fonte da verdade** — e este doc aponta o arquivo exato. Correlação durável com o git:
> `git log --oneline -i --grep='<slug>'` (scope do commit), não SHA.

## O que foi feito

Três a seis bullets do resultado **observável** — o que um usuário (perito, gestor, equipe do
escritório) ou outro serviço consegue fazer hoje que não conseguia antes.

- ...

## Por que

O problema de negócio em 1-2 parágrafos e **a decisão que um leitor futuro não deve desfazer
sem entender o motivo**. Cite `AD-NNN` de `.specs/STATE.md`. Alternativas rejeitadas ficam no
`design.md`; aqui vai só a que sobreviveu e por quê.

## Como

Um `###` por área tocada, na ordem de `areas:`. Caminhos sempre a partir da raiz do repo.

### `apps/<x>`

- `apps/<x>/src/<path>` — responsabilidade em uma linha.

### `packages/<y>`

- ...

## Como testar

O comando que se roda **hoje** e o caminho de UAT manual. Não cole resultado de execução
passada — isso é `validation.md`, que é datado e congelado.

```
pnpm vitest run <padrão>
```

- UAT: ...

## Pendências

- [ ] ... (obrigatório se `status: parcial` ou `em-andamento`)
- [x] ... (itens resolvidos ficam marcados — viram histórico)

## Histórico

Uma linha por mudança relevante, mais recente no topo. Ajustes pequenos posteriores à entrega
entram **aqui** (não abrem doc novo). Cite plano arquivado ou decisão quando houver.

- <YYYY-MM-DD> — <o que mudou e por quê> (<plano/AD/commit>)

## Referências

- Spec/design/tasks/validação (congelados): `.specs/features/<slug>/`
- Planos de execução: `.specs/features/<slug>/plans/`

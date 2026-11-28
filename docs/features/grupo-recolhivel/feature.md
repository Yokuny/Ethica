---
feature: Grupo recolhível único e edição do lançamento na página
slug: grupo-recolhivel
descricao: Blocos recolhíveis numa moldura só com cabeçalho fino e acinzentado, e lançamento editado na própria página de detalhe
data: 2026-11-28
status: concluido
areas: [apps/web]
decisoes: [AD-312, AD-238, AD-172]
spec: [.specs/features/grupo-recolhivel]
---

# Grupo recolhível único e edição do lançamento na página

**Status**: concluido · **Atualizado**: 2026-11-28 · **Áreas**: `apps/web`

> Documento vivo. Onde divergir do plano congelado, **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='grupo-recolhivel'`.

## O que foi feito

- No detalhe do serviço, Juízo, Partes, Observações, Prazos, Vistorias, Laudos, Movimentações, Financeiro do serviço e Próximos compromissos ficam empilhados numa moldura só, cada um com cabeçalho fino e acinzentado; os vazios continuam no fim, esmaecidos, com "Não preenchido".
- "Expandir tudo · Recolher tudo" vale para todos os blocos da página, não só para os grupos de leitura.
- Partes, compromisso da agenda e prazo/alerta mostram o bloco de leitura no mesmo visual.
- No detalhe do lançamento, quem edita o financeiro altera o lançamento direto na página: formulário sob os recebimentos, Salvar no cabeçalho e no rodapé, aviso "Salvo.". Sai o diálogo de edição; o "Novo lançamento" da lista continua em diálogo.

## Por que

Pedido do usuário, trazendo o padrão do DentalEase: a tabela agrupada se lê melhor que um cartão com borda por bloco, e editar sem abrir diálogo é mais direto. A AD-312 registra as duas decisões; não volte a um cartão por bloco nem ao diálogo de edição do lançamento sem uma AD nova.

## Como

### `apps/web`

- `apps/web/src/components/panel.tsx` — `PanelGroup` (moldura, expandir/recolher tudo) e `Panel` (bloco recolhível, cabeçalho fino, `empty` desce para o fim).
- `apps/web/src/components/product-specs.tsx` — só a tabela rótulo/valor (`specs`) dentro de um `Panel`.
- `apps/web/src/routes/_private/expert-cases/details/@components/case-details-view.tsx` — grupos de leitura e, por `children`, os blocos da página no mesmo `PanelGroup`.
- `apps/web/src/routes/_private/finance/@components/transaction-fields.tsx` — campos do lançamento, usados pelo diálogo de criação (`transaction-form.tsx`) e pela edição.
- `apps/web/src/routes/_private/finance/details/@components/transaction-edit-form.tsx` — formulário de edição na página; `apps/web/src/routes/_private/finance/@hooks/use-transaction-form.ts` acompanha o lançamento salvo (`values`, `keepDirtyValues`).

## Como testar

```
pnpm --filter web exec vitest run src/components/panel src/routes/_private/expert-cases src/routes/_private/finance
```

- UAT: abrir um serviço com blocos vazios e preenchidos, usar Expandir/Recolher tudo; abrir um lançamento, mudar a descrição, salvar pelo rodapé e conferir o título e o aviso "Salvo."; registrar um recebimento e salvar de novo o formulário.

## Pendências

- [x] Conferido no navegador local (serviço, lançamento, parte) em 2026-11-28.

## Histórico

- 2026-11-28 — Grupo recolhível único e edição do lançamento na página (AD-312, `.specs/features/grupo-recolhivel/plans/2026-11-28-grupo-recolhivel-edicao-lancamento.md`).

## Referências

- Planos de execução: `.specs/features/grupo-recolhivel/plans/`

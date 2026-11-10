---
feature: Preencher com vários PDFs
slug: preencher-pdfs
descricao: Cadastro do serviço preenchido por vários PDFs numa janela em etapas, com a escolha do valor de cada campo
data: 2026-11-04
status: concluido
areas: [apps/api, apps/web, packages/contracts]
decisoes: [AD-183]
spec: [.specs/features/preencher-pdfs]
branches: [main]
---

# Preencher com vários PDFs

**Status**: concluido · **Atualizado**: 2026-11-04 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), o código é a fonte da
> verdade. Correlação com o git: `git log --oneline -i --grep='preencher-pdfs'`.

## O que foi feito

- Em `/expert-cases/add`, "Preencher com PDF" abre uma janela com a barra de etapas no topo: **Arquivos** → **Escolher valores** → **Preencher**.
- **Arquivos**: área tracejada para soltar ou escolher vários PDFs (visual do bloco `file-upload-06` do blocks.so); cada arquivo mostra lendo/concluído/erro, os avisos dele (vários números, serviço já cadastrado com link) e pode ser removido.
- **Escolher valores**: número, tribunal, vara, comarca, objeto e nomeação com os valores diferentes achados e o arquivo de origem (começa pelo primeiro arquivo que trouxe o campo; dá para "Não preencher"); partes de todos os arquivos, sem repetição, marcáveis uma a uma; lista do que nenhum arquivo trouxe.
- **Preencher**: resumo e o botão que passa os valores ao formulário, sem apagar o que já foi digitado nos outros campos. Nada é gravado até salvar (AD-115).
- O ZIP saiu (AD-183 supersede AD-173): processo em partes = enviar as partes como vários PDFs.

## Por que

Pedido da perita (2026-11-04): vários documentos do mesmo processo trazem valores diferentes para o mesmo campo, e ela quer escolher qual entra.

## Como

- `apps/web/src/routes/_private/expert-cases/add/@hooks/use-pdf-fill.ts` — arquivos, leitura em fila (um por vez, pela rota de sempre `POST /expert-cases/import/pdf`), etapa, escolhas e `fill()`.
- `apps/web/src/routes/_private/expert-cases/add/@utils/pdf-choices.ts` — opções por campo, partes sem repetição (`partyNameKey`), rascunho final (o tribunal leva a justiça do mesmo arquivo).
- `apps/web/src/routes/_private/expert-cases/add/@components/pdf-fill-dialog.tsx`, `pdf-files-step.tsx`, `pdf-values-step.tsx` — a janela e as etapas.
- `apps/api/src/modules/case/import.service.ts` (`extractPdfText` só PDF) e `case.router.ts` (só `application/pdf`); `zip_without_pdf` saiu de `packages/contracts/src/response/messages.ts`.

## Como testar

```
pnpm vitest run apps/web/src/routes/_private/expert-cases/add apps/api/src/modules/case/import.router.e2e.test.ts
```

- UAT: `/expert-cases/add` → "Preencher com PDF" → soltar duas atas do mesmo processo → Próximo → trocar o tribunal e desmarcar uma parte → Próximo → Preencher → conferir o formulário.

## Pendências

- [ ] Conferência visual da janela no navegador.

## Histórico

- 2026-11-10 — Escolher valores sem rolagem lateral: o valor longo (com o nome do arquivo) é cortado com reticências dentro do seletor, e os botões ficam à vista.
- 2026-11-04 — Criada (AD-183); substitui o "Preencher com PDF ou ZIP" de `importacao-processos`.

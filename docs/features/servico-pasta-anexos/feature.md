---
feature: Link da pasta e anexos do serviço
slug: servico-pasta-anexos
descricao: Link da pasta na nuvem e arquivos anexados no cadastro e no detalhe do serviço
data: 2026-11-05
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-197]
spec: [.specs/features/servico-pasta-anexos]
branches: [main]
---

# Link da pasta e anexos do serviço

**Status**: concluido · **Atualizado**: 2026-11-05 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='servico-pasta-anexos'`.

## O que foi feito

- **Link da pasta** (OneDrive, Google Drive, Dropbox ou outro) no primeiro bloco do cadastro, em todos os tipos de serviço; no detalhe, "Abrir pasta" abre em outra aba.
- **Anexos** logo abaixo das Observações, no cadastro novo e na edição: vários arquivos por serviço, com limite e tipos em `CASE_ATTACHMENT_LIMIT`. Os escolhidos sobem ao salvar; os já salvos podem ser removidos na edição. No detalhe, cada anexo baixa com um clique.
- O anexo conta na cota de arquivos do escritório e devolve o espaço ao ser removido ou ao excluir o serviço.

## Por que

Pedido da perita (2026-11-05); ela escolheu vários arquivos por serviço e deixou o lugar do link à escolha mais coerente. Decisões técnicas em AD-197.

## Como

- `packages/contracts/src/schemas/case.schema.ts` — `folderUrl`, `CASE_ATTACHMENT_LIMIT`.
- `packages/db/src/models/case.model.ts` — `Case.folderUrl`, `Case.attachments`.
- `apps/api/src/modules/case/case.{router,controller,service,repository,schema}.ts` — rotas `/expert-cases/:id/attachments`.
- `apps/web/src/routes/_private/expert-cases/@components/case-attachments-field.tsx`, `@hooks/use-case-attachments.ts`, `details/@components/case-details-view.tsx`; `apps/web/src/query/case.ts`.

## Como testar

```
pnpm vitest run apps/api/src/modules/case/case-attachment.router.e2e.test.ts
```

- UAT: Serviços → Novo serviço → colar o link → anexar um PDF → salvar; no detalhe, Expandir tudo e conferir o link e o anexo.

## Pendências

- [ ] Envio real de arquivo pela tela: o `.env` local não tem `S3_BUCKET`, então foi conferido só com armazenamento simulado nos testes e com o aviso de falha na tela.

## Histórico

- 2026-11-05 — Link da pasta e anexos entregues (AD-197).

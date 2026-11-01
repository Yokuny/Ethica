---
feature: Importação de processos
slug: importacao-processos
descricao: Cadastro de perícia a partir do PDF da ata, importação em lote por CSV, partes e advogados reutilizáveis e dados trabalhistas
data: 2026-10-31
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-103, AD-107, AD-113, AD-114, AD-115, AD-116, AD-117, AD-118]
spec: [.specs/features/importacao-processos]
branches: [feat/importacao-processos]
---

# Importação de processos

**Status**: concluido · **Atualizado**: 2026-10-31 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), o código é a fonte da
> verdade. Correlação com o git: `git log --oneline -i --grep='importacao-processos'`.

## O que foi feito

- **Preencher com PDF** no cadastro de perícia: o perito envia a ata ou o despacho e recebe o formulário preenchido (número, tribunal, vara, comarca, objeto, partes, advogados, nomeação e prazo do laudo), com a lista do que não foi achado e avisos (prazo calculado, vários números, número inválido, perícia já cadastrada). Nada é gravado até o perito salvar.
- **Importar planilha** (`/pericias/import`): modelo CSV para baixar, envio do arquivo e relatório com criadas, ignoradas (já cadastradas) e recusadas, com o motivo por linha.
- **Partes** (`/partes`): cadastro reutilizável de partes (CPF/CNPJ) e advogados (OAB), com busca, abas por tipo, edição e as perícias de cada um. No formulário da perícia, cada polo tem quantas partes e advogados forem precisos, com sugestão dos cadastros existentes.
- **Dados do laudo trabalhista** na perícia trabalhista: autuação, admissão, demissão, período imprescrito (sugerido pelas datas), função do reclamante e endereço do local periciado.

## Por que

Cadastrar perícia exigia redigitar a ata, e quem tem dezenas de processos não migrava. A extração é por **regras sobre o texto do PDF** (AD-114), sem IA e sem OCR, por custo e LGPD; a IA externa colada foi vetada pelo usuário. O PDF só preenche o formulário: extração nunca é 100% (AD-115).

Partes deixaram de ser texto livre (`autor`/`reu` foram removidos) e viraram o cadastro `Parte`, com o nome **copiado** na perícia para a busca da listagem e o resumo do feed/aviso (AD-117). Quem mexer nisso precisa manter a cópia em dia: renomear a parte atualiza as perícias. Reaproveitamento: parte por CPF/CNPJ, advogado por OAB e, sem documento, pelo nome exato (AD-115). Na importação, justiça e tribunal saem do número CNJ, e o arquivo vai no corpo da requisição, sem multipart e sem armazenamento (AD-118).

## Como

### `apps/api`

- `apps/api/src/modules/pericia/parte.{router,controller,service,repository,schema}.ts` — `/partes` (lista com busca Atlas Search, criar, detalhe, editar, `GET /:id/pericias`), todas para qualquer papel do tenant (AD-107). `parte.service.resolvePartes` é a regra de reaproveitamento; `updateParte` propaga o nome.
- `apps/api/src/modules/pericia/importacao.service.ts` — `extrairAta` (regras sobre o texto), `extrairPdf` (`unpdf`), `parseCsv`, `linhaParaPericia` e `importarCsv`; `orgaoDoNumero` (número CNJ → justiça/tribunal). Rotas `POST /pericias/import/pdf` e `/csv` em `pericia.router.ts`.
- `apps/api/src/middlewares/fileBody.middleware.ts` — arquivo como corpo com o próprio `Content-Type` e limite; 415 `unsupported_file_type` e 413 `file_too_large`.
- `apps/api/src/modules/pericia/pericia.service.ts` — `createPericia` é o caminho único (formulário, PDF, CSV, oportunidade): resolve as partes e grava o período imprescrito sugerido quando vem vazio. `pericia.repository.ts` traz `renomearParte`, `listByParte`, `findIdByNumero` e o `findResumosByIds` com autor/réu derivados das partes.
- `apps/api/scripts/seed-demo.ts` — partes, advogados e dados trabalhistas de demonstração. Sem migração (AD-117).

### `apps/web`

- `apps/web/src/routes/_private/pericias/add/` — ação "Preencher com PDF" (`@hooks/use-pdf-import.ts`) e o aviso do que faltou (`@components/pdf-import-notice.tsx`).
- `apps/web/src/routes/_private/pericias/import/` — página de importação por CSV; o modelo é gerado em `@utils/csv-template.ts` a partir de `CSV_IMPORT_COLUMNS`.
- `apps/web/src/routes/_private/pericias/@components/pericia-partes-fields.tsx` e `pericia-trabalhista-fields.tsx` — partes por polo (com sugestão do cadastro) e o grupo trabalhista, usados no cadastro e na edição.
- `apps/web/src/routes/_private/pericias/@query/importacao.ts` — mutations de PDF e CSV (`sendFile` em `apps/web/src/lib/api/client.api.ts`, antes `postFile`).
- `apps/web/src/routes/_private/partes/` — listagem, `FormDialog` de criar/editar e `details/` com as perícias da parte; `apps/web/src/query/parte.ts` e `apps/web/src/components/parte-labels.ts`. Entrada no grupo "Trabalho" da navegação (`apps/web/src/routes/_private/@consts/home-sections.ts`).

### `packages/contracts`

- `packages/contracts/src/schemas/parte.schema.ts` — tipos de parte, polos, CPF/CNPJ e OAB normalizados, entrada da parte na perícia.
- `packages/contracts/src/schemas/pericia.schema.ts` — `partes`, campos trabalhistas e `sugerirPeriodoImprescrito`.
- `packages/contracts/src/schemas/importacao.schema.ts` — colunas do CSV, exemplo e limites (tamanho e linhas).
- `packages/contracts/src/response/messages.ts` — chaves de erro e aviso da importação.

### `packages/db`

- `packages/db/src/models/parte.model.ts` e `pericia.model.ts` (`partes` com a cópia do nome, campos trabalhistas).
- `packages/db/src/textSearch.ts` — `partes.nome` no índice da perícia e índice novo `parte_text`. Banco novo precisa de `pnpm --filter api run search:provision`.

## Como testar

```
pnpm vitest run apps/api/src/modules/pericia packages/contracts packages/db/src/textSearch apps/web/src/routes/_private/pericias
```

- UAT: entrar como qualquer papel (`ACC.md`), `/pericias/add` → "Preencher com PDF" com uma ata do PJe com texto; `/pericias` → "Importar planilha" → baixar o modelo, preencher e enviar; `/partes` → abrir uma parte, editar o nome e conferir na perícia.
- Docker: dependência nova na API (`unpdf`) exige `docker compose up --build -d --renew-anon-volumes api`.

## Pendências

- [ ] PDF escaneado (sem texto) não é lido: OCR ou IA no servidor ficam para depois (AD-114).
- [ ] Excluir e mesclar partes (duplicadas por nome sem documento, AD-115).
- [ ] CSV aceita uma parte e um advogado por polo; o resto se ajusta na tela.
- [ ] Os padrões da ata foram escritos sobre o cabeçalho do PJe; validar com atas reais de outros tribunais e ajustar `extrairAta`.

## Histórico

- 2026-10-31 — Implementado IMP-01 a IMP-04 (AD-114 a AD-118); validação em `.specs/features/importacao-processos/validation.md`. Divergências do design: a chave da data de autuação no web é `lawsuit_filing_date` (`filing_date` já era "Data do protocolo"), e a linha de parte no formulário ficou em duas colunas depois da UAT.
- 2026-10-31 — Spec criada (`.specs/features/importacao-processos/spec.md`).

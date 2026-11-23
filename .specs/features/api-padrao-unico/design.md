# Design — API num padrão único

Requisitos em `.specs/features/api-padrao-unico/spec.md`; decisão AD-284.

## Controller (APU-01)

```ts
// modules/case/case.controller.ts
export const getCase = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await caseService.getCase(tenantOf(req), req.params.id as string) }));
};

export const deleteCase = (storage: FileStorage | undefined) => async (req: Request, res: Response): Promise<void> => {
  await caseService.deleteCase(tenantOf(req), req.params.id as string, storage);
  res.json(respObj({ message: 'removed_successfully' }));
};
```

O Express 5 (5.2.1) encaminha a rejeição de handler `async` ao `errorHandler` com o `status` do erro — verificado num script mínimo antes da decisão. `next` só aparece em middleware. `tenantOf` continua local de cada controller (uma linha). Os wrappers `json`/`removed` de `report.controller` e `inspection.controller` e as fábricas `createPlatformController`/`createTenantInviteController` saem.

Exceção única: `InspectionConflictError` (AD-128) carrega a versão do servidor e o handler de salvar vistoria devolve 409 com ela; é o único `try/catch` em controller e a única classe de erro de módulo, as duas nominalmente liberadas no teste.

## Erro (APU-02)

```ts
// modules/case/case.service.ts
const found = await caseRepository.findById(tenantId, id);
if (!found) throw new CustomError('case_not_found', 404);
```

As 10 classes (`Case/Party/CourtDivision/Appointment/Transaction/Report/Template/Signatory/Notification NotFoundError`, mais as importações delas) e os 6 `notFoundAs404` somem. Nenhum código fora de controller faz `instanceof` nelas. Testes que esperam a classe passam a esperar `{ message, status: 404 }`.

## Router (APU-03) e convite (APU-04)

`inviteRouter` vira `createInviteRouter()`. `tenantInvite.{router,controller}` entram em `invite.{router,controller}`; `inviteTeamMember` (e o que só ela usa) sai de `platform.service` para `invite.service`. O prefixo continua `/tenant` no `app.ts` — dois `app.use` do mesmo router de entidade com prefixos diferentes, como já acontece em `/me`.

## Camadas (APU-05, APU-06)

- `identity/auth.deps.ts` passa a chamar `auth.repository` (as quatro leituras de `Session`/`User`/`Tenant` vão para lá).
- `avatarPath` (o caminho da foto, uma linha pura) sai de `auth.repository` para o arquivo de apoio `identity/user.avatar.ts`, importado por `auth.repository` e `account.repository`. `report.repository` → `report.html.ts` já é import de arquivo de apoio puro.
- Regra final de import do repository: `@ethica/db`, schema do módulo e arquivo de apoio do módulo — nunca outro repository, service ou controller.

## pdf-text (APU-07)

`extractPdfText` sai de `case/import.service.ts` para `providers/pdf-text.ts` (função direta, sem injeção: é pura, sem configuração nem credencial). `case` e `documents` importam dali.

## Nomes (APU-08)

`git mv` por pasta para kebab-case: `activityLog.*` → `activity-log.*`, `auth.deps.ts` já está; `errorHandler.middleware.ts` → `error-handler.middleware.ts` etc.; `providers/asaasClient.ts` → `asaas-client.ts`, `fileStorage.ts` → `file-storage.ts`, `pdfRenderer.ts` → `pdf-renderer.ts`; `metrics/*.metric.ts` já está. Cada `vi.mock` relativo é recalculado.

## Teste estrutural (APU-09)

Novas regras em `tests/structural/module-boundary.structural.test.ts`, com self-check por fixture:

- (f) `*.controller.ts` não contém `try {` (exceto `inspection.controller.ts`) e não importa repository nem `@ethica/db` por valor;
- (g) nenhum arquivo de módulo declara `class \w+ extends (KeyedError|CustomError|Error)` (exceto `InspectionConflictError`);
- (h) model do `@ethica/db` (nomes da `DB_OWNERSHIP`) só é importado por valor em `*.repository.ts`;
- (i) arquivo de módulo termina em `.router/.controller/.service/.repository/.schema.ts` ou é de apoio `<entidade>.<papel>.ts`; arquivo de apoio só é importado do mesmo módulo;
- (j) todo arquivo de `apps/api/src` é kebab-case.

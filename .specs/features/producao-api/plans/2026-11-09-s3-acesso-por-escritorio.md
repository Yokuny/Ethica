# Plano — S3 de produção com acesso por escritório (AD-202)

**Feature**: `producao-api` · **Data**: 2026-11-09 · **Tamanho**: ajuste pequeno (uma área, `apps/api/src/providers/`)

## Situação

- Infra pronta na AWS (`infra/aws/file-storage.yml`, stack `ethica-files`, us-east-2): bucket `ethica-files-677296948879`, usuário `ethica-files-api` sem acesso direto ao bucket, papel `ethica-files-tenant` que só alcança `tenants/<tenantId da etiqueta>/`.
- Railway (2026-11-09) já tem `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ROLE_ARN`. Falta `S3_BUCKET`, que liga o envio.
- Toda chave gravada pela API já começa com `tenants/${tenantId}/` (`case.service.ts`, `inspection.service.ts`, `report.service.ts`, `signatory.service.ts`, `office.service.ts`).
- O provider (`apps/api/src/providers/fileStorage.ts`) usa a chave direto no S3; em produção a AWS recusaria (o usuário não tem acesso ao bucket).

## Decisões

- O escritório sai da **própria chave** (`tenants/<tenantId>/…`): a interface `FileStorage` (`put`, `get`, `remove`) e quem a chama não mudam. Chave fora desse formato é recusada no provider, antes de ir à rede.
- Com `S3_ROLE_ARN`, o provider mantém um `S3Client` por escritório com `fromTemporaryCredentials` (`@aws-sdk/credential-providers`, mesma versão do `client-s3`), etiqueta `tenantId` e `RoleSessionName` `tenant-<tenantId>`; o SDK renova a credencial sozinho antes de vencer (1 hora).
- Sem `S3_ROLE_ARN` (dev e testes com RustFS, que não tem STS), segue o cliente único de hoje.
- Nada de helper ou camada nova: a mudança fica dentro de `createS3FileStorage`.

## Passos

1. `apps/api/package.json`: `@aws-sdk/credential-providers@3.1152.0`.
2. `apps/api/src/config/env.config.ts`: `S3_ROLE_ARN` opcional. `apps/api/src/app.ts`: repassa `roleArn`.
3. `apps/api/src/providers/fileStorage.ts`: tenant pela chave, cliente por escritório quando houver `roleArn`.
4. `apps/api/src/providers/fileStorage.unit.test.ts`: chave sem `tenants/<id>/` é recusada; com `roleArn`, a credencial pedida leva a etiqueta do escritório da chave.
5. `.env.example` (`S3_ROLE_ARN` vazio, comentado) e `RUN_BOOK.md` (como ligar o S3 de produção e criar/rodar a chave).
6. Gate (`pnpm run check`), registro (`feature.md`, arquivar este plano), commit e push na `main` → Railway publica.
7. Railway: `S3_BUCKET=ethica-files-677296948879` e aplicar. Trocar a chave de `ethica-files-api` (a atual apareceu em conversas): chave nova num arquivo local, nunca no chat; apagar a antiga depois do deploy.
8. Conferência em produção: enviar e baixar o logo e um anexo; `aws iam get-access-key-last-used` mostra uso da chave; `aws s3 ls s3://ethica-files-677296948879/tenants/ --profile yokuny` mostra a pasta do escritório.

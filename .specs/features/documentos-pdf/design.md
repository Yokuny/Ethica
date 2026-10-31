# Base de documentos — Design

**Spec**: `.specs/features/documentos-pdf/spec.md` · **Decisões**: AD-119 (Chromium), AD-120 (S3 e cota), AD-121 (defaults e movimentações), AD-122 (escopo e exportação). Seguem AD-103 (datas `YYYY-MM-DD`), AD-107 (financeiro), AD-113 (valores em inglês), AD-118 (arquivo no corpo).

## Visão geral

```
apps/web ──GET /documentos/*──▶ modules/documentos ──▶ services: pericia · agenda · financeiro · prospeccao · identity
                                       │ HTML (funções TS)
                                       ▼
                              providers/pdf (Chromium) ──▶ application/pdf
apps/web ──POST /tenant/office/logo──▶ modules/identity ──▶ providers/storage (S3) + Tenant.storageBytes (cota)
```

`documentos` é um módulo novo sem model: só lê os services dos outros módulos (grafo sem ciclo; ninguém depende dele). Providers `pdf` e `storage` são criados em `buildApp` e chegam aos controllers pelo `deps` do router, como o `datajud`.

## Modelo de dados (sem migração, seed refeito)

| Onde | Campo | Observação |
| --- | --- | --- |
| `Tenant` | `cabecalho?`, `rodape?` | texto com marcadores (AD-121) |
| `Tenant` | `logo?: { key, bytes, updatedAt }` | objeto no S3 (AD-120) |
| `Tenant` | `storageBytes` (default 0) | cota de 1 GB reservada no mesmo update |
| `Tenant` | `dataExports: [{ User, at }]` | 20 últimas (AD-122) |
| `User` | `cpf?`, `registroProfissional?`, `formacao?` | dados profissionais (DOC-01) |
| `Pericia` | `movimentacoes: [{ _id, tipo, data, observacoes? }]` | AD-121 |

## Contratos (`packages/contracts`)

- `account.schema.ts`: `updateProfileSchema` ganha `cpf` (11 dígitos, aceita máscara, `''` limpa), `registroProfissional`, `formacao`.
- `documento.schema.ts` (novo): `updateOfficeSchema` (`cabecalho`, `rodape` até 1000), `DOCUMENT_MARKERS`, `TENANT_LOGO_MAX_BYTES`, `TENANT_STORAGE_QUOTA_BYTES`, `PERICIA_PARADA_DIAS = 60`, `financeiroReportQuerySchema` (`from`/`to`, `from ≤ to`).
- `pericia.schema.ts`: `MOVIMENTACAO_TIPOS`, `createMovimentacaoSchema`.

## API

| Rota | Papel | Resposta |
| --- | --- | --- |
| `GET /me/profile` · `PATCH /me/profile` | qualquer | `AccountView` com dados profissionais |
| `GET /tenant/office` · `PUT /tenant/office` | admin | cabeçalho, rodapé, logo (caminho versionado), uso/cota, últimas exportações |
| `POST /tenant/office/logo` (`image/png`, 512 KB) · `DELETE` | admin | 503 `storage_not_configured`, 413 `file_too_large`, 422 `storage_quota_exceeded` |
| `GET /tenant/office/logo` | admin | bytes do PNG |
| `POST /pericias/:id/movimentacoes` · `DELETE /pericias/:id/movimentacoes/:movimentacaoId` | qualquer | `PericiaRecord` |
| `GET /documentos/pericias/:id/ficha` · `/checklist` | qualquer | PDF; ficha com resumo financeiro só para admin/manager |
| `GET /documentos/prazos` · `/paradas` | qualquer | PDF |
| `GET /documentos/financeiro?from&to` | admin/manager | PDF |
| `GET /documentos/export` | admin | ZIP; grava `dataExports` |

Funções novas nos services donos (consulta em lote, sem loop por item): `periciaService.listParadas`, `periciaService.listForExport`, `parteService.listForExport`, `prazoService.listForExport`, `compromissoService.listDaPericia` / `listForExport`, `lancamentoService.relatorioPeriodo` / `resumoDaPericia` / `listForExport`, `oportunidadeService.listForExport`, `authService.listUsersForExport`, `officeService.getDocumentIdentity` / `registrarExportacao`, `accountService.getProfile`.

### Documento

`documentos/documento.layout.ts` monta o HTML base (CSS de impressão, A4) e os templates de cabeçalho/rodapé: o texto do tenant é escapado, cada linha vira `<div>` e os marcadores são trocados — `[LOGO]` pelo `<img>` em data URL (ou nada), `[NOME_PERITO]` pelo nome de quem gera, `[PAGINA_ATUAL]`/`[TOTAL_PAGINAS]` pelas classes `pageNumber`/`totalPages` do Chromium. Sem texto configurado, o cabeçalho é o nome do escritório e o rodapé é "Página X de Y". Um arquivo por documento (`ficha`, `checklist`, `prazos`, `financeiro`, `paradas`) com função pura `(dados) => html`, testada sem navegador. Textos do PDF em pt-BR no servidor, como o e-mail e o iCal (exceção da AD-113); rótulos de domínio por um mapa local do módulo.

### Exportação

`documentos/exportacao.service.ts`: um CSV por entidade (`pericias`, `partes`, `prazos`, `compromissos`, `lancamentos`, `usuarios`, `oportunidades`), `;`, BOM, aspas quando preciso, `zipSync` do `fflate`. `lancamentos` só entra para admin (a rota já é admin).

## Web

| Tela | Mudança |
| --- | --- |
| `/account` | bloco "Dados profissionais" (CPF, registro, formação) no formulário de perfil, lido de `GET /me/profile` |
| `/_admin/office` (novo, card admin na navegação) | logo (envio/remoção), cabeçalho e rodapé com a lista de marcadores, uso do armazenamento, exportar dados + últimas exportações |
| `/pericias/details` | `PageMenu` com "Ficha (PDF)" e "Checklist de campo (PDF)"; painel "Movimentações" (lista + `FormDialog`) |
| `/relatorios` (novo, card para todos) | cronograma de prazos, perícias paradas e, para admin/manager, relatório financeiro com período |

Download: `getFile(path)` em `apps/web/src/lib/api/client.api.ts` devolve o `Blob` ou a mensagem traduzida; `downloadBlob` dispara o arquivo. Logo reduzido em `@utils/resize-logo.ts` (canvas → PNG até 600 px).

## Infra

- `Dockerfile.dev`: `chromium` e `fonts-liberation`; `CHROMIUM_PATH=/usr/bin/chromium`.
- `docker-compose.yml`: `s3` (RustFS, portas 19000/19001; as imagens públicas do MinIO saíram do Docker Hub) e `s3-init` (cria o bucket com o `aws-cli`); `.env.example` com `S3_*`.
- Sem `S3_BUCKET`, a API sobe e só o logo fica indisponível.

## Testes

- Unit: layout (marcadores, escape, logo ausente), cada documento (seções vazias, operador sem valores), CSV/ZIP, `listParadas` pela regra de 60 dias (service com repository mockado).
- E2E (renderizador e storage falsos): permissões (operador 403 no financeiro e export; ficha de operador sem "Resumo financeiro"), logo com cota, movimentações, export registra quem/quando.

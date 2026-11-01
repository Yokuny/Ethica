# Imagem de produção da API e arquivos por perícia — Specification

**Origem**: pendências de `docs/features/documentos-pdf/feature.md` e `docs/features/campo-vistorias/feature.md` ("Imagem de produção da API, hoje só existe `Dockerfile.dev`, precisa do Chromium e das variáveis `S3_*`") e pedido do usuário em 2026-11-01 ("iremos usar um bucket S3, porém por enquanto apenas estruture para futuramente só mudarmos a conexão e o acesso ao S3; as pastas devem ser separadas por tenant e agrupadas por perícia e usadas dentro dos laudos"). Prefixo de requisito: `PRD`.

## Problem Statement

A API só tem a imagem de desenvolvimento (`Dockerfile.dev`), que roda com `tsx` e dependências de desenvolvimento. Não há imagem enxuta para produção com o Chromium dos PDFs (AD-119). O storage já é S3 compatível (AD-120: RustFS no docker local), mas as pastas são por tipo de arquivo (`tenants/<tenantId>/inspections/<appointmentId>/<mediaId>`, `tenants/<tenantId>/logo/...`), não por perícia: não dá para ver, contar ou apagar os arquivos de uma perícia de uma vez, e cada arquivo novo do laudo inventaria o próprio caminho.

## Goals

- [ ] Existe uma imagem de produção da API, com o Chromium, que sobe só com variáveis de ambiente.
- [ ] Trocar o storage local pelo bucket S3 da produção é **só** configurar `S3_*`, sem mudar código.
- [ ] Os arquivos ficam em pastas por escritório e por perícia, e o laudo usa os arquivos da pasta da perícia.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Criar o bucket, a conta AWS e as credenciais de produção | Será feito quando o S3 for contratado; esta spec deixa só a conexão por configurar. |
| Escolher onde a API roda (VPS, ECS, Fly, Render…) e o pipeline de deploy | Decisão de infraestrutura separada; a imagem roda em qualquer um. |
| Imagem de produção do `apps/web` | O web é estático (`vite build`); servir por CDN ou pelo próprio host é decisão do deploy. |
| Migrar arquivos já gravados | Sistema em desenvolvimento, seed refeito (mesma regra da AD-141). |
| URL pública ou assinada para os arquivos | Continua tudo servido pela API (AD-120). |

---

## Já existe (não refazer)

| Item | O que já há | Lacuna |
| --- | --- | --- |
| Storage | `apps/api/src/providers/fileStorage.ts` (`put`, `get`, `remove` com `@aws-sdk/client-s3`; `S3_ENDPOINT` opcional para RustFS/R2; sem endpoint = AWS S3) | Remover por prefixo (pasta da perícia). |
| Configuração | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` em `apps/api/src/config/env.config.ts`; sem bucket o envio responde `storage_not_configured` | Documentar a troca para S3 no `RUN_BOOK.md`. |
| Chaves | Logo em `tenants/<tenantId>/logo/<ts>.png` (`apps/api/src/modules/identity/office.service.ts`); mídias em `tenants/<tenantId>/inspections/<appointmentId>/<mediaId>` (`apps/api/src/modules/agenda/inspection.service.ts`, AD-129) | Agrupar por perícia. |
| Foto no laudo | `src` pela rota da API (`/inspections/<appointmentId>/media/<mediaId>`), não pela chave (AD-129) | — |
| Imagem | `Dockerfile.dev` na raiz (Chromium, `CHROMIUM_PATH`) | Imagem de produção. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Organização das pastas | `tenants/<tenantId>/office/…` para o que é do escritório (logo) e `tenants/<tenantId>/cases/<caseId>/…` para o que é da perícia, com subpastas por tipo: `inspections/<appointmentId>/<mediaId>` (fotos, áudios, assinaturas) e `reports/<reportId>/…` (arquivos do laudo) (AD-146) | Pedido do usuário; nomes em inglês como todo nome de código (AD-139) | No |
| Chave gravada | Quem grava monta a chave por uma função única por tipo de arquivo (no módulo dono) e grava a chave completa no registro, como hoje | O registro continua sabendo onde está o arquivo; mudar a organização no futuro só muda arquivos novos | No |
| Excluir a perícia | Apaga a pasta `cases/<caseId>/` inteira no storage e devolve a cota, pelo evento `case:deleted` (AD-039) | Hoje cada módulo apaga os seus arquivos um a um | No |
| Arquivos do laudo | `reports/<reportId>/` fica reservado: PDF e Word continuam gerados na hora e não gravados; se um dia o laudo entregue for guardado, vai para essa pasta | Gravar o PDF ocuparia a cota sem pedido | No |
| Troca para S3 | AWS S3 = tirar `S3_ENDPOINT` e preencher região, bucket e chaves; R2 = `S3_ENDPOINT` da Cloudflare. Documentado no `RUN_BOOK.md` com o mínimo de permissões IAM (`GetObject`, `PutObject`, `DeleteObject`, `ListBucket` no bucket) | Já funciona assim; falta o passo a passo | No |
| Imagem de produção | `Dockerfile` multi-stage na raiz: build do monorepo com pnpm, `tsc` da API, estágio final com Node 24, Chromium, só dependências de produção, usuário sem root, `CHROMIUM_PATH` definido | Imagem menor e sem ferramentas de desenvolvimento | No |
| Variáveis obrigatórias em produção | A API recusa subir em produção sem `MONGODB_URI`, segredo de sessão e `CORS_ORIGIN`; `S3_*`, SMTP, Datajud e chaves de push seguem opcionais com o recurso desligado | Mesmo padrão atual de recurso opcional | No |

---

## User Stories

### P1: Arquivos por escritório e perícia ⭐ MVP — PRD-01

**User Story**: Como perita, quero que os arquivos de cada perícia fiquem juntos, para que o laudo use as fotos certas e excluir a perícia não deixe arquivo perdido ocupando espaço.

**Acceptance Criteria**:

1. WHEN uma mídia de vistoria é enviada THEN the system SHALL gravá-la em `tenants/<tenantId>/cases/<caseId>/inspections/<appointmentId>/<mediaId>`.
2. WHEN o logo é enviado THEN the system SHALL gravá-lo em `tenants/<tenantId>/office/`.
3. WHEN a perícia é excluída THEN the system SHALL apagar a pasta da perícia no storage e devolver os bytes à cota do escritório.
4. WHEN o laudo usa uma foto THEN the system SHALL continuar lendo pela rota da API, só do próprio tenant (AD-129).
5. WHEN um arquivo de outro tenant é pedido THEN the system SHALL responder como não encontrado.

**Independent Test**: enviar foto numa vistoria do seed, conferir a chave no console do RustFS (`http://localhost:19001`); excluir a perícia e ver a pasta sumir e a cota voltar.

### P1: Imagem de produção da API — PRD-02

**User Story**: Como responsável pelo deploy, quero uma imagem da API pronta para produção, para subir o Ethica só configurando o ambiente.

**Acceptance Criteria**:

1. WHEN a imagem é construída THEN the system SHALL conter só o código compilado, as dependências de produção e o Chromium.
2. WHEN a imagem sobe com as variáveis de produção THEN the system SHALL responder no health check e gerar um PDF com o Chromium da imagem.
3. WHEN falta variável obrigatória THEN the system SHALL falhar ao subir com a lista do que falta no log.
4. WHEN `S3_*` aponta para um bucket S3 real THEN the system SHALL gravar e ler arquivos sem mudança de código.

**Independent Test**: `docker build -f Dockerfile .` e `docker run` apontando para o Mongo e o RustFS do compose; gerar o PDF do checklist e enviar uma foto.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PRD-01 | P1: Arquivos por escritório e perícia | Specify | Pending |
| PRD-02 | P1: Imagem de produção da API | Specify | Pending |

## Success Criteria

- [ ] Trocar para o bucket S3 de produção é editar variáveis de ambiente, conforme o `RUN_BOOK.md`.
- [ ] Nenhum arquivo fica no storage depois de excluir a perícia dona dele.

## Pontos de atenção para o design

- A mídia da vistoria hoje é chaveada pelo compromisso; o compromisso tem `caseId`, então a chave nova se monta sem dado extra. Compromisso sem perícia (reunião, outro) não tem mídia de vistoria.
- Apagar a pasta da perícia precisa de `ListObjectsV2` + `DeleteObjects` no provider; o teste unitário roda sem rede (provider falso), como o de `geocoder.ts`.
- `docs/architecture.md` e `RUN_BOOK.md` ganham a seção de produção.

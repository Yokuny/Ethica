---
feature: Imagem de produção da API e arquivos por perícia
slug: producao-api
descricao: API na Railway (Dockerfile com Chromium) e web na Vercel com deploy pela main; falta o storage S3 em pastas por escritório e perícia
data: 2026-11-09
status: parcial
areas: [apps/api, infra]
decisoes: [AD-119, AD-120, AD-129, AD-146, AD-153, AD-202]
spec: [.specs/features/producao-api]
---

# Imagem de produção da API e arquivos por perícia

**Status**: parcial · **Atualizado**: 2026-11-09 · **Áreas**: `apps/api`,`` `infra`

> Documento vivo. Hospedagem feita (PRD-02, AD-153); pastas por perícia (PRD-01) ainda planejado em
> `.specs/features/producao-api/spec.md` (perguntas em aberto a confirmar com a perita antes do design).
> Correlação com o git: `git log --oneline -i --grep='producao-api'`.

## O que foi feito

- Imagem de produção da API em `Dockerfile` (Node 24, Chromium, só a API e os pacotes de que ela depende, usuário sem root), publicada na Railway por `railway.json` com health check em `/health`.
- Web na Vercel por `vercel.json`: volta para `index.html` em qualquer rota e repassa `/api/*` para a API da Railway (cookie de sessão do mesmo site, AD-153).
- Bucket S3 de produção em us-east-2, com acesso separado por escritório garantido pela AWS (AD-202): `infra/aws/file-storage.yml`, publicado como stack `ethica-files`. Com `S3_ROLE_ARN`, `apps/api/src/providers/fileStorage.ts` tira o escritório da chave (`tenants/<tenantId>/…`) e usa uma sessão do papel por escritório; chave fora desse formato é recusada. Passo a passo em `RUN_BOOK.md` ("Arquivos em produção").

## Por que

Só existe a imagem de desenvolvimento, e as pastas do storage são por tipo de arquivo, não por perícia. A AD-146 organiza as chaves em tenants/<tenantId>/cases/<caseId>/… e a troca para o S3 de produção fica só nas variáveis S3_*.

## Como

- `Dockerfile` instala com `pnpm install --filter api... --filter ethica` e sobe `tsx src/server.ts`; variável obrigatória ausente derruba a subida com a lista no log (`apps/api/src/config/env.config.ts`).
- `VITE_API_URL=/api` na Vercel; `CORS_ORIGIN` na Railway é o endereço da Vercel (também usado nos links dos e-mails).
- Pastas por perícia: a definir no `design.md`.

## Como testar

- Imagem: `docker build -t ethica-api-prod .` e `docker run` com `PORT`, `MONGODB_URI`, `SESSION_JWT_SECRET` e `CORS_ORIGIN`; `/health`, login do seed e PDF de um laudo.
- Pastas por perícia: a definir no `tasks.md`.
- Infra do bucket: `aws cloudformation deploy --stack-name ethica-files --template-file infra/aws/file-storage.yml --capabilities CAPABILITY_NAMED_IAM --region us-east-2 --profile <perfil>`. Isolamento conferido em 2026-11-09 com chave temporária (apagada depois): o usuário sozinho não acessa o bucket; sessão sem etiqueta ou com etiqueta extra é recusada; a sessão do escritório `t1` grava, lê, lista e apaga em `tenants/t1/` e é barrada em `tenants/t2/`, `tenants/t1x/` e na listagem do bucket inteiro; sem credencial, o arquivo não abre.

## Pendências

- [ ] Confirmar com a perita a tabela "Assumptions & Open Questions" da spec.
- [ ] `design.md` e `tasks.md` (skill `ethica-spec-driven`).
- [ ] Implementação, validação e UAT das pastas por perícia (PRD-01).
- [ ] Criar os projetos na Railway e na Vercel e o cluster no Atlas; conferir se o domínio gerado pela Railway bate com o `vercel.json`.
- [ ] Ligar o envio na Railway (`S3_BUCKET=ethica-files-677296948879`), trocar a chave de `ethica-files-api` (a atual apareceu em conversas) e conferir logo e anexo em produção.

## Histórico

- 2026-11-09 — Provider assume o papel por escritório quando há `S3_ROLE_ARN` (`@aws-sdk/credential-providers`); conferido contra o bucket real (gravar, ler e apagar em `tenants/live-check/`). Railway já tem `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` e `S3_ROLE_ARN`; falta `S3_BUCKET`. Plano: `.specs/features/producao-api/plans/2026-11-09-s3-acesso-por-escritorio.md`.
- 2026-11-09 — Bucket `ethica-files-677296948879`, usuário `ethica-files-api` e papel `ethica-files-tenant` criados na AWS (us-east-2) por `infra/aws/file-storage.yml` (AD-202). Divergência da AD-146: a troca para o S3 deixa de ser só configuração, porque o acesso por escritório passa pela AWS.

- 2026-11-02 — SMTP passa a ser obrigatório em produção (AD-156): com o acesso só por e-mail (`docs/features/acesso-email/feature.md`), a API não sobe sem `MAIL_PROVIDER=nodemailer`, `SMTP_HOST` e `SMTP_FROM`. Divergência da spec, que tratava o SMTP como opcional.
- 2026-11-01 — Spec criada (`.specs/features/producao-api/spec.md`).
- 2026-11-02 — `/metrics` deixa de existir em produção (`apps/api/src/app.ts`): a API é pública e nada coleta as métricas lá; em dev e nos testes continua.
- 2026-11-02 — A API lê a porta de `PORT` (Railway) antes de `API_PORT` em `apps/api/src/config/env.config.ts`, qualquer que seja o comando de início; o `Dockerfile` volta a chamar o `tsx` direto.
- 2026-11-02 — `vercel.json` sai de `apps/web` para a raiz (com o comando de montagem do web), porque o projeto da Vercel monta a partir da raiz do repositório; a AD-153 cita o caminho antigo.
- 2026-11-01 — A imagem passa a escutar na `PORT` injetada pela Railway (sem configurar `API_PORT`); `MONGODB_URI` do Atlas precisa do nome do banco.
- 2026-11-01 — Hospedagem Railway + Vercel (AD-153). Divergência da spec: a imagem roda `tsx` em vez de compilar com `tsc` em multi-stage, e a hospedagem, que estava fora de escopo, foi decidida.

## Referências

- Spec (congelada): `.specs/features/producao-api/`

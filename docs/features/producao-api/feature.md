---
feature: Imagem de produção da API e arquivos por perícia
slug: producao-api
descricao: API na Railway (Dockerfile com Chromium) e web na Vercel com deploy pela main; falta o storage S3 em pastas por escritório e perícia
data: 2026-11-01
status: parcial
areas: [apps/api, infra]
decisoes: [AD-119, AD-120, AD-129, AD-146, AD-153]
spec: [.specs/features/producao-api]
---

# Imagem de produção da API e arquivos por perícia

**Status**: parcial · **Atualizado**: 2026-11-01 · **Áreas**: `apps/api`,`` `infra`

> Documento vivo. Hospedagem feita (PRD-02, AD-153); pastas por perícia (PRD-01) ainda planejado em
> `.specs/features/producao-api/spec.md` (perguntas em aberto a confirmar com a perita antes do design).
> Correlação com o git: `git log --oneline -i --grep='producao-api'`.

## O que foi feito

- Imagem de produção da API em `Dockerfile` (Node 24, Chromium, só a API e os pacotes de que ela depende, usuário sem root), publicada na Railway por `railway.json` com health check em `/health`.
- Web na Vercel por `apps/web/vercel.json`: volta para `index.html` em qualquer rota e repassa `/api/*` para a API da Railway (cookie de sessão do mesmo site, AD-153).
- Passo a passo das variáveis e do primeiro acesso em `RUN_BOOK.md#produção-railway--vercel-ad-153`.

## Por que

Só existe a imagem de desenvolvimento, e as pastas do storage são por tipo de arquivo, não por perícia. A AD-146 organiza as chaves em tenants/<tenantId>/cases/<caseId>/… e a troca para o S3 de produção fica só nas variáveis S3_*.

## Como

- `Dockerfile` instala com `pnpm install --filter api... --filter ethica` e sobe `tsx src/server.ts`; variável obrigatória ausente derruba a subida com a lista no log (`apps/api/src/config/env.config.ts`).
- `VITE_API_URL=/api` na Vercel; `CORS_ORIGIN` na Railway é o endereço da Vercel (também usado nos links dos e-mails).
- Pastas por perícia: a definir no `design.md`.

## Como testar

- Imagem: bloco "Testar a imagem localmente" do `RUN_BOOK.md`; `curl localhost:18099/health`, login do seed e PDF de um laudo.
- Pastas por perícia: a definir no `tasks.md`.

## Pendências

- [ ] Confirmar com a perita a tabela "Assumptions & Open Questions" da spec.
- [ ] `design.md` e `tasks.md` (skill `ethica-spec-driven`).
- [ ] Implementação, validação e UAT das pastas por perícia (PRD-01).
- [ ] Criar os projetos na Railway e na Vercel e o cluster no Atlas; conferir se o domínio gerado pela Railway bate com o `vercel.json`.
- [ ] `/metrics` responde sem login (também pela Vercel em `/api/metrics`); fechar antes de dados reais.

## Histórico

- 2026-11-01 — Spec criada (`.specs/features/producao-api/spec.md`).
- 2026-11-01 — A imagem passa a escutar na `PORT` injetada pela Railway (sem configurar `API_PORT`); `MONGODB_URI` do Atlas precisa do nome do banco.
- 2026-11-01 — Hospedagem Railway + Vercel (AD-153). Divergência da spec: a imagem roda `tsx` em vez de compilar com `tsc` em multi-stage, e a hospedagem, que estava fora de escopo, foi decidida.

## Referências

- Spec (congelada): `.specs/features/producao-api/`

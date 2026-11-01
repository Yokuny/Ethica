---
feature: Imagem de produção da API e arquivos por perícia
slug: producao-api
descricao: Dockerfile de produção com Chromium e storage S3 em pastas por escritório e perícia, trocável para o bucket real só por configuração
data: 2026-11-01
status: planejado
areas: [apps/api, infra]
decisoes: [AD-119, AD-120, AD-129, AD-146]
spec: [.specs/features/producao-api]
---

# Imagem de produção da API e arquivos por perícia

**Status**: planejado · **Atualizado**: 2026-11-01 · **Áreas**: `apps/api`,`` `infra`

> Documento vivo. Ainda não implementado: a intenção e os requisitos estão em
> `.specs/features/producao-api/spec.md` (perguntas em aberto a confirmar com a perita antes do design).
> Correlação com o git: `git log --oneline -i --grep='producao-api'`.

## O que foi feito

- Nada ainda: só a spec.

## Por que

Só existe a imagem de desenvolvimento, e as pastas do storage são por tipo de arquivo, não por perícia. A AD-146 organiza as chaves em tenants/<tenantId>/cases/<caseId>/… e a troca para o S3 de produção fica só nas variáveis S3_*.

## Como

A definir no `design.md`.

## Como testar

A definir no `tasks.md`.

## Pendências

- [ ] Confirmar com a perita a tabela "Assumptions & Open Questions" da spec.
- [ ] `design.md` e `tasks.md` (skill `ethica-spec-driven`).
- [ ] Implementação, validação e UAT.

## Histórico

- 2026-11-01 — Spec criada (`.specs/features/producao-api/spec.md`).

## Referências

- Spec (congelada): `.specs/features/producao-api/`

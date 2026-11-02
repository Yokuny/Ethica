---
feature: Acesso por e-mail (sem senha)
slug: acesso-email
descricao: Entrar e criar o escritório só com o e-mail, pela chave de acesso (link e código) enviada à caixa de e-mail da pessoa
data: 2026-11-02
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-155, AD-156, AD-144]
spec: [.specs/features/acesso-email]
---

# Acesso por e-mail (sem senha)

**Status**: concluído · **Atualizado**: 2026-11-02 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Requisitos em `.specs/features/acesso-email/spec.md`.
> Correlação com o git: `git log --oneline -i --grep='acesso-email'`.

## O que foi feito

- Tela `/auth` em três passos: e-mail → código de 6 dígitos (com "Reenviar código" e "Usar outro e-mail") → "Criar escritório" quando o e-mail ainda não tem conta (nome, nome do escritório e CNPJ). O botão do e-mail abre `/auth?token=…` e entra direto.
- Convite pede só o nome. Minha conta perde o bloco Senha.
- Sessão de 30 dias por aparelho.
- A senha sai do banco, da API, dos scripts de carga e do bcrypt.

## Por que

A perita pediu que a segurança do login ficasse com o provedor de e-mail de cada pessoa (AD-155): sem senha para esquecer, vazar ou trocar.

## Como

- Banco: `packages/db/src/models/access-key.model.ts` guarda só os hashes do link e do código, uma chave por e-mail, com TTL.
- API: `apps/api/src/modules/identity/auth.service.ts` (`requestAccessKey`, `verifyAccessKey`, `signup`, `startSession` — o único lugar que abre sessão, usado também pelo convite). Rotas em `auth.router.ts`; limites em `apps/api/src/middlewares/rateLimit.middleware.ts`.
- Contratos: `packages/contracts/src/schemas/access.schema.ts`.
- Web: `apps/web/src/routes/_public/auth/` (`@hooks/use-access.ts` conduz os passos).
- Produção exige SMTP (AD-156, `apps/api/src/config/env.config.ts`).

## Como testar

- Local, com `MAIL_PROVIDER=log`: em `http://localhost:15173/auth` informe `admin@pericias.example.com`, pegue o código em `docker compose logs api | grep mail.log_send` e entre. Um e-mail novo leva ao passo "Criar escritório".
- Automático: `apps/api/src/modules/identity/auth.router.e2e.test.ts`, `apps/web/src/routes/_public/auth/index.unit.test.tsx`.

## Pendências

- [ ] Configurar o SMTP de um provedor de e-mail na Railway; até lá o deploy novo não entra no ar e a produção segue na versão anterior (com senha).
- [ ] Trocar o e-mail da conta (fora de escopo).

## Histórico

- 2026-11-02 — Feature criada: acesso e cadastro pela chave enviada ao e-mail, cadastro aberto, sessão de 30 dias (AD-155); SMTP obrigatório em produção (AD-156). Escritório do cadastro aberto só com CNPJ, seguindo a AD-144.

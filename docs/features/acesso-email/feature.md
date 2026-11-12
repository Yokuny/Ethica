---
feature: Acesso por e-mail (sem senha)
slug: acesso-email
descricao: Entrar e criar o escritório só com o e-mail, pela chave de acesso (link e código) enviada à caixa de e-mail da pessoa
data: 2026-11-02
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-155, AD-156, AD-157, AD-144, AD-219, AD-220]
spec: [.specs/features/acesso-email]
---

# Acesso por e-mail (sem senha)

**Status**: concluído · **Atualizado**: 2026-11-11 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Requisitos em `.specs/features/acesso-email/spec.md`.
> Correlação com o git: `git log --oneline -i --grep='acesso-email'`.

## O que foi feito

- Tela `/auth` em três passos: e-mail → código de 6 dígitos (com "Reenviar código" e "Usar outro e-mail") → "Criar escritório" quando o e-mail ainda não tem conta (nome, nome do escritório e CNPJ). O botão do e-mail abre `/auth?token=…` e entra direto.
- Convite pede só o nome. Minha conta perde o bloco Senha.
- Sessão de 30 dias por aparelho.
- A senha sai do banco, da API, dos scripts de carga e do bcrypt.
- "Cadastro de teste" na tela `/auth` (AD-157), provisório enquanto a Railway bloqueia o envio de e-mail: e-mail + senha; e-mail novo cria o escritório, e-mail com senha entra. Só contas criadas por ali têm senha.

## Por que

A perita pediu que a segurança do login ficasse com o provedor de e-mail de cada pessoa (AD-155): sem senha para esquecer, vazar ou trocar.

## Como

- Banco: `packages/db/src/models/access-key.model.ts` guarda só os hashes do link e do código, uma chave por e-mail, com TTL.
- API: `apps/api/src/modules/identity/auth.service.ts` (`requestAccessKey`, `verifyAccessKey`, `signup`, `startSession` — o único lugar que abre sessão, usado também pelo convite). Rotas em `auth.router.ts`; limites em `apps/api/src/middlewares/rateLimit.middleware.ts`.
- Contratos: `packages/contracts/src/schemas/access.schema.ts`.
- Web: `apps/web/src/routes/_public/auth/` (`@hooks/use-access.ts` conduz os passos).
- E-mail: `apps/api/src/providers/mail/` — Resend pela API HTTPS (AD-219), SMTP pelo nodemailer ou log em dev. Produção exige um provedor real (AD-156, AD-219, `apps/api/src/config/env.config.ts`).

## Como testar

- Local, com `MAIL_PROVIDER=log`: em `http://localhost:15173/auth` informe `admin@pericias.example.com`, pegue o código em `docker compose logs api | grep mail.log_send` e entre. Um e-mail novo leva ao passo "Criar escritório".
- Automático: `apps/api/src/modules/identity/auth.router.e2e.test.ts`, `apps/web/src/routes/_public/auth/index.unit.test.tsx`.

## Pendências

- [ ] Na Railway: `MAIL_PROVIDER=resend`, `RESEND_API_KEY` e `MAIL_FROM` com domínio verificado no Resend (AD-219).
- [ ] Com o e-mail no ar, retirar o cadastro de teste com senha (AD-157).
- [ ] Trocar o e-mail da conta (fora de escopo).

## Histórico

- 2026-11-02 — Feature criada: acesso e cadastro pela chave enviada ao e-mail, cadastro aberto, sessão de 30 dias (AD-155); SMTP obrigatório em produção (AD-156). Escritório do cadastro aberto só com CNPJ, seguindo a AD-144.
- 2026-11-02 — Cadastro de teste por e-mail + senha (AD-157), porque a Railway bloqueia SMTP no plano atual. Sessões passam a ter `jwtid` aleatório: duas entradas da mesma pessoa no mesmo segundo geravam o mesmo token.
- 2026-11-11 — Envio pelo Resend (AD-219): API HTTPS em vez de SMTP, que a Railway bloqueia. Remetente vira `MAIL_FROM`, comum aos provedores.
- 2026-11-12 — Evolução planejada em `acesso-aparelho` (AD-220): passkey do aparelho obrigatória após a chave do e-mail e saída do cadastro de teste com senha.

# Tasks — acesso-email

| # | Task | Gate |
| --- | --- | --- |
| T1 | `AccessKey` no `packages/db`, `User.password` sai; contratos (`accessKeyRequestSchema`, `accessKeyVerifySchema`, `signupSchema`; `signinSchema`, `changePasswordSchema` e senha do convite saem); chaves de mensagem | `pnpm vitest run --project unit packages` |
| T2 | API: rotas de chave e cadastro, `startSession` única de 30 dias, convite sem senha, `/me/password` sai, SMTP obrigatório em produção, scripts de carga sem senha, testes ajustados | `pnpm vitest run apps/api` |
| T3 | Web: tela de acesso em três passos, convite só com nome, Minha conta sem senha, dicionário | `pnpm vitest run apps/web` + build |
| T4 | Validação na tela (login com código, link, cadastro de escritório, convite) e registro (`feature.md`, ADs, `RUN_BOOK.md`) | `pnpm run check` |

Entregue num commit só (`feat(acesso-email)`), por ser uma troca de contrato que quebra a API e o web se separada.

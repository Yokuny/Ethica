---
feature: Acesso preso ao aparelho (passkey)
slug: acesso-aparelho
descricao: Entrada pelo e-mail termina criando a passkey do aparelho (um computador + um celular) e tela de entrada nova
data: 2026-11-12
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-220, AD-155]
spec: [.specs/features/acesso-aparelho]
---

# Acesso preso ao aparelho (passkey)

**Status**: concluído · **Atualizado**: 2026-11-12 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Requisitos e design em `.specs/features/acesso-aparelho/spec.md`.
> Correlação com o git: `git log --oneline -i --grep='acesso-aparelho'`.

## O que foi feito

- Toda entrada termina na passkey do aparelho: depois da chave do e-mail (link ou código), do "Criar escritório" ou do convite, a tela pede "Ativar neste aparelho" (digital, rosto, PIN ou Windows Hello). Sem isso a sessão não abre.
- Aparelho que já tem passkey entra por "Entrar com este aparelho" ou pela sugestão do navegador no campo de e-mail, sem esperar e-mail.
- Um computador e um celular por pessoa: a passkey nova substitui a anterior do mesmo tipo e encerra as sessões dela. Passkey sincronizada (iCloud/Google) é aceita.
- Minha conta ganhou "Aparelhos com acesso", com Remover (o aparelho removido sai do sistema).
- Tela de entrada em duas colunas: título, texto e formulário à esquerda (sem o bloco de seção, só os campos); à direita uma vitrine que passa uma peça por vez, com dados de exemplo: lista de serviços com o menu Filtros aberto, duas semanas da agenda como no calendário do sistema, rota do dia com o custo do deslocamento lançado dividido entre as OS, financeiro de um serviço (honorário, pagamento, despesas e líquido) e painel de honorários a receber (indicadores, valores por esfera e fluxo de caixa). Todas as peças ficam na mesma moldura, de altura fixa, com as bordas esmaecendo sobre o conteúdo. No celular, só o formulário.
- Saiu o cadastro de teste com senha (AD-157): campo, rota, tela e textos.

## Por que

A entrada pelo e-mail (AD-155) passa a valer só no aparelho em que a pessoa criou a passkey, um computador e um celular por vez (AD-220).

## Como

- Banco: `packages/db/src/models/passkey.model.ts` (`Passkey`, índice único `user + kind`) e `Session.passkey` (`packages/db/src/models/session.model.ts`).
- API: `apps/api/src/modules/identity/auth.service.ts` (`passkeyRegistrationOptions`, `registerPasskey`, `passkeySigninOptions`, `signinWithPasskey`; `startSession` só abre sessão com passkey), rotas `/auth/passkey*` em `auth.router.ts`; aparelhos em `account.*` (`GET`/`DELETE /me/passkeys`). Biblioteca `@simplewebauthn/server`.
- O site da passkey (`rpID`) é o domínio de `CORS_ORIGIN` (`apps/api/src/config/env.config.ts`): trocar o domínio do front invalida todas as passkeys.
- Contratos: `packages/contracts/src/schemas/access.schema.ts`.
- Web: `apps/web/src/query/passkey.ts` (cerimônias com `@simplewebauthn/browser` e lista de aparelhos), `apps/web/src/components/passkey-setup.tsx` (passo comum à entrada e ao convite), `apps/web/src/routes/_public/auth/` (`@components/auth-showcase.tsx` passa as peças `showcase-*.tsx`) e `apps/web/src/routes/_private/account/@components/account-devices.tsx`.

## Como testar

- Local: em `http://localhost:15173/auth`, peça a chave, pegue o código no log da API (`mail.log_send`) e ative o aparelho com a digital ou o PIN do computador. Saia e use "Entrar com este aparelho".
- Automático: `apps/api/src/modules/identity/auth.router.e2e.test.ts` (WebAuthn simulado), `invite.router.e2e.test.ts`, `apps/web/src/routes/_public/{auth,invite}/index.unit.test.tsx`.

## Pendências

- [ ] Conferir a ativação e a entrada com a digital/PIN de verdade num computador e num celular (os testes automáticos simulam o autenticador).
- [ ] Desativar membro (feature `gestao-membros`, ainda não feita) deve apagar as passkeys dele. Hoje membro inativo já não entra: a API recusa a passkey de quem está inativo.

## Histórico

- 2026-11-12 — Feature planejada: passkey obrigatória após o e-mail, um computador + um celular, passkey sincronizada aceita, cadastro de teste com senha sai, tela nova com vitrine do produto (AD-220).
- 2026-11-12 — Implementada. Divergências do design da spec: o desafio do WebAuthn volta no corpo da resposta (`challengeToken`, JWT de 10 min) em vez de cookie; o `rpID` sai de `CORS_ORIGIN`, sem variável `WEBAUTHN_RP_ID`; o tipo do aparelho (computador ou celular) é decidido só pelo servidor, pelo navegador da requisição, sem vir da tela; o registro da passkey troca o `passkeyToken` pelo `challengeToken` e não precisa reenviá-lo. O mapa da vitrine é desenho próprio (SVG), sem Leaflet nem mapa da internet.
- 2026-11-12 — Vitrine refeita a pedido: uma peça por vez (troca a cada 6 s), cada uma como trecho do sistema real; texto da tela reescrito para falar do ganho (menos burocracia, nenhum prazo ou honorário esquecido) e não de "sem senha"; formulários de entrada e do convite sem o `DefaultFormLayout`. A grade e as etiquetas do calendário saíram da agenda para `apps/web/src/components/`. O gráfico de fluxo de caixa (`finance-flow-chart.tsx`) pintava as barras com nomes de cor antigos que não existiam; corrigido.
- 2026-11-12 — Vitrine com moldura única (mesma altura, bordas esmaecidas por máscara) e peça nova do financeiro do serviço; painel destaca o valor a receber; textos falam de serviços em geral (perícia é um dos tipos), com título "Otimize seus serviços, SEM BUROCRACIA.".
- 2026-11-12 — Vitrine em estética minimalista (skill `minimalist-ui`, dentro dos padrões do projeto): moldura de janela com os três pontos, só a borda de baixo esmaece, sem títulos internos, texto menor e mais leve. Filtros com a lista apagada atrás; agenda em semana de domingo a quinta com as pontas esmaecendo; rota, despesas e painel compactos. A grade e as etiquetas do calendário voltaram para `apps/web/src/routes/_private/agenda/@components/`, já que a vitrine não as usa mais. Fora da skill, por regra do projeto: fonte serifada, ícones Phosphor e cores fixas fora do tema.

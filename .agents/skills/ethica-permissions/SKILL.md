---
name: ethica-permissions
description: Sistema de permissões do Ethica de ponta a ponta — onde o papel vive no banco (users.role, invites.role, isPlatformAdmin, sessions), como chega ao front (cookie de sessão → req.tenantUser → GET /auth/session), como é checado no apps/web (guards de rota, acesso de seção, ações escondidas) e rechecado no apps/api (validToken → tenantAssignmentCheck → checkRole → regra no service), o que cada papel libera e como criar uma permissão nova. Use ao criar rota, tela, botão ou ação que dependa de papel, ao revisar acesso, ao responder "quem pode fazer X", ou ao criar/alterar um papel. Trigger em "permissão", "papel", "role", "admin", "manager", "operator", "acesso", "403", "isAdmin", "checkRole", "canOperate", "quem pode", "restringir", "liberar para".
---

# Permissões do Ethica

O controle de acesso é uma **matriz de permissões por membro, dentro de um tenant** (AD-137): o `User` carrega o papel (`admin`, `manager`, `operator`) e a matriz `permissoes` (módulo → ações `view`/`create`/`update`/`delete`). O `admin` tem tudo; `manager` (Gestor) e `operator` (Operador) são perfis cujo **preset** preenche a matriz no convite, ajustável pelo admin. Cada rota de domínio declara módulo e ação com `can(modulo, acao)`; áreas de administração (usuários, escritório, diário, exportação, permissões) seguem `isAdmin`. O front repete a regra só para não mostrar o que a API vai recusar. **A API é a fonte da verdade.**

A matriz atual (rota → guardas, regras de service, checagens no front) é lida do código, não desta skill:

```bash
node .agents/skills/ethica-permissions/scripts/matrix.mjs        # API + web
node .agents/skills/ethica-permissions/scripts/matrix.mjs api    # só API
node .agents/skills/ethica-permissions/scripts/matrix.mjs web    # só web
```

Rode antes de responder "quem pode fazer X" ou de mexer em acesso. Os caminhos abaixo são a partir da raiz do repo.

## 1. Onde vive no banco

| Collection (model) | Campo | O que é |
| --- | --- | --- |
| `users` (`packages/db/src/models/user.model.ts`) | `role: string[]` | Papéis da pessoa no tenant. Array com enum; default `[]`. Diz quem é admin e qual preset usar. |
| | `permissoes` | Matriz do membro (AD-137), módulos e ações em `packages/contracts/src/schemas/permissao.schema.ts`. Ausente = preset do papel (`permissoesEfetivas`); admin ignora. |
| | `Tenant` | Tenant do usuário. Obrigatório, exceto para `isPlatformAdmin` (AD-016). |
| | `isPlatformAdmin: boolean` | Operador da plataforma (fora de qualquer tenant). Sem `Tenant`, `role: []`. |
| | `active: boolean` | `false` derruba a sessão no request seguinte (401) e impede login. |
| `invites` (`invite.model.ts`) | `role: string`, `permissoes` | Papel **único** e a matriz conferida no convite; viram `role: [invite.role]` e `permissoes` no aceite. |
| `sessions` (`session.model.ts`) | `tokenHash`, `deviceInfo`, `expiresAt` | Sessão de token único (AD-014). Guarda só o hash do token; TTL índice apaga sozinho. Não guarda papel. |
| `tenants` (`tenant.model.ts`) | `status` | `provisioned`/`active`/`suspended`. `suspended` derruba o acesso no request seguinte com 403 `tenant_suspended` (AD-098). |

Tipos compartilhados: `Role` e `TenantUser` em `packages/contracts/src/types.ts`. O enum de papéis **está repetido** em `user.model.ts`, `invite.model.ts`, `packages/contracts/src/schemas/createInvite.schema.ts`, `apps/web/src/routes/_private/_admin/users/add/@consts/roles.ts` e no tipo de `apps/web/src/routes/_private/_admin/users/@query/user-directory.ts`.

### Como um papel nasce

- **Admin da plataforma**: só por script (`apps/api/scripts/seed-platform-admin.ts`), nunca por rota.
- **Primeiro admin do tenant**: `POST /platform/tenants` cria o tenant; `POST /platform/tenants/:id/invites` emite convite com `role: 'admin'` forçado no service (`apps/api/src/modules/identity/platform.service.ts`, `inviteToTenant`).
- **Equipe**: admin do tenant chama `POST /tenant/invites` escolhendo o papel (`inviteTeamMember`). O convidado aceita em `POST /invites/:token/accept` (público) e `invite.repository.ts` cria o `User` com `role: [invite.role]`.
- **Matriz**: `PATCH /auth/users/:id/permissoes` (admin; alvo admin = 422 `admin_has_all_permissions`), tela de Usuários → "Permissões". Vale na requisição seguinte do membro.
- **Não existe rota para trocar papel nem desativar usuário.** Hoje isso só muda direto no banco.

## 2. Transporte back → front

1. `POST /auth/signin` (`identity/auth.service.ts`): valida senha, assina um JWT só com `{ user }` (4 dias), grava `Session { tokenHash, deviceInfo = User-Agent }` e devolve o token no cookie httpOnly `refreshToken` (`apps/api/src/config/cookie.config.ts`). **O papel não vai no token.**
2. Todo request autenticado passa por `authenticateSession` (`apps/api/src/middlewares/authentication.middleware.ts`): verifica o JWT, busca a `Session` pelo hash, confere o User-Agent (diferente ⇒ revoga **todas** as sessões do usuário), relê `User` e `Tenant` do banco (tenant `suspended` ⇒ 403 `tenant_suspended`) e monta `req.tenantUser = { tenant, user, role, isPlatformAdmin, permissoes }` (FND-05; `permissoes` já efetivas, AD-137). Trocar o papel no banco vale no request seguinte.
3. `GET /auth/session` devolve `SessionView = { tenant?, user, role, permissoes }` (`identity/auth.service.ts`, `getSessionView`). `isPlatformAdmin` **não** vai para o front.
4. O web lê isso em `sessionQuery` (`apps/web/src/query/session.ts`, `staleTime` 60s, `retry: false`). Não há Zustand nem access token (AD-014): o cookie vai sozinho com `credentials: 'include'` (`apps/web/src/lib/api/client.api.ts`).
5. `authenticateSession` é função pura: um futuro WebSocket reusa a mesma validação no handshake.

## 3. Checagem no back-end (a que vale)

Ordem fixa dos middlewares numa rota protegida — nada toca dado antes de decidir:

```ts
router.post('/', deps.validToken, tenantAssignmentCheck, isAdmin, validBody(schema), controller.create);
```

| Etapa | Arquivo | Falha |
| --- | --- | --- |
| `validToken` (via `createAuthMiddleware`) | `middlewares/authentication.middleware.ts` | 401 `invalid_session`; 403 `tenant_suspended` |
| `tenantAssignmentCheck` | `middlewares/tenantAssign.middleware.ts` | 424 `company_link_required` (usuário sem tenant, ex. admin da plataforma) |
| `can(modulo, ...acoes)` (domínio, AD-137), `checkRole([...])`, `isAdmin`, `platformAdminOnly` | `middlewares/authorization.middleware.ts` | 403 `no_permission` |
| Regra por recurso/dono no service | `modules/<m>/<m>.service.ts` | 403 `no_permission` ou 404 |
| Isolamento de tenant no repository | `tenantScoped` (`packages/db/src/tenantScoped.ts`), tenant sempre de `req.tenantUser.tenant` (AD-010) | registro de outro tenant simplesmente não existe |

`can(modulo, ...acoes)` passa se a matriz efetiva tem **todas** as ações pedidas no módulo (ex.: converter oportunidade = `can('prospeccao','update'), can('pericias','create')`). Sub-registros seguem o pai: prazos e movimentações = `pericias.update`; vistorias e mídias = `agenda`; parcelas = `financeiro.update`. `checkRole(allowed)` passa se **qualquer** papel estiver em `allowed` e sobra para `/me/*` e `/auth/users` (`canOperate`, qualquer papel, recusa `role: []`). Toda rota de tenant tem guarda (AD-098): rota **sem** guarda depois de `tenantAssignmentCheck` aceitaria `role: []` e é bug.

**Regras no service** (o controller passa `actor = req.tenantUser`): quando a decisão depende do registro e não só da rota. Hoje nenhum módulo de domínio precisa disso. Valores financeiros em PDF seguem `pode(req.tenantUser.permissoes, 'financeiro', 'view')` nos controllers de `documentos`. Quando surgir (ex.: perito só vê as próprias perícias), a regra vai no service do módulo.

Regra: **403** quando a pessoa pode saber que o recurso existe; **404** quando nem a existência deve vazar.

## 4. Checagem no front-end (só UX)

O front esconde ou redireciona; nunca é a barreira. Todos leem `sessionQuery`.

| Onde | Arquivo | Efeito |
| --- | --- | --- |
| Shell privado | `apps/web/src/routes/_private/route.tsx` | sem sessão ⇒ redirect `/auth`; tenant suspenso ⇒ `/suspended` |
| Layout de admin (pathless `_admin`) | `apps/web/src/routes/_private/_admin/route.tsx` | não-admin ⇒ redirect `/`. Tudo em `_private/_admin/**` (usuários, campos, integrações) herda. |
| Módulos de domínio | `apps/web/src/routes/_private/route.tsx` (`moduloDaRota` em `_private/@utils/home-access.ts`) | guarda única: primeiro segmento da URL → módulo; sem `view` ⇒ `/` |
| Navegação (sidebar, home, command menu) | `HOME_SECTIONS` em `_private/@consts/home-sections.ts` (`access: PermissaoModulo \| 'admin'`) filtrado por `canAccessHomeSection` (`_private/@utils/home-access.ts`) em `useHomePage` | item some do menu |
| Ações inline | `can(session, modulo, acao)`: inserir/editar/excluir nas listagens e detalhes, blocos do início (`HOME_BLOCO_MODULO`), valores financeiros | botão/bloco não aparece |

Helpers centrais em `apps/web/src/query/session.ts`: `can(session, modulo, acao = 'view')` e `isAdminSession(session)`. Quando a API responde 403, `client.api.ts` traduz `no_permission` e a tela mostra a mensagem como qualquer erro.

## 5. Papéis e presets atuais

O detalhe por rota sai do script; os presets ficam em `PERFIL_PERMISSOES` (`packages/contracts/src/schemas/permissao.schema.ts`).

| Papel | Matriz | Fora da matriz |
| --- | --- | --- |
| `isPlatformAdmin` | — | `/platform/*` |
| `admin` | tudo, sempre | usuários, convites, permissões, escritório, diário de bordo, exportação |
| `manager` (Gestor) | preset: tudo, menos excluir perícia | — |
| `operator` (Operador) | preset: sem financeiro, sem excluir perícia ou parte, só ver modelos e relatórios | — |
| sem papel (`role: []`) | nada | só `/auth/session`, sair e rotas públicas |

O admin ajusta a matriz de cada membro; o preset só preenche o convite e vale para quem não tem matriz gravada.

## 6. Como implementar uma permissão nova

Comece sempre pelo módulo e pela ação que já existem na matriz (AD-137). Não crie segunda camada de permissões, decorator nem wrapper novo (princípio de reduzir complexidade em `AGENTS.md`); `can`, `isAdmin` e a checagem no service bastam.

### a) Rota nova de domínio ou de admin

1. No router do módulo, depois de `tenantAssignmentCheck` e **antes** de qualquer validação de corpo: `can('<modulo>', '<acao>')` (domínio) ou `isAdmin` (administração). Módulo novo na matriz = entrada em `PERMISSAO_MODULOS` + presets + rótulo em `apps/web/src/routes/_private/_admin/users/@consts/permissoes-labels.ts` + `moduloDaRota`.
2. Teste e2e no `*.router.e2e.test.ts` do módulo: um caso 403 por ação ausente na matriz, verificando que nada mudou no banco. Molde: `seedSession(tenant, role, permissoes)` em `apps/api/src/modules/pericia/pericia.router.e2e.test.ts`.
3. No web, a mesma regra no ponto de entrada certo:
   - página inteira de admin ⇒ coloque a rota sob `apps/web/src/routes/_private/_admin/`;
   - página de módulo ⇒ a guarda central de `_private/route.tsx` já cobre pelo `moduloDaRota`;
   - item de navegação ⇒ `access` em `HOME_SECTIONS` (módulo da matriz ou `admin`);
   - botão/ação ⇒ `can(session, modulo, acao)` ou `isAdminSession(session)`.
4. Se a decisão não for óbvia (quem pode e por quê), registre uma `AD-NNN` em `.specs/STATE.md` e atualize o `feature.md` da área.

### b) Regra que depende do registro (dono, responsável, visibilidade)

Fica no service, não no router: receba `actor: { user, role }` do controller (`req.tenantUser`), decida e lance `CustomError('no_permission', 403)` ou `('not_found', 404)` conforme a seção 3. Se o front precisar saber, devolva um booleano na resposta (ex.: `canManage`) em vez de duplicar a regra no web. Teste no `*.unit.test.ts` do service e um caso e2e.

### c) Papel novo

Custa caro: exige AD e toca todos os pontos abaixo. Atualize juntos:

- enum em `packages/db/src/models/user.model.ts` e `invite.model.ts`;
- `Role` em `packages/contracts/src/types.ts` e `createInvite.schema.ts`;
- `INVITE_ROLES` e o tipo do diretório em `apps/web/src/routes/_private/_admin/users/**`, e a chave de tradução do papel em `apps/web/src/lib/helpers/translate.helper.ts`;
- **cada** `checkRole([...])` e cada `role.some/includes` (rode o script) — decidir, rota a rota, se o papel novo entra;
- matriz em `apps/api/src/middlewares/authorization.middleware.unit.test.ts`.

### Nunca

- Ler papel ou tenant do corpo, da query ou do payload do token: só de `req.tenantUser` (FND-05, AD-010).
- Confiar no front: toda regra do web tem a mesma regra na API.
- Rodar validação, consulta ou efeito antes do guard de papel.
- Mandar `isPlatformAdmin` ou o diretório completo (e-mail, papel) para quem não é admin (AD-071).

## 7. Divergências conhecidas (verificadas em 2026-10-29)

Lacunas reais do código. Não corrija por conta própria: confirme com o usuário e registre a decisão.

- Nenhuma conhecida na fundação.

## Verificação

```bash
node .agents/skills/ethica-permissions/scripts/matrix.mjs
pnpm vitest run apps/api/src/middlewares apps/web/src/routes/_private/route.unit.test.ts apps/web/src/routes/_private/_admin/route.unit.test.ts
pnpm vitest run apps/api/src/modules/<modulo>   # e2e do módulo alterado
pnpm run check
```

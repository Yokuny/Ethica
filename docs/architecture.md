# Arquitetura

Visão de uma página; regras de código ficam nos `CLAUDE.md` de cada app e nas skills.

```
apps/web (React 19 + Vite 7)  ──HTTP + cookie de sessão──▶  apps/api (Express 5)  ──▶  MongoDB Atlas
   TanStack Router/Query                                       módulos + event bus         (Atlas Search)
   packages/ui (shadcn/Base UI, chart)                         providers/datajudClient ──▶ API Pública do Datajud (CNJ)
          └──────────── packages/contracts (Zod) ──────────────┘
                                                               packages/db (Mongoose — único dono de `mongoose`)
```

## Back-end (`apps/api`)

- **Módulos contidos** (AD-038): `identity`, `pericia`, `agenda`, `financeiro`, `prospeccao`, cada um com router → controller → service → repository → schema. Um módulo só consome o *service* de outro; dono único de cada model (`tests/structural/module-boundary.structural.test.ts`).
- **Grafo**: `agenda`, `financeiro`, `prospeccao` → `pericia`. Sem ciclos.
- **Eventos in-process** (AD-039, AD-106, AD-111, AD-126): `pericia:honorarios_fixados` → financeiro lança a receita ou atualiza o honorário fixado já lançado; `pericia:deleted` → documentos exclui os laudos da perícia. Fire-and-forget; falha só no log. O prazo do laudo vira `Prazo` no próprio módulo `pericia` (AD-109).
- **Tenant** sempre de `req.tenantUser` (AD-010); todo filtro de repository passa por `tenantScoped`.
- **Sessão** de token único em cookie httpOnly, verificada no banco a cada request (AD-014).
- **Tempo**: instante em UTC; data de calendário como `YYYY-MM-DD` (AD-036, AD-103).
- **Busca de texto** por Atlas Search, nunca regex (AD-054).
- **Datajud** só pela API, chave em env (AD-105).

## Front-end (`apps/web`)

- Rotas por arquivo, pasta + `index.tsx`, `details/?id=`, pastas `@` por nível (AD-066, AD-067) — skill `ethica-web-standards`.
- TanStack Query é a única fonte de dados; filtro e paginação na URL (AD-028).
- Página = `Card asPage` com loading/vazio/erro dentro do `CardContent`; tabelas server-driven no `DataTable` (AD-077, AD-078); criar/editar por página `/add` ou `FormDialog` (AD-070).
- Gráficos pelo `chart` do `packages/ui` (recharts 3, AD-104).
- Guardas: `_private/route.tsx` (sessão), `_private/_admin/route.tsx` (admin), `financeiro/route.tsx` (admin/manager, AD-107).

## Testes e gate

Vitest por projects `unit`/`integration`/`e2e`/`structural` (AD-017); `pnpm run check` é o gate do CI (AD-031) junto de `pnpm docs:check`.

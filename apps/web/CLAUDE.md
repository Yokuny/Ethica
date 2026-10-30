# Ethica Web — Regras do Front-End

Front-end do Ethica: multi-tenant, gestão de perícias (perícias, agenda, financeiro, prospecção), API em `apps/api`.

**Arquitetura e padrões de código: skill `ethica-web-standards`** (`.agents/skills/ethica-web-standards/SKILL.md`).
Leia antes de criar página, módulo, sub-rota, componente, formulário ou query, e para entender a estrutura do front. Ela é a fonte única — não duplique regra aqui.

## Stack

React 19 + **Vite 7** (nunca `8.x`: o resolver Rolldown não resolve os imports `.js`→`.tsx` e quebra o dev server em silêncio) + TypeScript 5 (`moduleResolution: nodenext` — todo import relativo/`@/` leva `.js`, mesmo apontando para `.tsx`) + TanStack Router 1 (por arquivo, `autoCodeSplitting`) + TanStack Query 5 + TanStack Table 8 + Tailwind 4 + shadcn/Base UI (`packages/ui`) + react-hook-form 7 + Zod 4 + recharts 3 (via `@ethica/ui/components/chart`, AD-104) + `lucide-react` + Biome 2.

## Verificação (sempre, ao terminar)

```bash
pnpm run format                  # Biome, da raiz do monorepo
pnpm run check                   # tsc --noEmit + biome check + vitest
(cd apps/web && pnpm run build)  # único passo que empacota o app de fato
```

`check` não pega import quebrado que só o Rollup do build resolve. `build` é silencioso no sucesso; se ficar verboso passando, é o router-plugin avisando de arquivo sem `Route` — cubra o padrão em `routeFileIgnorePattern` (`vite.config.ts`). Typecheck não é verificação visual: renderize a tela real.

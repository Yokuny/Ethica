# Temas — tasks

Gate: `pnpm run check` e `(cd apps/web && pnpm run build)`. Entrega num commit só (código + docs).

1. **AD-237** em `.specs/STATE.md`.
2. **Tokens** — `.dark` e `.blue` em `apps/web/src/theme.css`, variante `dark:` nos dois.
3. **Mecanismo** — `main.tsx` (três temas, sem `forcedTheme`), script do `index.html`, `ThemeOptions` no menu do
   usuário, chaves `theme`/`light`/`dark`/`blue` no dicionário, `Toaster` com `light`/`dark`.
4. **Cor de ação nos detalhes** — `apps/web/src/components/step-list.tsx`.
5. **Paletas fixas** — `packages/ui/src/components/badge.tsx`, `apps/web/src/routes/_private/agenda/@consts/calendar.ts`,
   canvas da assinatura.
6. **Conferência visual** — lista, registro, agenda, dashboard, `StepList`, login nos três temas.
7. **Registro** — `apps/web/DESIGN.md`, `docs/features/temas/feature.md`, `docs/roadmap.md`, `pnpm docs:sync`.

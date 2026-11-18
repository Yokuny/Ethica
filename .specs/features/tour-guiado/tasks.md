# Tour guiado — tasks

Um commit por task. Gate de cada uma: `pnpm run check`; nas que mexem no web, também `(cd apps/web && pnpm run build)`.

1. **AD-233 e glossário** — entrada em `.specs/STATE.md` (tour com o `Popover` do projeto, sem biblioteca;
   `onboardingDismissed` reaproveitada) e termo "Tour guiado" (`GuidedTour`) em `docs/glossary.md`.
2. **`anchor` no `PopoverContent`** — `packages/ui/src/components/popover.tsx` repassa `anchor` ao `Positioner`.
3. **Alvos e passos** — `data-tour` em `workspace-navigation.tsx` (itens e grupo Configurações) e `user-menu.tsx`;
   `apps/web/src/routes/_private/@consts/tour-steps.ts`; chaves novas no dicionário (`translate.helper.ts`), conferindo
   antes as existentes (`next`, `back`, `skip`, `finish`…).
4. **`GuidedTour`** — `apps/web/src/routes/_private/@components/guided-tour.tsx` (filtro por `sections`/admin,
   destaque, balão ancorado ou centralizado, Voltar/Próximo/Pular/Concluir, grava `onboardingDismissed`), montado em
   `_private/route.tsx`; "Ver tour" no menu do usuário; comentário de `preferences.schema.ts` atualizado.
   Teste unitário `guided-tour.unit.test.tsx`: abre com `false`, passos por permissão, Pular grava `true`.
5. **Conferência visual** — desktop (menu aberto e recolhido) e celular (360 px), tema claro e escuro.
6. **Registro** — `docs/features/tour-guiado/feature.md`, `docs/roadmap.md`, `pnpm docs:sync`.

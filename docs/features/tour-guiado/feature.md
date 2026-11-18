---
feature: Tour guiado
slug: tour-guiado
descricao: Tour no primeiro acesso que destaca as seções do menu conforme as permissões da pessoa, reaberto por "Ver tour"
data: 2026-11-18
status: concluido
areas: [apps/web, packages/ui]
decisoes: [AD-233, AD-137, AD-087]
spec: [.specs/features/tour-guiado]
---

# Tour guiado

**Status**: concluido · **Atualizado**: 2026-11-18 · **Áreas**: `apps/web`, `packages/ui`

> Documento vivo. Requisitos e desenho em `.specs/features/tour-guiado/spec.md` (congelado).
> Correlação com o git: `git log --oneline -i --grep='tour-guiado'`.

## O que foi feito

- No primeiro acesso à área logada abre um tour breve: boas-vindas, uma parada por seção principal do menu
  (Serviços, Prazos e Alertas, Agenda, Logística, Laudos, Financeiro), o escritório (só admin) e a conta.
- Cada parada destaca o item do menu com um contorno e mostra o balão ao lado, com o andamento ("3 de 9"), Voltar,
  Próximo/Concluir e Pular. Esc também encerra.
- Só aparecem as seções que a pessoa vê no menu (matriz de permissões): o operador sem financeiro não vê o Financeiro.
- Concluir ou pular grava que a pessoa já viu o tour, em qualquer aparelho. **"Ver tour"** no menu do usuário
  (rodapé do menu lateral) reabre o tour a qualquer momento.
- No celular, onde o menu é uma gaveta fechada, os mesmos passos aparecem em balões no centro da tela.

## Por que

Com muitas seções, quem entra pela primeira vez não sabe por onde começar. O tour usa os componentes do próprio
projeto (`Popover` e `Dialog`), sem biblioteca, e só aponta para o menu, que existe em qualquer tela. O estado é a
preferência `onboardingDismissed` que a API já guardava por pessoa (AD-233).

## Como

### `apps/web`

- `apps/web/src/routes/_private/@components/guided-tour.tsx` — o tour: monta os passos, destaca o alvo
  (`data-tour-active`), balão ancorado ou centralizado e grava `onboardingDismissed`.
- `apps/web/src/routes/_private/@consts/tour-steps.ts` — seções que o tour apresenta e os passos fixos (boas-vindas,
  escritório, conta). Título e texto das seções são os mesmos do menu (`HOME_SECTIONS`).
- `apps/web/src/routes/_private/route.tsx` — monta o tour no shell, valendo para qualquer rota.
- `apps/web/src/routes/_private/@components/workspace-navigation.tsx` e `apps/web/src/components/user-menu.tsx` —
  alvos `data-tour` (item = rota, grupo Configurações = `admin`, menu do usuário = `account`) e o item "Ver tour".
- `apps/web/src/index.css` — contorno do alvo (`[data-tour-active]`).

### `packages/ui`

- `packages/ui/src/components/popover.tsx` — `PopoverContent` aceita `anchor`.

## Como testar

- Automático: `pnpm vitest run --project unit apps/web/src/routes/_private/@components/guided-tour`.
- Manual: entre no sistema; o tour abre. Para rever, menu do usuário (rodapé do menu lateral) → **Ver tour**. Confira
  com o menu aberto e recolhido, no celular e com um operador (`operator@pericias.example.com` do `seed:demo`).

## Pendências

- [ ] Conferir no navegador (computador com menu aberto e recolhido, celular, tema claro e escuro) e revisar os textos.

## Histórico

- 2026-11-18 — Spec criada (`.specs/features/tour-guiado/spec.md`) e implementada (AD-233). Divergência da spec: as
  paradas das seções usam o título e o texto que o menu já tem (`HOME_SECTIONS`), em vez de textos próprios; por
  isso Campo aparece como "Logística" e Serviços sem a dica do PDF.

## Referências

- Spec e tasks (congelados): `.specs/features/tour-guiado/`

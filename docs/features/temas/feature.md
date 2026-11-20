---
feature: Temas
slug: temas
descricao: Temas Claro, Escuro e Azul escolhidos no menu do usuário, com uma cor de ação por tema nos botões e nos detalhes
data: 2026-11-20
status: parcial
areas: [apps/web, packages/ui]
decisoes: [AD-237]
spec: [.specs/features/temas]
---

# Temas

**Status**: parcial · **Atualizado**: 2026-11-20 · **Áreas**: `apps/web`, `packages/ui`

> Documento vivo. Requisitos e desenho em `.specs/features/temas/spec.md` (congelado).
> Correlação com o git: `git log --oneline -i --grep='temas'`.

## O que foi feito

- Três temas no menu do usuário (rodapé do menu lateral → **Tema**): **Claro** (o de sempre, padrão), **Escuro**
  (grafite) e **Azul** (fundo azul-marinho, ação em amarelo mostarda dourado). Vale na hora e fica lembrado no
  aparelho, sem piscar o claro ao abrir; a barra de status do celular acompanha o fundo.
- Uma cor de ação por tema: botão primário e os detalhes de destaque (asterisco e cantos do `StepList`, hoje da
  agenda, aba ativa do celular, progresso, seleção, linha do agora). No Claro ela é o grafite, no Escuro o quase
  branco, no Azul o dourado (com texto azul-marinho por cima).
- Selos, blocos da agenda e as vitrines da tela de acesso ganham tons próprios nos temas escuros; a assinatura da
  vistoria continua tinta escura em papel branco.

## Por que

Pedido do usuário (2026-11-19): poder trocar o tema e ter uma cor de ação só, aplicada também nos detalhes. Os
detalhes seguem a cor de ação, então no Azul o dourado é a ação e o azul é o fundo (AD-237). Supersede a regra de
tema claro único do `apps/web/DESIGN.md`.

## Como

- `apps/web/src/theme.css` — tokens por classe: `:root` (Claro), `.dark, .blue` (status, sombras, `color-scheme`),
  `.dark` e `.blue` (superfícies, texto, link, ação, borda, menu). A variante `dark:` vale nos dois temas escuros.
- `apps/web/src/main.tsx` — `ThemeProvider` do `next-themes` com `light`/`dark`/`blue`, sem seguir o sistema e sem
  `color-scheme` em linha (vem do CSS).
- `apps/web/index.html` — aplica o tema salvo (`localStorage.theme`) e a `theme-color` antes do primeiro paint.
- `apps/web/src/components/user-menu.theme.tsx` — opções do menu; `user-menu.tsx` monta o submenu **Tema**.
- `apps/web/src/components/step-list.tsx` — asterisco e cantos em `text-primary`.
- Cores fixas com contraparte `dark:`: `packages/ui/src/components/badge.tsx`,
  `apps/web/src/routes/_private/agenda/@consts/calendar.ts`, `apps/web/src/routes/_public/auth/@components/showcase-{agenda,route}.tsx`.
- `packages/ui/src/components/sonner.tsx` — o aviso recebe `light`/`dark` (o Sonner não conhece `blue`).

Cor nova em tela: use os tokens (`bg-primary`, `text-foreground`, `bg-status-*`…). Cor da paleta do Tailwind só com a
contraparte `dark:` ao lado.

## Como testar

- Manual: menu do usuário → **Tema** → Escuro / Azul / Claro; recarregue a página (não pode piscar o claro). Confira
  lista de Serviços, um serviço aberto, Agenda (blocos por tipo), Dashboard, Conta/Escritório (`StepList`) e a tela de
  acesso.

## Pendências

- [ ] Conferir as telas logadas nos três temas (lista, registro, agenda, dashboard, `StepList`, celular). A tela de
  acesso foi conferida no navegador nos três; as logadas ficaram sem conferência porque o login exige passkey.

## Histórico

- 2026-11-20 — Spec (`.specs/features/temas/spec.md`) e implementação (AD-237). Divergência da spec: as vitrines da
  tela de acesso também ganharam tons escuros (mapa e agenda de exemplo); o `next-themes` deixou de gravar
  `color-scheme` em linha, porque gravava `light` no Azul.

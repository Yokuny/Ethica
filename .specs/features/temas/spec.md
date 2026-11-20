# Temas — spec

**Data**: 2026-11-19 · **Pedido**: usuário ("implementar temas e padronizar a cor dos botões de ação; a cor de ação
dos botões também nos detalhes de alguns componentes, como o asterisco do `StepList`; criar os temas Escuro e um azul
com detalhes em amarelo mostarda dourado").

## Problema

O `apps/web` tem um tema claro único e travado (`forcedTheme="light"`, `DESIGN.md` proíbe troca de paleta). Quem passa
o dia no sistema não tem opção de fundo escuro, e alguns detalhes decorativos (asterisco laranja e cantos vermelhos do
`StepList`) usam cores próprias, fora da cor de ação.

## Requisitos

- **TEM-01** Três temas: **Claro** (o atual, padrão), **Escuro** (grafite) e **Azul** (fundo azul-marinho, ação em
  amarelo mostarda dourado).
- **TEM-02** A escolha fica no menu do usuário ("Tema", ao lado de "Tamanho do texto"), vale na hora e é lembrada no
  aparelho, sem piscar o tema claro ao abrir.
- **TEM-03** Uma cor de ação por tema (`--primary`): botão primário e os detalhes de destaque (asterisco e cantos do
  `StepList`, hoje da agenda, aba ativa do celular, progresso, seleção, linha do agora) leem a mesma cor. No Azul ela é
  o dourado; no Claro, o grafite; no Escuro, o quase branco.
- **TEM-04** Todo texto, selo, gráfico, link e bloco da agenda continua legível nos três temas.
- **TEM-05** A assinatura da vistoria continua tinta escura em papel branco em qualquer tema (vai para o laudo).

## Design (inline)

- **Mecanismo**: o `ThemeProvider` do `next-themes` que já existe em `apps/web/src/main.tsx` deixa de forçar o claro:
  `themes={['light', 'dark', 'blue']}`, classe no `html`, sem seguir o sistema. Sem hook novo: a escolha usa
  `useTheme()`. O script do `apps/web/index.html` aplica a classe salva (`localStorage.theme`) e a `theme-color` antes
  do primeiro paint, como já faz com o tamanho do texto.
- **Tokens**: `apps/web/src/theme.css` mantém o `:root` claro; `.dark, .blue` compartilham o que é de fundo escuro
  (status, sombras, `color-scheme`), e cada classe define superfícies, texto, link, ação, borda e sidebar. A variante
  `dark:` passa a valer nos dois temas escuros (`@custom-variant dark (&:is(.dark *, .blue *))`), ativando os `dark:`
  que os primitivos de `packages/ui` já têm.
- **Ação**: nenhum token novo. `--primary`/`--primary-hover`/`--primary-foreground` são a cor de ação; o `StepList`
  troca `text-orange-500` e o `#FF0000` por `text-primary`/`currentColor`. Texto sobre o dourado é o azul-marinho do
  fundo (contraste ≈ 7,7:1), não branco.
- **Paletas fixas**: o `Badge` (`packages/ui`) e as cores por tipo da agenda (`TYPE_COLORS`) ganham contrapartes
  `dark:`; o `Toaster` recebe `light`/`dark` (o Sonner não conhece `blue`); o canvas da assinatura fica `bg-white`.
- Supersede a regra de tema claro único do `apps/web/DESIGN.md` (AD-237).

## Fora do escopo

- Seguir o tema do sistema operacional; preferência salva na conta (fica no aparelho, como o tamanho do texto).
- Ícones do app instalado (`manifest.webmanifest`) por tema.

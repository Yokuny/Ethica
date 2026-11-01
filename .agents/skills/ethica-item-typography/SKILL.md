---
name: ethica-item-typography
description: Regra de texto do Ethica (AD-073 e AD-087). Todo texto visível em apps/web usa ItemTitle ou ItemDescription; a base visual fica nos primitivos e ajustes pontuais usam className. Use ao escrever ou revisar texto, tipografia e links no front.
---

# Tipografia por ItemTitle e ItemDescription

`ItemTitle` e `ItemDescription` (`@ethica/ui/components/item`) são os wrappers de todo texto visível em `apps/web`. Eles fornecem família Geist, tamanho, peso, cor e quebra padrão. Escolha um dos dois pelo papel do texto e use apenas as classes locais necessárias para o resultado, como no DentalEase. Não crie props de variantes tipográficas nos primitivos.

`ItemTitle` começa em 14px/semibold e herda a cor. `ItemDescription` começa em 14px/normal, cor secundária e corte em duas linhas. Para texto inteiro, use `className="line-clamp-none"`; para cor herdada em badge ou botão, `className="text-inherit"`. Títulos, números e captions podem receber classes locais pequenas (`text-xl`, `font-normal`, `uppercase`, etc.). Os tokens de cor e fonte vêm de `apps/web/src/theme.css`.

`ItemTitle` renderiza `div` e `ItemDescription` renderiza `p`; não existe `as`. `render` troca a tag quando a semântica pede (`render={<h2 />}`, `<dt />`, `<dd />`, `<label htmlFor="…" />`, `<legend />`) e compõe `Link`, `a` ou `button` sem perder o wrapper de texto. Link textual para outra tela é sempre `AppLink` (`@/components/app-link.js`, AD-089): `<Link/>` sobre `ItemTitle` (padrão) ou `ItemDescription` (`as="description"`), com a classe `link` (azul escuro, sublinhado tracejado) e `ArrowUpRight` já incluídos — não monte essa combinação à mão. `className` só ajusta tamanho/quebra. Dentro de botão ou linha de texto, use o componente direto: não troque a tag por `span`.

```tsx
<ItemDescription className="font-medium text-xs uppercase tracking-wide">{label}</ItemDescription>
<ItemTitle render={<h2 />} className="text-2xl text-impact">{name}</ItemTitle>
<ItemDescription className="text-inherit line-clamp-none">{meta}</ItemDescription>
<ItemDescription role="alert" className="text-destructive line-clamp-none">{message}</ItemDescription>
<AppLink to="/expert-cases/details" search={{ id }}>{name}</AppLink>
<AppLink to="/expert-cases/details" search={{ id }} as="description">{name}</AppLink>
```

Não escreva texto visível diretamente em `p`, `span`, `h1–h6`, `dt`, `dd`, `label`, `a` ou `button` no código da tela. Primitivos que já têm tipografia própria (`Button`, `Badge`, `Table*`, `CardTitle`, `DialogTitle`, `Breadcrumb`, `Label`, `Form*` etc.) não precisam de wrapper adicional. Texto solto em `TableCell` também pode usar a tipografia da célula. Ícones, texto `sr-only` e tags usadas apenas para layout são exceções.

## Verificação

```bash
node .agents/skills/ethica-item-typography/scripts/scan.mjs --summary
pnpm exec tsc --noEmit -p apps/web
pnpm vitest run --project unit apps/web/src/components
```

O scanner aponta texto em tags cruas (`raw`); classes nos dois wrappers são permitidas pela AD-087. O codemod antigo, que convertia classes em props, foi aposentado. Ao tocar um módulo, atualize testes que esperam uma tag específica somente quando a semântica renderizada mudou; mantenha consultas por papel e nome acessível sempre que possível.

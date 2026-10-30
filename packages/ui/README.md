# UI compartilhada

Base shadcn/Base UI para `apps/web`. Os componentes usam tokens semânticos fornecidos pelo tema da
aplicação; o pacote não importa CSS de marca, roteador, sessão, API ou componentes das aplicações.

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@ethica/ui/components/card';
import { Button } from '@ethica/ui/components/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@ethica/ui/components/chart';
```

A aplicação inclui `@source "../../../packages/ui/src"` no CSS de entrada para o Tailwind gerar as
classes do pacote. Os exports por componente evitam carregar bibliotecas não utilizadas. React e
React DOM são peer dependencies.

`components.json` aponta o shadcn para esta base. Composições e personalizações exclusivas ficam
próximas dos usos, no web: `components/page-card.tsx` (breadcrumb, menu e títulos de rota),
`panel.tsx`, `data-table.tsx`, `record.tsx`, `form-fields.tsx`, `money-input.tsx`,
`date-picker.tsx` e `fluxo-financeiro-chart.tsx`.

`chart.tsx` segue o molde do shadcn sobre recharts 3 (AD-104): cores por `config` com tokens do tema.

Ao adicionar um componente, compartilhe a primitiva. Mantenha regras de negócio, status do domínio e
integrações de navegação na aplicação consumidora.

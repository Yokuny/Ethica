# Tradução (`t()`) e datas

Dicionário: `apps/web/src/lib/helpers/translate.helper.ts` (objeto TS pt-BR, sem lib de i18n).
`t(key)` devolve a própria `key` se ela não existir — chave errada aparece crua na tela.

## Regras de chave

1. **Busque e reaproveite antes de criar** (pelo texto e pelo conceito). Genérico existente
   (`details`, `active`, `information`) vence específico novo.
2. **Plana**: `^[a-z0-9]+(_[a-z0-9]+)*$`. Nunca `.`, nunca prefixo de tela/feature.
3. **Nomeia o texto, não o lugar**: `product.list.title` ❌ → `catalog` ✅;
   `customer.create.error` ❌ → `create_error` ✅.
4. Texto específico só quando duas coisas do mesmo papel dividem a tela (`new_commitment` ao lado de `new_entry`).
5. **Um texto = uma chave.** Exceções: chave que é valor de enum (`pending`, `pending_approval`) e homônimos de sentido diferente.
6. Chave nova: 1:1 com o texto, curta, no grupo certo do dicionário (comentário só de categoria).
7. **Chave dinâmica nunca é concat**: enum → `t(order.status)` (todo valor do enum no dicionário);
   índice → array exportado (`WEEKDAY_KEYS[n]`).
8. Pasta de rota com filhos `add`/`details` precisa de chave homônima ao segmento da URL
   (`pericias`, `agenda`…): o breadcrumb resolve o segmento sem `staticData` por `t(segmento)`.
9. Remova a chave junto com o último uso.
10. `translate.helper.unit.test.ts` trava 2, 7 e chave inexistente — rode `pnpm run check`.
11. **`message` da API é chave** (`API_MESSAGE_KEYS`, `packages/contracts/src/response/messages.ts`);
    o cliente já traduz → `toast.error(error.message)`, nunca `t(res.message)` de novo. Chave nova
    na API = entrada em `API_MESSAGE_KEYS` + no dicionário.

Literal sem `t()` só para erro de desenvolvedor que nunca chega ao usuário.

## Datas

Tudo que é exibido passa por `@/lib/helpers/formatDate.helper.js`: `formatDate` (`1 jun 2026`),
`formatTime` (`14:05`), `formatDateTime`, `formatDistanceToNow`. Nada de padrão passado pelo
chamador, `toLocaleDateString`, `Intl.DateTimeFormat` ou `date-fns` fora do helper.
`YYYY-MM-DD` é data de parede (sem fuso); instante sai no `DISPLAY_TIMEZONE`.
`displayTime.helper.ts` é formato de dado (search param, valor de input), nunca texto de tela.

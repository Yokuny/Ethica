# Filtros das listas — design

- **API**: os filtros de opções viram listas. Na URL, chave repetida (`phase=a&phase=b`); o Express 5 (parser
  `simple`) entrega string ou array, e `queryListSchema(item)` (`packages/contracts/src/schemas/query-list.schema.ts`)
  normaliza para array. Repositórios usam `$in`. Tipo do serviço: `$or` entre papéis sem tipo próprio e tipos próprios.
  Cidades de Varas recebem várias UFs.
- **Web**: `DataTable` recebe `filters={{ items: TableFilterItem[] }}` (no lugar de `content`/`active`). Item de opções
  (`{ label, items, value, onChange }`) ou de campos (`{ label, summary, content }`). O popover guarda o filtro aberto;
  sai `TableFilterSelect` e o seletor próprio do Diário. `options` (filtro único, Partes) fica igual.
- **URL da tela**: os filtros de opções são arrays no search do TanStack Router.

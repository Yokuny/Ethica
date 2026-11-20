# Logística em páginas por intenção — Design

Decisão: AD-239 (supersede AD-194 item 2 e a regra de período da AD-208).

## Rotas (`apps/web/src/routes/_private/field/`)

```
field/
├── index.tsx                      # hub: PageIntro + LinkCardList (LOG-01)
├── map/index.tsx                  # mapa + lista do que está no mapa (LOG-03)
├── route/index.tsx                # planejamento de rota (LOG-04)
├── inspections/
│   ├── index.tsx                  # vistorias agendadas (LOG-05)
│   ├── @components/field-card.tsx, navigation-icons.tsx
│   ├── @hooks/use-quick-status.ts
│   └── details/                   # registro (antes /field/inspection), LOG-06, LOG-07
├── @components/                   # compartilhado: map-leaflet, field-connection, range-nav
├── @hooks/use-field-range.ts      # from/to da URL + consulta do período + startSync
├── @interface/field.interface.ts  # fieldSearchSchema { from, to, focus }
├── @utils/range.ts                # shiftRange, rangeLabel (substitui period.ts)
└── @consts/field-labels.ts
```

- `route/@components/`: `field-route.tsx` (o que era `field-map.tsx`, sem o papel de "mapa do dia"), `travel-cost`, `route-places`; `route/@utils/`: `itinerary`, `travel-cost`, `route-places`; `route/@hooks/use-travel-cost`; `route/@interface/travel-cost`.
- Sai `view` (Mapa/Lista), `period` e `FIELD_PERIODS`/`FIELD_VIEWS`, `@utils/period.ts`.
- `RangeNav` (`field/@components/range-nav.tsx`): `PeriodNav` com o botão do meio abrindo um `Popover` com `Calendar mode="range"` (`max` 365 noites, a API aceita até 366 dias); o rótulo é o dia ou "dd/mm – dd/mm/aaaa".
- Consulta: `inspectionPeriodQuery({ from, to })` sem `type` (todos os compromissos), `networkMode: 'always'`; cada página que abre sem rede mantém `startSync`.
- Links atualizados: `mobile-dock`, `home-sections`, `tour-steps`, `workspace-navigation` seguem em `/field` (hub); `case-inspections`, `appointment-detail` e `field-card` passam a `/field/inspections/details`.

## Termo da vistoria (API)

- `GET /documents/inspections/:appointmentId` (`can('agenda', 'view')`), no módulo `documents` como `sheet`/`checklist`: `documentsService.generateInspection` lê `inspectionService.getInspection` e as mídias (`getMedia`) de fotos e assinaturas em data URL; `inspectionHtml` em `documents.templates.ts` usa `buildDocument`. Assinatura sem arquivo vira linha em branco. Compromisso inexistente: 404 (`AppointmentNotFoundError`).
- Rótulos de qualidade dos presentes e lados em pt-BR no `LABELS` de `document.layout.ts`.

## Termo da vistoria (web)

- Aba Observações: `signatures-panel.tsx` com a lista dos presentes (nome, qualidade, Assinado / Colher assinatura, reaproveitando `SignatureDialog`) e o botão "Pré-visualizar PDF" → `PdfPreviewDialog path="/documents/inspections/:id"` com Baixar.
- O botão fica desligado sem conexão ou com rascunho/mídia pendente do compromisso (`readDraft` + `pendingMedia` do `store`), com o motivo escrito.

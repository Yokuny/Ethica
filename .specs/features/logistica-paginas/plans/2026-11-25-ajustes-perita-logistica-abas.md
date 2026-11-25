# Ajustes da perita — contagem nas abas, logística, deslocamento, tipos de compromisso e dashboard (2026-11-25)

Pedido do usuário com prints e falas da perita. Ajustes pequenos em várias áreas; sem spec (cada um ≤3 passos).

## Itens

1. **Contagem nas abas** de Notificações (Abertas/Resolvidas) e Laudos (Todos + situações).
   A listagem devolve `counts` no mesmo `aggregate` (`$facet` com `$group`), com os mesmos filtros da lista
   menos a própria aba. Sem documento de contador gravado: contar na consulta é exato e não desatualiza.
   Arquivos: `apps/api/src/modules/notifications/notification.repository.ts`,
   `apps/api/src/modules/documents/report.repository.ts`, `apps/web/src/query/{notification,report}.ts`,
   as duas páginas (com `placeholderData: keepPreviousData` para o número não piscar na troca de aba).
2. **Serviços agendados**: cartão com menos espaço vertical (`field-card.tsx`).
3. **Planejamento de rota**:
   - "Partir da minha localização" ordena por proximidade **dentro de cada dia**, dias em ordem
     (`sortByProximity` em `field/@utils/itinerary.ts`); antes misturava os dias (17 → 16 → 22).
   - Link "Editar" em cada parada → `/agenda?date=<dia>&appointmentId=<id>`, que abre o compromisso
     já em edição; fechar limpa o parâmetro.
4. **Deslocamento sem duplicar** (AD-301): a despesa vence no primeiro dia da rota; antes de lançar,
   procura despesas de deslocamento **previstas** das OS escolhidas com vencimento entre o primeiro e o
   último dia da rota. Achou → diálogo "Substituir": cria as novas e só então apaga as antigas.
   API: filtro `category` em `GET /finance/entries`.
5. **Tipos de compromisso** (AD-302): Avaliação (`appraisal`), Inspeção (`technical_inspection`),
   Perícia (`expert_examination`), além de Vistoria, Audiência, Reunião e Outro (por último).
   Glossário antes do código; cores, selos, iCal, PDF e aviso por e-mail.
6. **"Serviços entregues"** na faixa de Serviços: chave `services_delivered` de ponta a ponta
   (API, web, e2e), sai `reports_delivered`.
7. **Mix de serviços** com escolha do mês: "Desde o início" (padrão) ou um mês do `byMonth` que a
   página já recebe; sem mudança na API.

## Verificação

`pnpm run format && pnpm run check && (cd apps/web && pnpm run build)`; conferir abas e cartão na tela.

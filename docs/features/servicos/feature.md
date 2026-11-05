---
feature: Serviços
slug: servicos
descricao: Seção Perícias vira Serviços, com tipo de serviço (inclusive do escritório), status, pagamento, despesas, líquido e data da perícia
data: 2026-11-02
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-158, AD-159, AD-160, AD-184, AD-185]
spec: [.specs/features/servicos]
branches: [main]
---

# Serviços

**Status**: concluido · **Atualizado**: 2026-11-02 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='servicos'`.

## O que foi feito

- A seção "Perícias" se chama "Serviços" na tela (menu, títulos, listas, avisos); "perícia" fica onde é o ato (data da perícia, vistoria). No código o termo continua `Case`.
- O cadastro pergunta o **tipo de serviço** numa lista: Perícia civil, Perícia trabalhista, Assistência técnica civil, Assistência técnica trabalhista, Perícia federal, Assistência técnica federal, os tipos que o escritório já criou e "Cadastrar novo" (nome + atuação). No tipo novo, número do processo e tribunal são opcionais.
- **Status do serviço** (Proposta enviada, Em andamento, Entregue, Com pendência, Cancelado) no cadastro, edição, detalhe e listagem, ao lado das etapas e fases, que continuam.
- No detalhe, o painel **Financeiro do serviço** mostra honorário, pagamento (Sim, Não ou Parcial, pelos recebimentos lançados) com o valor recebido, despesas e **honorário líquido**, e lança despesa.
- **Despesas** com as categorias Deslocamento, Equipamentos, Terceiros, Materiais, Taxas, Alimentação, as criadas pelo escritório e "Cadastrar nova despesa" (também na tela de lançamentos do financeiro).
- **Data, hora e local da perícia** no cadastro viram um compromisso de perícia (1 hora) na agenda, ligado ao serviço; o local aceita endereço completo ou coordenada "lat, long", que vai direto para o mapa do dia.

## Por que

A perita trabalha com serviços que nem sempre são nomeação judicial e quer ver, por serviço, se foi pago e quanto sobra depois das despesas. As escolhas foram dela (2026-11-02): status novo ao lado das etapas, pagamento automático pelos recebimentos, líquido sobre o honorário fixado/contratado (ou o proposto) e número de processo opcional só no tipo novo.

Não desfazer sem ler: tipo novo é `courtType: 'other'` + `serviceType` (nome), sem coleção própria (AD-158); categoria nova de despesa é `other_expenses` + `categoryName` (AD-159); a data da perícia chega à agenda pelo evento `case:inspection_scheduled` porque `case` não depende de `agenda` (AD-160).

## Como

### `apps/api`

- `apps/api/src/modules/case/case.service.ts` — valida tipo × número/tribunal (`validServiceType`) no cadastro e na edição; tipo judicial apaga o nome do tipo; emite `case:inspection_scheduled`; `listServiceTypes`.
- `apps/api/src/modules/case/case.repository.ts` — `null` vira `$unset`; `listServiceTypes` (nomes já usados); resumo da perícia leva o objeto.
- `GET /expert-cases/service-types` e `GET /finance/expense-names` (`case.router.ts`, `transaction.router.ts`).
- `apps/api/src/events/subscribers/agenda.subscriber.ts` — cria o compromisso de perícia.
- `apps/api/src/modules/agenda/appointment.service.ts` — `geocode` usa a coordenada digitada sem o geocodificador.
- Nome do serviço em e-mail, iCal, lançamentos e laudos: `caseLabel` (número do processo ou, sem ele, o objeto); arquivos sem número usam o id.

### `apps/web`

- `apps/web/src/routes/_private/expert-cases/@components/service-type-field.tsx` — lista "Tipo de serviço".
- `apps/web/src/routes/_private/expert-cases/@components/case-form-fields.tsx` — status do serviço e data/hora/local da perícia (só no cadastro).
- `apps/web/src/routes/_private/expert-cases/details/@components/case-finance.tsx` + `@utils/case-finance.ts` — pagamento, despesas e líquido; `expense-form.tsx` lança despesa.
- `apps/web/src/components/expense-category-field.tsx` — categoria de despesa com "Cadastrar nova despesa".
- `apps/web/src/components/case-labels.ts` — rótulos de tipo e status do serviço.

### `packages/contracts`

- `packages/contracts/src/schemas/case.schema.ts` — `JUDICIAL_COURT_TYPES` + `other`, `SERVICE_STATUS`, `caseInspectionSchema`, `validServiceType`, `caseLabel`, `parseCoordinates`.
- `packages/contracts/src/schemas/transaction.schema.ts` — categorias de despesa e `categoryName`.

### `packages/db`

- `packages/db/src/models/case.model.ts` — `serviceType`, `serviceStatus`; número e tribunal opcionais; índice único do número só quando existe. `syncIndexes()` do `Case` troca o índice antigo na subida da API.
- `packages/db/src/models/transaction.model.ts` — `categoryName`.

## Como testar

```
pnpm vitest run apps/api/src/modules/case/service.router.e2e.test.ts apps/web/src/routes/_private/expert-cases/details/@utils
```

- UAT: Serviços → Novo serviço → escolher "Cadastrar novo" tipo, salvar sem número; conferir o compromisso na agenda quando houver data da perícia; no detalhe, lançar despesa com categoria nova e conferir pagamento e líquido.

## Pendências

- [ ] Rodar `pnpm --filter api run search:provision` no banco de produção (índice `case_text` ganhou `serviceOrder`, AD-185).
- [ ] Conferência visual das telas no navegador (o navegador interno recusou abrir a página local em 2026-11-02).
- [ ] Relatório financeiro por categoria soma as categorias novas em "Outras despesas".
- [ ] Excluir ou renomear tipo de serviço e categoria criados pelo escritório.
- [ ] Banco de teste local criado antes de 2026-11-02 guarda o índice antigo do número do processo: apague `Tenant_1_processNumber_1` de `cases` (o servidor troca sozinho no banco da aplicação).

## Histórico

- 2026-11-04 — Filtro Número de controle acha a OS por qualquer pedaço (o número sozinho basta), também pela busca da lista; Cliente | Comarca mostra só o nome do contratante fora da perícia (AD-185). Índice de busca mudou: rodar `pnpm --filter api run search:provision` em cada banco.

- 2026-11-04 — Lista de Serviços com as colunas Controle (OS), Serviço, Contratante, Tipo de serviço, Cliente | Comarca (tribunal e vara na perícia; contatos do contratante nos outros tipos), Fase, Próximo prazo e Honorários, com largura parelha nas colunas de texto, e filtro por Número de controle (AD-184). Falta a conferência visual com dados.

- 2026-11-03 — Tipo do escritório ganha contratante, atuação e status digitados, data de entrega e pagamento no cadastro: feature `tipo-servico-proprio` (AD-176).

- 2026-11-03 — Blocos recolhidos do detalhe do serviço ficam na mesma caixa arredondada, com ícone, de Juízo, Partes e Observações (`icon` no `Panel` recolhível). Lista de serviços ganha a coluna Partes (reclamante em cima, reclamada embaixo; sem advogados) entre Processo e Tipo de serviço.

- 2026-11-03 — Detalhe do serviço mais compacto: prazos, vistorias, laudos, movimentações, financeiro, contato da vara e próximos compromissos começam recolhidos e abrem pelo título (`collapsible` em `apps/web/src/components/panel.tsx`, AD-172).

- 2026-11-03 — Data da perícia também na edição, movendo o compromisso; vencimentos do financeiro na agenda (`agenda-eventos`, AD-169).
- 2026-11-03 — Status do serviço passa a lista única no lugar de etapa, fase e status (`rotina-servico`, AD-166).
- 2026-11-03 — Partes com os advogados dentro, data e hora da perícia opcionais e OS no cadastro (`partes-servico`, `novo-laudo`, AD-161, AD-164, AD-165).
- 2026-11-02 — Feature entregue a pedido da perita (AD-158 a AD-160).

## Referências

- Spec/tasks (congelados): `.specs/features/servicos/`

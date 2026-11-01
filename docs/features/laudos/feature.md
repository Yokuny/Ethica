---
feature: Laudo automatizado
slug: laudos
descricao: Modelos de laudo por seções sim/não com variáveis do processo, parecer técnico e exportação em PDF e Word
data: 2026-10-31
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-103, AD-107, AD-113, AD-119, AD-121, AD-123, AD-124, AD-125, AD-126, AD-127]
spec: [.specs/features/laudos]
branches: [feat/laudos]
---

# Laudo automatizado

**Status**: concluido · **Atualizado**: 2026-10-31 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), o código é a fonte da
> verdade. Correlação com o git: `git log --oneline -i --grep='laudos'`.

## O que foi feito

- **Modelos de laudo** (`/expert-reports/templates`): biblioteca padrão (laudo pericial trabalhista e parecer técnico), só leitura e duplicável; modelos do escritório com seções numeradas pelo nível, "apenas título", quebra de página e texto "sim" e "não" num editor rico com "Inserir variável". Só admin e gestor criam e editam.
- **Iniciar laudo** (`/expert-reports/add` ou "Iniciar laudo" no detalhe da perícia): escolhe a perícia, o modelo do tipo certo e marca as seções com a variante de cada uma; o rascunho nasce com os dados do processo preenchidos.
- **Redigir** (`/expert-reports/details`): uma seção por vez, com as variáveis sem valor destacadas e apontadas; remover seção renumera.
- **Exportar** PDF e Word com capa, sumário, seções, cabeçalho e rodapé do escritório; variável sem valor bloqueia exportar e concluir.
- **Concluir**: o laudo fica só para leitura (também na API) e, com "Registrar a entrega", protocola o prazo "Entrega do laudo", lança a movimentação de entrega e avança a etapa da perícia.
- **Parecer técnico** para a perícia em que o escritório é assistente técnico, com modelo próprio (medições com o perito, quesitos complementares e suplementares, impugnação); as partes saem como reclamante/reclamada ou autor/réu pela justiça.

## Por que

O laudo era escrito fora do Ethica, redigitando número, partes e datas e repetindo a fundamentação da NR-15/NR-16 (`.specs/features/laudos/spec.md`). O texto é HTML de um editor Tiptap saneado na API por uma allowlist única, a mesma que o PDF (Chromium, AD-119) e o Word sabem desenhar (AD-123, AD-125). As variáveis são resolvidas ao criar, de novo a cada abertura do rascunho (sem gravar), na exportação e na conclusão, para a tela mostrar as mesmas pendências que bloqueiam (AD-126). O número da seção é calculado pela posição e pelo nível, nunca gravado, o que torna a renumeração automática. Os modelos padrão vivem no código e o texto-base é para revisão do perito (AD-127). A IA de redação ficou fora por custo e LGPD (AD-124).

## Como

### `apps/api`

- `apps/api/src/modules/documentos/` passa a ser dono de `Laudo` e `ModeloLaudo` (tabela de ownership em `apps/api/CLAUDE.md`):
  - `laudo.router.ts` (`/expert-reports/*`, montado em `apps/api/src/app.ts` com `express.json` de 1 MB só nesse prefixo), `laudo.controller.ts`, `laudo.schema.ts`.
  - `modeloLaudo.service.ts` / `modeloLaudo.repository.ts` — modelos do escritório, padrão só leitura, clonar, seções e reordenação.
  - `laudo.service.ts` / `laudo.repository.ts` — criar, abrir (resolve de novo), editar e remover seção, concluir (o bloqueio de rascunho é o filtro `status: 'draft'` no repository), exportar.
  - `laudo.biblioteca.ts` — os dois modelos padrão; `laudo.html.ts` — saneamento, resolução e pendências; `laudo.variaveis.ts` — valor de cada variável; `laudo.templates.ts` — HTML do PDF; `laudo.docx.ts` — Word com `docx` + `htmlparser2`.
  - `documento.layout.ts` ganhou `cabecalhoRodape` e `textosCabecalhoRodape`, usados pelos PDFs antigos, pelo laudo e pelo Word.
- `apps/api/src/modules/pericia/prazo.service.ts` — `protocolarEntregaDoLaudo`; o título "Entrega do laudo" é `PRAZO_ENTREGA_LAUDO` em `prazo.schema.ts`.
- `apps/api/src/modules/pericia/pericia.service.ts` emite `pericia:deleted`; `apps/api/src/events/subscribers/documentos.subscriber.ts` exclui os laudos.
- `apps/api/scripts/seed-demo.ts` — modelo do escritório e um laudo em rascunho.

### `apps/web`

- `apps/web/src/routes/_private/expert-reports/` — hub, `list/`, `add/` (seletor de perícia e árvore de seções), `details/` (navegação de seções, editor da seção, diálogo de conclusão) e `modelos/` (lista, criar/duplicar, `details/` com o formulário de seção).
- `apps/web/src/components/rich-text-editor.tsx` — Tiptap com a barra, "Inserir variável" e o destaque dos marcadores; `laudo-labels.ts` — rótulos das variáveis e do status.
- `apps/web/src/query/laudo.ts`; `canManageReportTemplates` em `apps/web/src/query/session.ts`.
- `apps/web/src/routes/_private/expert-cases/details/@components/pericia-laudos.tsx` — painel de laudos no detalhe da perícia; "Laudos" no grupo "Trabalho" da navegação.

### `packages`

- `packages/contracts/src/schemas/laudo.schema.ts` — tipos, status, variantes, `LAUDO_VARIAVEIS`, `LAUDO_HTML_TAGS`, `numerarSecoes` e os schemas de entrada; chaves de erro em `packages/contracts/src/response/messages.ts`.
- `packages/db/src/models/{laudo,modeloLaudo}.model.ts`. Sem migração: seed refeito.

## Como testar

```
pnpm vitest run apps/api/src/modules/documentos packages/contracts
pnpm run check && (cd apps/web && pnpm run build)
```

- Dependências novas: `docker compose up --build -d --renew-anon-volumes api web` e `pnpm --filter api run seed:demo`.
- UAT: admin inicia um laudo a partir de uma perícia trabalhista, edita, exporta PDF e Word e conclui com a entrega; gestor duplica o modelo padrão e cria um parecer técnico na perícia cível; operador vê os modelos só para leitura. Evidências em `.specs/features/laudos/validation.md`.

## Pendências

- [ ] Redação com IA (LAU-04): provedor, limite por tenant e LGPD numa spec própria (AD-124).
- [ ] Texto-base da biblioteca NR-15/NR-16 precisa de revisão técnica e jurídica; atualizar é deploy (AD-127).
- [ ] Sumário do PDF sem número de página (o Word tem, AD-125).
- [ ] Laudo concluído por engano não reabre; só sai excluindo a perícia (AD-126).
- [ ] Escolher uma subseção sem a seção-mãe a pendura na seção anterior na numeração (ex.: Anexo 1 sem "Insalubridade" vira 2.1 de "Objetivo").

## Histórico

- 2026-11-01 — Concluir com a entrega também põe a fase "aguardando manifestação das partes"; modelos seguem a permissão `modelos` da matriz (`docs/features/gestao-escritorio/feature.md`, AD-133, AD-137).
- 2026-10-31 — Fotos da vistoria no laudo (`img` restrito às mídias do tenant, no PDF e no Word) e variáveis de campo da última vistoria feita, usadas no modelo padrão em "Metodologia e vistoria" e "Atividades exercidas" (`docs/features/campo-vistorias/feature.md`, AD-129, AD-130).
- 2026-10-31 — Implementado LAU-01, LAU-02, LAU-03, LAU-05 e LAU-06 (AD-123 a AD-127); validação em `.specs/features/laudos/validation.md`. Divergências do design: o rascunho passou a ser resolvido de novo a cada abertura (achado na UAT: a tela mostrava pendência que a exportação já resolvia); o limite de 1 MB do JSON ficou no prefixo `/expert-reports` em `app.ts`, porque o parser global corre antes da rota; `[DATA_VISTORIA]` lê `compromissoService.listDaPericia` em vez de uma função nova; o status do laudo tem rótulo próprio ("Concluído") em vez da chave `completed` da perícia.
- 2026-10-31 — Pendência atualizada: a base de documentos (`documentos-pdf`, AD-119 a AD-122) está pronta para o laudo reaproveitar.
- 2026-10-31 — Spec criada (`.specs/features/laudos/spec.md`).

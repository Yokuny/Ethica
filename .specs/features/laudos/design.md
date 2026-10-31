# Laudo automatizado — Design

**Spec**: `.specs/features/laudos/spec.md` · **Decisões**: AD-123 (Tiptap + sanitize-html), AD-124 (IA fora), AD-125 (Word com `docx`), AD-126 (defaults e modelo de dados), AD-127 (escopo e biblioteca). Seguem AD-103 (datas), AD-107 (papéis), AD-113 (valores em inglês), AD-117 (partes), AD-119 (PDF), AD-120 (storage), AD-121 (marcadores e movimentações).

Escopo: LAU-01, LAU-02, LAU-03, LAU-05, LAU-06. LAU-04 (IA) fica fora (AD-124).

## Visão geral

```
apps/web /laudos ──/laudos/*──▶ modules/documentos (laudo.*, modeloLaudo.*)
                                    │ lê: periciaService · prazoService · compromissoService · accountService · officeService
                                    │ escreve: prazoService (protocolo) · periciaService (movimentação + etapa) ao concluir
                                    ├──▶ providers/pdfRenderer (HTML → PDF, AD-119)
                                    └──▶ docx (Word, AD-125)
pericia.service.deletePericia ──emit pericia:deleted──▶ subscribers/documentos ──▶ laudoService.deleteByPericia
```

Laudo e modelo moram no módulo `documentos` porque reaproveitam `documento.layout.ts` (escape, marcadores do cabeçalho/rodapé) e a identidade do escritório; um módulo novo não poderia importar o layout (regra (a) do teste de fronteira). `documentos` passa a ser dono de `Laudo` e `ModeloLaudo`; continua sem ninguém depender dele. A exclusão em cascata é evento porque `pericia` não pode depender de `documentos` (ciclo).

## Modelo de dados (sem migração, seed refeito)

`ModeloLaudo` (`modelos_laudo`):

| Campo | Observação |
| --- | --- |
| `Tenant`, `nome`, `tipo` | `tipo`: `report` (laudo pericial) ou `technical_opinion` (parecer técnico) |
| `secoes: [{ _id, titulo, nivel, apenasTitulo, quebraPagina, textoSim, textoNao }]` | `nivel` 1–3; a ordem é a do array; textos em HTML saneado |

`Laudo` (`laudos`):

| Campo | Observação |
| --- | --- |
| `Tenant`, `Pericia`, `tipo`, `status` | `status`: `draft` → `completed` |
| `titulo`, `modeloNome` | cópias do momento da criação |
| `secoes: [{ _id, titulo, nivel, apenasTitulo, quebraPagina, variante, html }]` | `variante`: `yes`/`no`; texto copiado e já com as variáveis resolvidas |
| `CriadoPor`, `concluidoEm?`, `ConcluidoPor?` | quem e quando |

Índices: `{ Tenant, Pericia }`, `{ Tenant, status, updatedAt }`, `{ Tenant, tipo }` no modelo.

Numeração ("1", "1.1", "2") é calculada pela posição e pelo nível (`numerarSecoes` em `laudo.schema.ts` do contracts) no web, no PDF e no Word; nunca é gravada (AD-126). Seção de nível maior que o anterior + 1 é tratada como o anterior + 1.

## Contratos (`packages/contracts/src/schemas/laudo.schema.ts`)

- `LAUDO_TIPOS`, `LAUDO_STATUS`, `LAUDO_VARIANTES`, `LAUDO_MODELOS_PADRAO` (`standard-report`, `standard-technical_opinion`), `laudoTipoDoPapel(papel)`.
- `LAUDO_VARIAVEIS` — marcadores aceitos: processo (`[NUMERO_PROCESSO]`, `[TRIBUNAL]`, `[VARA]`, `[COMARCA]`, `[JUSTICA]`, `[OBJETO]`), partes (`[NOME_AUTOR]`, `[NOME_REU]`, `[DENOMINACAO_AUTOR]`, `[DENOMINACAO_REU]`, `[ADVOGADOS_AUTOR]`, `[ADVOGADOS_REU]`), datas e dados trabalhistas (`[DATA_NOMEACAO]`, `[DATA_VISTORIA]`, `[LOCAL_PERICIA]`, `[FUNCAO_RECLAMANTE]`, `[DATA_ADMISSAO]`, `[DATA_DEMISSAO]`, `[PERIODO_IMPRESCRITO]`, `[DATA_EXTENSO]`), perito e escritório (`[PERITO_NOME]`, `[PERITO_REGISTRO]`, `[PERITO_FORMACAO]`, `[ESCRITORIO_NOME]`). `variaveisPendentes(html)` devolve os marcadores da lista presentes no texto.
- `LAUDO_HTML_TAGS` — allowlist única (AD-123): `p br strong em u h3 h4 ul ol li table tbody thead tr th td`.
- `numerarSecoes(secoes)`.
- Schemas: `createModeloLaudoSchema` (`nome`, `tipo`, `baseId?`), `updateModeloLaudoSchema` (`nome`), `modeloSecaoSchema` (seção completa), `moverSecaoSchema` (`direcao: up|down`), `createLaudoSchema` (`periciaId`, `modeloId`, `secoes: [{ id, variante }]` com pelo menos uma), `updateLaudoSecaoSchema` (`titulo?`, `html?`), `concluirLaudoSchema` (`registrarEntrega: boolean`). Limites: título 200, nome 120, HTML 200 000 caracteres, 200 seções.

## API (router novo `laudo.router.ts`, montado em `/laudos`)

| Rota | Papel | Observação |
| --- | --- | --- |
| `GET /laudos/modelos?tipo` | qualquer | padrão (somente leitura) + do escritório, resumo com nº de seções |
| `GET /laudos/modelos/:id` | qualquer | `:id` é ObjectId ou id padrão |
| `POST /laudos/modelos` | admin/manager | em branco ou clonando `baseId` (padrão ou do escritório) |
| `PATCH /laudos/modelos/:id` · `DELETE` | admin/manager | modelo padrão → 403 `standard_template_read_only` |
| `POST /laudos/modelos/:id/secoes` · `PUT …/secoes/:secaoId` · `DELETE` · `POST …/secoes/:secaoId/mover` | admin/manager | seção a seção; HTML saneado |
| `GET /laudos?page&limit&status&periciaId` | qualquer | com `periciaNumero` por lote (`findResumosByIds`) |
| `POST /laudos` | qualquer | valida tipo do modelo × papel da perícia (422 `report_template_type_mismatch`), copia as seções escolhidas com a variante e resolve as variáveis |
| `GET /laudos/:id` | qualquer | rascunho volta com as variáveis resolvidas de novo pelos dados atuais (sem gravar) e `pendencias: [{ secaoId, variaveis }]` calculadas desse texto |
| `PATCH /laudos/:id/secoes/:secaoId` · `DELETE` | qualquer | só `draft` (409 `report_completed`); a última seção não sai (422 `report_needs_section`) |
| `POST /laudos/:id/concluir` | qualquer | 422 `laudo_unresolved_variables` com as seções; `registrarEntrega` protocola o prazo, lança `report_filed` e avança a etapa |
| `DELETE /laudos/:id` | qualquer | só `draft` |
| `GET /laudos/:id/pdf` · `/docx` | qualquer | resolve as variáveis de novo; pendente → 422 `laudo_unresolved_variables` |

O prefixo `/laudos` recebe `express.json({ limit: '1mb' })` antes do parser global de 100 kB (seção com texto rico).

Funções novas em services donos: `prazoService.protocolarEntregaDoLaudo(tenantId, periciaId, now)` (título "Entrega do laudo" num só lugar, também usado na criação da perícia); `[DATA_VISTORIA]` lê `compromissoService.listDaPericia` (última vistoria não cancelada); evento `pericia:deleted` emitido por `periciaService.deletePericia`.

### Arquivos do módulo

- `modeloLaudo.{router,controller,service,repository,schema}.ts` não existe à parte: um só `laudo.router.ts` / `laudo.controller.ts` / `laudo.schema.ts`, com `laudo.service.ts` + `laudo.repository.ts` e `modeloLaudo.service.ts` + `modeloLaudo.repository.ts`.
- `laudo.biblioteca.ts` — os dois modelos padrão (AD-127).
- `laudo.html.ts` — `sanitizeLaudoHtml` (sanitize-html com `LAUDO_HTML_TAGS`) e `resolverVariaveis(html, valores)` (troca só marcadores com valor, valor escapado).
- `laudo.variaveis.ts` — `valoresDoLaudo({ pericia, perito, identity, vistoria, hoje })`: denominação pelas justiça (trabalhista reclamante/reclamada; cível e federal autor/réu), nomes por polo, datas `dd/mm/aaaa`, data por extenso.
- `laudo.templates.ts` — HTML do PDF: capa (tipo do documento, processo, vara/comarca, partes com a denominação, perito e registro, cidade/data), sumário numerado, seções (`h2`/`h3`/`h4` por nível, `break-before: page` na quebra), CSS próprio (serifada, justificado, 12 pt); cabeçalho/rodapé por `cabecalhoRodape(identity, nomePerito)` extraído de `documento.layout.ts`.
- `laudo.docx.ts` — Word (AD-125): `htmlparser2` → parágrafos/títulos/listas/tabelas do `docx`; capa, `TableOfContents`, títulos com `HeadingLevel`, cabeçalho/rodapé com `ImageRun` do logo e `PageNumber.CURRENT`/`TOTAL_PAGES`.

## Web

| Rota | Conteúdo |
| --- | --- |
| `/laudos` (hub, card "Laudos" no grupo de trabalho) | `PageIntro` + `LinkCard` para Laudos e Modelos |
| `/laudos/list` | tabela server-driven (processo, tipo, status, atualizado), abas por status |
| `/laudos/add?periciaId` | escolher perícia (busca) e modelo do tipo certo; resumo do processo; árvore de seções com marcar/desmarcar e sim/não; confirmar cria e abre o detalhe |
| `/laudos/details?id` | seções numeradas à esquerda (pendência marcada), editor Tiptap da seção à direita (salvar, remover), ações PDF, Word, Concluir (diálogo com "Registrar a entrega na perícia"), Excluir; concluído só leitura |
| `/laudos/modelos` | lista dos modelos (padrão com selo), criar (em branco ou clonando) |
| `/laudos/modelos/details?id` | nome, seções numeradas com subir/descer/editar/remover; `FormDialog` da seção com dois editores (sim/não), nível, "apenas título", quebra de página e "Inserir variável" com exemplo; padrão só leitura com "Duplicar" |
| `/pericias/details` | painel "Laudos" (lista + "Iniciar laudo"/"Iniciar parecer") |

- `apps/web/src/components/rich-text-editor.tsx` — Tiptap com a barra (negrito, itálico, sublinhado, título, listas, tabela), destaque dos marcadores de `LAUDO_VARIAVEIS` por decoração, `readOnly`, `onInsertVariable`. Compartilhado por laudo e modelo (dois níveis de rota irmãos → `src/components/`).
- `apps/web/src/query/laudo.ts` — laudos e modelos (usados por `laudos/*` e `pericias/details`).
- `apps/web/src/components/laudo-labels.ts` — rótulo da variável com exemplo (`t()`), tipo e status.
- Edição de modelo escondida para `operator` (a API recusa 403).

## Testes

- Unit: `numerarSecoes`, `variaveisPendentes` (contracts); `sanitizeLaudoHtml` (tags fora da lista, atributos, script), `resolverVariaveis`, `valoresDoLaudo` (denominação por justiça), template do PDF (capa, sumário, quebra), Word (gera ZIP válido com os títulos), biblioteca (todas as seções com texto sim/não, sem marcador fora da lista).
- E2E (renderizador falso): permissões de modelo (operador 403), modelo padrão somente leitura, clonar, criar laudo copia e resolve, editar/remover seção, concluir bloqueado por variável, concluir protocola o prazo + movimentação + etapa, laudo concluído recusa edição (409), exclusão da perícia remove os laudos, tipo do modelo × papel.

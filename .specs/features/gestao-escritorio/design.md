# Gestão do escritório — Design

**Spec**: `.specs/features/gestao-escritorio/spec.md` · **Decisões**: AD-133 a AD-137 (`.specs/STATE.md`)

## Visão geral

| Req | Onde | Peça nova |
| --- | --- | --- |
| GES-06 matriz | `packages/contracts` (`permissao.schema.ts`), `packages/db` (`user`, `invite`), `apps/api/src/middlewares/{authentication,authorization}.middleware.ts`, todos os routers de domínio, `identity` (sessão, convite, diretório), `apps/web` (sessão, `_private/route.tsx`, navegação, convite, usuários) | `can(modulo, acao)` |
| GES-01 diário | `packages/db` (`atividade.model.ts`), `apps/api/src/middlewares/diario.middleware.ts`, `identity/diario.*`, `identity/office.*`, `apps/web/src/routes/_private/_admin/diario/` | middleware + model |
| GES-02 fases | `pericia.schema.ts` (contrato), `pericia.model.ts`, `pericia.service/repository`, `laudo.service.ts`, web de perícias | `fase`, `situacaoDaPericia` |
| GES-03 contratante | `parte.schema.ts` (`contratante`), `lancamento.schema.ts` (`contracted_fees`), evento, `lancamento.service`, `documentos` | — |
| GES-04 início | `account.schema.ts` (`HOME_BLOCOS`), `preferences.*`, `apps/web/src/routes/_private/index.tsx` | diálogo "Personalizar" |
| GES-05 paradas | `GET /pericias/paradas`, bloco no início | — |

## GES-06 — Matriz de permissões (AD-137)

**Contrato** (`packages/contracts/src/schemas/permissao.schema.ts`):

```ts
export const PERMISSAO_MODULOS = ['pericias','partes','agenda','laudos','modelos','financeiro','prospeccao','relatorios'] as const;
export const PERMISSAO_ACOES = ['view','create','update','delete'] as const;
export type Permissoes = Partial<Record<PermissaoModulo, PermissaoAcao[]>>;
export const permissoesSchema; // objeto estrito por módulo, ações sem repetição; `update`/`create`/`delete` exigem `view`
export const PERFIL_PERMISSOES: Record<'manager' | 'operator', Permissoes>; // presets = AD-107
export const TODAS_PERMISSOES: Permissoes;               // admin
export const permissoesEfetivas(role, permissoes?): Permissoes; // admin → todas; senão gravadas ?? preset do primeiro papel
export const pode(permissoes, modulo, acao): boolean;
```

**Back-end**: `UserRecord.permissoes` vem de `buildAuthDeps().getUserById`; `authenticateSession` devolve `TenantUser.permissoes = permissoesEfetivas(role, user.permissoes)` (relido do banco a cada requisição, então a mudança vale na seguinte). `can(modulo, ...acoes)` em `authorization.middleware.ts` → 403 `no_permission`. Mapeamento das rotas:

| Rotas | Guarda |
| --- | --- |
| `GET /pericias*`, `/pericias/stats`, `/distribution`, `/paradas`, `/prazos` (GET), `GET /documentos/pericias/:id/{ficha,checklist}` | `pericias.view` |
| `POST /pericias`, `/pericias/import/*` | `pericias.create` |
| `PATCH /pericias/:id`, prazos (POST/PATCH/DELETE), movimentações | `pericias.update` |
| `DELETE /pericias/:id` | `pericias.delete` |
| `/partes` GET / POST / PATCH | `partes.view/create/update` |
| `/agenda` e `/vistorias`: GET / POST / PATCH-PUT e geocode/aviso/mídias / DELETE (compromisso e mídia) | `agenda.view/create/update/delete` |
| `/laudos` (não modelos): GET+pdf+docx / POST / seções e concluir / DELETE | `laudos.*` |
| `/laudos/modelos*` | `modelos.*` |
| `/financeiro/*` | `financeiro.*` (parcelas = `update`) |
| `/prospeccao/*` (converter = `prospeccao.update` + `pericias.create`) | `prospeccao.*` |
| `/documentos/{prazos,paradas}` | `relatorios.view`; `/documentos/financeiro` = `relatorios.view` + `financeiro.view` |
| `/documentos/export`, `/tenant/*`, `/auth/users/directory`, `PATCH /auth/users/:id/permissoes`, `/tenant/diario` | `isAdmin` (fora da matriz) |
| `/me/*`, `/auth/users` (nomes) | `canOperate` (qualquer papel) — mantém |

`canSeeFinance` dos controllers de `documentos` passa a ser `pode(req.tenantUser.permissoes, 'financeiro', 'view')`.

**Convite**: `createInviteSchema` ganha `permissoes: permissoesSchema.optional()`; `platformService.inviteTeamMember` grava `permissoes` só para não-admin (`?? PERFIL_PERMISSOES[role]`); o aceite copia para o `User`. **Ajuste**: `PATCH /auth/users/:id/permissoes` (admin) com `{ permissoes }`; alvo admin → 422 `admin_has_all_permissions`. Diretório (`/auth/users/directory`) devolve `permissoes` efetivas.

**Web**: `SessionView.permissoes`; `can(session, modulo, acao)` em `apps/web/src/query/session.ts` substitui `canSeeFinance` e `canManageReportTemplates`. `HOME_SECTIONS.access` vira `PermissaoModulo | 'admin'`. `_private/route.tsx` `beforeLoad`: primeiro segmento do caminho → módulo (`pericias`, `partes`, `agenda`, `campo`→agenda, `laudos`, `laudos/modelos`→modelos, `financeiro`, `prospeccao`, `relatorios`) sem `view` → redirect `/`; `financeiro/route.tsx` sai (o guarda central cobre). Botões de inserir/editar/excluir checam `can`. Componente `PermissoesMatrix` (tabela módulo × 4 checkboxes, marcar ação marca `view`, desmarcar `view` limpa a linha) usado no convite e no diálogo de permissões do membro em Usuários.

## GES-01 — Diário de bordo (AD-134)

**Model** `packages/db/src/models/atividade.model.ts`:
`{ Tenant, User, userName, modulo, recurso?, acao, registroId?, rotulo?, createdAt }`, índices `{Tenant, createdAt:-1}`, `{Tenant, User, createdAt:-1}` e TTL `createdAt` 365 dias. Dono: `identity` (`DB_OWNERSHIP`).

**Middleware** `createDiarioMiddleware(registrar)` (camada compartilhada, função injetada por `app.ts` = `diarioService.registrar`): envolve `res.json` para guardar o corpo; em `res.on('finish')`, se `req.tenantUser?.tenant`, status < 400 e (método de escrita ou `GET /documentos/export`), monta a entrada com `descreverRequisicao(method, path)`:
- segmentos sem ids; módulo pelo primeiro segmento (`pericias`, `partes`, `agenda`/`vistorias`→`agenda`, `laudos` (`modelos`→`modelos`), `financeiro`, `prospeccao`, `documentos`→`escritorio`, `tenant`→`escritorio`/`usuarios` (convites), `auth/users`→`usuarios`, `me`→`conta`);
- recurso = último segmento literal depois do primeiro (ex. `prazos`, `movimentacoes`, `parcelas`, `secoes`, `midias`, `import`);
- ação: `POST`→`create`, `PUT/PATCH`→`update`, `DELETE`→`delete`; sufixos `concluir`→`complete`, `converter`→`convert`, `import`→`import`, `export`→`export`, `aviso`→`notify`;
- `registroId` = primeiro ObjectId do caminho, senão `body.data.id`; `rotulo` = primeiro campo presente em `data`: `numeroProcesso`, `titulo`, `nome`, `descricao`, `email`.
- `userName` vem do `registrar` (identity lê o nome). Login: `auth.controller.signin` chama `diarioService.registrar` direto com `acao: 'signin'`, `modulo: 'conta'`.
- Ignorados: `/me/preferences`, `/agenda/:id/geocode` (efeito técnico), `/auth/signout`.

**Consulta** `GET /tenant/diario?page&pageSize&from&to&userId&modulo&acao` (admin) → `{ items, total }`. Escritório: `office.service` lê as últimas 5 exportações de `diarioRepository` (`acao: 'export'`); `Tenant.dataExports`, `office.repository.registrarExportacao` e a chamada em `documentos.service` saem.

**Web** `/diario` sob `_admin`: tabela em modo servidor (AD-028) com filtros (período, usuário, módulo, ação), coluna "Registro" com link quando o módulo tem detalhe (`/pericias/details`, `/partes/details`, `/laudos/details`, `/financeiro/lancamentos/details`). Item "Diário de bordo" em `HOME_SECTIONS` (`access: 'admin'`).

## GES-02 — Fase e situação (AD-133)

Contrato (`pericia.schema.ts`):

```ts
export const PERICIA_FASES_POR_ETAPA = {
  appointed: ['awaiting_acceptance_signature'],
  accepted: ['awaiting_site_info', 'scheduling_inspection'],
  inspection: ['awaiting_inspection', 'return_environmental_assessment', 'return_complement_inspection'],
  drafting_report: ['writing_report', 'reviewing_report', 'awaiting_report_approval'],
  report_delivered: ['awaiting_objections'],
  clarifications: ['answering_objection', 'awaiting_objection_reply', 'awaiting_clarification_approval',
    'awaiting_clarification_reply', 'awaiting_new_clarifications', 'awaiting_judge_decision', 'drafting_petition'],
  completed: ['monitoring_fees', 'fees_received'],
  declined: [],
} as const satisfies Record<PericiaStatus, readonly string[]>;
export const PERICIA_FASES_SUSPENSAO = ['withdrawal', 'removal', 'settlement'] as const;
export const PERICIA_FASES = [...todas, ...PERICIA_FASES_SUSPENSAO];
export const PERICIA_SITUACOES = ['active', 'suspended', 'closed'] as const;
export const etapaDaFase(fase): PericiaStatus | undefined;  // undefined para suspensão
export const faseCabeNaEtapa(fase, status): boolean;        // suspensão cabe em qualquer etapa aberta
export const situacaoDaPericia({ status, fase }): PericiaSituacao;
```

`updatePericiaSchema` ganha `fase: z.enum(PERICIA_FASES).nullable().optional()` (`null` apaga); `createPericiaSchema` aceita `fase` opcional. Regra única no `periciaService` (`resolverEtapaEFase(before, data)`): etapa final = `data.status ?? etapaDaFase(data.fase) ?? before.status`; fase final = `data.fase` se informada, senão a anterior se couber na etapa final, senão nenhuma; fase informada que não cabe → 422 `phase_stage_mismatch`. Repository: `$unset: { fase }` quando a fase final é nenhuma. `PericiaRecord` e o item de listagem levam `fase` e `situacao` (calculada no `toRecord`). Listagem filtra `situacao` (closed → etapa em `completed/declined`; suspended → etapa aberta e fase de suspensão; active → o resto) e `fase`. `listParadas` exclui fase de suspensão. `laudo.service` concluir com entrega: `{ status: 'report_delivered', fase: 'awaiting_objections' }` quando a etapa é anterior.

Web: select "Fase" agrupado por etapa no formulário (itens = fases da etapa escolhida + suspensão); badge de situação na listagem e no detalhe; filtros situação e fase.

## GES-03 — Contratante (AD-135)

- `periciaParteInputSchema` + `contratante: z.boolean().optional()`; `periciaFields` refine: no máximo uma parte contratante, e só com `papel: technical_assistant` (mensagem `contratante`). Model: `partes[].contratante?: boolean`.
- `PericiaHonorariosFixadosPayload.categoria: 'fixed_fees' | 'contracted_fees'` (pelo `papel`). `LANCAMENTO_CATEGORIAS.income` + `contracted_fees`. `lancarHonorariosFixados` procura o honorário automático da perícia por qualquer das duas categorias, cria com a categoria do payload e descrição "Honorários contratados — <nº>".
- `findResumosByIds` devolve `contratante?: string` (nome da parte marcada); listagem do financeiro (`lancamento.service` enriquecimento) e relatório financeiro mostram.
- Web: na perícia de assistente, o campo "Honorários fixados" vira "Honorários contratados" e cada parte ganha o checkbox "Contratante"; o detalhe mostra o contratante.

## GES-04/05 — Início

- `account.schema.ts`: `HOME_BLOCOS = ['overview','upcoming','cash_flow','stalled','by_stage','by_court','sections']`; `updatePreferencesSchema` + `blocosOcultos: z.array(z.enum(HOME_BLOCOS)).max(n)`; leitura filtra chaves desconhecidas. Bloco → módulo exigido: `cash_flow`→`financeiro`, `upcoming`→`agenda`, `stalled|by_stage|by_court|overview`→`pericias`.
- `GET /pericias/paradas` (`pericias.view`) → `{ total, items: PericiaParada[] (5 mais antigas) }`.
- Web: botão "Personalizar" no cabeçalho do início abre `FormDialog` com um switch por bloco permitido e "Restaurar padrão"; salva com `PATCH /me/preferences`.

## Testes

- Unit: `permissao.schema` (presets, `permissoesEfetivas`, `pode`, schema), `pericia.schema` (fases/situação), `descreverRequisicao` do diário, `resolverEtapaEFase`.
- E2E: `can` em uma rota de cada módulo (403 por falta de ação, 200 com ela), `PATCH /auth/users/:id/permissoes`, convite com matriz, `/tenant/diario` (entrada gravada depois de uma escrita; 403 para não admin), `PATCH /pericias/:id` com fase, contratante → lançamento `contracted_fees`.
- Web unit: guarda central e navegação por permissão.

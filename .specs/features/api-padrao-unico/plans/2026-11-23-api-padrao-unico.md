# Plano — `apps/api` num padrão único de arquitetura

Data: 2026-11-23 · Status: análise concluída, execução aguardando as decisões da seção 5 · Slug proposto da feature: `api-padrao-unico`

Objetivo: o back-end inteiro seguir **um** jeito de escrever cada camada (router, controller, service, repository, schema, arquivo de apoio), sem variantes, e o teste estrutural travar esse jeito. Princípio do `AGENTS.md`: chegar lá **removendo** variantes e estruturas antigas, sem helper, wrapper ou camada nova.

Fonte da verdade do padrão hoje: `apps/api/CLAUDE.md`, AD-038 (módulos contidos), AD-039 (event bus) e `tests/structural/module-boundary.structural.test.ts` (regras a–e).

---

## 1. As seis skills e o que cada uma entrega aqui

Instaladas em `.claude/skills/` (cópia, como as demais skills de terceiros do repo). Todas vêm da literatura de decomposição de monólito em serviços (Richards/Ford; Khononov para acoplamento). O Ethica **não** vai virar serviços: AD-038/AD-039 fixam um monólito modular com bus in-process. Por isso cada skill foi usada só na parte que serve para **arrumar a arquitetura dentro do monólito**.

| Skill | O que ela faz | Uso neste plano | O que não se aplica |
| --- | --- | --- | --- |
| `component-identification-sizing` | Mapeia componentes (pastas-folha) e mede tamanho em statements, % e desvio-padrão para achar componentes grandes demais | Inventário dos 8 módulos e dos arquivos; aponta os pontos quentes de tamanho | Limiar de "extrair primeiro" |
| `component-common-domain-detection` | Acha lógica de negócio repetida em vários componentes e avalia consolidar (serviço, lib ou fusão) pelo acoplamento aferente | Lista o que se repete entre controllers/services | Consolidar em "shared service/library": vira helper novo, o que o `AGENTS.md` proíbe. Só se consolida o que **some** (ver 4.6) |
| `component-flattening-analysis` | Acha "classes órfãs": código em namespace-pai que tem subpastas, e propõe consolidar, dividir ou extrair `shared` | Os módulos são planos (nenhuma subpasta), então a regra clássica quase não dispara; aplicada às **camadas**: arquivos que não pertencem a nenhuma das 5 camadas | Reestruturar em subpastas |
| `coupling-analysis` | Modelo de três dimensões: força da integração (intrusiva, funcional, de modelo, de contrato), distância e volatilidade; `BALANÇO = (FORÇA XOR DISTÂNCIA) OU NÃO VOLATILIDADE` | Grafo entre módulos, Ca/Ce/instabilidade, desvios de camada dentro do módulo, volatilidade e co-mudança pelo git | — |
| `domain-identification-grouping` | Agrupa componentes em domínios de negócio e propõe alinhar namespaces | Confere se cada módulo é um domínio coeso (`identity` e `documents` são os candidatos) | Agrupar para virar serviço |
| `decomposition-planning-roadmap` | Ordena os seis padrões (dimensionar → comuns → achatar → dependências → domínios → serviços) e prioriza por `valor×3 − risco×2 − dependências` | Ordem e priorização das fases da seção 6 | Fase 3 "extração de serviços", cronograma em meses, story points |

## 2. Como cada análise foi feita

Scripts descartáveis no scratchpad, sobre `apps/api/src` sem arquivos `*.test.ts`:

- **Tamanho**: contagem de statements pelo AST do TypeScript (número **aproximado**: conta statements de topo e internos, exceto blocos).
- **Imports**: todos os `import`/`export … from` de cada arquivo, resolvidos para caminho; classificados por módulo e por camada (sufixo `.router/.controller/.service/.repository/.schema`).
- **Volatilidade**: `git log --since=120.days` por módulo e por arquivo; co-mudança = pares de módulos tocados no mesmo commit (106 commits).
- **Verificação do Express 5.2.1**: handler `async` que lança um erro com `status` chega ao error handler com o status certo, **sem** `try/catch` nem `next(e)` (script mínimo com o Express do `apps/api`: resposta `404 {"message":"case_not_found"}`).

## 3. Resultados por análise

### 3.1 Inventário e tamanho (`component-identification-sizing`)

| Módulo | Statements (aprox.) | Arquivos | % dos módulos | Commits em 120 dias |
| --- | ---: | ---: | ---: | ---: |
| `documents` | 1450 | 24 | 28,1% | 43 |
| `identity` | 1235 | 47 | 23,9% | 37 |
| `case` | 1119 | 18 | 21,7% | 50 |
| `agenda` | 569 | 16 | 11,0% | 28 |
| `finance` | 384 | 5 | 7,4% | 22 |
| `notifications` | 301 | 5 | 5,8% | 8 |
| `automation` | 73 | 5 | 1,4% | 2 |
| `contact` | 33 | 4 | 0,6% | 2 |

Média 646, desvio-padrão ≈ 550. Nenhum módulo passa de 2 desvios nem do limiar de 30% (app com menos de 10 componentes). O tamanho está concentrado em arquivos: `documents/report.service.ts` (759 linhas), `case/import.service.ts` (572), `case/case.repository.ts` (571), `documents/report.docx.ts` (563), `documents/documents.templates.ts` (494), `finance/transaction.repository.ts` (447). Os três primeiros também estão entre os que mais mudam.

**Leitura**: tamanho não é o problema. Dividir arquivo grande só por tamanho aumentaria conceitos; o que pesa é a variação de forma (seção 4).

### 3.2 Acoplamento (`coupling-analysis`)

Grafo entre módulos (A → B = A importa o service/schema de B), acíclico:

```
agenda        → case, identity, notifications
automation    → case, identity
case          → identity                 (office.service: cota de arquivos)
documents     → agenda, case, finance, identity, notifications
finance       → case, identity
notifications → automation, case, finance
contact       → (ninguém)
```

| Módulo | Ca (quem depende dele) | Ce (de quem depende) | Instabilidade Ce/(Ca+Ce) |
| --- | ---: | ---: | ---: |
| `identity` | 5 | 0 | 0,00 |
| `case` | 5 | 1 | 0,17 |
| `finance` | 2 | 2 | 0,50 |
| `notifications` | 2 | 3 | 0,60 |
| `automation` | 1 | 2 | 0,67 |
| `agenda` | 1 | 3 | 0,75 |
| `documents` | 0 | 5 | 1,00 |
| `contact` | 0 | 0 | — |

- **Força**: toda integração entre módulos é por **contrato** (função de service ou schema), nenhuma intrusiva: nenhum módulo lê model ou repository de outro (garantido pelas regras a e b do teste estrutural). A camada compartilhada só é importada por `app.ts`, `events/subscribers/**` e `schema.registry.ts` (regra e).
- **Balanço**: os módulos estáveis (`identity`, `case`) são os mais usados, e o mais instável (`documents`) não é usado por ninguém. Direção saudável.
- **Co-mudança**: `case + documents` mudam juntos em 22 commits, o maior par. É acoplamento funcional real (o laudo lê a perícia, as partes e usa a extração de PDF de `case/import.service.ts`). Os demais pares altos são com `schema.registry.ts` (16, 15, 15, 10), que é o arquivo mais alterado do app (37 commits): todo schema local novo passa por ele.
- **Desvios de camada dentro do módulo**: listados na seção 4.

### 3.3 Domínios (`domain-identification-grouping`)

- `identity` junta 10 entidades: `auth`, `account`, `invite`, `tenantInvite`, `platform`, `preferences`, `push`, `office`, `billing`, `activityLog`. Subdomínios visíveis: acesso (auth, account, invite, platform, preferences, push), escritório (office), assinatura (billing) e diário de bordo (activityLog). Todos gravam ou leem `User`/`Tenant`, que é o motivo registrado na AD-038 para ficarem juntos. Separar criaria chamadas de service entre módulos para o mesmo documento. **Manter como está.**
- `documents` junta dois subdomínios: geração de PDF/ZIP (`documents.*`) e laudo (`report.*`, `template.*`, `signatory.*`), com 8 arquivos de renderização compartilhados. Mesmo dono de collection não há (os models são `Report Template Signatory`), mas o laudo usa a mesma camada de layout dos PDFs. **Manter um módulo**; o que falta é regra para os arquivos de apoio (decisão D5).
- Os demais módulos são um domínio cada, coesos.

### 3.4 Estrutura e "órfãos" (`component-flattening-analysis`)

- Pastas: nenhum módulo tem subpasta; a única "classe órfã" no sentido da skill é `modules/schema.registry.ts`, solta na pasta-pai dos módulos. É raiz de composição como `app.ts`. Mover não reduz complexidade e quebra o teste de registry: **sem ação**.
- Camadas: 10 arquivos não pertencem a nenhuma das 5 camadas, todos de apoio de service: `documents/{document.layout, documents.templates, report.attachment, report.docx, report.html, report.library, report.process, report.templates, report.variables}.ts` e `identity/auth.deps.ts`. Nenhuma regra escrita diz como esses arquivos se nomeiam nem quem pode importá-los.
- Entidades incompletas (sem alguma camada), pela forma atual: `push` (sem service), `tenantInvite` (só router e controller, usa `platform.service`), `signatory` e `feed` (sem router; as rotas vivem em `report.router` e `appointment.router`), `template` e `calendar-entry` (sem router/controller), `case/service-order` (só repository), `case/import` (service e schema, rotas no `case.router`).

### 3.5 Lógica repetida (`component-common-domain-detection`)

| Repetição | Ocorrências | Veredito |
| --- | --- | --- |
| `notFoundAs404` (traduz `XNotFoundError` em `CustomError` 404) | 6 controllers | **Remover**: some com o padrão de erro único (D2) |
| `try { … } catch (e) { next(e) }` | ~115 blocos em 23 controllers | **Remover**: o Express 5 já repassa a rejeição (verificado) |
| Classes `XNotFoundError extends KeyedError` sem status | 10 services | **Remover**: viram `CustomError('<chave>', 404)`, que já é o jeito da maioria dos erros dos services (≈117 linhas com `new CustomError` nos services). Nenhum código fora de controller faz `instanceof` nelas |
| `const tenantOf = (req) => req.tenantUser.tenant as string` | 10 controllers | Manter local (uma linha, sem dependência entre arquivos) |
| `const canOperate = checkRole(['admin','manager','operator'])` | 4 routers de `identity` | Conferir com a skill `ethica-permissions` se essas rotas deveriam usar `can(área, ação)` da matriz (AD-137); se sim, a repetição some |
| `withCaseNumber` (junta o número do processo em lote) | `agenda` ×2, `finance` | Manter: é o padrão de enriquecimento do `CLAUDE.md`, cada uma com o seu tipo de registro; extrair seria helper novo |

## 4. Achados classificados

### Classe A — quebra regra já escrita (corrigir sem perguntar)

| # | Onde | Regra quebrada | Correção |
| --- | --- | --- | --- |
| A1 | `identity/push.controller.ts` importa `push.repository.ts` | controller fala com service | criar `push.service.ts` delegando, como os demais |
| A2 | `case/import.service.ts:412` `export type CsvCell` | service não exporta tipo | mover para `case/import.schema.ts` |
| A3 | `case/case.controller.ts:18` `STALLED_IN_START` e o `slice` da resposta | regra de negócio fica no service | levar o corte para `case.service.ts` |

### Classe B — regra silenciosa e o código tem variantes (precisa de decisão; seção 5)

| # | Variantes encontradas |
| --- | --- |
| B1 | **Quatro formas de controller**: função exportada (maioria); função curried pelo provider `(storage) => handler` (9 arquivos); fábrica `createXController(deps)` que devolve objeto (`platform`, `tenantInvite`); wrappers `json(run)`/`removed(run)` (`report.controller`) |
| B2 | **Dois estilos de erro**: `XNotFoundError` sem status mapeado no controller; `CustomError(chave, status)` lançado no service |
| B3 | **Router**: `inviteRouter` é uma constante; os outros 20 são `createXRouter(deps)` |
| B4 | **Entidade apoiada em outra**: `tenantInvite.{router,controller}` usam `platform.service.inviteTeamMember`, enquanto o convite (`invite.*`) é outra entidade |
| B5 | **Acesso a model fora do repository**: `identity/auth.deps.ts` consulta `Session`, `User` e `Tenant` direto |
| B6 | **Repository importando de fora da camada**: `identity/account.repository.ts` → `auth.repository.ts` (`avatarPath`); `documents/report.repository.ts` → `report.html.ts` |
| B7 | **Arquivos de apoio sem regra de nome nem de quem importa** (os 9 de `documents` da seção 3.4) |
| B8 | **Infra dentro de domínio**: `extractPdfText` (texto de PDF, técnico) mora em `case/import.service.ts` e é usado por `documents` (laudo e modelo) |
| B9 | **Nome de arquivo**: kebab-case (`court-division`, `calendar-entry`, `service-order`) e camelCase (`activityLog`, `tenantInvite`, `errorHandler.middleware`, `asaasClient`, `pdfRenderer`, `fileStorage`) convivem |

### Classe C — documentação desatualizada (corrigir junto)

- C1 `apps/api/CLAUDE.md` diz que `case` não depende de ninguém, mas `case.service.ts` chama `identity/office.service` (`reserveFile`/`returnFile`, cota de arquivos).
- C2 A árvore do `apps/api/CLAUDE.md` não lista `providers/asaasClient.ts`; o mapa do monorepo no `AGENTS.md` não lista `packages/mail`.
- C3 Comentários sobre um handshake WebSocket que não existe mais: `identity/auth.deps.ts` (cita `createInboxSocketServer`) e `middlewares/authentication.middleware.ts:70`.
- C4 Itens já conformes que o `CLAUDE.md` pode citar como padrão: services importam de `@ethica/db` só helpers sem dono (datas, `hashToken`, `TextSearchUnavailableError`); nenhum service ou repository importa `express`.

## 5. Decisões para você (com recomendação)

| # | Pergunta | Recomendação |
| --- | --- | --- |
| D1 | Como fica o controller? | **Função exportada, sem `try/catch`**; quando precisa de um provider (storage, pdf, mail), recebe-o antes: `export const x = (storage) => async (req, res) => …`. Somem a fábrica `createXController` e os wrappers `json`/`removed` |
| D2 | Como o service sinaliza "não encontrado"? | **`CustomError('<chave>_not_found', 404)` direto no service**, igual aos outros erros. Somem as 10 classes `XNotFoundError` e os 6 `notFoundAs404` |
| D3 | Router | **Sempre `createXRouter(deps)`**, inclusive o de convite; um router por prefixo montado em `app.ts` (por isso `signatory` em `/expert-reports` e o feed em `/agenda` seguem dentro do router do prefixo) |
| D4 | Convite de membro do escritório | **Juntar `tenantInvite.{router,controller}` em `invite.*`** e levar `inviteTeamMember` de `platform.service` para `invite.service` (casa com `gestao-membros`, AD-148) |
| D5 | Arquivos de apoio (`report.docx.ts` etc.) | **Permitidos com nome `<entidade>.<papel>.ts`, só funções puras (sem banco, sem HTTP), importados apenas por service do mesmo módulo**. `report.repository` deixa de importar `report.html`; `auth.deps.ts` passa a chamar `auth.repository` |
| D6 | `extractPdfText` | **Mover para `providers/pdfText.ts`**, ao lado do `pdfRenderer`; `case` e `documents` passam a importar dali. O `parseData` fica no `case` |
| D7 | Nome de arquivo | **kebab-case em todo o `apps/api`** (`activity-log.*`, `tenant-invite.*` se ainda existir, `error-handler.middleware.ts`, `asaas-client.ts`…), com `git mv` e `vi.mock` recalculados |

## 6. Plano de execução

Feature média/grande: antes do código, `spec.md` → `design.md` → `tasks.md` em `.specs/features/api-padrao-unico/` (skill `ethica-spec-driven`), com as respostas de D1–D7. Ordem pela priorização da `decomposition-planning-roadmap` (mais valor e menos risco primeiro; o que tem dependência depois). Cada passo é um commit atômico na `main` com `pnpm run check` verde.

**Fase 0 — Escrever o padrão (sem código)**
1. Nova `AD-284` em `.specs/STATE.md`: o padrão único (D1–D7), citando que o Express 5 repassa a rejeição de handler `async`.
2. `apps/api/CLAUDE.md`: seções "Controller", "Erro", "Router", "Arquivo de apoio", "Nome de arquivo", com um exemplo curto cada; corrigir C1–C4. `AGENTS.md`: `packages/mail` no mapa.

**Fase 1 — Classe A e C3 (baixo risco, valor alto)**
3. A1 `push.service.ts`; A2 `CsvCell` para o schema; A3 corte no service; C3 comentários.

**Fase 2 — Erro e controller (maior volume, risco baixo, testes e2e cobrem)**
4. D2 por módulo (um commit por módulo, começando por `contact` e `automation`, terminando em `documents`): erro 404 no service, apaga classe e `notFoundAs404`.
5. D1 no mesmo módulo, logo depois: tira `try/catch`, fábricas e wrappers. Teste e2e de cada rota 404 confirma o status.

**Fase 3 — Camadas e infra**
6. D5: `auth.deps.ts` → `auth.repository`; `account.repository` e `report.repository` sem import de fora da camada.
7. D6: `providers/pdfText.ts`.
8. D3 e D4: `createInviteRouter`; `tenantInvite` dentro de `invite`.
9. Revisar `canOperate` com `ethica-permissions` (seção 3.5).

**Fase 4 — Nomes**
10. D7: `git mv` em lote por pasta, um commit por pasta, `vi.mock` recalculados (o TypeScript não avisa, só o teste).

**Fase 5 — Travar no teste estrutural** (`tests/structural/module-boundary.structural.test.ts`, com self-check por fixture, no molde das regras a–e)
11. (f) controller não importa repository nem `@ethica/db`; (g) só repository importa model por valor (exceção: nenhuma, depois do passo 6); (h) arquivo de módulo termina em uma das 5 camadas ou segue `<entidade>.<papel>.ts` e só é importado por service do mesmo módulo; (i) nenhum `try {` em `*.controller.ts`; (j) nenhum `class \w+Error extends KeyedError` fora de `middlewares/`; (k) nomes de arquivo em kebab-case.

**Ao concluir**: `docs/features/api-padrao-unico/feature.md` com histórico, este plano arquivado em `.specs/features/api-padrao-unico/plans/`, roadmap em "Resolvidos", `pnpm docs:sync`.

## 7. Fora do escopo

- `apps/worker` (outro processo, não importa da API; AD-267).
- Dividir módulo ou arquivo grande por tamanho, extrair serviço, criar pacote compartilhado novo.
- Regras de negócio dentro de agregações dos repositories (`transaction.repository` deriva status das parcelas no pipeline para filtrar e ordenar no banco): é consulta, fica onde está.

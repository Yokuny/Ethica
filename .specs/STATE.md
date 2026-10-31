# STATE

## Decisions

Decisões de nível de projeto. Toda feature futura conforma ou supersede.

O Ethica nasceu da base do **checkduplo** (repo `CRM`). As decisões herdadas **mantêm o número
original** (AD-010 … AD-098) para que as referências espalhadas em código, skills e docs
continuem válidas; o texto foi ajustado só nos nomes (`crm-api` → `api`, `@crm/*` → `@ethica/*`).
Quando uma herdada cita módulo, tela ou arquivo que não veio para o Ethica (clientes, processos,
inbox, kanban, Asaas, `ai-gateway`, `field-engine`), vale o **princípio** da decisão, aplicado ao
equivalente daqui. Decisões novas do Ethica começam em AD-102.

### AD-001
- **Decision**: Monorepo pnpm workspaces — `apps/{api,web}` + `packages/{contracts,db,ui}`.
- **Reason**: contratos Zod e tipos compartilhados entre API e web sem duplicar; um único gate (`pnpm run check`) para o repo inteiro.
- **Trade-off**: CI roda tudo a cada PR; permissão de repositório vira tudo-ou-nada.
- **Scope**: todo o projeto.
- **Date**: 2026-10-29
- **Status**: active

### AD-010
- **Decision**: Tenant sempre injetado no servidor — nunca em `input_schema` de tool, nunca no corpo da requisição. Acesso a dados no `ai-kit` passa por `TenantScopedRepo` que exige `Tenant` no filtro.
- **Reason**: vazamento entre tenants é a falha mais cara do sistema; o padrão já está provado no `ToolContext` do DentalEase.
- **Trade-off**: nenhum relevante — é restrição estrutural barata.
- **Scope**: todo o projeto. Teste estrutural obrigatório no CI.
- **Date**: 2026-09-02
- **Status**: active

### AD-014
- **Decision**: Sessão de token único verificada no banco — o cookie httpOnly `refreshToken` é a credencial de todo request; não existe access token separado.
- **Reason**: o contrato de sessão exige carregar `tenantUser` do banco em toda requisição (FND-05), então um access token curto não pouparia leitura; pouparia apenas a verificação de assinatura, ao custo de rotação, corrida de 401 e fila de retry no cliente.
- **Trade-off**: cada request faz duas leituras (`sessions` + `users`/`tenants`); sem stateless. Em troca, papel revogado, usuário desativado e tenant suspenso passam a valer no request seguinte.
- **Scope**: `api`, `apps/web`, `packages/contracts`.
- **Date**: 2026-09-02
- **Status**: active

### AD-015
- **Decision**: Vitest 4 é o único runner de testes do monorepo, configurado por `projects` na raiz.
- **Reason**: o gate de testes decide se uma task fechou, e um runner só cobre back-ends, packages isomórficos e o `web` sem transform ts-jest nem atrito de ESM em pnpm workspace.
- **Trade-off**: desvio do Jest + ts-jest do `DentalEase-BackEnd` — os testes portados de lá precisam de tradução de API (mínima) e o padrão de referência deixa de ser copiável literalmente.
- **Scope**: todo o projeto, incluindo `evals/`.
- **Date**: 2026-09-02
- **Status**: active

### AD-016
- **Decision**: E-mail é globalmente único e um `User` pertence a exatamente um `Tenant`; `isPlatformAdmin` é a única exceção a ter `Tenant` ausente.
- **Reason**: `POST /auth/signin` recebe só e-mail e senha e nenhum requisito prevê seletor de empresa no login; unicidade global mantém a resolução de identidade determinística.
- **Trade-off**: a mesma pessoa atuando em duas empresas precisa de dois e-mails. Suportar identidade compartilhada depois exige seletor de tenant no login e migração do índice.
- **Scope**: `api`, `packages/db`, `packages/contracts`.
- **Date**: 2026-09-02
- **Status**: active

### AD-017
- **Decision**: Convenção concreta de testes do monorepo — Vitest `projects` nomeados `unit` / `integration` / `e2e` / `structural`; arquivos colocados por sufixo (`*.unit.test.ts`, `*.int.test.ts`, `*.e2e.test.ts`, `*.structural.test.ts`, `*.unit.test.tsx` no `web`), sem diretório `__test__` separado. Gates: Quick = `pnpm vitest run --project unit --project structural`; Full = `pnpm vitest run`; Build = `pnpm -r exec tsc --noEmit && pnpm biome check . && pnpm vitest run`.
- **Reason**: AD-015 fixou o runner único; faltava a convenção de nomes de `project` e os comandos de gate que toda feature futura reusa sem reinventar — decidido com o usuário na fase Tasks da feature 1, na ausência de qualquer teste pré-existente no repo.
- **Trade-off**: renomear um `project` exige atualizar todo `Location Pattern` já escrito em specs futuros; um arquivo de teste fora do sufixo esperado não roda em nenhum project (falso-negativo silencioso).
- **Scope**: todo o projeto.
- **Date**: 2026-09-02
- **Status**: active

### AD-018
- **Decision**: Um único `.env` na raiz do monorepo para todo dev local — backends leem `process.env` direto; `apps/web` lê o mesmo arquivo via `envDir: '../../'` no `vite.config.ts` (nunca `.env` duplicado por app). Cada app Node expõe `"dev": "tsx watch src/server.ts"` no seu `package.json`. Dado de bootstrap que não pode vir de rota (ex.: primeiro `isPlatformAdmin`) é seed idempotente em `apps/<app>/scripts/`, nunca endpoint.
- **Reason**: nenhuma task da feature 1 cobriu como o ambiente de dev realmente sobe (só testes automatizados contra `MongoMemoryServer`/apps mínimos via supertest) — sem isso `pnpm dev` não funcionava em nenhum dos 3 apps e o percurso manual do Success Criteria do spec (convite → senha → login → área privada no navegador) não rodava. Descoberto e corrigido pelo orquestrador na verificação pós-Execute da feature 1.
- **Trade-off**: variáveis de ambiente perdem isolamento por app — nomes precisam ser únicos globalmente (o front já usa prefixo `VITE_` para isso). Um seed script por dado de bootstrap é mais uma peça de tooling para manter, mas evita abrir uma segunda via de escrita para um campo que uma rota nunca deveria aceitar (AD-010).
- **Scope**: todo o projeto — toda feature futura que adicionar um app Node ou telas no `web` segue esta convenção sem redecidir.
- **Date**: 2026-09-03
- **Status**: active

### AD-028
- **Decision**: Any table component in `apps/web` uses `@tanstack/react-table` in manual/server mode (`manualPagination: true, manualSorting: true, manualFiltering: true`) — client-side slicing/sorting/filtering over an already-fetched page is never acceptable, regardless of expected dataset size.
- **Reason**: Decided during `crm-web-shell` Design after finding that the reference repo's own convenience `DataTable<T>` (`../DentalEase/DentalEase/src/components/ui/data-table.tsx`) is actually 100% client-side despite its name — porting it as-is would have violated WEB-01 AC2/AC3's explicit server-side requirement. Recorded as a standing convention so a future feature doesn't rediscover or re-litigate this the same way.
- **Trade-off**: every list screen must carry its filter/sort/page state in a place the server call can read (URL search params or component state) instead of handing a full dataset to a convenience component — slightly more wiring per screen, in exchange for never accidentally loading a full collection into the browser.
- **Scope**: `apps/web`, any future table/list screen.
- **Date**: 2026-09-05
- **Status**: active

### AD-030
- **Decision**: `apps/web` adopts TanStack Router's file-based routing (`@tanstack/router-plugin`'s `tanstackRouter()` vite plugin + `createFileRoute()`), converging the manual `createRoute`+`router.tsx` `addChildren` composition feature 1 introduced onto the file-based convention `CLAUDE.md` already documents as mandatory (directory + `index.tsx`, `staticData`, no `.`-nested filenames). Every route that identifies a specific record resolves it via `search` params (`validateSearch`), never a dynamic path segment (`$id`) — `details.tsx` is the fixed name for a single-record view/edit screen, `add/index.tsx` for a create screen. A directory prefixed with `_` (e.g. `_private`) is a pathless layout requiring a matching `<name>.tsx` layout file; `_public` had no such file and no shared layout component, so `auth`/`invite` move to plain top-level directories (`auth/index.tsx`, `invite/index.tsx`) instead of inventing an unneeded pathless group.
- **Reason**: Confirmed with the user during `crm-web-shell` Execute (before Batch 2), after finding `CLAUDE.md`'s routing section (`createFileRoute`, `staticData`, explicit ban on `$id` for details — "use details.tsx com search: { id }") was never actually adopted by feature 1 (`foundation-tenancy-auth` shipped `createRoute`+manual composition instead), and this feature's own Design phase continued that gap (`$customerId`/`$processId` in its original Routes table) without cross-checking `CLAUDE.md`. `crm-web-shell` is the first feature adding a meaningful volume of new `apps/web` routes (6, vs. feature 1's 3) — the natural point to correct this before more routes accumulate on the wrong convention, rather than migrating later at higher cost. The reference `../DentalEase/DentalEase` already uses this exact plugin+convention (`@tanstack/router-plugin@1.168.18` resolved in its lockfile), confirming `CLAUDE.md`'s routing section was transcribed from it.
- **Trade-off**: rewrites all 4 of feature 1's existing route files (`_private.tsx`, `_private/index.tsx`, `_public/auth/index.tsx`→`auth/index.tsx`, `_public/invite/index.tsx`→`invite/index.tsx`) plus `router.tsx`, adds a new dependency (`@tanstack/router-plugin`) and a generated `routeTree.gen.ts`; every future `apps/web` route follows this from now on — no more manual composition, no more `$id` path segments for a record detail.
- **Scope**: `apps/web`, every future feature that adds a route.
- **Date**: 2026-09-05
- **Status**: active; o arquivo de layout `<nome>.tsx` ao lado da pasta `_nome/` e `details.tsx` como arquivo foram superseded pela AD-066

### AD-031
- **Decision**: CI via GitHub Actions (`.github/workflows/ci.yml`), um único job (`build-gate`) que roda em todo push/PR para `main`, executando exatamente o script `check` da raiz (`pnpm -r exec tsc --noEmit && pnpm biome check . && pnpm vitest run` — o próprio Build gate do AD-017, sem comando novo). `packageManager` (pnpm) já fixado em `package.json`; Node fica em `lts/*` (nenhuma versão de Node era fixada em lugar nenhum do repo antes desta decisão — sem precedente para fixar um número específico).
- **Reason**: `ai-gateway`'s AC AIG-43 ("golden set — gate 100% determinístico no CI") expôs que nenhuma das 4 features anteriores jamais configurou CI — achado pelo Verifier independente da feature (`validation.md`, iteração 1). Discutido e confirmado com o usuário: em vez de tratar como um fix isolado só de `ai-gateway`, resolve a lacuna de uma vez para o projeto inteiro, já que o Build gate (AD-017) é o mesmo para toda feature — um único workflow cobre todas.
- **Trade-off**: nenhuma versão de Node fixada (`lts/*` muda sozinho quando o GitHub atualiza a LTS corrente) — aceito por não haver nenhum precedente de pin no repo; fixar um número específico agora seria uma decisão nova sem base. Binário do `mongodb-memory-server` baixa da rede a cada run (sem cache) — aceitável para o volume atual de testes, revisar se o tempo de CI virar gargalo. Risco pré-existente conhecido: `apps/api`/`ai-gateway` `integration`/`e2e` projects compartilham uma única instância de `MongoMemoryServer` (`vitest.config.ts`), causando um flake intermitente já documentado — a CI pode eventualmente mostrar 1 run vermelho sem regressão real; revisitar se a taxa de flake virar incômodo prático.
- **Scope**: todo o projeto — todo push/PR para `main`, toda feature futura.
- **Date**: 2026-09-07
- **Status**: active
- **Follow-up (mesmo dia)**: `pnpm biome check .` rodava vermelho na PRIMEIRA execução do workflow — o erro de formatação pré-existente de `.specs/lessons.json` (nunca corrigido, arquivo machine-owned) tornaria a CI permanentemente vermelha, achado pelo Verifier na iteração 2 do `ai-gateway`. Corrigido com um override em `biome.json` excluindo o arquivo do linter/formatter/assist (mesmo padrão já usado para `**/*.gen.ts`), commit `4805e4b`.

### AD-036
- **Decision**: Convenção de tempo do projeto, nascida em `scheduling` e válida para toda feature futura: (1) **instante** é sempre gravado em UTC, sem exceção; (2) **regra recorrente** (ex.: "seg a sex, 08:00") não é instante e não tem UTC próprio — é gravada como hora de parede (`HH:mm`) e interpretada numa constante única de exibição, `DISPLAY_TIMEZONE = 'America/Sao_Paulo'`, exportada por `packages/db/src/scheduling.ts`; (3) a conversão hora de parede ↔ instante resolve o offset pelo `Intl.DateTimeFormat` com `timeZoneName: 'longOffset'` **na data alvo**, em duas passadas, nunca por offset fixo em string; (4) a conversão para horário local acontece só na borda de apresentação (tela e texto que a IA envia), em nenhuma outra camada. `contextBuild.ts` passa a importar `DISPLAY_TIMEZONE` em vez de repetir a string `'America/Sao_Paulo'` que já carrega hoje.
- **Reason**: Instrução literal do usuário na sessão de Discuss de `scheduling` ("evitar fuso, sempre o fuso vai ser em +0 e apenas no momento de apresentação deve ser calculado e aplicado o timezone partindo do +0"), com a ressalva técnica de que a grade semanal não é um instante — converter a regra recorrente para UTC na gravação deforma o dado (uma janela 21:00–23:00 local vira o dia seguinte em UTC e muda o dia da semana gravado, verificado por execução). O offset resolvido por `Intl` em vez de `-03:00` cravado (o que a referência DentalEase faz) mantém o cálculo correto se o horário de verão brasileiro voltar, e já funciona para outros fusos sem reescrita.
- **Trade-off**: Não existe fuso por tenant — um tenant fora do horário de Brasília (Manaus, Rio Branco) vê horários deslocados; aceito explicitamente pelo usuário. Como a matemática já resolve offset por data e por fuso nomeado, adotar fuso por tenant depois é trocar a constante por um campo, não reescrever o cálculo. Toda leitura de "agora" no domínio de agenda tem que passar pelos helpers, não por `new Date().getHours()`, sob pena de reintroduzir hora local do servidor.
- **Scope**: todo o projeto — `packages/db` (`scheduling.ts`), `packages/ai-kit` (`contextBuild.ts`), `apps/api`, `apps/web`, e qualquer feature futura que grave data/hora.
- **Date**: 2026-09-10
- **Status**: active
- **Correção (fase Tasks, 2026-09-11)**: o item (2) acima dizia que `DISPLAY_TIMEZONE` é exportada por `packages/db/src/scheduling.ts`. Ao planejar as telas, o grafo de dependências mostrou que o `apps/web` depende só de `@ethica/contracts`/`@ethica/field-engine` e nunca de `@ethica/db` — importar `packages/db` levaria Mongoose para o bundle do navegador —, e o front precisa da mesma constante para exibir horário igual ao que a IA escreve, qualquer que seja o fuso do navegador. A constante passa a ser exportada por **`packages/contracts`** (o único pacote sem dependência `@crm`, importado pelos dois backends e pelo `web`); `packages/db/src/scheduling.ts` e `contextBuild.ts` a importam de lá. Consequência de fronteira, no mesmo espírito do item (4): a API do operador recebe data e hora **em hora de parede** (`YYYY-MM-DD` + `HH:mm`) e o servidor converte para UTC com a implementação única de `packages/db`; o `apps/web` só formata UTC → exibição, nunca converte no sentido contrário.

### AD-038
- **Decision**: `apps/api` é organizado em **módulos contidos** em `src/modules/<modulo>/` (`identity`, `field-template`, `customer`, `process`, `product`, `order`, `payments`, `inbox`, `scheduling`, `kanban`). Cada módulo carrega todas as suas camadas: router, controller, service, repository e testes colocalizados. Tem também uma camada de schema por entidade (`<entidade>.schema.ts`), que concentra schemas Zod de entrada locais, re-export dos schemas de `@ethica/contracts` usados, tipos `z.infer` e tipos de saída/record. Um arquivo não-teste de um módulo só importa de outro módulo o `*.service.ts` ou o `*.schema.ts`. Dado de banco de outro módulo só chega via service do dono. Cada model/transição do `@ethica/db` tem um único módulo dono (tabela em `.specs/features/api-modules/design.md`). O grafo entre módulos é acíclico. Schemas locais do app são registrados em `modules/schema.registry.ts`, e o structural AD-010 valida a união com `@ethica/contracts`. A camada compartilhada (`config/ middlewares/ providers/ metrics/ events/`) não importa de `modules/`, exceto o composition root (`app.ts`/`server.ts`) e `events/subscribers/`. Tudo isso é verificado por `tests/structural/module-boundary.structural.test.ts`.
- **Reason**: Pedido explícito do usuário (feature `api-modules`). As camadas técnicas espalhavam cada domínio por 4 pastas, e schemas/tipos ficavam soltos nos routers. Services e repositories liam dados de outros domínios direto, com fronteiras só implícitas.
- **Trade-off**: O enriquecimento cross-módulo (nomes/telefone/payment) sai do repository e vai para o service consumidor, via service do dono: uma consulta `$in` por collection, mesma contagem de round-trips, mas mais código de junção no service. Transições multi-collection de `packages/db` (AD-033/AD-035) ficam fora da regra. `auth`, `platform` e `invite` viram um módulo só (`identity`) porque dividem User/Session/Tenant/Invite.
- **Scope**: `apps/api`; toda feature futura do api cria ou estende um módulo.
- **Date**: 2026-09-19
- **Status**: active

### AD-039
- **Decision**: Efeitos colaterais entre módulos do `api` cujo resultado a resposta HTTP não usa são **eventos de domínio in-process**. Eles passam por `src/events/`, com a mesma estrutura de `DentalEase-BackEnd/src/events`: `DomainEventBus` tipado sobre `EventEmitter` (`emit`/`on`/`off`), `DomainEventMap` em `event-types.ts`, `subscribers/*.subscriber.ts` que chamam o service do módulo consumidor e `registerAllSubscribers()` idempotente, chamado em `buildApp()`. É fire-and-forget: um handler que rejeita é logado como JSON `domain_event.handler_failed` e nunca chega ao emissor. Services importam só `events/event-bus.js`. Primeiro evento: `tenant:provisioned` → seed do template padrão de customer.
- **Reason**: Pedido explícito do usuário, espelhando o DentalEase. O emissor não conhece o consumidor, e a regra "módulo só fala com service de outro módulo" (AD-038) não precisa virar dependência de ida e volta.
- **Trade-off**: Sem garantia de entrega nem retry: um handler que falha só deixa log. Por isso, processo cujo resultado a resposta precisa continua chamada síncrona ao service do outro módulo (ex.: `notice` do cancel/reschedule de appointment). Não substitui nem contradiz AD-002: o bus é interno ao processo do `api`, sem broker nem evento entre serviços.
- **Scope**: `apps/api`.
- **Date**: 2026-09-19
- **Status**: active

### AD-054
- **Decision**: Busca de texto passa a usar MongoDB Atlas Search (`$search`), e não `$text` nem `$regex`: o operador `contains` dos segmentos e a busca `q` de cliente e produto. O banco **migra para Atlas** e o **dev local também roda Atlas Search**, trocando a imagem Docker do serviço `mongo` por uma que embute Atlas Search (candidata `mongodb/mongodb-atlas-local`, a confirmar na execução) em vez de depender da versão do Mongo. Índices de busca são provisionados por script idempotente versionado no repo, não por Mongoose. A busca fica atrás de uma interface `TextSearch`; no `$search` o filtro de tenant vai em `compound.filter`, primeiro estágio. Sem fallback silencioso para regex: banco sem suporte = `search_unavailable`. `mongodb-memory-server` não executa `$search`, então os testes de busca rodam contra a imagem Atlas local ou contra dublê da interface, e a busca só é dada como verificada contra Atlas real. Vector Search é do RAG (ADR-0043), fora daqui.
- **Reason**: pedido do usuário (2026-10-10). O repositório tinha só dois `RegExp` escapados e nenhum `$text`.
- **Trade-off**: semântica por termos analisados difere de substring (rótulo "contém termos"); o corte de produção (VM → Atlas) é operação do usuário, fora do código; testes de busca ganham dependência de Docker ou de dublê; as listas de cliente e produto mudam de comportamento quando `q` migrar.
- **Scope**: `docker-compose.yml`, `RUN_BOOK.md`, `packages/db`, `apps/api/src/modules/customer`, `apps/api/src/modules/product`. Complementa ADR-0043.
- **Date**: 2026-10-10
- **Status**: active (aprovada pelo usuário em 2026-10-10); a parte dos testes com dublê de regex foi superseded pela AD-056; a parte do dev local com imagem Docker Atlas Search foi superseded pela AD-056 e **restabelecida pela AD-059** (Atlas Local em dev e testes, cluster hospedado só em produção)

### AD-059
- **Decision**: O padrão único de banco passa a ser o **motor** MongoDB Atlas (Atlas Search) em todos os ambientes, mas **local onde for dev ou teste** e hospedado só em produção. (1) **Dev local**: o serviço `mongo` volta ao `docker-compose.yml` com `mongodb/mongodb-atlas-local:8` (healthcheck, volume `mongo-atlas-data`, porta de host 37017); `api`, `ai-gateway` e `web` dependem dele e recebem `MONGODB_URI=mongodb://mongo:27017/crm?directConnection=true` por `environment`, que se sobrepõe ao `.env`. (2) **Testes locais**: o mesmo container, banco `crm_test`, por `MONGODB_TEST_URI=mongodb://localhost:37017/crm_test?directConnection=true`; as guardas da AD-056 (nome com `test`, URI diferente da `MONGODB_URI`, limpeza recusa banco sem `test`) seguem como estão. (3) **CI**: inalterado (container `mongodb-atlas-local`, serviço `mongo-test`, sem secret). (4) **Produção**: o único ambiente em que a `MONGODB_URI` é a connection string `mongodb+srv://` do cluster hospedado no MongoDB Atlas; ela não entra no `.env.example` como valor de dev nem no compose. (5) Nenhuma mudança de código de busca: `$search`, `SEARCH_INDEXES` e `search:provision` continuam (AD-054). Mudaram só compose, `.env.example`, `RUN_BOOK.md`, mensagens e comentários.
- **Reason**: pedido do usuário (2026-10-11): a AD-056 leu "Atlas em todos os ambientes" como cluster hospedado em dev e em teste, o contrário do pretendido. O que se queria era um padrão de tecnologia (Atlas Search em todo lugar), não de hospedagem: dev e testes locais num Atlas em Docker, produção no cluster do MongoDB. Evita dois clusters na nuvem, credencial no `.env` de dev e o limite de índices do tier gratuito.
- **Trade-off**: volta um serviço pesado ao compose (imagem maior, mais memória, ~30 s para ficar `healthy`); o volume `mongo-data` do `mongo:8` não abre na imagem Atlas Local (dump/restore, como previsto na AD-055 item 10); dev e testes dividem a instância, então a limpeza dos testes só é segura pela guarda do nome `test`.
- **Scope**: `docker-compose.yml`, `.env.example`, `RUN_BOOK.md`, `apps/api/CLAUDE.md`, `packages/db/src/testDatabase.ts`, `packages/db/tests/setup/globalSetup.ts`, `apps/api/scripts/provision-search-indexes.ts`, `vitest.config.ts`, `evals/replay/cli.ts`, `docs/adr/0013-evals-golden-set-e-replay.md`. **Supersede** da AD-056 os itens (1), (2) e (5) e a parte do item (4) que previa cluster de teste na nuvem; mantém o restante (3, guardas, CI).
- **Date**: 2026-10-11
- **Status**: active; os itens (2) e (3) foram superseded pela AD-065

### AD-065
- **Decision**: O banco de testes é **derivado** da `MONGODB_URI`: mesmo servidor, banco `<banco>_test` (`mongodb://localhost:37017/crm` → `.../crm_test`). `MONGODB_TEST_URI` vira override opcional e some do `.env`/`.env.example`. A derivação só vale para `mongodb://` em `localhost`, `127.0.0.1` ou `mongo`; `mongodb+srv://` nunca é derivado. Guardas mantidas (nome com `test`, URI diferente da do app, limpeza recusa banco sem `test`). O CI expõe o serviço `mongo-test` na porta `37017` e define só `MONGODB_URI`, igual ao dev. A regra fica escrita só em `RUN_BOOK.md#banco-de-dados`; código, compose, CI e `CLAUDE.md` apenas apontam para lá.
- **Reason**: pedido do usuário (2026-10-11): duas variáveis, portas diferentes (27017 no CI e na URI fictícia do vitest, 37017 no dev) e a mesma explicação repetida em ~12 arquivos geravam divergência.
- **Trade-off**: dev e testes dependem de `MONGODB_URI` apontar para um servidor local; quem testar contra servidor remoto precisa definir `MONGODB_TEST_URI` explicitamente.
- **Scope**: `packages/db/src/testDatabase.ts`, `packages/db/tests/setup/globalSetup.ts`, `vitest.config.ts`, `.github/workflows/ci.yml`, `.env.example`, `docker-compose.yml`, `RUN_BOOK.md`, `apps/api/CLAUDE.md`, `evals/replay/cli.ts`, `docs/adr/0013-evals-golden-set-e-replay.md`. **Supersede** da AD-059 os itens (2) e (3).
- **Date**: 2026-10-11
- **Status**: active

### AD-066
- **Decision**: Padrão único de rotas do `apps/web`, documentado na skill `ethica-web-standards` (fonte única; `apps/web/CLAUDE.md` só aponta para ela). (1) Toda rota é pasta + `index.tsx`: detalhe em `details/index.tsx` (`?id=`), nunca `details.tsx`. (2) Layout pathless é `route.tsx` dentro da própria pasta (`_private/route.tsx`, `_public/route.tsx`, `_private/_admin/route.tsx`); nenhum arquivo de rota fica ao lado de pasta homônima. (3) `@components/@utils/@interface` pertencem à rota do mesmo nível: usado só por uma rota filha desce para o `@` dela; usado por 2+ rotas irmãs fica no `@` do pai; usado por outro módulo sobe para `src/components/` ou `src/lib/`. Todas as rotas existentes foram migradas.
- **Reason**: pedido do usuário (2026-10-11): o padrão estava documentado no `apps/web/CLAUDE.md` mas não era seguido (`kanban/details.tsx` ao lado de `kanban/details/`, `_admin.tsx` ao lado de `_admin/`, `professionals/@components/` servindo o `details`), e o próprio CLAUDE.md citava caminhos inexistentes (`@/components/ui/*`). Padrões trazidos do `iotlog-frontend-v2-standards`, projeto com a mesma stack.
- **Trade-off**: IDs de `createFileRoute` dos detalhes ganham barra final (`/_private/x/details/`); URLs e links não mudam. Form compartilhado entre `add` e `details` continua no `@` do pai, e não no do `details`.
- **Scope**: `apps/web/src/routes/`, `apps/web/src/components/order-status.ts`, `apps/web/CLAUDE.md`, `.agents/skills/ethica-web-standards/`, `AGENTS.md`. **Supersede** parte da AD-030 (layout `<nome>.tsx` ao lado de `_nome/`, `details.tsx` como arquivo).
- **Date**: 2026-10-11
- **Status**: active

### AD-067
- **Decision**: Complementa a AD-066: rotas do `apps/web` separam responsabilidades em `@components/` (visual), `@consts/` (valores fixos), `@hooks/` (orquestração de formulário/search), `@interface/` (schemas de search e tipos locais), `@query/` (factories de dados locais) e `@utils/` (funções puras). `index.tsx` compõe a tela. As pastas seguem o nível de uso da AD-066 e só são criadas com conteúdo real. Queries de entidades usadas por 2+ rotas permanecem em `src/query/<entidade>.ts`; não há imports entre módulos de rotas. Hooks de formulário reúnem `useForm`, resolver do contrato, mutation e submit, sem substituir factories `queryOptions` por hooks de busca. O molde de estados mantém `Card asPage` montado, filtros em `CardContent`, e resolve loading → erro com retry → vazio filtrado com limpeza ou vazio inicial → conteúdo com dados prontos.
- **Reason**: pedido do usuário (2026-10-11) para padronizar o conteúdo das páginas após a migração de pastas da AD-066, preservando comportamento, visual e asserções dos testes existentes. A skill precisa definir a separação antes do inventário e da migração por módulo.
- **Trade-off**: extração cria arquivos locais adicionais e exige atualizar imports/mocks; evita concentrar formulário, navegação e factories no `index.tsx`. `@query/` exige verificar consumidores antes de mover dados compartilhados.
- **Scope**: `apps/web/src/routes/`, `.agents/skills/ethica-web-standards/`. Fonte única dos moldes: `SKILL.md` e `references/{data-layer,page-patterns}.md` da skill.
- **Date**: 2026-10-11
- **Status**: active

### AD-068
- **Decision**: O shell privado desktop de `apps/web` passa a oferecer navegação lateral persistente por áreas do CRM, destacando a rota atual. A navegação é montada apenas com rotas existentes e obedece as mesmas regras de acesso da home; em mobile continua a dock atual. O acabamento visual mais suave fica restrito ao shell do `apps/web` e ao tema default Emerald Mauve, sem alterar `@ethica/ui` compartilhado com `apps/site` nem as escolhas de tema salvas pelo usuário.
- **Reason**: Pedido do usuário (2026-10-12) para enriquecer a interface do CRM usando padrões de navegação de CRMs modernos, incluindo RD Station, devido à dependência de breadcrumb/home no desktop e à baixa hierarquia visual relatada. As áreas e permissões já existem, então orientação consistente não exige novo domínio ou endpoint.
- **Trade-off**: Navegação persistente usa largura no desktop e requer manutenção quando uma nova área de topo é adicionada. Um conjunto único de rotas existentes evita links inválidos e estados duplicados.
- **Scope**: `apps/web` (shell privado, navegação, tokens e home). Supersede as restrições visuais da AD-027 apenas quanto ao acabamento do shell web; preserva stack, componentes, identidade verde, padrões de rota, formulários e regras do site.
- **Date**: 2026-10-12
- **Status**: active

### AD-070
- **Decision**: Supersede a AD-037. `apps/web` pode usar `Dialog` (`packages/ui/src/components/dialog.tsx`) para criar, editar e agir sobre registro, ou uma página `/add` com `apps/web/src/components/default-form-layout.tsx`; a escolha é feita caso a caso, com o usuário. Os painéis inline existentes (agendamento/bloqueio do calendário, ações do quadro kanban) são legado a migrar, não padrão a copiar.
- **Reason**: Pedido do usuário (2026-10-14) para tirar a proibição de `Dialog` e levar a edição dos painéis inline para `Dialog` ou `/add`, junto do redesign Workspace (AD-069).
- **Trade-off**: Dois padrões de criação/edição coexistem (Dialog e `/add`) e cada tela precisa justificar o seu; em troca, o conteúdo da página deixa de ser empurrado por formulários abertos no meio dela.
- **Scope**: `apps/web`. Plano de entrada: `.specs/plans/2026-10-14-telas-de-dados-e-dialogs.md`.
- **Date**: 2026-10-14
- **Status**: active

### AD-072
- **Decision**: Página de registro do `apps/web` (detalhes de entidade, relatórios, integrações) segue o layout final de três telas do `iotlog-frontend-v2` (`service-management/fas/details`, `fas/filled-os/@components/os-details.tsx`, `maintenance/list-os-done/view`): cabeçalho com rótulo em caixa alta e título a 24px, faixa de destaques com valores a 24px e seções colapsáveis de linhas rótulo/valor, em `apps/web/src/components/record.tsx`. Supersede a parte da AD-071 que mantinha a escala Workspace sem exceção tipográfica; o diretório de usuários da AD-071 continua.
- **Reason**: O usuário apontou essas telas como a versão final desejada para o layout de apresentação de dados.
- **Trade-off**: Uma exceção de escala no DESIGN.md (24px em título e valores dessas páginas) e um segundo vocabulário visual de leitura além de `Item`/`Panel`; em troca, as 12 telas falam a mesma língua e reaproveitam um componente só. Adaptações ao tema: `secondary` do IOT vira `muted` (no CRM `secondary` é a tinta azul) e a faixa usa `tabular-nums` da Inter em vez da mono.
- **Scope**: `apps/web/src/components/record.tsx`, `packages/ui/src/components/collapsible.tsx`, telas listadas em `docs/features/web-registro-dialogs/feature.md`.
- **Date**: 2026-10-14
- **Status**: active; a forma visual da faixa `RecordStats` foi superseded by AD-090

### AD-075
- **Decision**: Todo cartão de redirecionamento do `apps/web` (atalho de hub, contador do dia, primeiros passos, tarefa prioritária, registro relacionado do cliente, próxima ação, evento da jornada, board do kanban, template de campos, integração e indicador de relatório) é uma linha de `LinkList`/`LinkListItem` (`apps/web/src/components/link-list.tsx`), a partir da referência `cards.html` do usuário: moldura cinza envolvendo um cartão branco, linhas com ladrilho de ícone, título (ou número de destaque com `size="xl"`) + selos, rótulo e botão de seta. A linha inteira é o link; sem `render`, a linha é estática e sem seta. `columns` (1–4) quebra em grade a partir de `sm`. Nos relatórios, substitui a faixa `RecordStats`/`RecordStat` da AD-072 para os indicadores; o nome acessível do link passa a começar pelo valor.
- **Reason**: Pedido do usuário (2026-10-14): um componente só para todos os cartões de redirecionamento, com o layout da referência.
- **Trade-off**: O título da linha não leva o sublinhado tracejado da AD-074 (o botão de seta é o sinal de link, como já era no `Item` com `render={<Link/>}`); os relatórios perdem a faixa de destaques entre fios. `ItemGroup` segue para listas que não são destinos.
- **Scope**: `apps/web/src/components/link-list.tsx` e as telas citadas; testes de relatório ajustados ao novo nome acessível.
- **Date**: 2026-10-14
- **Status**: active; supersede a AD-072 só no uso de `RecordStats` para indicadores de relatório

### AD-077
- **Decision**: Toda listagem em tabela do `apps/web` usa o painel `DataTable` (`apps/web/src/components/data-table.tsx`), a partir do `table.html` do usuário (um data-grid): cartão com a toolbar de busca/filtros no topo, fio, tabela encostada nas bordas e paginação (`TablePagination`) como rodapé abaixo de um fio. O loading e o estado vazio ficam dentro do painel, com respiro. Os primitivos `Table*` de `packages/ui/src/components/table.tsx` seguem a referência: cabeçalho sem faixa (só fio inferior, texto secundário, 32px), linha com hover `muted/40` e fio na célula (`border-separate`), célula `px-2 py-1.5`, primeira/última coluna com 16px de borda. Fora do `DataTable` a tabela mantém a própria moldura; dentro dele (`in-data-[slot=data-table]`) a perde. Coluna ordenável usa `DataTableSortButton` (botão fantasma com seta dupla, ou seta da direção) e `aria-sort` via `sortAria` no `<th>`. Aplicado em clientes, tarefas, processos, catálogo e pedidos.
- **Reason**: Pedido do usuário (2026-10-14): tornar o design do `table.html` a tabela padrão do sistema.
- **Trade-off**: A família tipográfica dos primitivos continua a do sistema (AD-073), não o `text-sm` sans da referência. Toolbar de colunas, ações em lote, seleção por checkbox e colunas fixas da referência ficaram de fora — nenhuma listagem tem esses recursos. As outras tabelas (importação, conhecimento, profissionais, espaços, conversas, itens do pedido, pagamentos) ganham o novo estilo de cabeçalho/linha pelos primitivos, mas ainda não estão no painel `DataTable`.
- **Scope**: `apps/web/src/components/{data-table,table-pagination}.tsx`, `packages/ui/src/components/table.tsx`; páginas e `@components/*-table.tsx` de `customers/list`, `activities/list`, `processes/list`, `products`, `orders`. Supersede a linha "Tables" do `apps/web/DESIGN.md`.
- **Date**: 2026-10-14
- **Status**: active

### AD-078
- **Decision**: O conteúdo das células de toda tabela do `apps/web` segue as linhas-modelo do usuário (`line.html`, `premium line.html`), com as peças de `apps/web/src/components/data-table.tsx`: `TableIdentity` na coluna principal (avatar com iniciais para pessoa/empresa, ladrilho de ícone para coisa; título 500 em uma linha, link quando navega; linha de apoio em 12px), `TableStack` para valor + linha de apoio (data/hora, tempo/desde, total/quantidade), `TableIconText` para ícone + texto discreto, `TableStatus` (selo suave com bolinha; `variant` para status de domínio, `color` para status do tenant) e `TableRowActions`/`TableRowAction` (menu ⋮ que não propaga o clique da linha). Dentro do `DataTable` a linha tem 56px. `ItemDescription` ganha `size="sm"` (12px). Ícone por tipo de tarefa em `ACTIVITY_TYPE_ICON` (`apps/web/src/components/activity-labels.ts`). Aplicado em clientes (nome + documento, telefone, status, cliente desde, menu Detalhes/Novo processo/Nova tarefa), tarefas, processos, catálogo e pedidos.
- **Reason**: Pedido do usuário (2026-10-14): a AD-077 copiou só a moldura da tabela; o principal era a apresentação do conteúdo do `TableBody`.
- **Trade-off**: Texto longo corta em uma linha com reticências (o valor completo fica no detalhe). No celular a identidade tem largura mínima de 176px e a tabela rola de lado em vez de espremer as colunas. Atraso da próxima ação do processo virou texto na linha de apoio ("Atrasada · prazo"), não selo. Checkbox de seleção e variação percentual da referência ficaram de fora — nenhuma listagem tem esses dados.
- **Scope**: `apps/web/src/components/{data-table,activity-labels}.tsx`, `packages/ui/src/components/{item,table}.tsx`; colunas/tabelas de `customers/list`, `activities/list`, `processes/list`, `products`, `orders`; dois testes de `processes/list` ajustados (responsável fora do `td` direto, atraso na linha de apoio).
- **Date**: 2026-10-14
- **Status**: active

### AD-079
- **Decision**: Ação irreversível (remover, arquivar, rejeitar) no `apps/web` nunca dispara no primeiro clique: abre o `ConfirmDialog` (`apps/web/src/components/confirm-dialog.tsx`, sobre o `FormDialog`). Formulário curto de ação sobre um registro (cancelar, remarcar, reabrir tarefa; motivo da rejeição de pedido) também é `FormDialog`, não bloco inline na página.
- **Reason**: Pedido do usuário (2026-10-15): cliente, produto, rejeição de pedido, card e coluna do kanban apagavam sem confirmação, e alguns formulários ainda empurravam a página.
- **Trade-off**: Um clique a mais em cada remoção. Rejeitar pedido na lista e na inbox só confirma (sem motivo); o motivo continua só no detalhe do pedido. Fora do escopo, por já estarem em Dialog: confirmação em dois cliques de `saved-views`, remoção de bloqueio e cancelar/remarcar agendamento.
- **Scope**: `confirm-dialog.tsx`; `customers|products|orders|activities|kanban|inbox` e `_admin/{custom_fields,integrations/knowledge}` (`details/`); testes ajustados para o clique de confirmação.
- **Date**: 2026-10-15
- **Status**: active; estende a AD-070

### AD-083
- **Decision**: Supersede a AD-082 nos pontos de fonte, topo e indicadores. Geist + Geist Mono substituem Inter/IBM Plex Mono; captions, cabeçalhos de tabela e rótulos de grupo voltam a sans. A faixa superior (breadcrumb + menus) é removida: `SidebarTrigger` e menu de usuário vivem na sidebar, o breadcrumb é o título do `CardHeader`, na mesma linha das ações. Recortes salvos viram abas. Listagens de clientes, tarefas, processos, catálogo e pedidos exibem KPIs por contagem real vindos de endpoints `GET /<entidade>/stats`. `Button`, `Badge` e abas existem só em `@ethica/ui`; os wrappers de `apps/web/src/components` são removidos. AD-073 (ItemTitle/ItemDescription) segue valendo.
- **Reason**: O usuário quer o resultado idêntico à referência e menos componentes customizados, com identidade nos componentes base.
- **Trade-off**: Os endpoints de stats mostram o panorama do tenant (não o recorte da tela); sparklines e ações em lote seguem fora até haver dados/fluxos.
- **Scope**: `apps/web`, `packages/ui`, `packages/contracts`, `apps/api` (módulos customer, activity, process, product, order).
- **Date**: 2026-10-16
- **Status**: active

### AD-085
- **Decision**: Supersede AD-084 no período de comparação. A faixa da lista de clientes mostra a série diária dos últimos 30 dias e compara o volume de novos registros nos 30 dias anteriores; os status seguem como fotografia atual e não recebem tendência sem histórico próprio.
- **Reason**: O usuário definiu a janela desejada como 30 dias contra os 30 dias anteriores.
- **Trade-off**: A tendência cobre criação de clientes, não mudanças de status. Quando o período anterior não tem registros, a direção continua visível, mas não há percentual.
- **Scope**: `apps/api/src/modules/customer/`, `packages/contracts/src/schemas/listStats.schema.ts`, `apps/web/src/components/record.tsx` e listagem de clientes.
- **Date**: 2026-10-17
- **Status**: active

### AD-086
- **Decision**: Supersede AD-083 apenas na exclusão de sparklines das listagens. Indicadores de catálogo, tarefas, processos e pedidos podem mostrar séries diárias de eventos reais, com 30 dias de exibição e comparação por período anterior ou pela média diária dos 30 dias anteriores. O número principal permanece a contagem atual. Tooltips nomeiam o evento medido; estados sem histórico de transição confiável continuam como fotografia atual e podem usar régua de proporção. As janelas desta extensão seguem `DISPLAY_TIMEZONE`; a série de clientes passa a usar o mesmo helper temporal.
- **Reason**: O usuário pediu a linguagem visual de clientes nas demais listagens e média diária para tarefas e processos; modelos existentes guardam datas de criação e de alguns marcos, mas não todos os snapshots de estado.
- **Trade-off**: Uma série de registros que estão atualmente num estado não reconstrói o estado daquele dia. Reabertura e mudança de estado removem o registro da coorte atual; a descrição do tooltip evita chamá-la de snapshot histórico.
- **Scope**: `packages/db/src/dailyTrend.ts`, `packages/contracts/src/schemas/listStats.schema.ts`, stats dos módulos customer/product/activity/process/order e faixas correspondentes em `apps/web`.
- **Date**: 2026-10-17
- **Status**: active

### AD-087
- **Decision**: Supersede a AD-074 na API de texto. Todo texto visível de `apps/web` continua em `ItemTitle` ou `ItemDescription`, com família, tamanho, peso e cor padrão nos dois primitivos. Variações pontuais usam `className` diretamente no uso, sem props tipográficas (`size`, `weight`, `tone`, `caption`, `clamp`, `multiline`, `nowrap`, `link`, `arrow`). `as` mantém a tag semântica e `render` compõe links e botões. Setas de redirecionamento são ícones explícitos no conteúdo. A direção visual vigente de AD-082/083 permanece.
- **Reason**: O usuário pediu a simplicidade do padrão DentalEase: uma base visual sólida com estilização local pequena, sem uma matriz de variantes no componente compartilhado.
- **Trade-off**: Ajustes visuais locais ficam explícitos em cada consumidor e não têm a uniformidade rígida das props anteriores. A varredura de tipografia verifica wrappers de texto e deixa de rejeitar classes nos dois componentes.
- **Scope**: `packages/ui/src/components/{item,form,label}.tsx`, `apps/web/src/**`, `.agents/skills/{ethica-item-typography,ethica-web-standards}/`, `apps/web/DESIGN.md`.
- **Date**: 2026-10-17
- **Status**: active

### AD-088
- **Decision**: Supersede a AD-087 apenas no `as`. `ItemTitle` renderiza `div` e `ItemDescription` renderiza `p`; `as`, `htmlFor` e o tipo `TextTag` saem dos dois. `render` fica como único ponto de troca de tag, para a semântica que pede (`h2`, `dt`, `dd`, `legend`, `label`) e para compor `Link`/`a`/`button`. Onde antes havia `as="span|div|p"` o componente é usado direto. `h1` como tag padrão do título foi descartado: o título está em quase todo texto de peso (células, `dt`/`dd`, itens de menu) e `h1` em `button`/`dt`/`span` é HTML inválido.
- **Reason**: O usuário pediu menos props e a simplicidade do DentalEase, onde o título é `div` e a descrição `p`, sem `as`.
- **Trade-off**: Texto que ficava em `span` dentro de botão ou linha corrida passa a ser bloco (`p`/`div`); `label`, `h2` e `legend` por `render` pedem `biome-ignore` pontual, porque o Biome não enxerga o conteúdo através do `render`.
- **Scope**: `packages/ui/src/components/{item,label,form}.tsx`, `apps/web/src/**`, `.agents/skills/ethica-item-typography/SKILL.md`.
- **Date**: 2026-10-17
- **Status**: active

### AD-089
- **Decision**: Todo link de texto para outra tela usa `AppLink` (`apps/web/src/components/app-link.tsx`): `<Link/>` de verdade sobre `ItemTitle` (padrão) ou `ItemDescription` (`as="description"`), com a classe `link` (`apps/web/src/theme.css`: cor `--link` `#1c2638`, azul escuro quase preto e pouco saturado, sublinhado `dashed` sempre visível) e `ArrowUpRight` ao final. Não se monta mais `ItemTitle render={<Link/>}` + seta à mão. Cada célula de `RecordStat` que leva a outra tela ganha o mesmo estilo. Em tabela, a linha inteira abre o detalhe do próprio registro (`onClick` na `TableRow` + `cursor-pointer`) e a coluna de identidade só leva `link` (`TableIdentity`) quando o destino é outro registro (ex.: o comprador em Pedidos); esse link não propaga o clique para a linha. Supersede só a parte de link da AD-087 (`text-impact hover:underline`); a AD-087 segue valendo para o resto do texto.
- **Reason**: o usuário viu o mesmo link com estilos diferentes (sem sublinhado, sem seta, só no hover) conforme a tela, e links na tabela que só respondiam ao clique no texto.
- **Trade-off**: `AppLink` fixa a seta e o sublinhado; um link de voltar ou sem destino de registro continua `ItemTitle` com a classe `link` e sem seta. Linha de tabela clicável e link na linha convivem: o link só existe quando o destino difere da linha.
- **Scope**: `apps/web/src/components/{app-link,data-table,record}.tsx`, `apps/web/src/theme.css`, `apps/web/src/routes/_private/**` (links de registro), `apps/web/DESIGN.md`, `.agents/skills/{ethica-item-typography,ethica-web-standards}/`.
- **Date**: 2026-10-17
- **Status**: active

### AD-090
- **Decision**: A página de registro do `apps/web` passa a ter um modelo só, o das telas do `iotlog-frontend-v2` (`maintenance/list-os-done/view`, `fas/filled-os/@components/os-details.tsx`), com toda a estética dentro de `apps/web/src/components/record.tsx`: (1) `RecordStats` padrão (`variant="ruled"`) é a faixa entre fios em cima e embaixo, com divisória vertical entre as células a partir de `md`, rótulo em caixa alta (caption) e valor a 24px; (2) `RecordHeadingGroup` põe vários pares rótulo/título lado a lado no cabeçalho (ex.: ordem + embarcação); (3) `RecordTable`/`RecordTableRow`/`RecordTableCell`/`RecordTableMedia` são a lista livre do checklist da OS concluída: título a 24px, linhas entre fios, ícone de situação tingido e células rótulo-sobre-valor alinhadas em colunas. A faixa de indicadores das listagens (sparkline, régua, tendência) continua com a superfície cinza da AD-083/086, agora explícita em `variant="band"`. A tela só passa dados: nenhum `className` de identidade nos usos. Supersede a forma visual da faixa da AD-072 (superfície cinza sem divisórias nos detalhes); o resto da AD-072 segue.
- **Reason**: o usuário comparou o render atual (faixa cinza sem fios nem divisórias) com as telas do IOT e pediu o modelo do IOT, mais rico, num componente base que espalhe a mesma estética pelo sistema.
- **Trade-off**: dois visuais para `RecordStats` (`ruled` nos registros, `band` nas listagens) em vez de um, para não perder as sparklines e réguas das listagens. `RecordTable` é `<table>` sem cabeçalho (o rótulo vai em cada célula, como no IOT), o que repete o rótulo por linha em troca de leitura sem olhar para o topo. Faixa com mais células que colunas quebra linha e a divisória da primeira célula da linha nova fica à esquerda.
- **Ajuste (2026-10-18)**: `RecordHeading` ganha `badge` (selo ao lado do rótulo) e o detalhe do cliente usa o par da direita do cabeçalho para "Cliente desde", com telefone, status e contagens do `/overview` na faixa.
- **Scope**: `apps/web/src/components/record.tsx`, as cinco `*-overview.tsx` das listagens (`variant="band"`), `apps/web/src/routes/_private/_admin/custom_fields/details/@components/template-view.tsx` (campos em `RecordTable`), `apps/web/DESIGN.md`, `.agents/skills/ethica-web-standards/`.
- **Date**: 2026-10-17
- **Status**: active

### AD-091
- **Decision**: Grupos de leitura com rótulo/valor nos detalhes usam `ProductSpecs` (`apps/web/src/components/product-specs.tsx`), o bloco `@shadcnblocks/product-specs1` com os dados de exemplo removidos: "Expandir tudo · Recolher tudo" à direita, cada grupo em cartão `rounded-lg border` com ícone, nome, ação opcional e uma tabela simples (rótulo `text-muted-foreground` em metade da largura, valor `font-medium`). O grupo aceita `description` sob o rótulo, `children` no lugar das linhas (formulário, tabela de itens, vazio, erro, carregando) e `footer` (paginação). A tela passa os grupos como dados num único `ProductSpecs`. Aplicado em processo (histórico + valores com o formulário de edição dentro do grupo), tarefa, produto, pedido, etapas do modelo de campos e cliente (informações + próxima ação, processos, conversas, pedidos e agendamentos do `/overview`). Supersede o `RecordSections`/`RecordSection`/`RecordField`/`RecordEntry` da AD-072/AD-090; cabeçalho e faixa (`RecordHeader`, `RecordStats`) e o `RecordTable` dos campos seguem.
- **Reason**: o usuário comparou o render adaptado ao design system (cartão dentro de cartão pelo `Table` do `@ethica/ui`, título a 24px, embrulhos tipográficos) com o bloco instalado puro e pediu o bloco como está, sem os textos de exemplo, com menos estrutura.
- **Trade-off**: os textos do componente são `span`/`td` como no bloco, fora da regra de `ItemTitle`/`ItemDescription` (AD-073/AD-088); o `Table` do `@ethica/ui` não é usado nas linhas (ele traz moldura própria) e a tabela de itens do pedido perde a moldura por `data-slot="data-table"`. O `CLI` do shadcn pede para sobrescrever `collapsible`/`table` do `@ethica/ui` e adiciona um pacote `cn` falso: o componente foi trazido à mão, sem aceitar essas mudanças. 
- **Ajuste (2026-10-18)**: `RecordSections`/`RecordSection`/`RecordField`/`RecordEntry` saíram de `record.tsx`; os últimos usos (modelos aprovados do WhatsApp e grade semanal do profissional) viraram grupos do `ProductSpecs`.
- **Scope**: `apps/web/src/components/{product-specs,record}.tsx`, `apps/web/src/routes/_private/{processes,activities,products,orders,customers}/details/@components/`, `apps/web/src/routes/_private/_admin/integrations/whatsapp/index.tsx`, `apps/web/src/routes/_private/schedule/professionals/details/@components/professional-details-view.tsx`, `apps/web/src/routes/_private/_admin/custom_fields/details/@components/template-view.tsx`, `apps/web/components.json` (registro `@shadcnblocks`).
- **Date**: 2026-10-18
- **Status**: active

### AD-092
- **Decision**: `DefaultEmptyData` (`apps/web/src/components/default-empty-data.tsx`) tem só `title`, `description` e `action`. Sem moldura de cartão: ilustração isométrica (do `default exemple.html`), título, descrição e no máximo uma ação, sem borda. Padrões: título "não encontrado" e descrição "altere a filtragem ou adicione novos dados". "Tentar de novo" e "limpar filtros" são `Button` passados em `action` pela tela.
- **Reason**: o `reason` (empty/filtered/error), o texto legado e os callbacks `onRetry`/`onClearFilters` geravam ramificações no componente; a tela diz diretamente o que mostrar.
- **Trade-off**: cada tela com erro ou filtro monta o próprio botão; a descrição padrão não combina com erro de carga, então telas de erro podem passar `description`.
- **Scope**: `apps/web/src/components/default-empty-data.tsx` e todos os usos em `apps/web/src/routes/`. Supersede o `reason` do ENR-01.
- **Date**: 2026-10-18
- **Status**: active

### AD-093
- **Decision**: Controles têm duas alturas escolhidas pelo contexto: **ação** `h-8` (barra de ferramentas, cabeçalho, rodapé, menus) e **campo** `h-11` (formulário/grade de filtros, ao lado de `Input`). Cada primitivo tem como padrão o seu contexto natural e uma `size` para o oposto: `Button` padrão `h-8` + `size="field"` `h-11`; `SelectTrigger` padrão `h-11` + `size="compact"` `h-8` (nova); `Input` só `h-11`; `ToggleGroup` só `h-8`. Regra e motivação em `.agents/skills/ethica-web-standards/references/visual.md` ("Altura dos controles").
- **Reason**: o `SelectTrigger` só tinha `default` (`h-11`) e `sm` (`h-7`), então os filtros da barra do calendário ficavam mais altos que o `ToggleGroup` e os botões da mesma linha.
- **Trade-off**: os nomes não são simétricos (`field` no Button, `compact` no Select) porque o padrão de cada componente segue o uso dominante; trocar o padrão do Select exigiria `size` em ~40 formulários.
- **Scope**: `packages/ui/src/components/select.tsx`, `apps/web/src/routes/_private/schedule/calendar/@components/calendar-toolbar.tsx`.
- **Date**: 2026-10-18
- **Status**: active

### AD-094
- **Decision**: Página-hub que lista destinos (kanban `/kanban`, modelos de campos `/custom_fields`) abre com `PageIntro` (`apps/web/src/components/page-intro.tsx`) e lista os destinos em `LinkCardList`/`LinkCard` (`apps/web/src/components/link-card.tsx`), a partir do `cards-aligh.html` do usuário. `PageIntro`: título e descrição da página, depois um cartão com ilustração à esquerda (decorativa, `aria-hidden`), título e texto do que a tela permite e uma linha de recursos com ícone. `LinkCard`: linha sem moldura, separada por fio, com ladrilho de ícone quadrado, título, linha de apoio "A / B" (`meta`) e `ArrowUpRight`; a linha inteira é o link (`render={<Link/>}`). Nessas telas o `CardHeader` leva só o título e a ação principal (`CardAction`, mesmo padrão das listas), a descrição vive na introdução, e o conteúdo fica em coluna `max-w-4xl` alinhada à esquerda com `pb-24` no fim. Supersede a AD-075 só para essas duas telas: `LinkList`/`LinkListItem` segue nos demais cartões de redirecionamento.
- **Reason**: o usuário achou os cartões em grade de `LinkList` pobres e trouxe um layout de listagem (vaga em destaque + linhas) para dar à página uma introdução e uma lista mais limpa e premium.
- **Trade-off**: a ilustração de cada página é um componente próprio (`fields-illustration.tsx`, `boards-illustration.tsx`) em vez de foto; o bloco "em destaque" do modelo (selo, local, botão "Apply") não foi reproduzido porque não há dado equivalente; `LinkCard` não tem selos nem avatar, diferente do `LinkListItem`.
- **Scope**: `apps/web/src/components/{link-card,page-intro}.tsx`, `apps/web/src/routes/_private/_admin/custom_fields/index.tsx` (e `@components/fields-illustration.tsx`), `apps/web/src/routes/_private/kanban/index.tsx` (e `@components/boards-illustration.tsx`); remove `template-list.tsx` e `use-templates-page.ts`.
- **Date**: 2026-10-19
- **Status**: active

### AD-095
- **Decision**: Todo `index.tsx` que redireciona para as páginas de um módulo (`/customers`, `/activities`, `/processes`, `/schedule`, `/kanban`, `/custom_fields`) segue o mesmo molde: `PageIntro` + `LinkCardList`/`LinkCard` (`apps/web/src/components/link-card.tsx`), usados direto. `LinkCard` é um cartão com moldura (`rounded-xl border`, ladrilho de ícone, título, apoio opcional, `ArrowUpRight`) em grade de duas colunas a partir de `sm`; o cartão do `PageIntro` tem altura fixa (`lg:h-80`, `min-h-152` no mobile) para ficar igual em todos os hubs. Supersede a AD-094 só no formato da lista (linhas separadas por fio viram grade de cartões) e o `ItemGroup`/`Item` dos hubs de módulo. `LinkList`/`LinkListItem` segue nos cartões de redirecionamento da home e dos relatórios.
- **Reason**: o usuário aprovou o novo layout (`design.html`, com o recorte do ladrilho tirado do `dusk-team-1` da Tailark) e pediu que ele seja o padrão dessas páginas.
- **Trade-off**: altura fixa exige que texto novo do `PageIntro` caiba nela; os hubs não mostram descrição por destino, só ícone e título.
- **Scope**: `apps/web/src/components/{link-card,page-intro}.tsx`, `apps/web/src/routes/_private/{customers,activities,processes,schedule,kanban}/index.tsx`, `apps/web/src/routes/_private/_admin/custom_fields/index.tsx`, `.agents/skills/ethica-web-standards/`.
- **Date**: 2026-10-19
- **Status**: active

### AD-097
- **Decision**: A conta da pessoa logada (`/account`: foto, nome, senha) escreve só em `/me/*` (`PATCH /me/profile`, `PUT /me/password`, `PUT`/`DELETE /me/avatar`, módulo `identity`, `account.*`). A foto é recortada e reduzida no navegador para 256×256 WebP (JPEG se o navegador não codifica WebP) e guardada no próprio `User` como data URL (`avatar`, `select: false`) com `avatarUpdatedAt`; `GET /auth/users/:id/avatar` devolve os bytes (mesmo tenant, `Cache-Control: immutable`) e `GET /auth/users`, `/auth/users/directory` e `/auth/session` trazem só `avatar` = caminho com `?v=`. No `apps/web`, o responsável de qualquer item aparece com `UserChip` (`apps/web/src/components/user-chip.tsx`, a partir do `@reui/c-avatar-25`: pílula com borda, avatar e o nome no lugar da contagem), que acha a foto pelo `assignee` no `usersQuery` (já em cache, agora com `staleTime` de 5 min); os endpoints de tarefa, processo, card e conversa não mudam. Tarefas mostram o responsável também no escopo "minhas" (sai o `showAssignee`).
- **Reason**: o usuário pediu foto, nome e senha editáveis e o avatar do responsável em todo kanban e lista; o nome já vinha resolvido, mas o escopo "minhas" escondia o responsável.
- **Trade-off**: a foto mora no Mongo (sem S3/CDN), limitada a 100 mil caracteres para caber no `express.json` padrão; a imagem é carregada por `<img>` com o cookie da sessão, então segue a mesma regra de cookie cross-site das demais chamadas. Trocar a senha encerra as outras sessões da pessoa. O componente foi trazido à mão (o CLI do shadcn sobrescreveria o `avatar` do `@ethica/ui`).
- **Scope**: `packages/db/src/models/user.model.ts`, `packages/contracts/src/schemas/account.schema.ts`, `apps/api/src/modules/identity/{account.*,auth.*}`, `apps/web/src/components/{user-chip,user-menu}.tsx`, `apps/web/src/routes/_private/account/`, kanbans e listas de tarefas, processos, quadros e inbox. Spec em `.specs/features/user-account/`.
- **Date**: 2026-10-19
- **Status**: active

### AD-098
- **Decision**: Tenant `suspended` é barrado em `authenticateSession` (`apps/api/src/middlewares/authentication.middleware.ts`) com `403 tenant_suspended` no request seguinte, inclusive em `GET /auth/session` e no handshake do WebSocket do inbox; `provisioned` continua passando. `POST /auth/signout` segue sem `validToken`, então sair funciona com o tenant suspenso. No `apps/web`, o guard de `_private` manda esse caso para a tela pública `/suspended` (explicação + "Sair") em vez de `/auth`. Toda rota de tenant exige papel: `/customers` (exceto o DELETE, que é `isAdmin`), `/processes`, `/activities`, `/saved-views`, a leitura de `/field-templates` e `GET /channels/templates` passam a usar `canOperate`; usuário com `role: []` recebe 403 em tudo do tenant.
- **Reason**: a AD-014 prometia que a suspensão valia no request seguinte e o código ignorava `status`; as rotas sem guarda eram a exceção ao padrão `canOperate` do resto da API. O usuário escolheu 403 (a sessão é válida, voltar ao login só repetiria o ciclo), só `suspended` (`provisioned` precisa do aceite do primeiro admin) e uma tela dedicada.
- **Trade-off**: um usuário sem papel não vê mais nem a lista de clientes; o web distingue o caso comparando a mensagem traduzida de `tenant_suspended`, já que `/auth/session` não tem outra causa de 403.
- **Scope**: `apps/api/src/middlewares/authentication.middleware.ts`, routers de `customer`, `process`, `activity`, `saved-view`, `field-template` e `inbox/channel`, `packages/contracts/src/response/messages.ts`, `apps/web/src/routes/_private/route.tsx`, `apps/web/src/routes/_public/suspended/`, `.agents/skills/ethica-permissions/SKILL.md`.
- **Date**: 2026-10-23
- **Status**: active

### AD-102
- **Decision**: Fundação do Ethica (gestão de perícias judiciais trabalhistas, cíveis e federais + prospecção via Datajud) a partir da base do checkduplo: harness (AGENTS/CLAUDE/GEMINI, skills `ethica-*`, hooks, CI, docs gateway), arquitetura do back (módulos contidos + event bus) e do front (rotas pasta+`index.tsx`, pastas `@`, componentes default), identidade visual e configurações. Só `apps/api` e `apps/web` nesta fase; o domínio de CRM (clientes, processos, inbox, pedidos, kanban, campos dinâmicos, IA do WhatsApp) **não** veio. Domínio inicial: módulos `pericia`, `agenda`, `financeiro`, `prospeccao` + `identity` portado.
- **Reason**: o usuário quer começar a criar páginas e processos novos já com os padrões e a identidade do projeto de referência, sem herdar domínio que não é dele.
- **Trade-off**: algumas ADs herdadas citam telas que não existem aqui; valem pelo princípio (ver cabeçalho). Campos dinâmicos por tenant (AD-003/AD-019 do checkduplo) ficaram de fora — perícia tem schema fixo.
- **Scope**: todo o projeto; `.specs/plans/2026-10-29-fundacao-ethica.md`, `docs/features/fundacao-ethica/feature.md`.
- **Date**: 2026-10-29
- **Status**: active

### AD-103
- **Decision**: Complementa a AD-036. **Data de calendário** (prazo do laudo, data da nomeação, vencimento e liquidação de lançamento) trafega e é gravada como texto `YYYY-MM-DD` no fuso de exibição, não como instante. Só o que tem hora (início/fim de compromisso) é `Date` em UTC; a entrada de hora continua em hora de parede (`date` + `time`) convertida no service com `wallClockToUtc` (`packages/db/src/time.ts`). Schemas em `packages/contracts/src/schemas/date.schema.ts`.
- **Reason**: prazo judicial é um dia, não um instante; gravar meia-noite UTC mudaria o dia na tela (UTC−3). Texto `YYYY-MM-DD` ordena e compara lexicograficamente, então filtros de vencido/próximos 7 dias são `$lt`/`$lte` simples.
- **Trade-off**: duas representações de tempo no banco; quem cria campo novo precisa escolher (dia → `YYYY-MM-DD`, momento → `Date`).
- **Scope**: `packages/contracts`, `packages/db/src/models/{pericia,lancamento}.model.ts`, `apps/web/src/components/date-picker.tsx`.
- **Date**: 2026-10-29
- **Status**: active

### AD-104
- **Decision**: Gráficos com **recharts 3** através do primitivo `chart` do `packages/ui` (`ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, molde do shadcn). Cores sempre por token (`var(--chart-1..5)`, `var(--destructive)`) via `config`; a tela passa dados prontos. Gráfico usado por 2+ módulos mora em `apps/web/src/components/` (ex.: `fluxo-financeiro-chart.tsx`).
- **Reason**: o checkduplo não tinha biblioteca de gráfico (só sparkline em SVG); o pedido inclui gráficos de fluxo de caixa e distribuição de perícias. recharts é o que o `chart` do shadcn usa e casa com os tokens do tema.
- **Trade-off**: +~100 kB no bundle das telas com gráfico (code splitting por rota limita o impacto).
- **Scope**: `packages/ui/src/components/chart.tsx`, `apps/web/src/components/fluxo-financeiro-chart.tsx`, `apps/web/src/routes/_private/{index,financeiro/relatorios}`.
- **Date**: 2026-10-29
- **Status**: active

### AD-105
- **Decision**: Prospecção usa a **API Pública do Datajud (CNJ)** chamada só pelo `apps/api` (`providers/datajudClient.ts`, injetado em `buildApp`), com a chave em `DATAJUD_API_KEY` (sem chave ⇒ 503 `datajud_not_configured`, o resto do app funciona). A busca é `POST /prospeccao/datajud/search` (por tribunal, termo em movimentos/assuntos/classe, órgão julgador; paginação `search_after`), com rate limit por tenant+IP, e **não persiste** resultado. O que interessa vira `Oportunidade` (collection própria, única por tenant+número); converter cria a `Pericia` por chamada direta ao `periciaService` (a resposta precisa do id) e marca a oportunidade `convertida`.
- **Reason**: o Datajud tem cota e é a fonte da verdade do processo; guardar só o que o perito escolheu evita espelhar o índice do CNJ. A chave nunca vai ao front.
- **Trade-off**: o formato da consulta Elasticsearch (`multi_match` em `movimentos.nome`/`assuntos.nome`/`classe.nome`, ordenação por `@timestamp`) segue a documentação pública e precisa ser validado contra a API real com chave; não há busca por data de ajuizamento ainda.
- **Scope**: `apps/api/src/providers/datajudClient.ts`, `apps/api/src/modules/prospeccao/`, `packages/contracts/src/schemas/prospeccao.schema.ts`, `apps/web/src/routes/_private/prospeccao/`.
- **Date**: 2026-10-29
- **Status**: active

### AD-106
- **Decision**: Efeitos entre módulos do domínio por evento (AD-039): `pericia:created` com `prazoLaudo` ⇒ a `agenda` cria o compromisso automático "Entrega do laudo" (18:00 do dia do prazo, `origem: 'automatico'`); `pericia:honorarios_fixados` (valor fixado novo ou alterado) ⇒ o `financeiro` lança a receita prevista `honorarios_fixados` com vencimento em 30 dias. Grafo de dependência: `agenda`, `financeiro` e `prospeccao` dependem do service de `pericia`; `pericia` não depende de ninguém. Enriquecimento com número do processo é uma consulta `$in` por lote (`findNumerosByIds`).
- **Reason**: a resposta de criar/editar perícia não usa o compromisso nem o lançamento; o evento mantém `pericia` sem conhecer os consumidores e evita ciclo.
- **Trade-off**: falha do subscriber só aparece no log (`domain_event.handler_failed`); alterar o honorário fixado de novo cria um segundo lançamento (o anterior fica para o perito cancelar).
- **Scope**: `apps/api/src/events/`, `apps/api/src/modules/{pericia,agenda,financeiro}`.
- **Date**: 2026-10-29
- **Status**: active; a parte `pericia:created` ⇒ compromisso "Entrega do laudo" foi superseded pela AD-109, e o trade-off do segundo lançamento ao alterar o honorário fixado foi superseded pela AD-111

### AD-107
- **Decision**: O financeiro (`/financeiro/*` na API e no web) é restrito a `admin` e `manager`; perícias, agenda e prospecção são de qualquer papel do tenant (`canOperate`); excluir perícia é só `admin`. No web, a guarda é o `route.tsx` de layout de `financeiro/` e os blocos financeiros da home/detalhe somem para `operator`.
- **Reason**: honorários e despesas são dado sensível do escritório; a operação (vistoria, prazo, prospecção) é trabalho de toda a equipe.
- **Trade-off**: operador não vê se a perícia já foi paga; se precisar, é um booleano na resposta da perícia, não acesso ao financeiro.
- **Scope**: `apps/api/src/modules/financeiro/lancamento.router.ts`, `apps/web/src/routes/_private/financeiro/route.tsx`, `apps/web/src/routes/_private/@utils/home-access.ts`.
- **Date**: 2026-10-29
- **Status**: active

### AD-108
- **Decision**: Permissões do tenant passam a ser uma **matriz perfil × módulo × ação** (acessar, visualizar, editar, inserir, excluir). Os perfis de equipe (equivalentes a "equipe técnica" e "secretaria") têm valores pré-selecionados diferentes, e o cadastro de um membro sempre passa pela etapa de conferir/ajustar as permissões. O primeiro acesso do escritório é administrador e é quem gerencia as permissões dos perfis.
- **Reason**: definido pelo usuário em 2026-10-31 a partir do benchmark da Jusperia; os papéis fixos não cobrem escritórios em que a secretaria cuida do financeiro e da agenda e a equipe técnica cuida de perícias e laudos.
- **Trade-off**: substitui a checagem por papel fixo (`checkRole`, `canOperate`) por consulta à matriz em toda rota e tela; quando aceita, supersede a parte de AD-107 que fixa o financeiro em `admin`/`manager`. Precisa de spec própria e de migração dos usuários atuais.
- **Scope**: `apps/api/src/modules/identity/`, `apps/api/src/middlewares/`, `apps/web` (guardas de rota e ações), `.agents/skills/ethica-permissions/SKILL.md`; origem `.specs/features/benchmark-jusperia/2026-10-31-jusperia-inventario.md`.
- **Date**: 2026-10-31
- **Status**: proposed

### AD-109
- **Decision**: Prazo processual é entidade própria: collection `Prazo` no módulo `pericia` (dono do model), com título, vencimento `YYYY-MM-DD` (AD-103), status `pendente`/`protocolado`/`perdido`, data de protocolo e observações; vários por perícia. O `prazoLaudo` informado no cadastro da perícia cria, na mesma chamada do `periciaService`, o prazo "Entrega do laudo" pendente, e deixa de ser campo gravado na `Pericia` (faixa de indicadores e "próximo prazo" da listagem passam a ler os prazos). A agenda mostra os prazos pendentes no calendário e no feed iCal lendo do `periciaService` (grafo `agenda → pericia` inalterado). O compromisso perde o tipo `prazo`, e o evento `pericia:created` com o subscriber da agenda é removido (ficou sem consumidor). Excluir a perícia exclui os prazos dela.
- **Reason**: escolha do usuário em 2026-10-31. Prazo tem semântica de protocolo (entregue/perdido, data de entrega) que compromisso não tem, e é um dia, não um instante com hora; guardar como compromisso de 18:00 deformava o dado. Criar o prazo no mesmo módulo dispensa evento.
- **Trade-off**: duas fontes no calendário (compromissos e prazos), juntadas na tela e no feed; a perícia deixa de carregar o prazo do laudo como campo, então quem precisa dele consulta os prazos.
- **Scope**: `packages/db/src/models/{prazo,pericia,compromisso}.model.ts`, `packages/contracts/src/schemas/{prazo,pericia,compromisso}.schema.ts`, `apps/api/src/modules/{pericia,agenda}/`, `apps/api/src/events/`, `apps/web/src/routes/_private/{pericias,agenda}/`. Supersede da AD-106 a parte `pericia:created` ⇒ compromisso "Entrega do laudo"; origem `.specs/features/prazos-recebimentos/spec.md`.
- **Date**: 2026-10-31
- **Status**: active

### AD-110
- **Decision**: O aviso de prazo por e-mail é uma preferência **por usuário**: todo usuário com papel no tenant (qualquer papel) liga ou desliga o próprio aviso na tela de conta, começando ligado. Não há liga/desliga no tenant. O envio é um consolidado diário às 07:00 de `America/Sao_Paulo` (AD-036) com os prazos pendentes que vencem em 15 dias, no dia e venceram ontem; prazo protocolado ou perdido sai do aviso. Tenant suspenso (AD-098) não recebe.
- **Reason**: escolha do usuário em 2026-10-31; prazo é operacional (perícias e agenda são de qualquer papel, AD-107), e cada pessoa decide se quer o e-mail. Uma só chave elimina a combinação tenant × usuário.
- **Trade-off**: o admin não consegue silenciar o escritório inteiro de uma vez; supersede o critério 3 de PRZ-04 da spec ("o tenant desliga os avisos"), registrado como divergência no `feature.md`.
- **Scope**: `packages/db/src/models/user.model.ts`, `apps/api/src/modules/{identity,pericia}/`, `apps/api/src/providers/mail/`, `apps/web/src/routes/_private/account/`.
- **Date**: 2026-10-31
- **Status**: active

### AD-111
- **Decision**: Honorário (lançamento de `natureza: receita`) **não é excluído nem cancelado**. Recebe parcelas (valor, data, conta/observação) gravadas dentro do lançamento; o status é derivado da soma das parcelas: `previsto` (nenhuma), `parcial` (menor que o valor) ou `liquidado` (igual ao valor). Parcela que excede o saldo é recusada; estorno é por parcela e recalcula o status. Resumo e fluxo de caixa contam o recebido pela data de cada parcela. Quando o juízo altera o honorário fixado, o lançamento automático existente da perícia passa a ter o valor novo, recusado se ficar abaixo do já recebido, em vez de criar um segundo lançamento. Despesa continua como hoje (excluir, cancelar, liquidar com data única).
- **Reason**: escolha do usuário em 2026-10-31 ("não é permitido excluir honorários, apenas alterar o status para pagamento parcial e pagamento total"); dinheiro que entrou na conta não pode sumir do fluxo de caixa. Sem cancelar, o lançamento duplicado da AD-106 deixaria de ter saída, então a alteração do valor atualiza o existente.
- **Trade-off**: um honorário lançado por engano fica no histórico (corrige-se editando descrição/valor/vencimento); receita e despesa passam a ter regras de status diferentes no mesmo model. Supersede o trade-off da AD-106 sobre o segundo lançamento.
- **Scope**: `packages/db/src/models/lancamento.model.ts`, `packages/contracts/src/schemas/lancamento.schema.ts`, `apps/api/src/modules/financeiro/`, `apps/api/src/events/subscribers/financeiro.subscriber.ts`, `apps/web/src/routes/_private/financeiro/`.
- **Date**: 2026-10-31
- **Status**: active

### AD-112
- **Decision**: A troca de modelo da feature `prazos-recebimentos` (prazo do laudo vira `Prazo`, compromisso perde o tipo `prazo`, lançamento ganha parcelas) **não tem script de migração**; só o `apps/api/scripts/seed-demo.ts` é atualizado para o modelo novo.
- **Reason**: escolha do usuário em 2026-10-31; ainda não há tenant real, só o seed de demonstração.
- **Trade-off**: um banco local antigo precisa ser recriado com o seed; se surgir dado real antes do deploy, a migração vira tarefa própria.
- **Scope**: `apps/api/scripts/seed-demo.ts`.
- **Date**: 2026-10-31
- **Status**: active

## Handoff

- **Feature**: `prazos-recebimentos` — concluída (AD-109 a AD-112, `validation.md` PASS). Pendente só UAT visual e a trava por dia do aviso diário quando houver mais de uma réplica da API (`docs/features/prazos-recebimentos/feature.md`).
- **Feature**: `fundacao-ethica` — base pronta (código + harness + docs).

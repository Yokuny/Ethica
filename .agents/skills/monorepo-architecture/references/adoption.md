# Aplicar num projeto: do zero ou a partir de um MVP

Em qualquer dos dois caminhos, cada passo termina com `pnpm -r exec tsc --noEmit` e o Biome verdes, e nada é criado antes de ter uso.

## Do zero

1. **Raiz**: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `biome.json`, `vitest.config.ts`, `.gitignore`, `.env.example` (`references/monorepo.md`).
2. **`packages/contracts`**: envelope da resposta, chaves de mensagem, schema de id, tipo de quem chama (`TenantUser`) e o registry.
3. **`packages/db`**: conexão, `tenantScoped`, models de tenant, usuário e sessão, ajuda de banco de teste.
4. **`apps/api`**: `config/env`; middlewares de erro, validação, autenticação, autorização e tenant; `app.ts` e `server.ts`; módulo `identity` (entrar, sair, `GET /auth/session`); `modules/schema.registry.ts` (`references/backend.md`).
5. **`tests/structural/`**: os três testes de fronteira (`references/structural-tests.md`). Entram **antes** do segundo módulo: é o que impede a arquitetura de escorregar.
6. **`packages/ui`**: `components.json` e só os primitivos que as primeiras telas usam.
7. **`apps/web`**: `vite.config.ts`, `main.tsx`, `router.tsx`, `routes/__root.tsx`, entrada pública, layout privado com a guarda de sessão, cliente HTTP, dicionário de textos, `query/session.ts` e os componentes padrão de página (`references/frontend.md`).
8. **Ambiente**: `docker-compose.yml` com banco, api e web; CI rodando o gate.
9. **Primeiro módulo de domínio**, de ponta a ponta. Ele prova que a base está ligada. `events/` nasce quando o primeiro efeito entre módulos aparecer.

## A partir de um MVP existente

### 1. Diagnóstico

Antes de mover qualquer arquivo, responda olhando o código:

| Pergunta | O que decide |
| --- | --- |
| Quantos apps existem e onde ficam? | o que vai para `apps/api` e `apps/web` |
| Quais tipos e validações são escritos duas vezes (API e tela)? | o primeiro conteúdo de `packages/contracts` |
| Quem importa o ORM ou o driver do banco? | o tamanho da extração para `packages/db` |
| A API é organizada por camada técnica (`controllers/`, `services/`, `models/`)? Quais são os domínios? | a lista de módulos e a ordem de migração |
| Que código de um domínio lê tabela ou collection de outro? | onde nascerão funções de service e, talvez, eventos |
| Onde a tela guarda dado de servidor (store global, contexto, `useEffect` com `fetch`)? | o que vira `query/` |
| O formato de resposta e de erro da API é um só? | se o envelope e as chaves de mensagem entram já no primeiro passo |

Escreva o resultado como um mapa "arquivo atual → destino". É o plano da migração.

### 2. Ordem

Um passo por vez, com o sistema funcionando ao fim de cada um. **O passo só termina quando a estrutura antiga daquele passo foi excluída.**

1. **Raiz do monorepo**: workspaces, `tsconfig.base.json`, Biome, Vitest. Mova os apps existentes para `apps/` sem mudar o conteúdo.
2. **`packages/contracts`**: envelope único da resposta e chaves de mensagem; depois os schemas Zod dos payloads, um domínio por vez. A API passa a validar e a tela a montar formulário com o **mesmo** schema; as cópias saem.
3. **`packages/db`**: models e conexão. Nenhum app importa mais o ORM direto; o teste `db-boundary` entra aqui.
4. **Montagem da API**: `buildApp()` sem `listen`, `server.ts`, env validado no import, `errorHandler` único, middlewares de validação e de sessão.
5. **Módulos, um domínio por vez**, começando pelo que não depende de ninguém:
   1. crie `modules/<módulo>/` e mova router, controller, service e repository do domínio;
   2. tipos e schemas soltos vão para `<entidade>.schema.ts`;
   3. troque todo acesso a repository ou model de outro domínio por uma função do service dono;
   4. efeito colateral cuja resposta não usa o resultado vira evento;
   5. ligue o teste `module-boundary` no primeiro módulo e registre o dono de cada model;
   6. apague as pastas por camada quando esvaziarem.
6. **Camada global do web**: cliente HTTP único e dicionário de textos; depois `query/<entidade>.ts` por entidade, apagando o store global e os `fetch` soltos conforme cada tela migra.
7. **Rotas**: pasta + `index.tsx`, layouts com guarda, pastas `@`. O que duas telas de módulos diferentes usam sobe para a camada global; o resto fica local.
8. **`packages/ui`**: os primitivos visuais saem do app quando o desenho deles estabilizar. É o último passo porque é o que menos trava os outros.

### 3. Armadilhas

- **Migrar por camada em vez de por domínio**: mover "todos os controllers" primeiro deixa o sistema quebrado por dias. Um domínio inteiro por vez.
- **Deixar ponte**: re-export do caminho antigo, alias de import, função que só repassa para a nova. A referência antiga é corrigida no mesmo passo.
- **Criar a estrutura inteira vazia antes**: pastas `@`, `events/`, `providers/` e pacotes nascem com o primeiro arquivo real.
- **Ciclo entre módulos descoberto tarde**: desenhe o grafo no diagnóstico. Onde dois domínios se chamam nos dois sentidos, um dos sentidos vira evento.
- **Nomes diferentes para o mesmo conceito** em contrato, model e tela: escolha um termo antes de mover e renomeie junto.

## A base está pronta quando

- [ ] `pnpm run check` verde, com os três testes estruturais rodando.
- [ ] Entrar no sistema funciona de ponta a ponta: sessão em cookie, `req.tenantUser` montado do banco, guarda de rota no web.
- [ ] Um erro da API chega traduzido na tela (chave → dicionário), sem texto pronto no servidor.
- [ ] Um `.env` na raiz serve todos os apps.
- [ ] Não existe pasta por camada técnica na API, store global no web, nem import do ORM fora de `packages/db`.
- [ ] Um módulo de domínio existe de ponta a ponta e serve de molde para os próximos.

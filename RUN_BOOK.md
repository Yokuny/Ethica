# RUN_BOOK — subir o Ethica localmente (Docker Compose + MongoDB Atlas Local)

Sobe mongo (Atlas Local), `api` e `web` em containers, com hot-reload do código-fonte via bind mount. Uso local/dev — não é imagem de produção. O banco é **sempre o motor MongoDB Atlas** (com Atlas Search): em dev e nos testes é o container `mongodb/mongodb-atlas-local:8` do compose; em produção, um cluster hospedado (AD-059).

## Pré-requisitos

- Docker Desktop rodando, Node 24+ e pnpm 11 (`corepack enable`).
- Arquivo `.env` na raiz: `cp .env.example .env`.
- Para a prospecção: `DATAJUD_API_KEY` com a chave pública vigente do CNJ (https://datajud-wiki.cnj.jus.br/api-publica/acesso). Sem ela, o resto do app funciona e a busca responde "não configurada".

## Subir o ambiente

```bash
docker compose up --build -d
docker compose logs -f api web
```

`--build` só na primeira vez ou depois de mudar dependências (`package.json`/lockfile).

## Rodar fora do Docker (só o banco no compose)

```bash
docker compose up -d mongo
pnpm install
pnpm --filter api run search:provision   # índices do Atlas Search (idempotente)
pnpm dev:api                             # http://localhost:18080
pnpm dev:web                             # http://localhost:15173
```

Os scripts da API carregam o `.env` da raiz (`--env-file-if-exists`); o web lê o mesmo arquivo via `envDir` do `vite.config.ts`. A porta do web é fixa (`strictPort`) porque o `CORS_ORIGIN` da API só aceita `http://localhost:15173`.

## Serviços

| Serviço | URL | Healthcheck |
| --- | --- | --- |
| web (Vite) | http://localhost:15173 | — |
| api | http://localhost:18080 | `curl localhost:18080/health` |
| mongo (Atlas Local) | `localhost:37017` (host) / `mongo:27017` (rede do compose) | `docker compose ps` mostra `healthy` |
| s3 (RustFS, AD-120) | `localhost:19000` (API S3) · console `http://localhost:19001` (`ethica` / `ethica-dev-secret`) | o `s3-init` termina com sucesso depois de criar o bucket `ethica` |

PDFs (AD-119) usam o Chromium instalado na imagem `Dockerfile.dev` (`CHROMIUM_PATH`). Fora do Docker, aponte `CHROMIUM_PATH` para um Chrome/Chromium local e suba o `s3` com `docker compose up -d s3 s3-init` para enviar o logo (sem `S3_BUCKET` o logo fica desligado e os PDFs saem sem ele).

## Dados de demonstração

```bash
pnpm --filter api run seed:demo
# ou: docker compose exec api /app/node_modules/.bin/tsx scripts/seed-demo.ts
```

Cria o tenant **Perícias Demo** com perícias em várias etapas, agenda, seis meses de lançamentos e oportunidades (datas relativas a hoje). Logins (senha `asdQWE123!@#`, ou `SEED_PASSWORD`): `admin@pericias.example.com`, `manager@pericias.example.com`, `operator@pericias.example.com`. Rodar de novo apaga e recria só esse tenant.

## Primeiro acesso (tenant real)

1. Seed do admin de plataforma (idempotente): `pnpm --filter api run seed:platform-admin` → `admin@platform.local` / `plataforma123`.
2. Login e cookie:
   ```bash
   curl -c /tmp/ethica.cookies -X POST http://localhost:18080/auth/signin \
     -H 'Content-Type: application/json' -d '{"email":"admin@platform.local","password":"plataforma123"}'
   ```
3. Criar o tenant (`document` = CNPJ com 14 dígitos, único):
   ```bash
   curl -b /tmp/ethica.cookies -X POST http://localhost:18080/platform/tenants \
     -H 'Content-Type: application/json' -d '{"name":"Perícias Silva","document":"11222333000181"}'
   ```
4. Convidar o admin do tenant:
   ```bash
   curl -b /tmp/ethica.cookies -X POST http://localhost:18080/platform/tenants/<TENANT_ID>/invites \
     -H 'Content-Type: application/json' -d '{"email":"voce@teste.local","role":"admin"}'
   ```
5. O link do convite sai no log (`MAIL_PROVIDER=log`): `grep mail.log_send` na saída da API → abra `http://localhost:15173/invite?token=...`.

## Banco de dados

**Regra única:** o banco de testes é o banco da `MONGODB_URI` com sufixo `_test`, no mesmo servidor (`.../ethica` → `.../ethica_test`, AD-065).

| Ambiente | Servidor | Banco |
| --- | --- | --- |
| Dev local | serviço `mongo` do compose, `localhost:37017` | `ethica` |
| Testes (local e CI) | o mesmo servidor do dev | `ethica_test` |
| Produção | cluster hospedado no MongoDB Atlas (`mongodb+srv://...`) | `ethica` |

- Índices do Atlas Search (busca de perícias e de partes) não são índices Mongoose: rode `search:provision` em cada banco novo (ou depois de `docker compose down -v`). Sem eles a busca devolve lista vazia. Logo após subir o container o `mongot` pode levar alguns segundos: se falhar com `SearchIndexManagementHostUnreachable`, rode de novo.
- `docker compose down -v` apaga o banco local.

### Testes

```bash
docker compose up -d mongo     # integration/e2e precisam do banco
pnpm vitest run                # tudo
pnpm vitest run --project unit --project structural   # sem banco
pnpm run check                 # gate do CI: tsc + biome + vitest
pnpm docs:check                # gateway de documentação em dia
```

- O nome do banco de testes contém `test`; a suíte recusa a URI do app e recusa apagar banco sem `test` no nome.
- `integration` e `e2e` rodam em sequência no mesmo banco: não rode duas suítes ao mesmo tempo.

## Comandos úteis

```bash
docker compose ps
docker compose restart api
docker compose down          # os dados ficam no volume mongo-atlas-data
```

## Limitações conhecidas

- `/auth/signin` tem rate limit de 5 tentativas/15 min por e-mail+IP; a busca no Datajud, 60/15 min por tenant+IP.
- As imagens públicas do MinIO saíram do Docker Hub; o storage local é o RustFS (S3 compatível). Em produção, configure `S3_*` para S3 ou R2.
- A consulta ao Datajud segue a documentação pública; validar com a chave real (AD-105).

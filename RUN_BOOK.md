# RUN_BOOK — subir o Ethica localmente (Docker Compose + MongoDB Atlas Local)

Sobe mongo (Atlas Local), `api` e `web` em containers, com hot-reload do código-fonte via bind mount. Uso local/dev; produção na seção [Produção](#produção-railway--vercel-ad-153). O banco é **sempre o motor MongoDB Atlas** (com Atlas Search): em dev e nos testes é o container `mongodb/mongodb-atlas-local:8` do compose; em produção, um cluster hospedado (AD-059).

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

Campo (AD-128, AD-131): o mapa geocodifica pelo Nominatim público (`GEOCODER_URL`, `GEOCODER_USER_AGENT`) e desenha a rota pelo OSRM público, os dois a partir da rede do container e do navegador. O app só recarrega sem conexão no build de produção, porque o service worker não roda no dev server. O `.env` local tem `NODE_ENV=development`, que o Vite aplica ao build; para testar o PWA, use `NODE_ENV=production pnpm --filter web run build` e `pnpm --filter web exec vite preview`.

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

## Produção (Railway + Vercel, AD-153)

Deploy automático a cada push na `main`: a API roda na **Railway** pela imagem `Dockerfile` (config em `railway.json`), o web é estático na **Vercel** (config em `apps/web/vercel.json`). O navegador só fala com a Vercel: ela repassa `/api/*` para a API, então o cookie de sessão é do mesmo site (funciona no Safari/iPhone, que bloqueia cookie de outro domínio).

Banco: cluster do **MongoDB Atlas** (o M0 gratuito serve), porque a busca usa Atlas Search (AD-059); o Mongo da Railway não tem. Em *Network Access* libere `0.0.0.0/0` (a Railway não tem IP fixo no plano comum).

### Railway (API)

1. *New Project → Deploy from GitHub repo* → este repositório. Em *Settings → Source*, branch **`main`** (o branch padrão do GitHub não é a `main`).
2. *Settings → Networking → Generate Domain*. O endereço precisa bater com o `destination` de `/api` em `apps/web/vercel.json` (hoje `ethica-api-production.up.railway.app`); se sair outro, troque lá.
3. *Variables*:

| Variável | Valor |
| --- | --- |
| `NODE_ENV` | `production` (já vem da imagem) |
| `PORT` e `API_PORT` | `8080` (os dois iguais: a Railway encaminha para `PORT`, a API escuta em `API_PORT`) |
| `MONGODB_URI` | `mongodb+srv://.../ethica?retryWrites=true&w=majority` do Atlas |
| `SESSION_JWT_SECRET` | segredo longo e aleatório (`openssl rand -hex 32`) |
| `CORS_ORIGIN` | endereço da Vercel (`https://<projeto>.vercel.app`), usado também nos links dos e-mails |
| `DATAJUD_API_KEY`, `S3_*`, `MAIL_PROVIDER`/`SMTP_*`, `GEOCODER_*` | opcionais, mesmo significado do `.env.example`; sem eles o recurso fica desligado |

4. Uma vez por banco novo, pelo terminal do serviço (`railway ssh`) ou local com o `MONGODB_URI` do Atlas:
   ```bash
   /app/node_modules/.bin/tsx scripts/provision-search-indexes.ts   # índices do Atlas Search
   /app/node_modules/.bin/tsx scripts/seed-platform-admin.ts        # admin de plataforma; troque a senha
   ```
   Depois siga "Primeiro acesso" trocando `http://localhost:18080` pelo domínio da Railway.

### Vercel (web)

1. *Add New → Project* → este repositório. *Root Directory*: `apps/web` (o framework Vite é detectado pelo `vercel.json`).
2. *Settings → Git → Production Branch*: **`main`**.
3. *Environment Variables*: `VITE_API_URL=/api` e `ENABLE_EXPERIMENTAL_COREPACK=1` (usa o pnpm 11 do `packageManager`). *Settings → General → Node.js Version*: 24.x.

Testar a imagem localmente, contra o mongo e o s3 do compose:

```bash
docker build -t ethica-api-prod .
docker run --rm --network ethica_default -p 18099:8080 -e API_PORT=8080 \
  -e MONGODB_URI='mongodb://mongo:27017/ethica?directConnection=true' \
  -e SESSION_JWT_SECRET=teste -e CORS_ORIGIN=http://localhost:15173 ethica-api-prod
```

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

# Imagem de produção da API (AD-153), usada pela Railway (railway.json). Roda o código-fonte com
# tsx, sem watch: os pacotes do monorepo exportam o .ts direto (`exports: ./src/index.ts`), então
# não há etapa de compilação. O web não entra aqui: é estático e fica na Vercel.
FROM node:24-bookworm-slim

# python3/make/g++ compilam o addon nativo do bcrypt no install. `chromium` gera os PDFs
# (AD-119, CHROMIUM_PATH=/usr/bin/chromium); `fonts-liberation` dá as fontes dos documentos.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ chromium fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.11.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/ui/package.json packages/ui/package.json

# Só a API, os pacotes de que ela depende e a raiz (tsx).
RUN pnpm install --frozen-lockfile --filter api... --filter ethica

COPY package.json tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/contracts packages/contracts
COPY packages/db packages/db

ENV NODE_ENV=production
WORKDIR /app/apps/api
USER node

# A Railway injeta a porta em PORT; a API escuta em API_PORT.
CMD ["sh", "-c", "API_PORT=${PORT:-$API_PORT} exec /app/node_modules/.bin/tsx src/server.ts"]

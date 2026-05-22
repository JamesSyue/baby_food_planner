FROM node:22-bookworm-slim AS base

LABEL language="nodejs"
LABEL framework="next.js"

WORKDIR /src

ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/

FROM base AS deps

COPY package*.json .npmrc ./

RUN --mount=type=cache,target=/root/.npm \
  npm config delete proxy || true && \
  npm config delete https-proxy || true && \
  npm config set registry "$NPM_CONFIG_REGISTRY" && \
  npm config get registry && \
  node -v && npm -v && npm ci --registry="$NPM_CONFIG_REGISTRY" --no-audit --no-fund --loglevel=notice || ( \
    echo "==== /root/.npm/_logs ====" && \
    ls -lah /root/.npm/_logs || true && \
    for f in /root/.npm/_logs/*; do \
      echo "---- $f ----"; \
      cat "$f"; \
    done && \
    exit 1 \
  )

FROM base AS builder

COPY --from=deps /src/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=8080

COPY --from=builder /src/package.json ./package.json
COPY --from=builder /src/package-lock.json ./package-lock.json
COPY --from=builder /src/prisma.config.ts ./prisma.config.ts
COPY --from=builder /src/prisma ./prisma
COPY --from=builder /src/node_modules ./node_modules
COPY --from=builder /src/public ./public
COPY --from=builder /src/.next/standalone ./
COPY --from=builder /src/.next/static ./.next/static

EXPOSE 8080

CMD ["node", "server.js"]
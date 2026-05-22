FROM node:22-bookworm-slim AS base

LABEL language="nodejs"
LABEL framework="next.js"

WORKDIR /src

FROM base AS deps

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
  node -v && npm -v && npm ci --no-audit --no-fund --loglevel=notice || ( \
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

COPY --from=builder /src/public ./public
COPY --from=builder /src/.next/standalone ./
COPY --from=builder /src/.next/static ./.next/static

EXPOSE 8080

CMD ["node", "server.js"]
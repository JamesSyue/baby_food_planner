FROM node:22-bookworm-slim

LABEL language="nodejs"
LABEL framework="next.js"

WORKDIR /src

COPY package*.json ./

RUN node -v && npm -v && npm ci --verbose || ( \
  echo "==== /root/.npm/_logs ====" && \
  ls -lah /root/.npm/_logs || true && \
  for f in /root/.npm/_logs/*; do \
    echo "---- $f ----"; \
    cat "$f"; \
  done && \
  exit 1 \
)

COPY . .

RUN npm run build

ENV HOSTNAME=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["npm", "start", "--", "--hostname", "0.0.0.0", "--port", "8080"]
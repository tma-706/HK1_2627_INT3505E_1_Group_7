FROM node:22-bookworm-slim

WORKDIR /app
COPY infra/mock/package.json infra/mock/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY docs/api/core/v1/ ./contract/
RUN ./node_modules/.bin/redocly lint contract/openapi.yaml \
    && ./node_modules/.bin/redocly bundle contract/openapi.yaml --output openapi.json

COPY infra/mock/validate-posts.mjs ./
USER node
CMD ["node", "contract/mock.mjs", "openapi.json"]

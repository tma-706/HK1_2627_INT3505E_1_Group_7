FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/core/package.json apps/core/package.json
RUN npm ci
COPY apps/core/tsconfig.json apps/core/tsconfig.json
COPY apps/core/src apps/core/src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/core/dist ./dist
COPY apps/core/package.json ./package.json
USER node
CMD ["node", "dist/api.js"]

FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/prisma ./packages/prisma
COPY apps/worker ./apps/worker

RUN npm ci --workspace=apps/worker --workspace=packages/prisma
RUN npx prisma generate --schema=packages/prisma/schema.prisma
RUN npm run build --workspace=apps/worker

FROM node:18-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/packages/prisma/generated ./packages/prisma/generated

ENV NODE_ENV=production

CMD ["node", "dist/worker.js"]

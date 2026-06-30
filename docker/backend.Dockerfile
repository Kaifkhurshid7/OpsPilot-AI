FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/prisma ./packages/prisma
COPY apps/backend ./apps/backend

RUN npm ci --workspace=apps/backend --workspace=packages/prisma
RUN npx prisma generate --schema=packages/prisma/schema.prisma
RUN npm run build --workspace=apps/backend

FROM node:18-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/packages/prisma/generated ./packages/prisma/generated

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "dist/server.js"]

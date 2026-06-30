FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/frontend ./apps/frontend

RUN npm ci --workspace=apps/frontend --workspace=packages/shared-types
RUN npm run build --workspace=apps/frontend

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./.next/static
COPY --from=builder /app/apps/frontend/public ./public

EXPOSE 3000

CMD ["node", "server.js"]

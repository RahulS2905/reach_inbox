FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/worker/package*.json ./apps/worker/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=apps/worker --workspace=packages/shared --include-workspace-root
COPY . .
RUN npm run build -w apps/worker

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker ./apps/worker
COPY --from=builder /app/packages/shared ./packages/shared
CMD ["npm", "start", "-w", "apps/worker"]

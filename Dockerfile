FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV COREPACK_HOME="/pnpm/corepack"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# 迁移工具只放在独立镜像目标中，应用运行镜像无需开发依赖。
FROM dependencies AS migrator
RUN mkdir -p /data && chown node:node /data
COPY db ./db
COPY scripts ./scripts
COPY drizzle ./drizzle
COPY drizzle.config.ts tsconfig.json ./
USER node
CMD ["pnpm", "db:migrate:prod"]

FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]

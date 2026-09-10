# syntax=docker/dockerfile:1

#######################################
# Base
#######################################
FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV COREPACK_HOME="/pnpm/corepack"
ENV PATH="${PNPM_HOME}:$PATH"

RUN corepack enable \
    && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app


#######################################
# Dependencies
#######################################
FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile


#######################################
# Build
#######################################
FROM dependencies AS builder

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build


#######################################
# Database Migration
#######################################
FROM dependencies AS migrator

COPY --chown=node:node db ./db
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node drizzle/migrations ./drizzle/migrations
COPY --chown=node:node drizzle.config.ts tsconfig.json ./

ENV NODE_ENV=production

USER node

CMD ["pnpm", "db:migrate:prod"]


#######################################
# Production Runner
#######################################
FROM node:22-bookworm-slim AS runner

WORKDIR /app


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
# === 阶段 1: 安装依赖 ===
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++ && ln -sf python3 /usr/bin/python
WORKDIR /app

# 复制锁文件
COPY package.json ./

# 安装 pnpm 并安装依赖
RUN npm config set registry https://registry.npmmirror.com && npm install

# === 阶段 2: 打包构建 ===
FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# === 阶段 3: 生产运行 ===
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
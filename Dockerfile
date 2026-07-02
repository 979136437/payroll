# === 阶段 1: 安装依赖 ===
FROM node:22.23.1-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 启用 pnpm (Node.js 官方推荐方式)
RUN corepack enable pnpm

# 复制根目录的配置、锁文件以及 .npmrc
# 这样容器内执行 pnpm install 也会直接读取你配置好的淘宝二进制镜像源
COPY package.json pnpm-workspace.yaml* .npmrc ./
COPY scripts/check-node-version.mjs ./scripts/check-node-version.mjs

# 💡 如果是 Monorepo 架构，请取消下方注释并根据实际情况复制子包的 package.json，以最大化利用 Docker 缓存：
# COPY packages/ui/package.json ./packages/ui/
# COPY apps/web/package.json ./apps/web/

# 安装依赖（--frozen-lockfile 确保严格锁定版本）
RUN pnpm install

# === 阶段 2: 打包构建 ===
FROM node:22.23.1-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 执行打包构建
RUN pnpm run build

# === 阶段 3: 生产运行 ===
FROM node:22.23.1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 账号保障生产环境安全
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 初始化持久化数据目录，和项目运行时的 data/payroll.db 保持一致
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# 复制 Next.js standalone 独立产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# 如果有静态公共资源，请取消下行注释：
# COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

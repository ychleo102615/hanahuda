# syntax=docker/dockerfile:1

# ============================================
# Stage 1: 安裝依賴
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

# 安裝 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 複製 package 檔案
COPY package.json pnpm-lock.yaml ./

# 安裝所有依賴（包含 devDependencies，構建需要）
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: 構建應用
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# 安裝 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 複製依賴
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 構建 Nuxt 應用
RUN pnpm run build

# ============================================
# Stage 3: 生產運行
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

# 建立非 root 使用者
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nuxtjs

# 複製構建產物
COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./.output

# 切換到非 root 使用者
USER nuxtjs

# 環境變數
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

# 啟動伺服器
CMD ["node", ".output/server/index.mjs"]

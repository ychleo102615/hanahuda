# Quickstart: 玩家帳號功能開發指南

**Feature**: 010-player-account
**Date**: 2026-01-02

## Prerequisites

### 環境需求
- Node.js 20.19.0+ 或 22.12.0+
- pnpm（套件管理）
- PostgreSQL 14+（本地或 Docker）
- Docker（建議，用於本地資料庫）

### 專案設定
```bash
cd front-end
pnpm install
pnpm db:up      # 啟動 PostgreSQL Docker
pnpm db:push    # 同步 schema 至資料庫
```

---

## 新增依賴

```bash
# 安裝新增的依賴
pnpm add bcryptjs arctic

# 安裝 TypeScript 型別
pnpm add -D @types/bcryptjs
```

---

## 目錄結構快速建立

### 後端（server/）

```bash
# 1. 建立 Identity BC 目錄結構
mkdir -p server/identity/domain/{player,account,oauth-link,types,services}
mkdir -p server/identity/application/{ports/input,ports/output,use-cases}
mkdir -p server/identity/adapters/{persistence,session,oauth}

# 2. 建立 API 路由目錄
mkdir -p server/api/v1/auth/oauth/{google,line}

# 3. 建立資料庫 schema 檔案
touch server/database/schema/players.ts
touch server/database/schema/accounts.ts
touch server/database/schema/oauthLinks.ts
```

### 前端（app/）

```bash
# 1. 建立 Identity BC 目錄結構
mkdir -p app/identity/domain
mkdir -p app/identity/application/{ports,use-cases}
mkdir -p app/identity/adapter/{stores,api,composables,components}
```

---

## 關鍵檔案模板

### 1. Domain - Player Factory

```typescript
// server/identity/domain/player/player-factory.ts
import { randomUUID } from 'crypto'

export interface Player {
  readonly id: string
  readonly displayName: string
  readonly isGuest: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}

export function createGuestPlayer(): Player {
  const guestSuffix = generateGuestSuffix()
  return Object.freeze({
    id: randomUUID(),
    displayName: `Guest_${guestSuffix}`,
    isGuest: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

function generateGuestSuffix(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}
```

### 2. Application - Output Port

```typescript
// server/identity/application/ports/output/player-repository-port.ts
import type { Player } from '../../domain/player/player-factory'

export abstract class PlayerRepositoryPort {
  abstract findById(id: string): Promise<Player | null>
  abstract save(player: Player): Promise<void>
  abstract updateDisplayName(id: string, displayName: string): Promise<void>
}
```

### 3. Adapter - Session Store

```typescript
// server/identity/adapters/session/in-memory-session-store.ts
import { randomBytes } from 'crypto'

interface Session {
  id: string
  playerId: string
  createdAt: Date
  expiresAt: Date
  lastAccessedAt: Date
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

class InMemorySessionStore {
  private sessions = new Map<string, Session>()

  create(playerId: string): Session {
    const id = randomBytes(32).toString('base64url')
    const now = new Date()
    const session: Session = {
      id,
      playerId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      lastAccessedAt: now,
    }
    this.sessions.set(id, session)
    return session
  }

  get(id: string): Session | null {
    const session = this.sessions.get(id)
    if (!session) return null
    if (session.expiresAt < new Date()) {
      this.sessions.delete(id)
      return null
    }
    // Sliding expiration
    session.lastAccessedAt = new Date()
    session.expiresAt = new Date(Date.now() + SESSION_TTL_MS)
    return session
  }

  delete(id: string): void {
    this.sessions.delete(id)
  }
}

export const sessionStore = new InMemorySessionStore()
```

### 4. API Route - Register

```typescript
// server/api/v1/auth/register.post.ts
import { defineEventHandler, readBody, setCookie, createError } from 'h3'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).regex(/^(?=.*[a-zA-Z])(?=.*[0-9]).+$/),
  confirmPassword: z.string(),
  email: z.string().email().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = registerSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      data: {
        error: 'VALIDATION_ERROR',
        details: result.error.issues,
      },
    })
  }

  // TODO: Implement actual registration logic
  // 1. Check username uniqueness
  // 2. Hash password with bcryptjs
  // 3. Create Player and Account
  // 4. Create Session
  // 5. Set Cookie

  return { message: 'Not implemented' }
})
```

### 5. Frontend - Auth Store

```typescript
// app/identity/adapter/stores/auth-store.ts
import { defineStore } from 'pinia'
import type { PlayerInfo } from '../../../shared/contracts/identity-types'

interface AuthState {
  currentPlayer: PlayerInfo | null
  isLoading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    currentPlayer: null,
    isLoading: true,
  }),

  getters: {
    isAuthenticated: (state) => state.currentPlayer?.isAuthenticated ?? false,
    isGuest: (state) => state.currentPlayer?.isGuest ?? true,
    displayName: (state) => state.currentPlayer?.displayName ?? '',
  },

  actions: {
    async fetchCurrentPlayer() {
      this.isLoading = true
      try {
        const response = await $fetch<PlayerInfo>('/api/v1/auth/me')
        this.currentPlayer = response
      } catch {
        this.currentPlayer = null
      } finally {
        this.isLoading = false
      }
    },

    async logout() {
      await $fetch('/api/v1/auth/logout', { method: 'POST' })
      this.currentPlayer = null
    },
  },
})
```

---

## 開發順序建議

### Phase 1: 後端 Core Game BC 隔離（前置工作）
1. 建立 `server/core-game/` 目錄
2. 移動現有 `domain/`, `application/`, `adapters/` 至 `server/core-game/`
3. 更新所有 import 路徑
4. 執行測試驗證功能正常

### Phase 2: 後端 Identity BC - Domain Layer
1. 定義 Player, Account, OAuthLink 領域模型
2. 實作 Player Factory（訪客/註冊玩家建立）
3. 撰寫單元測試

### Phase 3: 後端 Identity BC - Application Layer
1. 定義 Port 介面（Repository, Session, OAuth）
2. 實作 Use Cases（Register, Login, OAuth Login, Create Guest）
3. 撰寫單元測試（Mock Ports）

### Phase 4: 後端 Identity BC - Adapter Layer
1. 實作 Drizzle Repository Adapters
2. 實作 Session Store（In-memory）
3. 實作 OAuth Adapters（Arctic）
4. 建立 API Routes

### Phase 5: 前端 Identity BC
1. 建立 Auth Store（Pinia）
2. 實作 Auth API Client
3. 建立 UI Components（登入、註冊表單）
4. 整合至首頁與大廳

### Phase 6: 整合與測試
1. 前後端整合測試
2. 訪客流程測試
3. OAuth 流程測試

---

## 環境變數

```bash
# .env

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/oauth/google/callback

# OAuth - Line
LINE_CLIENT_ID=your-line-channel-id
LINE_CLIENT_SECRET=your-line-channel-secret
LINE_REDIRECT_URI=http://localhost:3000/api/v1/auth/oauth/line/callback

# Session
SESSION_SECRET=your-random-secret-at-least-32-chars
```

---

## 測試指令

```bash
# 單元測試
pnpm test:unit

# 僅執行 Identity BC 測試
pnpm test:unit tests/server/identity

# 型別檢查
pnpm type-check

# Lint
pnpm lint
```

---

## 參考文件

- [Feature Spec](./spec.md) - 功能規格
- [Implementation Plan](./plan.md) - 實作計畫
- [Research](./research.md) - 技術研究
- [Data Model](./data-model.md) - 資料模型
- [API Contracts](./contracts/auth-api.yaml) - API 規格

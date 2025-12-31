# Quickstart: Nuxt Backend Server

**Feature Branch**: `008-nuxt-backend-server`
**Date**: 2024-12-04

---

## 1. Prerequisites

### 1.1 環境需求

- Node.js 20+
- pnpm 9+（或 npm/yarn）
- PostgreSQL 14+（本地或遠端）
- Git

### 1.2 確認 Nuxt 4 專案

```bash
cd front-end
cat package.json | grep nuxt
# 應該看到 "nuxt": "^4.x.x"
```

---

## 2. 安裝依賴

### 2.1 Drizzle ORM

```bash
cd front-end
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit @types/pg
```

### 2.2 驗證與工具

```bash
pnpm add zod                    # Request validation
pnpm add nanoid                 # 短 ID 生成（可選）
```

---

## 3. 目錄結構設置

### 3.1 建立後端目錄

```bash
cd front-end

# Server 目錄結構
mkdir -p server/api/v1/games
mkdir -p server/api/v1/games/\[gameId\]/turns
mkdir -p server/application/use-cases
mkdir -p server/application/ports/input
mkdir -p server/application/ports/output
mkdir -p server/domain/game
mkdir -p server/domain/round
mkdir -p server/domain/services
mkdir -p server/adapters/persistence
mkdir -p server/adapters/event-publisher
mkdir -p server/adapters/opponent
mkdir -p server/adapters/mappers
mkdir -p server/database/schema

# Shared types（前後端共用）
mkdir -p shared/types
```

### 3.2 預期結構

```
front-end/
├── shared/
│   └── types/
│       ├── events.ts
│       ├── commands.ts
│       ├── shared.ts
│       ├── flow-state.ts
│       └── errors.ts
├── server/
│   ├── api/v1/
│   │   └── games/
│   │       ├── join.post.ts
│   │       └── [gameId]/
│   │           ├── events.get.ts
│   │           ├── leave.post.ts
│   │           ├── snapshot.get.ts
│   │           └── turns/
│   │               ├── play-card.post.ts
│   │               └── select-target.post.ts
│   ├── application/
│   │   ├── use-cases/
│   │   └── ports/
│   ├── domain/
│   │   ├── game/
│   │   ├── round/
│   │   └── services/
│   ├── adapters/
│   │   ├── persistence/
│   │   ├── event-publisher/
│   │   ├── opponent/
│   │   ├── timeout/
│   │   └── mappers/
│   ├── middleware/
│   │   └── rateLimit.ts
│   ├── plugins/
│   │   ├── opponent.ts
│   │   └── gameCleanup.ts
│   └── database/
│       └── schema/
├── drizzle.config.ts
└── nuxt.config.ts
```

---

## 3.5 Docker Compose 開發環境（推薦）

如果你沒有本地 PostgreSQL，可以使用 Docker Compose 快速啟動：

### 啟動 PostgreSQL

```bash
cd front-end
pnpm db:up
```

### 驗證資料庫就緒

```bash
docker compose ps
# 應該看到 hanafuda-postgres (healthy)
```

### 執行 Migration

```bash
pnpm db:migrate
```

### 停止資料庫

```bash
pnpm db:down
```

### 完全清除（包含資料）

```bash
docker compose down -v
```

---

## 4. 資料庫設置

### 4.1 環境變數

建立 `.env` 檔案：

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hanafuda

# Game Settings
ACTION_TIMEOUT_SECONDS=15
DISPLAY_TIMEOUT_SECONDS=5
OPPONENT_ANIMATION_DELAY_MS=3000
OPPONENT_THINKING_MIN_MS=1500
OPPONENT_THINKING_MAX_MS=3000
DISCONNECT_TIMEOUT_SECONDS=60
```

### 4.2 Drizzle 配置

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/database/schema/*.ts',
  out: './server/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

### 4.3 建立 Schema

```typescript
// server/database/schema/games.ts
import { pgTable, uuid, varchar, jsonb, timestamp, boolean, integer } from 'drizzle-orm/pg-core'

export const games = pgTable('games', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: uuid('session_token').unique().notNull(),
  player1Id: uuid('player1_id').notNull(),
  player1Name: varchar('player1_name', { length: 50 }).notNull(),
  player2Id: uuid('player2_id'),
  player2Name: varchar('player2_name', { length: 50 }),
  isPlayer2Ai: boolean('is_player2_ai').default(true).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('WAITING'),
  totalRounds: integer('total_rounds').notNull().default(2),
  roundsPlayed: integer('rounds_played').notNull().default(0),
  cumulativeScores: jsonb('cumulative_scores').notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

### 4.4 執行 Migration

```bash
# 生成 migration
pnpm drizzle-kit generate

# 執行 migration
pnpm drizzle-kit migrate
```

---

## 5. 第一個 API 端點

### 5.1 健康檢查

```typescript
// server/api/health.get.ts
export default defineEventHandler(() => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  }
})
```

### 5.2 測試

```bash
pnpm dev

# 另一個終端
curl http://localhost:3000/api/health
# {"status":"ok","timestamp":"2024-12-04T..."}
```

---

## 6. 開發順序建議

### Phase 1: 基礎設施

1. [ ] 設置 Drizzle ORM 連線
2. [ ] 建立 Database Schema
3. [ ] 實作 InMemoryGameStore
4. [ ] 實作 SSE EventPublisher

### Phase 2: Domain Layer

1. [ ] 實作 Card 相關邏輯（MMTI 解析）
2. [ ] 實作 DeckService（洗牌、發牌）
3. [ ] 實作 MatchingService（配對驗證）
4. [ ] 實作 YakuDetectionService（役種檢測）
5. [ ] 實作 Game Aggregate
6. [ ] 實作 Round Entity

### Phase 3: Application Layer

1. [ ] 定義 Input/Output Ports
2. [ ] 實作 JoinGameUseCase
3. [ ] 實作 PlayHandCardUseCase
4. [ ] 實作 SelectTargetUseCase
5. [ ] 實作 MakeDecisionUseCase

### Phase 4: Adapter Layer

1. [ ] 實作 GameRepository（Drizzle）
2. [ ] 實作 SSEEventPublisher
3. [ ] 實作 OpponentService（隨機策略）
4. [ ] 實作 EventMapper（Domain → DTO）

### Phase 5: API Layer

1. [ ] 實作 POST /games/join
2. [ ] 實作 GET /games/{id}/events（SSE）
3. [ ] 實作 POST /games/{id}/turns/play-card
4. [ ] 實作 POST /games/{id}/turns/select-target
5. [ ] 實作 POST /games/{id}/rounds/decision

### Phase 6: 整合測試

1. [ ] 完整遊戲流程測試
2. [ ] 斷線重連測試
3. [ ] 假玩家回合測試

---

## 7. 常用指令

```bash
# 開發
pnpm dev

# 型別檢查
pnpm typecheck

# 測試
pnpm test

# Database
pnpm drizzle-kit generate  # 生成 migration
pnpm drizzle-kit migrate   # 執行 migration
pnpm drizzle-kit studio    # 開啟 Drizzle Studio（GUI）

# Build
pnpm build
pnpm preview
```

---

## 8. 參考資源

- [Nuxt Server Routes](https://nuxt.com/docs/guide/directory-structure/server)
- [Drizzle ORM](https://orm.drizzle.team/)
- [H3 Event Stream](https://h3.unjs.io/utils/response#sendstream-event-stream)
- [spec.md](./spec.md) - 功能規格
- [data-model.md](./data-model.md) - 資料模型
- [contracts/rest-api.md](./contracts/rest-api.md) - REST API 契約
- [contracts/sse-events.md](./contracts/sse-events.md) - SSE 事件契約

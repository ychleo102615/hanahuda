# Nuxt 全棧整合可行性分析

> 調查日期：2024-12
> 狀態：調查完成，待決策

---

## 目錄

1. [背景與目標](#1-背景與目標)
2. [目前後端架構摘要](#2-目前後端架構摘要)
3. [Nuxt 4 (Nitro) 能力對照](#3-nuxt-4-nitro-能力對照)
4. [關鍵可行性分析](#4-關鍵可行性分析)
5. [部署架構比較](#5-部署架構比較)
6. [部署平台詳細分析](#6-部署平台詳細分析)
7. [SSE vs WebSocket 比較](#7-sse-vs-websocket-比較)
8. [低成本部署方案](#8-低成本部署方案)
9. [效能考量](#9-效能考量)
10. [實施建議](#10-實施建議)
11. [結論](#11-結論)

---

## 1. 背景與目標

評估將原本規劃的 Java Spring Boot 後端整合至 Nuxt 4 (Nitro) 的可行性，目標：

- 簡化技術棧（全棧 TypeScript）
- 降低部署複雜度
- 共用 Domain Layer（前端離線模式與後端使用同一套遊戲邏輯）
- 減少開發與維護成本

---

## 2. 目前後端架構摘要

依據 [backend/architecture.md](./backend/architecture.md) 設計：

| 項目 | 規格 |
|-----|------|
| 技術棧 | Java 17+ / Spring Boot 3.x / Spring WebFlux |
| 資料庫 | PostgreSQL 14+ |
| 通訊協議 | REST API + SSE (Server-Sent Events) |
| BC 劃分 | Core Game BC + Opponent BC |
| 架構模式 | Clean Architecture + DDD |

### 核心功能需求

1. **Core Game BC**
   - Game Aggregate（遊戲狀態管理）
   - 遊戲規則引擎（發牌、配對、役種檢測）
   - 回合流程控制（FlowStage 狀態機）
   - SSE 事件推送
   - 遊戲狀態持久化

2. **Opponent BC**
   - 對手決策邏輯
   - 策略模式實作（MVP: RandomStrategy）

---

## 3. Nuxt 4 (Nitro) 能力對照

| 功能需求 | Spring Boot | Nuxt 4 (Nitro) | 評估 |
|---------|-------------|----------------|------|
| REST API | Spring MVC | Nitro Server Routes | ✅ 完全支援 |
| SSE 推送 | Spring WebFlux | Nitro + `h3` eventStream | ⚠️ 支援但需特別處理 |
| WebSocket | Spring WebSocket | Nitro WebSocket Handler | ✅ 原生支援 |
| PostgreSQL | Spring Data JPA | Prisma / Drizzle ORM | ✅ 完全支援 |
| Clean Architecture | Java POJO | TypeScript Pure Functions | ✅ 完全可實現 |
| DI Container | Spring IoC | tsyringe / 自建 DI | ✅ 可實現 |

---

## 4. 關鍵可行性分析

### 4.1 REST API - ✅ 可行

Nitro 提供 `server/api/` 目錄自動路由：

```typescript
// server/api/v1/games/join.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  // 呼叫 Use Case
  return { gameId, sessionToken }
})
```

### 4.2 SSE 事件推送 - ⚠️ 需特別設計

Nitro 支援 SSE，但有部署平台考量：

```typescript
// server/api/v1/games/[gameId]/events.get.ts
export default defineEventHandler(async (event) => {
  setHeader(event, 'content-type', 'text/event-stream')
  setHeader(event, 'cache-control', 'no-cache')
  setHeader(event, 'connection', 'keep-alive')

  return eventStream(event, async (push) => {
    // 訂閱遊戲事件並推送
  })
})
```

### 4.3 PostgreSQL 資料庫 - ✅ 可行

使用 Prisma ORM：

```typescript
// server/utils/prisma.ts
import { PrismaClient } from '@prisma/client'
export const prisma = new PrismaClient()
```

```prisma
// prisma/schema.prisma
model Game {
  id           String   @id @default(uuid())
  gameState    Json     // 序列化 Game Aggregate
  sessionToken String   @unique
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model GameEvent {
  id        String   @id @default(uuid())
  gameId    String
  eventType String
  payload   Json
  createdAt DateTime @default(now())

  @@index([gameId])
}
```

### 4.4 Domain Layer 共用 - ✅ 重大優勢

由於前端 `local-game BC` 已經規劃實現完整遊戲引擎，整合後可完全共用：

```
src/
├── shared/                    # 前後端共用
│   └── domain/
│       ├── game/
│       │   ├── game.ts       # Game Aggregate
│       │   ├── round.ts      # Round Entity
│       │   └── card.ts       # Card Value Object
│       └── services/
│           ├── gameRuleService.ts
│           └── yakuDetectionService.ts
├── local-game/               # 前端離線模式
└── server/                   # Nitro 後端
    └── application/
        └── useCases/
```

---

## 5. 部署架構比較

### 方案 A：分離部署（目前設計）

```
[Nuxt Frontend] ←REST+SSE→ [Spring Boot Backend] → [PostgreSQL]
    Vercel/Netlify              VPS/K8s              RDS
```

| 優點 | 缺點 |
|-----|------|
| 技術成熟 | 需維護兩套系統 |
| 各自獨立擴展 | 跨域處理 |
| Java 效能較高 | 部署複雜度高 |
| 微服務化路徑清晰 | Domain 邏輯重複實作 |

### 方案 B：整合 Nuxt 全棧（Nitro）

```
[Nuxt Fullstack App (Nitro)] → [PostgreSQL]
         VPS/Docker                RDS
```

| 優點 | 缺點 |
|-----|------|
| 單體部署簡單 | 無法使用 Serverless 平台 |
| 全棧 TypeScript | Node.js 效能較 Java 低 |
| 共用 Domain Layer | 未來微服務化需額外拆分 |
| 開發效率高 | SSE 需要持久伺服器 |

---

## 6. 部署平台詳細分析

### 6.1 長連接技術限制本質

無論 SSE 或 WebSocket，**核心限制相同**：需要持久化的伺服器進程維持連接。

### 6.2 平台支援矩陣

#### 免費/極低成本選項

| 平台 | 免費額度 | SSE | WebSocket | 限制 | 月費（超額） |
|-----|---------|-----|-----------|------|------------|
| **Railway** | $5/月 | ✅ | ✅ | 連接數無硬限 | $5 起 |
| **Render** | 750hr/月 | ✅ | ✅ | 閒置 15 分鐘休眠 | $7/月 |
| **Fly.io** | 3 shared VMs | ✅ | ✅ | 256MB RAM | $1.94/月 |
| **Koyeb** | 1 nano instance | ✅ | ✅ | 512MB RAM | $5.4/月 |
| **Zeabur** | $5/月 | ✅ | ✅ | 台灣團隊，中文支援 | $5 起 |
| **Oracle Cloud** | **永久免費** 2 VM | ✅ | ✅ | 1GB RAM, 需搶資源 | 免費 |
| **Google Cloud Run** | 200萬請求/月 | ⚠️ | ⚠️ | 最長 60 分鐘 timeout | $0.00002/秒 |

#### Serverless 平台（不適用長連接）

| 平台 | SSE | WebSocket | 原因 |
|-----|-----|-----------|------|
| Vercel | ❌ | ❌ | Function 最長 60 秒 |
| Netlify | ❌ | ❌ | Function 最長 26 秒 |
| Cloudflare Workers | ⚠️ | ⚠️ | 需 Durable Objects（$5/月起） |
| AWS Lambda | ❌ | ❌ | 最長 15 分鐘，不適合遊戲 |

### 6.3 資料庫免費選項

| 服務 | 免費額度 | 限制 |
|-----|---------|------|
| **Supabase** | 500MB | 1 週無活動暫停 |
| **Neon** | 0.5GB | 分支數限制 |
| **PlanetScale** | 5GB | 僅 MySQL |
| **Railway** | 內含 | 與應用共用 $5 額度 |

---

## 7. SSE vs WebSocket 比較

### 7.1 技術特性對比

| 比較項目 | SSE | WebSocket |
|---------|-----|-----------|
| 通訊方向 | 單向（Server → Client） | 雙向 |
| 協議 | HTTP | WS（需 Upgrade） |
| 瀏覽器重連 | ✅ 內建自動重連 | ❌ 需自行實作 |
| HTTP/2 多路復用 | ✅ 支援 | ❌ 獨立連接 |
| 二進制資料 | ❌ 僅文字 | ✅ 支援 |
| 防火牆穿透 | ✅ 較佳（純 HTTP） | ⚠️ 可能被阻擋 |

### 7.2 部署限制對比

| 比較項目 | SSE | WebSocket |
|---------|-----|-----------|
| CDN/代理相容性 | ✅ 較佳（標準 HTTP） | ⚠️ 部分需特殊設定 |
| Nginx 設定 | 簡單（`proxy_buffering off`） | 需額外 Upgrade header |
| 負載均衡 | ✅ 標準 HTTP LB | ⚠️ 需 sticky session |
| Cloudflare 免費版 | ✅ 支援 | ✅ 支援（100 秒 idle timeout） |
| 平台支援普及度 | 略少 | 較多 |

### 7.3 結論

兩者在現代平台上限制差異不大。對於本專案：

- **維持 SSE 建議**：遊戲是「命令-事件」模式，SSE 語意更清晰
- 瀏覽器內建自動重連，開發更簡單
- 現有 [protocol.md](./shared/protocol.md) 設計完整，無需改動

---

## 8. 低成本部署方案

### 方案 1：Oracle Cloud 永久免費（$0/月）

```
[Nuxt Fullstack] → [Oracle Cloud Free Tier VM] → [PostgreSQL (Supabase Free)]
                        1 vCPU, 1GB RAM                 500MB
```

**優點**：
- 完全免費
- 1GB RAM 足夠 MVP

**限制**：
- 需要搶資源（熱門區域常滿）
- 需自行維護伺服器
- 1GB RAM 需要優化

**適用**：預算極低，願意花時間維護

---

### 方案 2：Railway（$5/月起）⭐ 推薦

```
[Railway]
├── Nuxt App (Web Service)
└── PostgreSQL (Database Service)
```

**優點**：
- 免費 $5 額度/月，MVP 可能夠用
- 自動部署、SSL、自訂域名
- 內建 PostgreSQL 服務
- SSE/WebSocket 完整支援
- 開發體驗最佳

**限制**：
- 超過 $5 開始計費
- 無休眠，持續計費

**適用**：快速啟動，願意支付少量費用

---

### 方案 3：Fly.io + Supabase（$0-5/月）

```
[Fly.io]                          [Supabase Free]
├── Nuxt App (1 shared VM)   →    PostgreSQL 500MB
└── 256MB RAM, 3GB storage
```

**優點**：
- 3 個 shared-cpu-1x 免費
- 全球多區域部署
- WebSocket/SSE 原生支援

**限制**：
- 256MB RAM 較緊（Nuxt 約需 150-200MB）
- 超過免費額度 $1.94/月起

**適用**：需要低延遲全球部署

---

### 方案 4：Zeabur（$5/月起）

```
[Zeabur]
├── Nuxt App
└── PostgreSQL (Serverless)
```

**優點**：
- 台灣團隊，中文客服
- 介面友善，類似 Railway
- SSE/WebSocket 支援

**適用**：偏好中文介面與支援

---

### 方案比較總結

| 優先級 | 方案 | 月費 | 難度 | 適用情境 |
|-------|------|------|------|---------|
| 1️⃣ | Railway | $0-5 | ⭐ 最簡單 | 快速啟動 MVP |
| 2️⃣ | Fly.io + Supabase | $0-5 | ⭐⭐ | 全球低延遲 |
| 3️⃣ | Oracle Free + Supabase | $0 | ⭐⭐⭐ | 完全免費但需維護 |
| 4️⃣ | Zeabur | $5+ | ⭐ | 中文支援需求 |

---

## 9. 效能考量

### 9.1 Java vs Node.js

| 指標 | Spring Boot (Java) | Nitro (Node.js) |
|-----|---------------------|-----------------|
| 計算密集任務 | ⭐⭐⭐⭐⭐ JIT 優化強 | ⭐⭐⭐ V8 引擎 |
| 並發連接 | ⭐⭐⭐⭐ WebFlux 非阻塞 | ⭐⭐⭐⭐ 事件循環 |
| 記憶體使用 | ⭐⭐⭐ JVM 開銷大 | ⭐⭐⭐⭐ 較輕量 |
| 冷啟動 | ⭐⭐ JVM 啟動慢 | ⭐⭐⭐⭐ 啟動快 |

### 9.2 MVP 階段評估

對於 MVP 階段 100+ 並發遊戲：
- Node.js 完全能勝任
- 役種檢測等計算不算密集
- 主要瓶頸在資料庫 I/O，非 CPU

---

## 10. 實施建議

### 10.1 若選擇整合 Nuxt

#### 目錄結構建議

```
front-end/
├── src/
│   ├── shared/                  # 前後端共用
│   │   ├── domain/              # 遊戲邏輯（原 local-game/domain）
│   │   │   ├── game/
│   │   │   │   ├── game.ts
│   │   │   │   ├── round.ts
│   │   │   │   └── card.ts
│   │   │   └── services/
│   │   │       ├── gameRuleService.ts
│   │   │       └── yakuDetectionService.ts
│   │   └── contracts/           # 數據契約
│   ├── user-interface/          # 前端 UI BC（不變）
│   └── local-game/              # 改為使用 shared/domain
├── server/
│   ├── api/v1/                  # REST endpoints
│   │   ├── games/
│   │   │   ├── join.post.ts
│   │   │   └── [gameId]/
│   │   │       ├── events.get.ts     # SSE
│   │   │       ├── snapshot.get.ts
│   │   │       └── turns/
│   │   │           ├── play-card.post.ts
│   │   │           └── select-match.post.ts
│   ├── application/             # Use Cases
│   │   ├── joinGameUseCase.ts
│   │   ├── playHandCardUseCase.ts
│   │   └── executeOpponentTurnUseCase.ts
│   ├── adapters/
│   │   ├── persistence/         # Prisma Repository
│   │   │   └── gameRepository.ts
│   │   └── eventPublisher/      # SSE Publisher
│   │       └── sseEventPublisher.ts
│   └── utils/
│       └── prisma.ts
├── prisma/
│   └── schema.prisma
└── nuxt.config.ts
```

#### 實施步驟

1. **Phase 1**：將 `local-game BC` 的 Domain Layer 提升為 `shared/domain`
2. **Phase 2**：在 `server/` 目錄實現 Application Layer（Use Cases）
3. **Phase 3**：使用 Prisma 實現持久化
4. **Phase 4**：實現 SSE 事件推送機制
5. **Phase 5**：部署至 Railway/Fly.io

---

## 11. 結論

### 可行性評估

| 評估維度 | 可行性 | 說明 |
|---------|-------|------|
| 技術實現 | ✅ 高 | Nitro 能實現所有後端功能 |
| 開發效率 | ✅ 高 | 全棧 TypeScript + Domain 共用 |
| MVP 效能 | ✅ 足夠 | 100+ 並發無問題 |
| 部署簡化 | ✅ 高 | 單一應用部署 |
| Serverless | ❌ 不支援 | SSE 需要長連接 |
| 未來微服務化 | ⚠️ 中等 | 需要額外拆分工作 |

### 決策建議

| 優先考量 | 建議方案 |
|---------|---------|
| 開發效率與 MVP 快速迭代 | ✅ 整合至 Nuxt |
| 效能與微服務預備 | 維持 Java 後端 |
| 最低成本部署 | 整合至 Nuxt + Railway/Oracle |

### 核心價值

整合至 Nuxt 的核心價值：**Domain Layer 完全共用**

- 前端離線模式與後端使用同一套遊戲邏輯
- 減少重複開發與同步維護成本
- 全棧 TypeScript 提升開發體驗

---

## 參考文檔

- [後端架構總覽](./backend/architecture.md)
- [前端架構總覽](./frontend/architecture.md)
- [通訊協議](./shared/protocol.md)
- [數據契約](./shared/data-contracts.md)

# 花牌 Koi-Koi 網頁遊戲

日本傳統花牌遊戲，展示 **Clean Architecture**、**Domain-Driven Design** 與**全端工程能力**。

## 專案亮點

| 面向 | 技術實作 |
|------|---------|
| **架構** | 嚴格 Clean Architecture 分層、DDD Bounded Contexts、依賴反轉 |
| **前端** | Nuxt 4 + Vue 3 + TypeScript、自製 DI Container、SVG Sprite 最佳化 |
| **後端** | Nuxt 4 Nitro + Drizzle ORM + PostgreSQL、SSE + REST API 即時通訊、悲觀鎖 |
| **效能** | SSR 首次 inline SVG sprite；localStorage 恢復機制消除重複下載，Chrome 與 Safari 皆零渲染阻塞 |
| **遊戲邏輯** | 完整役種偵測引擎（12 種役型）、Koi-Koi 規則、特殊規則處理 |
| **配對** | 線上人機/人人對戰、AI 對手配對、房間類型管理、PlayerEventBus |
| **身份識別** | 玩家帳號、訪客模式、軟刪除機制、Telegram Mini App OAuth |
| **排行榜** | 玩家排名、勝率統計、役種成就追蹤 |
| **狀態管理** | 斷線重連機制、操作計時器、頁面可見性狀態恢復 |
| **動畫系統** | 可中斷動畫、AbortController 整合、動態座標計算 |

---

## 技術棧

```
┌─────────────────────────────────────────────────────────────┐
│                        前端                                  │
│  Nuxt 4 • Vue 3 • TypeScript • Tailwind CSS v4 • Pinia     │
├─────────────────────────────────────────────────────────────┤
│                        後端                                  │
│  Nuxt 4 Nitro • Drizzle ORM • PostgreSQL • SSE             │
├─────────────────────────────────────────────────────────────┤
│                      架構                                    │
│  Clean Architecture • DDD • Event-Driven • CQRS-like        │
└─────────────────────────────────────────────────────────────┘
```

---

## 架構總覽

### Clean Architecture 分層

前後端均採用嚴格的四層結構：

```
┌───────────────────────────────────────────────────────────┐
│  Framework 層（Nuxt Pages、API Routes、Vue Components）    │
├───────────────────────────────────────────────────────────┤
│  Adapter 層（Pinia Stores、API Clients、SSE、DB Repo）     │
├───────────────────────────────────────────────────────────┤
│  Application 層（Use Cases、Event Handlers、Ports）        │
├───────────────────────────────────────────────────────────┤
│  Domain 層（Entities、Value Objects、Domain Services）     │
└───────────────────────────────────────────────────────────┘
```

**依賴方向**：外層 → 內層（Domain 不依賴任何框架）

### Bounded Contexts

| Context | 職責 | 層 |
|---------|------|----|
| **Game Client BC** | 遊戲 UI 渲染、動畫、使用者互動 | 前端 |
| **Core Game BC** | 遊戲規則引擎、回合控制、計分 | 後端 |
| **Identity BC** | 玩家帳號、身份驗證、訪客模式 | 後端 |
| **Matchmaking BC** | 線上配對、房間管理 | 後端 |
| **Leaderboard BC** | 玩家排名、統計追蹤 | 後端 |
| **Opponent BC** | AI 對手決策邏輯 | 後端 |

---

## 核心功能實作

### 1. SSE + REST API 即時通訊

**設計決策**：從 WebSocket 遷移回 SSE + REST API 以支援 HTTP/2

WebSocket 需要 HTTP/1.1 Upgrade 握手，在 Fly.io 環境強制降級整條連線至 HTTP/1.1，失去多路複用。SSE 是標準 HTTP 回應，原生支援 HTTP/2 多路複用，單一 TCP 連線可同時承載 SSE 事件流與 REST API 請求。由於遊戲只需伺服器推送（事件）與客戶端請求回應（指令），全雙工 WebSocket 是不必要的開銷。

```typescript
// 事件流範例
Client → REST: POST /api/v1/games/{id}/turns/play-card
Server → SSE:  TurnCompleted { hand_card_play, draw_card_play, next_state }
Server → SSE:  DecisionRequired { yaku_update, current_multipliers }
Client → REST: POST /api/v1/games/{id}/rounds/decision
Server → SSE:  RoundScored { winner_id, final_points }
```

### 2. 動畫系統

**設計決策**：使用 AbortController 實作可中斷動畫

```typescript
class AnimationPortAdapter implements AnimationPort {
  private operationSession: OperationSessionManager

  async playDealAnimation(params: DealAnimationParams): Promise<void> {
    await delay(ANIMATION_DURATION.DEAL_CARD, this.operationSession.getSignal())
  }
}
```

- Zone Registry 追蹤卡牌位置（相對於容器座標）
- 動畫層使用複製卡牌避免閃爍
- 支援 pulse、fadeIn、fadeOut、pulseToFadeOut 效果

### 3. 並發控制

**設計決策**：悲觀鎖保護遊戲操作

```typescript
class InMemoryGameLock implements GameLockPort {
  private locks: Map<string, Promise<void>> = new Map()

  async withLock<T>(gameId: string, operation: () => Promise<T>): Promise<T> {
    const currentLock = this.locks.get(gameId) ?? Promise.resolve()
    const newLock = currentLock.then(() => operation())
    this.locks.set(gameId, newLock.catch(() => {}))
    return newLock
  }
}
```

### 4. 遊戲規則引擎

Domain 層純函數實作，所有函數回傳新物件，使用 `Object.freeze()` 確保不可變性：

```typescript
export function playHandCard(round: Round, ...): PlayHandCardResult {
  return Object.freeze({
    ...round,
    field: Object.freeze([...newField]),
  })
}
```

### 5. 配對系統

**設計決策**：事件驅動配對，專用 PlayerEventBus

```
Player → REST: POST /matchmaking/enter { roomType: 'SINGLE' | 'HUMAN' }
Server → PlayerEventBus: MatchFound { game_id, opponent_name, is_bot }
Player → SSE: 連接 /api/v1/events
```

- **PlayerEventBus**（以 playerId 為鍵）：遊戲前事件（MatchFound、MatchFailed）
- **GameEventBus**（以 gameId 為鍵）：遊戲中事件（TurnCompleted、RoundScored）

### 6. 事件序列化處理

**問題**：SSE 事件快速連續到達時，前一個動畫可能尚未完成

```typescript
class EventRouter {
  private eventChain: Promise<void> = Promise.resolve()

  route(eventType: SSEEventType, payload: any): void {
    this.eventChain = this.eventChain.then(() => {
      return port.execute(payload, options)
    })
  }
}
```

### 7. 排行榜系統

**設計決策**：事件驅動統計，關注點分離

```
GAME_FINISHED event → GameFinishedEventHandler
  → UpdatePlayerStatsUseCase（勝者統計、敗者統計）
  → PlayerStatsRepository（持久化至 player_stats 資料表）
```

### 8. SVG Sprite 載入策略

**問題**：首頁英雄區卡牌使用 `<use href="#icon-...">` 參照 DOM 內的 inline SVG symbol，需要 sprite 在 HTML parse 階段就存在於 DOM。`vite-plugin-svg-icons` 透過 JavaScript 在 hydration 後注入 — 對純 CSR 沒問題，但 SSR 頁面會在 JS 執行前出現空白牌面。

**演進過程**：

1. **CSR 階段**：Sprite 透過 `vite-plugin-svg-icons` 打進 JS bundle，在執行時注入。Vue 元件本身也要等 JS 執行，不存在 first-paint 問題。
2. **導入 SSR**：SSR HTML 預先渲染，但 `<use href="#...">` 是 DOM 錨點參照，在對應 `<symbol>` 存在於 DOM 之前無法解析，產生空白期。解法：server 首次訪問時直接 inline 整份 sprite。
3. **重複訪問最佳化**：每次 SSR 都 inline ~700KB 過於浪費。第一次訪問後將 sprite 存入 `localStorage`，後續訪問透過在 parse 階段注入的同步 inline script 從 `localStorage` 讀取並恢復 — 效果等同 server inline，零 HTTP 請求。

**為何不用 HTTP cache**：`href="#..."` 是 DOM 內容的參照，不是外部資源請求。HTTP cache 用於外部檔案，無法將資料注入 DOM。即使 disk cache 命中，仍需請求流程；`localStorage` 讀取是同步的。

**為何 Safari fetch 方案失效**：Safari 不將 `fetch()` 回應寫入 disk cache（僅 memory cache，重新整理即清除）。每次 hard refresh 都重新下載 700KB，與 cache-control 設定無關。

```
首次訪問：  Server inline sprite 至 HTML body
            → app:mounted 存入 localStorage + 設 cookie

後續訪問：  Server 偵測到 cookie → 注入 RESTORE_SCRIPT（parse 階段執行）
            → RESTORE_SCRIPT 同步讀取 localStorage → 注入 DOM
            → 零 HTTP 請求，等同 server inline 的渲染時機
```

**邊緣案例**：
- `localStorage` 被清除但 cookie 存在：RESTORE_SCRIPT 偵測空值，刪除 cookie → 下次 server 重新 inline
- 私密模式：`localStorage` 拋出 `SecurityError` → 不設 cookie → server 每次 inline

**雙模式 `SvgIcon`**：

| 元件 | 模式 | 資源來源 |
|------|------|---------|
| `HeroCardGrid`（首頁英雄） | `inline: true` → `href="#icon-..."` | DOM inline SVG |
| `MonthRow`、`CardComponent`（遊戲） | `inline: false` → `href="/sprite.svg#..."` | 外部檔案，HTTP cache |

遊戲頁面為 SPA（`ssr: false`），所有渲染皆在 JS 執行後，HTTP disk cache 已足夠，外部檔案也使 JS bundle 更小。

**職責分配**：

| 位置 | 職責 |
|------|------|
| `server/plugins/svg-sprite.ts` | 讀 cookie → inline sprite 或注入 RESTORE_SCRIPT |
| `app/plugins/svg-sprite-cache.client.ts` | hydration 後存 localStorage + 設 cookie（Infrastructure 層） |
| RESTORE_SCRIPT（server 注入的 inline script） | parse 階段同步讀 localStorage → 注入 DOM |

---

## 重要技術決策

### 1. SSE 連線重建策略

頁面 Visibility Change 後，SSE 連線可能接收到過期事件。解法：偵測到可見性變更恢復時，主動斷線重連並請求完整狀態快照。

### 2. 統一 Gateway 連線設計

不同場景（新遊戲、重連、配對）統一使用 `/api/v1/events` SSE 端點，透過 `GatewayConnected` 事件自動判斷情境。

### 3. 動畫層座標系統

原先使用相對 Viewport 的固定定位，捲動時動畫位置錯誤。改為相對遊戲容器的絕對定位，動態計算容器偏移量。

### 4. 統一 AbortController 取消機制

使用 `OperationSessionManager` 統一管理 `AbortSignal`，動畫被中斷時取消所有進行中的延遲與動畫。

### 5. 悲觀鎖而非樂觀鎖

樂觀鎖（版本號檢查）無法防止並發競態條件。使用 Promise chain 實作悲觀鎖，確保同一遊戲操作的互斥執行。

### 6. 事件序列化處理

SSE 事件快速連續到達時，EventRouter 使用 Promise chain 序列化事件處理，避免動畫衝突。

### 7. Domain 純函數 + Object.freeze 不可變性

所有 Domain 函數回傳新物件，使用 `Object.freeze()` 確保 Domain 層無副作用。

### 8. 配對競態條件防止

配對成功時，`game_id` 必須包含在 `MatchFound` 事件中，但此時遊戲尚未建立。解法：`GameCreationHandler` 先建立遊戲，再發布帶有有效 `game_id` 的 `MatchFound` 事件。

---

## 目錄結構

```
front-end/
├── app/                              # 前端應用
│   ├── assets/icons/                # 花牌 SVG（50 個檔案，sprite 最佳化）
│   ├── pages/                       # 路由頁面
│   ├── plugins/                     # DI Container 初始化、SVG sprite 快取
│   └── game-client/                 # Game Client BC（前端）
│       ├── domain/                  #   純遊戲邏輯
│       ├── application/             #   Use Cases 與 Event Handlers
│       └── adapter/                 #   Pinia、SSE、REST API、Animation、DI
│
├── server/                          # Nuxt 4 Nitro 後端
│   ├── core-game/                   # Core Game BC
│   ├── identity/                    # Identity BC
│   ├── matchmaking/                 # Matchmaking BC
│   ├── leaderboard/                 # Leaderboard BC
│   ├── opponent/                    # Opponent（AI）BC
│   ├── gateway/                     # API Gateway
│   └── plugins/                     # SVG sprite SSR 注入
│
└── shared/                          # 前後端共用合約
    ├── contracts/                   # 事件類型、Gateway 合約
    ├── constants/                   # 卡牌常數、SVG sprite 常數
    └── errors/                      # HTTP 錯誤、錯誤處理器
```

---

## 快速開始

### 環境需求

- Node.js 18+
- PostgreSQL 14+
- pnpm（建議）

### 安裝與啟動

```bash
git clone https://github.com/your-username/hanahuda.git
cd hanahuda/front-end
pnpm install
cp .env.example .env
# 編輯 .env 設定 DATABASE_URL
pnpm db:migrate
pnpm dev
```

### 測試

```bash
pnpm test:unit    # 單元測試
pnpm test:server  # 後端測試
pnpm type-check   # 型別檢查
```

---

## 授權

本專案採用 MIT 授權。花牌圖像來自 [Hanafuda-Louie-Recolor](https://github.com/dotty-dev/Hanafuda-Louie-Recolor)（CC BY-SA 4.0）。

---

## 作者

**Leo Huang**

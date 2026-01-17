# Quickstart: Leaderboard and Records

**Feature Branch**: `012-leaderboard-records`
**Date**: 2026-01-13

## Prerequisites

確保已完成以下設定：

```bash
# 切換到功能分支
git checkout 012-leaderboard-records

# 安裝依賴
pnpm --prefix front-end install

# 確認資料庫連線
pnpm --prefix front-end db:studio
```

---

## Development Setup

### 1. 建立新的 Bounded Context 架構

使用 `/create-bounded-context` skill 快速建立 BC 骨架：

```bash
# 在 Claude Code 中執行
/create-bounded-context leaderboard
```

這會建立以下目錄結構：

```
front-end/server/leaderboard/
├── domain/
├── application/
│   ├── use-cases/
│   └── ports/
│       ├── input/
│       └── output/
└── adapters/
    ├── di/
    └── persistence/
```

### 2. 建立資料庫 Schema

建立 `dailyPlayerScores.ts` schema 檔案：

```bash
# 檔案位置
front-end/server/database/schema/dailyPlayerScores.ts
```

Schema 定義請參考 [data-model.md](./data-model.md#new-table-daily_player_scores)。

在 `front-end/server/database/schema/index.ts` 中註冊：

```typescript
export * from './dailyPlayerScores'
```

### 3. 執行資料庫遷移

```bash
# 生成遷移檔案
pnpm --prefix front-end db:generate

# 執行遷移
pnpm --prefix front-end db:migrate

# 驗證表格建立
pnpm --prefix front-end db:studio
```

---

## Implementation Order

### Phase 0: Shared Infrastructure Extension (Prerequisite)

**重要**：此功能依賴 `GAME_FINISHED` 事件，但目前 InternalEventBus 不支援此事件類型。

1. **擴充事件類型定義**
   - 修改 `front-end/server/shared/infrastructure/event-bus/types.ts`
   - 新增 `GameFinishedPayload` 介面
   - 更新 `EVENT_TYPES` 常數

2. **擴充 InternalEventBus**
   - 修改 `front-end/server/shared/infrastructure/event-bus/internalEventBus.ts`
   - 支援 `GAME_FINISHED` 事件的發布與訂閱

3. **修改 Core-Game BC**
   - 在遊戲結束時發布 `GAME_FINISHED` 事件
   - 確保 payload 包含 `achievedYaku`, `koiKoiCalls`, `isMultiplierWin` 等資訊

詳見 [research.md](./research.md#2-shared-infrastructure-extension-prerequisite)。

---

### Phase A: Backend Domain Layer (TDD)

1. **Domain Types**
   - `types.ts` - 定義 `YakuCounts` Value Object（不依賴 DB Schema）

2. **Value Objects**
   - `leaderboard-type.ts` - 排行榜類型常數
   - `time-range.ts` - 時間範圍計算邏輯

3. **Entities**
   - `daily-player-score.ts` - 每日分數實體與更新邏輯
   - `player-stats.ts` - 玩家累計統計實體
   - `leaderboard-entry.ts` - 排行榜條目與排名計算

4. **Domain Services**（若需要）

**測試優先**：
```bash
# 執行 Domain 測試
pnpm --prefix front-end test:unit -- --grep "leaderboard/domain"
```

### Phase B: Backend Application Layer (TDD)

1. **Ports**
   - `daily-player-score-repository-port.ts`
   - `player-stats-repository-port.ts` (從 Core-Game 轉移)
   - `get-leaderboard-input-port.ts`
   - `get-player-statistics-input-port.ts`
   - `update-player-records-input-port.ts`

2. **Use Cases**
   - `update-player-records-use-case.ts` (統一更新 player_stats + daily_player_scores)
   - `get-daily-leaderboard-use-case.ts`
   - `get-weekly-leaderboard-use-case.ts`
   - `get-player-statistics-use-case.ts`

**測試優先**：
```bash
# 執行 Application 測試
pnpm --prefix front-end test:unit -- --grep "leaderboard/application"
```

### Phase C: Backend Adapters

1. **Persistence**
   - `drizzle-daily-player-score-repository.ts`
   - `drizzle-player-stats-repository.ts` (從 Core-Game 轉移)

2. **Event Subscriber**
   - `game-finished-subscriber.ts` - 訂閱 InternalEventBus

3. **DI Container**
   - `container.ts` - 註冊所有依賴

4. **Server Plugin**
   - `dailyScoreCleanup.ts` - 30 天資料清理

5. **Core-Game BC Cleanup** (移除舊檔案)
   - 刪除 `recordGameStatsUseCase.ts`
   - 刪除 `playerStatsRepositoryPort.ts`
   - 刪除 `drizzlePlayerStatsRepository.ts`

### Phase D: API Endpoints

1. `GET /api/v1/leaderboard` - `front-end/server/api/v1/leaderboard/index.get.ts`
2. `GET /api/v1/stats/me` - `front-end/server/api/v1/stats/me.get.ts`

API 規格請參考 [contracts/](./contracts/)。

### Phase E: Frontend Components

1. **NavigationBar 修改**
   - 移除 Rules, About 連結
   - 保留 Logo, Player/SignIn, Start Game

2. **新組件**
   - `NavigationSection.vue`
   - `RecordSection.vue`
   - `LeaderboardBlock.vue`
   - `PersonalStatsBlock.vue`
   - `YakuStatsAccordion.vue`

3. **首頁整合**
   - 更新 `index.vue` 組件順序

---

## Testing Strategy

### Domain Layer Tests

```typescript
// front-end/server/leaderboard/domain/__tests__/time-range.spec.ts
describe('TimeRange', () => {
  describe('getTimeRangeStartDate', () => {
    it('should return today 00:00 for DAY range', () => {
      // ...
    })

    it('should return Monday 00:00 for WEEK range', () => {
      // ...
    })
  })
})
```

### Application Layer Tests

```typescript
// front-end/server/leaderboard/application/use-cases/__tests__/get-daily-leaderboard.spec.ts
describe('GetDailyLeaderboardUseCase', () => {
  it('should return top N players sorted by score DESC', async () => {
    // Mock repository
    // Execute use case
    // Assert results
  })

  it('should handle ties with same rank', async () => {
    // ...
  })
})
```

### API Contract Tests

```typescript
// front-end/server/api/v1/leaderboard/__tests__/index.get.spec.ts
describe('GET /api/v1/leaderboard', () => {
  it('should return daily leaderboard', async () => {
    // Use nitro test utils
  })

  it('should return 400 for invalid type', async () => {
    // ...
  })
})
```

---

## Event Integration

### 訂閱 GameFinishedEvent

在 `front-end/server/plugins/leaderboard.ts` 中設定事件訂閱：

```typescript
import { internalEventBus } from '~/server/shared/infrastructure/event-bus/internalEventBus'
import { getLeaderboardContainer } from '~/server/leaderboard/adapters/di/container'

export default defineNitroPlugin(() => {
  const container = getLeaderboardContainer()
  const updatePlayerRecordsUseCase = container.updatePlayerRecordsUseCase

  internalEventBus.subscribe('GAME_FINISHED', async (event) => {
    const { winnerId, finalScores, players } = event.payload

    // 過濾人類玩家
    const humanPlayers = players.filter(p => !p.isAi)

    for (const player of humanPlayers) {
      const scoreData = finalScores.find(s => s.playerId === player.id)
      if (!scoreData) continue

      // 統一更新 player_stats 和 daily_player_scores
      await updatePlayerRecordsUseCase.execute({
        playerId: player.id,
        scoreChange: scoreData.score,
        isWinner: winnerId === player.id,
        koiKoiCallCount: scoreData.koiKoiCalls ?? 0,
        achievedYaku: scoreData.achievedYaku ?? [],
        isMultiplierWin: scoreData.isMultiplierWin ?? false,
      })
    }
  })
})
```

---

## Verification Checklist

### Prerequisite (Phase 0)

- [ ] `GameFinishedPayload` 已定義在 `shared/infrastructure/event-bus/types.ts`
- [ ] `EVENT_TYPES` 已包含 `GAME_FINISHED`
- [ ] InternalEventBus 支援 `GAME_FINISHED` 事件的發布與訂閱
- [ ] Core-Game BC 在遊戲結束時發布 `GAME_FINISHED` 事件

### Backend

- [ ] `daily_player_scores` 表已建立
- [ ] `YakuCounts` 定義在 Domain 層 (`domain/types.ts`)，不依賴 DB Schema
- [ ] `player_stats` Repository 已遷移至 Leaderboard BC
- [ ] Core-Game BC 中的舊 player_stats 相關檔案已移除
- [ ] Domain 層單元測試覆蓋率 > 80%
- [ ] Application 層單元測試覆蓋率 > 80%
- [ ] API 端點回應符合 OpenAPI 規格
- [ ] GameFinishedEvent 訂閱正常運作（同時更新兩個表）
- [ ] 30 天清理任務正常執行

### Frontend

- [ ] NavigationBar 已移除 Rules/About
- [ ] NavigationSection 顯示正確錨點連結
- [ ] RecordSection 顯示排行榜（日/週切換）
- [ ] RecordSection 顯示個人統計（已登入）
- [ ] RecordSection 顯示登入提示（未登入）
- [ ] 載入/錯誤/空狀態正確顯示
- [ ] 響應式設計（手機/桌面）

---

## Common Commands

```bash
# 開發伺服器
pnpm --prefix front-end dev

# 執行測試
pnpm --prefix front-end test:unit

# 執行 lint
pnpm --prefix front-end lint

# 資料庫操作
pnpm --prefix front-end db:generate  # 生成遷移
pnpm --prefix front-end db:migrate   # 執行遷移
pnpm --prefix front-end db:studio    # 開啟 Drizzle Studio
```

---

## Related Documents

- [spec.md](./spec.md) - 功能規格
- [plan.md](./plan.md) - 實作計畫
- [research.md](./research.md) - 技術研究
- [data-model.md](./data-model.md) - 資料模型
- [contracts/](./contracts/) - API 規格

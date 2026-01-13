# Research: Leaderboard and Records

**Feature Branch**: `012-leaderboard-records`
**Date**: 2026-01-13

## 1. Player Stats Ownership Migration

### Decision
將 `player_stats` 表的擁有權從 Core-Game BC 轉移至 Leaderboard BC，統一管理所有玩家統計資料。

### Rationale
- **Domain 歸屬**：「玩家統計」本質上屬於 Records/Leaderboard 領域，而非遊戲核心邏輯
- **資料一致性**：統一由 Leaderboard BC 管理 `player_stats` 和 `daily_player_scores`，避免跨 BC 資料同步問題
- **單一更新點**：`UpdatePlayerRecordsUseCase` 同時更新兩個表，確保累計統計與每日快照一致
- **符合 Constitution VI**：BC 資料擁有權明確，不再需要跨 BC 查詢

### Migration Impact
| 項目 | 原歸屬 (Core-Game BC) | 新歸屬 (Leaderboard BC) |
|------|----------------------|------------------------|
| `playerStats.ts` Schema | 保留原位置（共享基礎設施） | 保留原位置（共享基礎設施） |
| `PlayerStatsRepositoryPort` | ❌ 移除 | ✅ 新增 |
| `DrizzlePlayerStatsRepository` | ❌ 移除 | ✅ 新增 |
| `RecordGameStatsUseCase` | ❌ 移除 | - |
| `UpdatePlayerRecordsUseCase` | - | ✅ 新增（統一更新） |

### Cleanup in Core-Game BC
需要移除以下檔案：
- `front-end/server/core-game/application/use-cases/recordGameStatsUseCase.ts`
- `front-end/server/core-game/application/ports/output/playerStatsRepositoryPort.ts`
- `front-end/server/core-game/adapters/persistence/drizzlePlayerStatsRepository.ts`

---

## 2. Daily Score Snapshot Architecture

### Decision
新增 `daily_player_scores` 表格，由 Core-Game BC 的 `GameFinishedEvent` 事件驅動更新，採用 **Event Subscription** 模式。

### Rationale
- `player_stats` 表僅儲存累計統計，無法支援時間區間查詢
- 事件驅動模式符合專案既有的 Event Sourcing 架構
- 30 天資料保留策略平衡儲存成本與查詢需求

### Alternatives Considered
1. **即時計算（從 game_logs 聚合）** - 查詢效能差，複雜度高
2. **定時批次任務** - 資料延遲較高，不符合 SC-003（1 分鐘內反映）
3. **擴充 player_stats 加入時間序列欄位** - 違反單一職責，schema 複雜化

### Implementation Approach
```
GameFinishedEvent (Core-Game BC)
       ↓
InternalEventBus.subscribe('GAME_FINISHED')
       ↓
Leaderboard BC - UpdatePlayerRecordsUseCase
       ↓
┌──────────────────────────────────────┐
│ Transaction:                         │
│   1. player_stats.upsert()           │
│   2. daily_player_scores.upsert()    │
└──────────────────────────────────────┘
```

---

## 3. BC Integration Pattern

### Decision
Leaderboard BC 透過 **InternalEventBus** 訂閱 Core-Game 的 `GameFinishedEvent`，採用鬆耦合的事件訂閱模式。

### Rationale
- 符合 Constitution VI（BC Isolation）的要求
- 利用現有的 `internalEventBus.ts` 基礎設施
- 單向依賴：Leaderboard → Core-Game Events（僅訂閱，不反向呼叫）

### Event Payload Structure
```typescript
// 從 Core-Game 發布的 GameFinished 事件
interface GameFinishedInternalEvent {
  type: 'GAME_FINISHED'
  payload: {
    gameId: string
    winnerId: string | null
    finalScores: { playerId: string; score: number }[]
    players: { id: string; isAi: boolean }[]
    timestamp: Date
  }
}
```

### Alternatives Considered
1. **直接資料庫查詢 Core-Game 的 games 表** - 違反 BC 隔離原則
2. **HTTP API 呼叫** - 過於複雜，增加網路延遲
3. **共用 Repository** - 違反 DDD 原則，產生緊耦合

---

## 4. Weekly Leaderboard Calculation

### Decision
週排行榜透過 SQL 聚合 `daily_player_scores` 表的當週資料（星期一至今）計算。

### Rationale
- 日分數已經預計算，週聚合查詢效能高
- 無需額外儲存週快照表
- 週邊界使用 UTC+8 時區的星期一 00:00 作為起點

### SQL Pattern
```sql
SELECT player_id, SUM(score) as weekly_score, SUM(games_played) as weekly_games
FROM daily_player_scores
WHERE date >= date_trunc('week', NOW() AT TIME ZONE 'Asia/Taipei')
  AND date < NOW() AT TIME ZONE 'Asia/Taipei'
GROUP BY player_id
ORDER BY weekly_score DESC, weekly_games ASC
LIMIT 10;
```

---

## 5. Data Cleanup Strategy

### Decision
使用 Nuxt Server Plugin 定時清理超過 30 天的 `daily_player_scores` 資料。

### Rationale
- 與現有的 `guestCleanup.ts`、`gameCleanup.ts` 模式一致
- 每日執行一次，低資源消耗
- 30 天足夠支援月度統計查詢需求

### Implementation
```typescript
// front-end/server/plugins/dailyScoreCleanup.ts
export default defineNitroPlugin((nitro) => {
  const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000 // 24 小時
  const RETENTION_DAYS = 30

  setInterval(async () => {
    const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
    await db.delete(dailyPlayerScores).where(lt(dailyPlayerScores.date, cutoffDate))
  }, CLEANUP_INTERVAL)
})
```

---

## 6. Frontend Navigation Restructure

### Decision
移除 NavigationBar 中的 Rules/About 錨點連結，新增獨立的 NavigationSection 組件提供頁內導航。

### Rationale
- 簡化頂部導航，聚焦核心 CTA（Start Game）
- NavigationSection 可提供更豐富的視覺設計空間
- 符合 FR-008、FR-009 的需求

### Component Structure
```
index.vue
├── NavigationBar (簡化版)
│   └── Logo | [Player/SignIn] | Start Game (CTA)
├── HeroSection
├── NavigationSection (新增)
│   └── Records | Rules | About (錨點連結)
├── RecordSection (新增)
│   ├── LeaderboardBlock
│   └── PersonalStatsBlock
├── RulesSection
└── AboutSection
```

---

## 7. API Design Pattern

### Decision
採用與現有 `/api/v1/` 一致的 RESTful 風格，新增 `/api/v1/leaderboard` 和 `/api/v1/stats` 端點。

### Rationale
- 維持 API 設計一致性
- 支援未來的 API 版本管理
- 清晰的資源導向命名

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/leaderboard?type=daily&limit=10` | 查詢日排行榜 |
| GET | `/api/v1/leaderboard?type=weekly&limit=10` | 查詢週排行榜 |
| GET | `/api/v1/stats/me?range=all` | 查詢當前玩家統計 |
| GET | `/api/v1/stats/me?range=week` | 查詢當前玩家本週統計 |

---

## 8. Personal Statistics Data Source

### Decision
個人統計分為兩個來源：
- **累計統計**（全部）：直接查詢 `player_stats` 表
- **時間範圍統計**（日/週/月）：聚合 `daily_player_scores` 表

### Rationale
- 利用現有 `player_stats` 避免重複計算全時間統計
- `daily_player_scores` 提供時間範圍查詢能力
- 兩個資料源職責明確，避免資料不一致

### Query Strategy
```typescript
// 全部統計
const allStats = await playerStatsRepository.findByPlayerId(playerId)

// 時間範圍統計
const rangeStats = await dailyPlayerScoreRepository.aggregateByRange(playerId, range)
```

---

## 9. UI Component Design

### Decision
RecordSection 採用 Tab 切換設計，左側為排行榜（日/週切換），右側為個人統計。

### Rationale
- 單一 Section 整合相關功能，減少頁面滾動
- Tab 切換比多 Section 更節省垂直空間
- 響應式設計時可堆疊顯示

### Layout (Desktop)
```
┌─────────────────────────────────────────────────┐
│                 Record Section                   │
├───────────────────────┬─────────────────────────┤
│   Leaderboard         │   Personal Stats        │
│   [Daily] [Weekly]    │   [All] [Week] [Month]  │
│   ┌───────────────┐   │   ┌─────────────────┐   │
│   │ 1. Player A   │   │   │ Total Score     │   │
│   │ 2. Player B   │   │   │ Win Rate        │   │
│   │ 3. ...        │   │   │ Koi-Koi Calls   │   │
│   │ ...           │   │   │ [Yaku Details]  │   │
│   └───────────────┘   │   └─────────────────┘   │
│   [Your Rank: #15]    │   [Login to view]       │
└───────────────────────┴─────────────────────────┘
```

### Layout (Mobile)
```
┌─────────────────────────┐
│     Record Section      │
├─────────────────────────┤
│ Leaderboard             │
│ [Daily] [Weekly]        │
│ ┌─────────────────────┐ │
│ │ 1. Player A         │ │
│ │ ...                 │ │
│ └─────────────────────┘ │
│ [Your Rank: #15]        │
├─────────────────────────┤
│ Personal Stats          │
│ [All] [Week] [Month]    │
│ ┌─────────────────────┐ │
│ │ Total Score: 1234   │ │
│ │ ...                 │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

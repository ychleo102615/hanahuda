# Research: Backend Testing & Logging Enhancement

**Feature Branch**: `009-backend-testing-logging`
**Date**: 2025-12-23

## 1. Testing Framework Configuration

### Decision
使用 Vitest 作為後端單元測試框架，需針對 server/ 目錄建立獨立的測試配置。

### Rationale
- 專案已使用 Vitest 作為前端測試框架（見 `front-end/package.json`）
- Vitest 對 TypeScript 有原生支援，與 Nuxt 4 生態系整合良好
- 可複用現有的 coverage 設定（`@vitest/coverage-v8`）
- 符合 Constitution V（Test-First Development）的要求

### Alternatives Considered
1. **Jest** - 更成熟但需額外設定 TypeScript/ESM 支援
2. **Node Test Runner** - 原生但生態系支援較弱

### Implementation Notes
- 需建立 `front-end/vitest.server.config.ts` 專門用於 server 測試
- 測試檔案放置於 `front-end/server/__tests__/` 目錄
- 新增 npm scripts: `test:unit:domain`, `test:unit:application`

---

## 2. Domain Layer Testing Strategy

### Decision
Domain Layer 測試採用純函數測試模式，無需 mocking 框架。

### Rationale
- Domain Layer 根據 Clean Architecture 原則應為純函數，零框架依賴
- 現有程式碼結構（`server/domain/`）已符合此設計
- 純函數測試更快速、更可靠、更易維護

### Test Coverage Targets
依據 spec 要求，需覆蓋以下模組（目標 80%+）：
1. `domain/game/game.ts` - Game Aggregate
2. `domain/round/round.ts` - Round 實體
3. `domain/services/yakuDetectionService.ts` - 役種檢測（核心邏輯）
4. `domain/services/deckService.ts` - 牌組管理
5. `domain/services/matchingService.ts` - 配對邏輯
6. `domain/services/scoringService.ts` - 計分邏輯
7. `domain/services/specialRulesService.ts` - 特殊規則
8. `domain/services/roundTransitionService.ts` - 回合轉移

### Implementation Notes
- 優先測試 `yakuDetectionService.ts`（最複雜的業務邏輯）
- 使用 test fixtures 建立標準的卡片組合測試案例
- 測試應涵蓋所有 12 種標準役種的檢測

---

## 3. Application Layer Testing Strategy

### Decision
Application Layer 測試採用 mock/stub 模式隔離 Output Ports。

### Rationale
- Application Layer（Use Cases）依賴 Output Ports（Repository、EventPublisher 等）
- 使用 mock 可確保測試隔離性和可重複性
- 符合 Clean Architecture 的依賴反轉原則

### Test Coverage Targets
依據 spec 要求，需覆蓋以下 Use Cases（目標 80%+）：
1. `joinGameUseCase.ts`
2. `joinGameAsAiUseCase.ts`
3. `playHandCardUseCase.ts`
4. `selectTargetUseCase.ts`
5. `makeDecisionUseCase.ts`
6. `leaveGameUseCase.ts`
7. `autoActionUseCase.ts` - 處理玩家超時的自動操作
8. `confirmContinueUseCase.ts`

### Mocking Strategy
需 mock 的 Output Ports：
- `GameRepositoryPort` - 遊戲持久化
- `GameStorePort` - 記憶體存取
- `EventPublisherPort` - 事件發布
- `InternalEventPublisherPort` - 內部事件
- `GameTimeoutPort` - 超時管理
- `EventMapperPort` - 事件映射
- `PlayerStatsRepositoryPort` - 玩家統計

### Implementation Notes
- 使用 Vitest 內建的 `vi.fn()` 建立 mock
- 建立 `__tests__/mocks/` 目錄統一管理 mock 實作
- 每個 Use Case 測試應驗證：輸入處理、Domain 操作、事件發布

---

## 4. Logger Standardization

### Decision
審查並確保所有 Domain/Application 層使用 `loggers` 工廠函數。

### Rationale
- 現有 `server/utils/logger.ts` 已提供完整的結構化日誌功能
- 工廠函數 `loggers.domain()`, `loggers.useCase()` 已定義
- 需確保一致性使用，避免直接使用 `console.*`

### Current Logger Capabilities
依據程式碼分析，現有 logger 已支援：
- ISO 8601 時間戳 ✓
- 日誌等級（DEBUG/INFO/WARN/ERROR）✓
- 模組名稱標識 ✓
- Request ID 追蹤 ✓
- 結構化 JSON 資料 ✓
- 錯誤堆疊追蹤 ✓

### Implementation Notes
- 審查所有 Domain Services 和 Use Cases 的日誌使用
- 移除任何直接的 `console.*` 呼叫
- 確保關鍵業務事件都有適當的日誌記錄

---

## 5. GameLog Schema - Event Sourcing 設計

### Decision
採用 **Event Sourcing** 模式設計 GameLog，記錄最小必要資料以支援遊戲重播。

### Rationale
- Event Sourcing 是遊戲業界標準做法，支援：
  - 遊戲重播（Replay）
  - 問題追蹤與除錯
  - 稽核與作弊檢測
  - 分析與統計
- 最小化資料儲存，只記錄重建狀態所需的事件

### Schema Design（最小必要欄位）
```typescript
// gameLogs table
{
  id: uuid (primary key)
  gameId: uuid (indexed, 用於查詢特定遊戲的所有事件)
  playerId: varchar(100) (nullable, 系統事件沒有 playerId)
  eventType: varchar(100) // 事件類型識別
  payload: jsonb // 事件參數，足以重建狀態
  createdAt: timestamp with timezone (indexed with BRIN)
}
```

### Event Types（可重播的事件序列）
依據現有 protocol，需記錄以下事件：

| Event Type | Payload 內容 | 說明 |
|------------|--------------|------|
| `GAME_STARTED` | 初始發牌、親家、場牌 | 遊戲起點 |
| `CARD_PLAYED_FROM_HAND` | cardId, targetCardId? | 出牌動作 |
| `CARD_DRAWN` | cardId | 翻牌動作 |
| `SELECTION_MADE` | sourceCardId, targetCardId | 配對選擇（雙配對時） |
| `DECISION_MADE` | decision (KOI_KOI/END_ROUND) | Koi-Koi 決策 |
| `ROUND_ENDED` | scores, winner, yakus | 回合結算 |
| `GAME_FINISHED` | finalScores, winner | 遊戲結束 |

### Data Retention
- 保留 30 天後自動清理（透過 PostgreSQL partition drop 或 scheduled job）

---

## 6. 高效能日誌寫入技術

### Decision
採用 **Append-only + BRIN Index + Time Partitioning + Async Writes** 組合。

### Rationale
確保日誌寫入不影響遊戲效能（< 10ms 延遲要求）。

### 技術策略

#### 6.1 Append-only 設計
- Event Sourcing 天然為 append-only（只有 INSERT，無 UPDATE/DELETE）
- PostgreSQL 對 append-only 寫入有極佳優化
- 無需處理行鎖競爭

#### 6.2 BRIN Index（Block Range Index）
```sql
CREATE INDEX idx_game_logs_created_at ON game_logs
  USING BRIN (created_at) WITH (pages_per_range = 128);
```
- 比 B-tree 小約 100 倍
- 專為時序資料設計
- 適合按時間範圍查詢

#### 6.3 Time-based Partitioning
```sql
CREATE TABLE game_logs (
  ...
) PARTITION BY RANGE (created_at);

-- 每週一個分區
CREATE TABLE game_logs_2025_w01 PARTITION OF game_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-01-08');
```
- 配合 30 天保留策略，直接 DROP 過期分區
- 查詢時自動 partition pruning
- 減少 vacuum 負擔

#### 6.4 Async Fire-and-Forget Writes
```typescript
// 不等待寫入完成
db.insert(gameLogs).values(log)
  .catch(err => console.error('Game log write failed', err))
```
- 主遊戲流程不阻塞
- 寫入失敗時僅記錄錯誤，不影響遊戲

#### 6.5 Optional: Unlogged Table（進階選項）
```sql
CREATE UNLOGGED TABLE game_logs (...);
```
- 跳過 WAL（Write-Ahead Log），寫入速度提升 2-3 倍
- **風險**：資料庫 crash 時會丟失資料
- **適用情境**：如果日誌丟失可接受，或有其他備份機制

### Performance Expectation
- 單次 INSERT 延遲：< 1ms（async 後對主流程影響趨近 0）
- 批量查詢（單場遊戲）：< 10ms（透過 gameId index）

---

## 7. Vitest Server Configuration

### Decision
建立獨立的 Vitest 配置用於 server 測試。

### Configuration Details
```typescript
// vitest.server.config.ts
export default defineConfig({
  test: {
    include: ['server/**/*.test.ts'],
    environment: 'node', // 非 jsdom
    coverage: {
      include: ['server/domain/**', 'server/application/**'],
      exclude: ['server/adapters/**', 'server/api/**'],
      thresholds: {
        'server/domain': { lines: 80 },
        'server/application': { lines: 80 }
      }
    }
  }
})
```

### NPM Scripts
```json
{
  "test:unit:domain": "vitest run --config vitest.server.config.ts --dir server/domain",
  "test:unit:application": "vitest run --config vitest.server.config.ts --dir server/application",
  "test:unit:server": "vitest run --config vitest.server.config.ts"
}
```

---

## Summary

| 項目 | 決策 |
|------|------|
| 測試框架 | Vitest（與前端一致） |
| Domain 測試 | 純函數測試，無需 mock |
| Application 測試 | Mock Output Ports |
| Logger | 統一使用 `loggers.*` 工廠函數 |
| GameLog Schema | Event Sourcing 最小資料設計 |
| 寫入效能 | Append-only + BRIN + Partitioning + Async |

所有技術決策均基於：
1. 現有專案架構和技術棧
2. Constitution 原則
3. Spec 中定義的具體需求和成功標準
4. 業界最佳實踐（Event Sourcing for game replay）

無需額外釐清事項，可直接進入 Phase 1 設計階段。

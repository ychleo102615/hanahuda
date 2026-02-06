# Research: 遊戲私房功能

**Feature**: 013-private-room
**Date**: 2026-02-05

## Overview

此研究文件記錄私房功能實作前的技術調查結果。由於技術棧已確定（Nuxt 4 + TypeScript），主要研究重點為：
1. 現有 Matchmaking BC 模式分析
2. Room ID 生成策略
3. 超時管理機制
4. SSE 事件擴展方案

---

## R-001: Matchmaking BC 現有模式

### 調查結果

現有 Matchmaking BC 結構：
```
matchmaking/
├── domain/
│   ├── matchmakingPool.ts      # Aggregate Root - 管理配對佇列
│   ├── matchmakingEntry.ts     # Entity - 等待配對的玩家
│   ├── matchResult.ts          # Value Object - 配對結果
│   └── matchmakingEvents.ts    # Domain Events
├── application/
│   ├── ports/
│   │   ├── input/              # Use Case 介面
│   │   └── output/             # Repository/Event Publisher 介面
│   └── use-cases/
│       ├── enterMatchmakingUseCase.ts
│       └── processMatchmakingUseCase.ts
└── adapters/
    ├── persistence/            # In-Memory 實作
    ├── event-publisher/        # Event Bus Adapter
    └── registry/               # 配對計時器管理
```

### 決策

**採用相同的分層架構模式**：
- `PrivateRoom` 作為獨立 Aggregate Root（不影響現有 `MatchmakingPool`）
- 共用 `MatchResult` Value Object（擴展 MatchType）
- 共用 Event Publisher Port（發布 MATCH_FOUND 事件）

**理由**：
1. 一致性：與現有程式碼風格一致
2. 整合性：共用事件機制，GameCreationHandler 無需修改
3. 可維護性：熟悉的模式降低學習成本

**替代方案考慮**：
- 建立獨立 BC：增加複雜度，對目前規模過度設計

---

## R-002: Room ID 生成策略

### 調查結果

需求：
- 6 位英數混合字元
- 易於口頭分享（避免混淆字元）
- 唯一性保證

常見方案：
1. **UUID 截取**: 取 UUID 前 6 位
2. **NanoID**: 專為 URL-safe 設計的 ID 生成器
3. **自定義字元集**: 排除混淆字元 (0/O, 1/I/l)

### 決策

**使用 NanoID + 自定義字元集**：
```typescript
import { customAlphabet } from 'nanoid'

// 排除混淆字元: 0, O, 1, I, l
const ROOM_ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const generateRoomId = customAlphabet(ROOM_ID_ALPHABET, 6)
```

**理由**：
1. 避免混淆：排除易混淆字元，提升使用者體驗
2. 碰撞機率低：32^6 = ~10億種組合，足夠使用
3. 輕量：nanoid 無依賴，體積小

**替代方案考慮**：
- UUID: 太長，不便於口頭分享
- 自增 ID: 可預測，有安全風險

---

## R-003: 超時管理機制

### 調查結果

現有機制參考：
- `MatchmakingRegistry`: 使用 `setTimeout` 管理配對超時 (15秒)
- `GameTimeoutManager`: 使用 `setTimeout` 管理回合超時

私房超時需求：
- 房間 10 分鐘過期自動解散
- 房主斷線 30 秒後自動解散
- 剩餘 2 分鐘時發送提醒

### 決策

**建立 `PrivateRoomTimeoutManager`**：
```typescript
class PrivateRoomTimeoutManager {
  // 房間過期計時器 Map<roomId, timeoutId>
  private expirationTimers: Map<string, NodeJS.Timeout>
  // 斷線計時器 Map<playerId, timeoutId>
  private disconnectionTimers: Map<string, NodeJS.Timeout>
  // 提醒計時器 Map<roomId, timeoutId>
  private warningTimers: Map<string, NodeJS.Timeout>

  setExpirationTimeout(roomId: string, onExpire: () => void): void
  setDisconnectionTimeout(playerId: string, onDisconnect: () => void): void
  setWarningTimeout(roomId: string, onWarning: () => void): void
  clearAllTimeouts(roomId: string): void
}
```

**理由**：
1. 職責分離：獨立於配對超時管理
2. 可測試性：可 mock 計時器
3. 記憶體管理：集中管理計時器，避免洩漏

**替代方案考慮**：
- 合併至 GameTimeoutManager: 職責不同，會增加耦合

---

## R-004: SSE 事件擴展

### 調查結果

現有 SSE 事件架構：
```typescript
// playerEventBus.ts
export function createMatchmakingEvent(type: string, payload: object): GatewayEvent
export function createGameEvent(type: string, payload: object): GatewayEvent
```

現有 Matchmaking 事件類型：
- `MatchFound`: 配對成功通知
- `MatchFailed`: 配對失敗通知
- `MatchmakingStatus`: 配對狀態更新

### 決策

**最小化新增事件，重用現有 `MatchFound` 機制**：

沿用現有配對流程：玩家建立房間後立即導航至 Game Page，在 Game Page 建立 SSE 連線接收事件。

```typescript
// 新增事件類型（僅 2 個）
type PrivateRoomEventType =
  | 'RoomDissolved'    // 房間解散
  | 'RoomExpiring'     // 房間即將過期 (2分鐘警告)

// 重用現有事件
// MatchFound — 訪客加入後，私房滿人觸發（與普通配對相同）

// 使用現有的 createMatchmakingEvent 建立事件
function createPrivateRoomEvent(type: PrivateRoomEventType, payload: object): GatewayEvent {
  return createMatchmakingEvent(type, payload)
}
```

**移除的事件**：
- ~~`RoomCreated`~~：HTTP response 已回傳 `roomId`、`shareUrl`、`expiresAt`，無需 SSE 重複通知
- ~~`RoomJoined`~~：訪客加入即觸發 `MatchFound`，房主直接收到配對成功通知，不需要額外的「有人加入」事件

**理由**：
1. 一致性：使用現有的事件建立機制，沿用配對流程的 UX 模式
2. 最小化：只新增無法透過 HTTP response 或現有事件覆蓋的事件
3. 流程對齊：房主在 Game Page 等待 → 收到 `MatchFound` → 遊戲開始，與普通配對體驗一致

**替代方案考慮**：
- 新建 Event Bus: 過度設計，增加複雜度
- 新增 RoomCreated/RoomJoined 事件：資訊已被 HTTP response 和 MatchFound 覆蓋，屬於冗餘

---

## R-005: 玩家狀態互斥檢查

### 調查結果

現有機制：
- `PlayerGameStatusPort.hasActiveGame(playerId)`: 檢查是否有進行中的遊戲
- `MatchmakingPool.hasPlayer(playerId)`: 檢查是否在配對佇列中

私房需求：
- 玩家不能同時在私房和配對佇列
- 玩家不能同時在多個私房
- 玩家不能同時在私房和進行中的遊戲

### 決策

**擴展 `PlayerGameStatusPort`**：
```typescript
abstract class PlayerGameStatusPort {
  abstract hasActiveGame(playerId: string): Promise<boolean>
  // 新增：檢查是否在私房中
  abstract hasActivePrivateRoom(playerId: string): Promise<boolean>
}
```

**在 Use Case 中組合檢查**：
```typescript
// CreatePrivateRoomUseCase
async execute(input) {
  // 1. 檢查是否有進行中的遊戲
  if (await this.playerGameStatusPort.hasActiveGame(input.playerId)) {
    return { error: 'PLAYER_IN_GAME' }
  }
  // 2. 檢查是否在配對佇列中
  if (await this.matchmakingPoolPort.hasPlayer(input.playerId)) {
    return { error: 'PLAYER_IN_MATCHMAKING' }
  }
  // 3. 檢查是否在其他私房中
  if (await this.privateRoomRepositoryPort.findByPlayerId(input.playerId)) {
    return { error: 'PLAYER_IN_ROOM' }
  }
  // ... 建立房間
}
```

**理由**：
1. 單一職責：每個 Port 負責自己的狀態查詢
2. 業務規則集中：Use Case 中明確表達互斥邏輯
3. 可測試：易於 mock 各個 Port

---

## R-006: SSE 連線同步機制

### 調查結果

**問題**：
普通配對流程中，雙方都已在 Game Page 建立 SSE 連線後，後端才配對成功並觸發 MATCH_FOUND，因此雙方都能收到完整的遊戲首發事件（GameStarted、RoundDealt）。

私房流程不同——訪客 POST /join 時，後端若立即觸發 MATCH_FOUND，訪客的 SSE 尚未建立（還在等 HTTP response → navigateTo('/game') → SSE 連線），會錯過首發事件。

**現有遊戲啟動流程分析**（`gameStartService.ts`）：
1. Player2 加入 → 狀態變為 STARTING
2. **延遲 1000ms** → `executeGameStart()`
3. 發牌 → 發布 `GameStarted` + `RoundDealt`（每玩家版本）

1000ms 的延遲不足以可靠地等待訪客完成頁面導航 + SSE 建立。

**現有基礎設施**：
- `playerConnectionManager.isConnected(playerId)`: 已存在，可查詢玩家是否有活躍 SSE 連線
- `events.get.ts`: SSE 連線建立後查詢玩家狀態，已有分支邏輯（IN_GAME → GameSnapshotRestore）

### 決策

**引入 `FULL` 中間狀態 + `startPrivateRoomGameUseCase`**：

```typescript
// 狀態轉換
// WAITING → FULL: 訪客 POST /join（不觸發 MATCH_FOUND）
// FULL → IN_GAME: 雙方 SSE 就位後觸發 MATCH_FOUND

// 新增 Output Port
abstract class PlayerConnectionPort {
  /** 查詢玩家是否有活躍 SSE 連線 */
  abstract isConnected(playerId: string): boolean
}

// 新增 Use Case
class StartPrivateRoomGameUseCase {
  constructor(
    private privateRoomRepo: PrivateRoomRepositoryPort,
    private playerConnectionPort: PlayerConnectionPort,
    private matchmakingEventPublisher: MatchmakingEventPublisherPort,
  ) {}

  async execute(playerId: string): Promise<void> {
    const room = await this.privateRoomRepo.findByPlayerId(playerId)
    if (!room || room.status !== 'FULL') return

    const hostConnected = this.playerConnectionPort.isConnected(room.hostId)
    const guestConnected = this.playerConnectionPort.isConnected(room.guestId!)
    if (!hostConnected || !guestConnected) return

    // 雙方就位，發布 MATCH_FOUND
    room.status = 'IN_GAME'
    await this.privateRoomRepo.save(room)
    await this.matchmakingEventPublisher.publishMatchFound({
      player1Id: room.hostId,
      player1Name: room.hostName,
      player2Id: room.guestId!,
      player2Name: room.guestName!,
      roomType: room.roomType,
      matchType: 'PRIVATE',
      matchedAt: new Date(),
    })
  }
}
```

**觸發點**：`events.get.ts` 中 SSE 連線建立後，`playerStatusService` 偵測玩家在 FULL 房間時呼叫此 use case。

**理由**：
1. 確保雙方都能收到完整的遊戲首發事件（GameStarted、RoundDealt 發牌動畫）
2. 不修改現有 GameCreationHandler 或 GameStartService
3. 複用 `playerConnectionManager.isConnected()` 現有能力
4. 無論房主或訪客的 SSE 誰先就位，都能正確觸發

**替代方案考慮**：
- 依賴 GameSnapshotRestore 恢復：功能正確但訪客錯過發牌動畫，體驗斷裂
- 前端等待後手動呼叫 /ready API：多一次 HTTP 往返，增加複雜度

---

## Summary

| 研究項目 | 決策 | 影響範圍 |
|---------|------|---------|
| R-001 | 採用相同分層架構 | Domain/Application/Adapter 結構 |
| R-002 | NanoID + 自定義字元集 | Room ID 生成 |
| R-003 | 獨立 TimeoutManager | 超時管理 |
| R-004 | 使用現有事件機制 | SSE 事件 |
| R-005 | 擴展 PlayerGameStatusPort | 狀態互斥檢查 |
| R-006 | FULL 狀態 + SSE 同步觸發 | 遊戲啟動時序 |

所有 NEEDS CLARIFICATION 已解決，可進入 Phase 1: Design & Contracts。

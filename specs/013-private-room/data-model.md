# Data Model: 遊戲私房功能

**Feature**: 013-private-room
**Date**: 2026-02-05

## Overview

此文件定義私房功能的領域模型，包含實體、值物件、聚合根及其關係。

---

## Aggregates

### PrivateRoom (Aggregate Root)

代表一個私人遊戲房間。

```typescript
/**
 * Private Room Aggregate Root
 *
 * 業務規則:
 * - 房間建立時產生唯一 Room ID (6 位英數字元)
 * - 房間有效期限為 10 分鐘
 * - 房間最多容納 2 位玩家
 * - 只有房主可以解散房間
 * - 房間滿人後等待雙方 SSE 連線就位，再轉換為遊戲狀態
 */
interface PrivateRoom {
  // Identity
  readonly id: string                    // UUID - 內部識別碼
  readonly roomId: string                // 6 位英數字元 - 分享用 ID

  // State
  status: PrivateRoomStatus              // 房間狀態
  readonly hostId: string                // 房主 ID
  readonly hostName: string              // 房主名稱
  guestId: string | null                 // 訪客 ID (加入後填入)
  guestName: string | null               // 訪客名稱

  // Configuration
  readonly roomType: RoomTypeId          // 遊戲場數規則 (SINGLE/QUICK/STANDARD/MARATHON)

  // Timestamps
  readonly createdAt: Date               // 建立時間
  readonly expiresAt: Date               // 過期時間 (createdAt + 10 minutes)

  // Derived (optional, for Game integration)
  gameId: string | null                  // 遊戲開始後的 Game ID
}
```

### State Transitions

```
                    ┌─────────────┐
                    │   WAITING   │ ← 初始狀態 (房主建立房間)
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │   FULL   │    │ EXPIRED  │    │ DISSOLVED│
    └─────┬────┘    └──────────┘    └──────────┘
          │         (10分鐘過期)     (房主解散)
          │
          ▼
    ┌──────────┐
    │ IN_GAME  │
    └──────────┘
    (雙方 SSE 就位)
```

```typescript
type PrivateRoomStatus =
  | 'WAITING'    // 等待訪客加入
  | 'FULL'       // 訪客已加入，等待雙方 SSE 連線就位
  | 'IN_GAME'    // 遊戲進行中
  | 'EXPIRED'    // 已過期
  | 'DISSOLVED'  // 已解散
```

**轉換規則**:
- `WAITING → FULL`: 訪客成功加入房間（尚未開始遊戲）
- `FULL → IN_GAME`: 雙方 SSE 連線就位，發布 MATCH_FOUND 事件
- `WAITING → EXPIRED`: 達到 10 分鐘期限
- `WAITING → DISSOLVED`: 房主主動解散 或 房主斷線超過 30 秒
- `FULL → EXPIRED`: 達到 10 分鐘期限（訪客加入但 SSE 未及時就位）
- `FULL → DISSOLVED`: 房主主動解散

---

## Value Objects

### RoomTypeId (Existing)

重用現有的房間類型定義。

```typescript
// shared/constants/roomTypes.ts (已存在)
type RoomTypeId = 'SINGLE' | 'QUICK' | 'STANDARD' | 'MARATHON'
```

---

## Extended Types

### MatchType (Existing - Extended)

擴展現有的配對類型。

```typescript
// Before
type MatchType = 'HUMAN' | 'BOT'

// After
type MatchType = 'HUMAN' | 'BOT' | 'PRIVATE'
```

### MatchFoundPayload (Existing - No Change)

現有的 MATCH_FOUND 事件 Payload 已支援私房使用，無需修改結構。

```typescript
interface MatchFoundPayload {
  readonly player1Id: string        // 房主 ID
  readonly player1Name: string      // 房主名稱
  readonly player2Id: string        // 訪客 ID
  readonly player2Name: string      // 訪客名稱
  readonly roomType: RoomTypeId     // 遊戲規則
  readonly matchType: MatchType     // 'PRIVATE'
  readonly matchedAt: Date          // 配對時間
}
```

---

## DTOs

### CreatePrivateRoomRequest

```typescript
interface CreatePrivateRoomRequest {
  readonly roomType: RoomTypeId      // 遊戲場數規則
}
```

### CreatePrivateRoomResponse

```typescript
interface CreatePrivateRoomResponse {
  readonly success: boolean
  readonly roomId?: string           // 房間 ID (成功時)
  readonly shareUrl?: string         // 分享連結 (成功時，由 API Adapter 層組裝)
  readonly expiresAt?: string        // ISO 8601 格式 (成功時)
  readonly error?: CreateRoomError   // 錯誤碼 (失敗時)
}

type CreateRoomError =
  | 'PLAYER_IN_GAME'           // 玩家有進行中的遊戲
  | 'PLAYER_IN_MATCHMAKING'    // 玩家在配對佇列中
  | 'PLAYER_IN_ROOM'           // 玩家已在其他房間中
  | 'UNAUTHORIZED'             // 未登入
```

### JoinPrivateRoomRequest

```typescript
interface JoinPrivateRoomRequest {
  readonly roomId: string            // 6 位房間 ID
}
```

### JoinPrivateRoomResponse

```typescript
interface JoinPrivateRoomResponse {
  readonly success: boolean
  readonly hostName?: string         // 房主名稱 (成功時)
  readonly error?: JoinRoomError     // 錯誤碼 (失敗時)
}
// 注意：遊戲 ID 透過 SSE MatchFound 事件通知，不在 API Response 中返回

type JoinRoomError =
  | 'ROOM_NOT_FOUND'           // 房間不存在
  | 'ROOM_EXPIRED'             // 房間已過期
  | 'ROOM_FULL'                // 房間已滿
  | 'ROOM_DISSOLVED'           // 房間已解散
  | 'PLAYER_IN_GAME'           // 玩家有進行中的遊戲
  | 'PLAYER_IN_MATCHMAKING'    // 玩家在配對佇列中
  | 'PLAYER_IN_ROOM'           // 玩家已在其他房間中
  | 'CANNOT_JOIN_OWN_ROOM'     // 不能加入自己的房間
  | 'UNAUTHORIZED'             // 未登入
```

### DissolvePrivateRoomRequest

```typescript
interface DissolvePrivateRoomRequest {
  readonly roomId: string            // 6 位房間 ID
}
```

### DissolvePrivateRoomResponse

```typescript
interface DissolvePrivateRoomResponse {
  readonly success: boolean
  readonly error?: DissolveRoomError // 錯誤碼 (失敗時)
}

type DissolveRoomError =
  | 'ROOM_NOT_FOUND'           // 房間不存在
  | 'NOT_HOST'                 // 不是房主，無權解散
  | 'ROOM_IN_GAME'             // 房間已在遊戲中，無法解散
  | 'UNAUTHORIZED'             // 未登入
```

### GetRoomStatusResponse

```typescript
interface GetRoomStatusResponse {
  readonly roomId: string
  readonly status: PrivateRoomStatus
  readonly hostId: string
  readonly hostName: string
  readonly guestId: string | null
  readonly guestName: string | null
  readonly roomType: RoomTypeId
  readonly expiresAt: string         // ISO 8601 格式
  readonly remainingSeconds: number  // 剩餘秒數
}
```

---

## SSE Events

### PrivateRoom Events

房主建立房間後立即導航至 Game Page，在 Game Page 建立 SSE 連線。
房間建立資訊（roomId、expiresAt）由 HTTP response 提供，shareUrl 由 API Adapter 層組裝，不需要 SSE 事件。
訪客加入後房間進入 FULL 狀態，等待雙方 SSE 連線就位後才觸發 `MatchFound`。
這確保雙方都能收到完整的遊戲首發事件（GameStarted、RoundDealt 等）。

```typescript
// 房間解散 (發送給房內玩家，主要是等待中的房主)
interface RoomDissolvedEvent {
  type: 'RoomDissolved'
  payload: {
    room_id: string
    reason: 'HOST_DISSOLVED' | 'HOST_DISCONNECTED' | 'EXPIRED'
  }
}

// 房間即將過期警告 (發送給房內玩家，主要是等待中的房主)
interface RoomExpiringEvent {
  type: 'RoomExpiring'
  payload: {
    room_id: string
    remaining_seconds: number    // 剩餘秒數 (< 120)
  }
}

// MatchFound (現有事件，重用) — 訪客加入使房間滿人時觸發
// 見 MatchFoundPayload（上方 Extended Types 區段）
```

---

## Repository Interface

### PrivateRoomRepositoryPort

```typescript
abstract class PrivateRoomRepositoryPort {
  /** 儲存房間 */
  abstract save(room: PrivateRoom): Promise<void>

  /** 依 Room ID 查詢 (6 位英數字元) */
  abstract findByRoomId(roomId: string): Promise<PrivateRoom | undefined>

  /** 依內部 ID 查詢 (UUID) */
  abstract findById(id: string): Promise<PrivateRoom | undefined>

  /** 依玩家 ID 查詢 (房主或訪客) */
  abstract findByPlayerId(playerId: string): Promise<PrivateRoom | undefined>

  /** 刪除房間 */
  abstract delete(id: string): Promise<void>

  /** 取得所有等待中的房間 (用於過期檢查) */
  abstract findAllWaiting(): Promise<PrivateRoom[]>

  /** 取得所有滿人的房間 (用於 FULL 狀態過期檢查) */
  abstract findAllFull(): Promise<PrivateRoom[]>
}
```

### PlayerConnectionPort

```typescript
/**
 * 查詢玩家 SSE 連線狀態的 Output Port
 *
 * 由 PlayerConnectionManager 實作
 */
abstract class PlayerConnectionPort {
  /** 查詢玩家是否有活躍 SSE 連線 */
  abstract isConnected(playerId: string): boolean
}
```

### PrivateRoomTimerPort

```typescript
/**
 * 私房計時器 Output Port
 *
 * UseCase 透過此 Port 操作計時器，避免直接依賴 Adapter 層的 TimeoutManager。
 * 由 PrivateRoomTimeoutManager (Adapter 層) 實作。
 * Timer 到期的 callback 在 DI 容器組裝時注入。
 */
abstract class PrivateRoomTimerPort {
  /** 設定房間過期計時器 (10 分鐘) */
  abstract setExpirationTimer(roomId: string, durationMs: number): void
  /** 設定即將過期警告計時器 (8 分鐘後) */
  abstract setWarningTimer(roomId: string, durationMs: number): void
  /** 設定房主斷線計時器 (30 秒) */
  abstract setDisconnectionTimer(playerId: string, durationMs: number): void
  /** 清除指定房間的所有計時器 */
  abstract clearTimers(roomId: string): void
  /** 清除指定玩家的斷線計時器 */
  abstract clearDisconnectionTimer(playerId: string): void
}
```

---

## Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                     Matchmaking BC                               │
│                                                                  │
│  ┌─────────────────┐         ┌─────────────────┐                │
│  │ MatchmakingPool │         │   PrivateRoom   │                │
│  │  (Aggregate)    │         │   (Aggregate)   │                │
│  └────────┬────────┘         └─────────────────┘                │
│           │                                                      │
│           │ has many                                             │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │MatchmakingEntry │                                            │
│  │   (Entity)      │                                            │
│  └─────────────────┘                                            │
│                                                                  │
│           └──────────────┬───────────────┘                      │
│                          │ both produce                         │
│                          ▼                                       │
│                 ┌─────────────────┐                             │
│                 │   MatchResult   │                             │
│                 │ (Value Object)  │                             │
│                 └────────┬────────┘                             │
│                          │ triggers                             │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼ MATCH_FOUND event
┌──────────────────────────────────────────────────────────────────┐
│                      Core-Game BC                                 │
│                                                                   │
│  ┌─────────────────┐         ┌─────────────────┐                 │
│  │GameCreationHdlr │────────▶│      Game       │                 │
│  │  (Subscriber)   │ creates │   (Aggregate)   │                 │
│  └─────────────────┘         └─────────────────┘                 │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

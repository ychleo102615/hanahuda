# Quickstart: 遊戲私房功能

**Feature**: 013-private-room
**Date**: 2026-02-05

## Overview

本指南說明如何快速開始開發私房功能。

---

## Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+ (開發環境可使用 Docker)

---

## Setup

### 1. 切換到功能分支

```bash
git checkout 013-private-room
```

### 2. 安裝依賴

```bash
pnpm --prefix front-end install
```

### 3. 啟動開發伺服器

```bash
pnpm --prefix front-end dev
```

---

## Key Files to Create/Modify

### Domain Layer (新增)

```
front-end/server/matchmaking/domain/
├── privateRoom.ts           # PrivateRoom Aggregate Root
└── roomParticipant.ts       # (可選) 如需要獨立 Entity
```

### Application Layer (新增)

```
front-end/server/matchmaking/application/
├── ports/
│   ├── input/
│   │   ├── createPrivateRoomInputPort.ts
│   │   ├── joinPrivateRoomInputPort.ts
│   │   ├── dissolvePrivateRoomInputPort.ts
│   │   └── startPrivateRoomGameInputPort.ts
│   └── output/
│       ├── privateRoomRepositoryPort.ts
│       └── playerConnectionPort.ts          # 查詢玩家 SSE 連線狀態
└── use-cases/
    ├── createPrivateRoomUseCase.ts
    ├── joinPrivateRoomUseCase.ts
    ├── dissolvePrivateRoomUseCase.ts
    └── startPrivateRoomGameUseCase.ts       # 雙方 SSE 就位後觸發 MATCH_FOUND
```

### Adapter Layer (新增)

```
front-end/server/matchmaking/adapters/
├── persistence/
│   └── inMemoryPrivateRoomStore.ts
├── timeout/
│   └── privateRoomTimeoutManager.ts
└── di/
    └── container.ts  # 擴展現有容器
```

### API Endpoints (新增)

```
front-end/server/api/private-room/
├── create.post.ts
├── [roomId]/
│   ├── join.post.ts
│   ├── dissolve.post.ts
│   └── status.get.ts
```

### Existing Files to Modify

```
front-end/server/shared/infrastructure/event-bus/types.ts
  - 擴展 MatchType: 'HUMAN' | 'BOT' | 'PRIVATE'

front-end/server/matchmaking/adapters/di/container.ts
  - 註冊私房相關依賴

front-end/server/gateway/playerStatusService.ts
  - 新增私房狀態檢查 (IN_PRIVATE_ROOM)

front-end/server/api/v1/events.get.ts
  - SSE 連線建立後，若玩家在 FULL 房間，呼叫 startPrivateRoomGameUseCase
```

---

## Development Workflow

### TDD Cycle

1. **Red**: 撰寫失敗的測試

```bash
# 執行測試 (會失敗)
pnpm --prefix front-end test:unit -- --filter=privateRoom
```

2. **Green**: 實作最小程式碼讓測試通過

3. **Refactor**: 改善程式碼品質

### 測試檔案結構

```
front-end/server/matchmaking/
├── domain/
│   └── __tests__/
│       └── privateRoom.spec.ts
└── application/
    └── use-cases/
        └── __tests__/
            ├── createPrivateRoomUseCase.spec.ts
            ├── joinPrivateRoomUseCase.spec.ts
            ├── dissolvePrivateRoomUseCase.spec.ts
            └── startPrivateRoomGameUseCase.spec.ts
```

---

## Quick Test Commands

```bash
# 執行所有測試
pnpm --prefix front-end test:unit

# 執行私房相關測試
pnpm --prefix front-end test:unit -- --filter=privateRoom

# 執行 Matchmaking BC 測試
pnpm --prefix front-end test:unit -- --filter=matchmaking

# 執行 lint
pnpm --prefix front-end lint
```

---

## API Testing (cURL)

### 建立房間

```bash
curl -X POST http://localhost:3000/api/private-room/create \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -d '{"roomType": "STANDARD"}'
```

### 加入房間

```bash
curl -X POST http://localhost:3000/api/private-room/ABC123/join \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

### 解散房間

```bash
curl -X POST http://localhost:3000/api/private-room/ABC123/dissolve \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

### 查詢房間狀態

```bash
curl http://localhost:3000/api/private-room/ABC123/status \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

---

## SSE Testing

訂閱 SSE 事件流：

```bash
curl -N http://localhost:3000/api/sse \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

預期事件：
- `RoomExpiring` - 剩餘 2 分鐘時（房主在 Game Page 等待時收到）
- `RoomDissolved` - 房間解散時（過期/房主解散/房主斷線）
- `MatchFound` - 雙方 SSE 就位後，遊戲開始時（與普通配對相同格式）

---

## Key Interfaces

### PrivateRoom Aggregate

```typescript
interface PrivateRoom {
  readonly id: string              // UUID
  readonly roomId: string          // 6 位英數字元
  status: PrivateRoomStatus
  readonly hostId: string
  readonly hostName: string
  guestId: string | null
  guestName: string | null
  readonly roomType: RoomTypeId
  readonly createdAt: Date
  readonly expiresAt: Date
  gameId: string | null
}

type PrivateRoomStatus = 'WAITING' | 'FULL' | 'IN_GAME' | 'EXPIRED' | 'DISSOLVED'
```

### Use Case Input/Output

```typescript
// CreatePrivateRoomUseCase
interface CreatePrivateRoomInput {
  playerId: string
  playerName: string
  roomType: RoomTypeId
}

interface CreatePrivateRoomOutput {
  success: boolean
  roomId?: string
  shareUrl?: string
  expiresAt?: Date
  error?: CreateRoomError
}
```

---

## References

- [spec.md](./spec.md) - 功能規格
- [data-model.md](./data-model.md) - 資料模型
- [contracts/private-room-api.yaml](./contracts/private-room-api.yaml) - REST API 契約
- [contracts/private-room-events.yaml](./contracts/private-room-events.yaml) - SSE 事件契約
- [research.md](./research.md) - 技術研究

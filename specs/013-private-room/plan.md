# Implementation Plan: 遊戲私房功能

**Branch**: `013-private-room` | **Date**: 2026-02-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-private-room/spec.md`

## Summary

實作私人房間功能，讓玩家可以建立專屬遊戲房間並透過 Room ID 或連結邀請好友加入。作為 Matchmaking BC 的擴展，新增 `PrivateRoom` Aggregate Root，並重用現有的 `MATCH_FOUND` 事件機制整合 Core-Game BC。

## Technical Context

**Language/Version**: TypeScript 5.x (Nuxt 4 / Vue 3)
**Primary Dependencies**: Nuxt 4, Vue 3, Pinia, Drizzle ORM, Tailwind CSS v4
**Storage**: PostgreSQL 14+ (透過 Drizzle ORM), In-Memory Store (活躍房間)
**Testing**: Vitest (單元測試 + 整合測試)
**Target Platform**: Web (SSR + SPA)
**Project Type**: Web application (前後端整合於 Nuxt 4)
**Performance Goals**: 房間建立 <5s, 加入房間 <3s, 遊戲啟動 <2s (spec SC-001~003)
**Constraints**: 房間有效期限 10 分鐘, 房主斷線 30 秒後自動解散
**Scale/Scope**: 與現有配對系統相同規模 (100+ 並發遊戲)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 狀態 | 說明 |
|------|------|------|
| I. Clean Architecture | ✅ Pass | 遵循 Domain → Application → Adapter 分層 |
| II. Domain-Driven Development | ✅ Pass | 新增 PrivateRoom Aggregate 於 Matchmaking BC |
| III. Server Authority | ✅ Pass | 所有房間邏輯在伺服器端，客戶端僅渲染狀態 |
| IV. Command-Event Architecture | ✅ Pass | REST API (Commands) + SSE (Events) |
| V. Test-First Development | ✅ Pass | Domain/Application Layer 需 >80% 覆蓋率 |
| VI. Bounded Context Isolation | ✅ Pass | 透過 DTOs 與現有 BC 通訊，不暴露 Domain Model |
| VII. Microservice-Ready Design | ✅ Pass | 使用 UUID 作為 Room ID，無狀態 API 設計 |
| VIII. API Contract Adherence | ✅ Pass | 新增 API 將遵循 protocol.md 規範 |

**Gate 結果**: ✅ 全部通過，無需複雜度證明

## Flow Decision

**決策：沿用現有配對模式，建立房間後立即導航至 Game Page。**

房主和訪客都在 Game Page 建立 SSE 連線、等待事件。這與現有配對流程（Lobby → POST enter → navigate to /game → SSE）完全一致。

**與普通配對的關鍵差異**：訪客加入時不立即觸發 MATCH_FOUND，而是等待雙方 SSE 連線就位後再觸發。這確保雙方都能收到完整的遊戲首發事件（GameStarted、RoundDealt 等），避免訪客錯過發牌動畫。

**移除的 SSE 事件**：
- ~~`RoomCreated`~~：HTTP response 已回傳 roomId、shareUrl、expiresAt
- ~~`RoomJoined`~~：FULL 狀態 + SSE 就位後直接觸發 MatchFound，不需要中間事件

**保留的 SSE 事件**：
- `RoomExpiring`：剩餘 <2 分鐘時提醒房主
- `RoomDissolved`：房間過期/解散/房主斷線時通知
- `MatchFound`（現有，重用）：雙方 SSE 就位後觸發

### 房主建立房間流程

```
Lobby
  → 點擊「建立房間」→ 選擇場數規則
  → POST /api/private-room/create
  → HTTP response: { roomId, shareUrl, expiresAt }
  → navigateTo('/game')
  → Game Page 建立 SSE 連線
  → GatewayConnected { status: 'IN_PRIVATE_ROOM', roomId, ... }
  → 顯示等待畫面（roomId、shareUrl、倒數計時）
  → 等待事件:
      RoomExpiring  → 顯示即將過期提醒
      RoomDissolved → 房間結束，返回大廳
      MatchFound    → 對手已就位，遊戲開始
```

### 訪客透過 ID 加入流程

```
Lobby
  → 輸入房間 ID
  → POST /api/private-room/{roomId}/join
  → HTTP response: { success, hostName }
  → navigateTo('/game')
  → Game Page 建立 SSE 連線
  → GatewayConnected { status: 'IN_PRIVATE_ROOM', roomId, ... }
  → 後端偵測雙方 SSE 就位 → 觸發 MATCH_FOUND
  → 雙方收到 MatchFound → GameStarted → RoundDealt → 遊戲開始
```

### 訪客透過連結加入流程

```
點擊連結 → /room/{roomId}
  → (若未登入 → 導向登入 → 登入後回來)
  → POST /api/private-room/{roomId}/join
  → HTTP response: { success, hostName }
  → navigateTo('/game')
  → (同上：SSE 連線 → 雙方就位 → 遊戲開始)
```

### 房主解散房間流程

```
Game Page (等待畫面)
  → 點擊「解散房間」
  → POST /api/private-room/{roomId}/dissolve
  → HTTP response: { success }
  → navigateTo('/') (返回大廳)
```

### SSE 連線同步機制

**問題**：若訪客加入時立即觸發 MATCH_FOUND，訪客的 SSE 尚未建立，會錯過遊戲首發事件（GameStarted、RoundDealt）。

**解決方案**：引入 `FULL` 中間狀態 + `startPrivateRoomGameUseCase`。

```
訪客 POST /join
  → joinPrivateRoomUseCase: 加入房間，狀態 WAITING → FULL（不觸發 MATCH_FOUND）
  → HTTP 200 回傳

訪客 navigateTo('/game') → SSE 連線建立
  → events.get.ts: playerStatusService 偵測玩家在 FULL 房間
  → 呼叫 startPrivateRoomGameUseCase
  → 檢查: playerConnectionManager.isConnected(hostId) && isConnected(guestId)
  → 雙方都連線 → 發布 MATCH_FOUND → GameCreationHandler 建立遊戲
  → 雙方同時收到 MatchFound → GameStarted → RoundDealt ✅
```

**反向競態（房主 SSE 較慢）**：

```
訪客 SSE 先建立 → 房間 FULL → 檢查雙方連線 → 房主未連線 → 不觸發
房主 SSE 後建立 → 房間 FULL → 檢查雙方連線 → 雙方都連線 → 觸發 ✅
```

每次 SSE 連線建立都會檢查，無論誰先誰後都能正確觸發。

## Project Structure

### Documentation (this feature)

```text
specs/013-private-room/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── private-room-api.yaml
└── tasks.md             # Phase 2 output (by /speckit.tasks)
```

### Source Code (repository root)

```text
front-end/
├── app/                          # 前端 Game-Client BC
│   ├── pages/
│   │   └── room/
│   │       └── [roomId].vue      # 新增：連結加入的中繼頁面 (POST join → redirect /game)
│   └── game-client/
│       └── adapter/
│           ├── components/
│           │   └── PrivateRoomPanel.vue  # 新增：Game Page 等待畫面 (顯示 roomId/shareUrl/倒數)
│           └── stores/
│               └── privateRoomStore.ts   # 新增：私房狀態管理 (roomId/shareUrl/expiresAt)
│
└── server/
    └── matchmaking/              # 後端 Matchmaking BC (擴展)
        ├── domain/
        │   ├── privateRoom.ts           # 新增：私房 Aggregate Root (含 shareUrl 衍生方法)
        │   └── matchResult.ts           # 擴展：加入 PRIVATE 類型
        ├── application/
        │   ├── ports/
        │   │   ├── input/
        │   │   │   ├── createPrivateRoomInputPort.ts    # 新增
        │   │   │   ├── joinPrivateRoomInputPort.ts      # 新增
        │   │   │   ├── dissolvePrivateRoomInputPort.ts  # 新增
        │   │   │   └── startPrivateRoomGameInputPort.ts # 新增
        │   │   └── output/
        │   │       ├── privateRoomRepositoryPort.ts     # 新增
        │   │       └── playerConnectionPort.ts          # 新增：查詢玩家 SSE 連線狀態
        │   └── use-cases/
        │       ├── createPrivateRoomUseCase.ts    # 新增
        │       ├── joinPrivateRoomUseCase.ts      # 新增
        │       ├── dissolvePrivateRoomUseCase.ts  # 新增
        │       └── startPrivateRoomGameUseCase.ts # 新增：雙方 SSE 就位後觸發 MATCH_FOUND
        └── adapters/
            ├── persistence/
            │   └── inMemoryPrivateRoomStore.ts    # 新增
            ├── timeout/
            │   └── privateRoomTimeoutManager.ts   # 新增
            └── di/
                └── container.ts                   # 擴展：註冊私房相關依賴

front-end/server/api/
└── private-room/
    ├── create.post.ts      # 新增：建立房間 API
    ├── [roomId]/
    │   ├── join.post.ts    # 新增：加入房間 API
    │   ├── dissolve.post.ts # 新增：解散房間 API
    │   └── status.get.ts   # 新增：查詢房間狀態 API
    └── index.ts            # 新增：API 路由設定
```

**Structure Decision**: 採用現有 Nuxt 4 專案結構，在 Matchmaking BC 下擴展私房功能。前端新增專用頁面和狀態管理，後端新增 Domain/Application/Adapter 層級的私房相關模組。

## Constitution Check (Post-Design)

*Re-validation after Phase 1 design completion.*

| 原則 | 狀態 | 設計驗證 |
|------|------|---------|
| I. Clean Architecture | ✅ Pass | Domain (privateRoom.ts) → Application (use-cases/) → Adapter (adapters/) |
| II. DDD | ✅ Pass | PrivateRoom Aggregate Root、RoomInvitation Value Object |
| III. Server Authority | ✅ Pass | 所有房間狀態由伺服器管理，前端僅透過 SSE 接收狀態 |
| IV. Command-Event | ✅ Pass | REST API (create/join/dissolve) + SSE Events (RoomDissolved/RoomExpiring/MatchFound) |
| V. Test-First | ✅ Pass | Domain/Application 測試結構已定義於 quickstart.md |
| VI. BC Isolation | ✅ Pass | DTOs 定義於 data-model.md，不暴露 Domain Model |
| VII. Microservice-Ready | ✅ Pass | UUID (internal id) + NanoID (roomId)，無狀態 API |
| VIII. API Contract | ✅ Pass | OpenAPI 3.0 契約已定義於 contracts/private-room-api.yaml |

**Post-Design 結果**: ✅ 全部通過

## Complexity Tracking

> 無違反需要證明 - 設計完全符合憲法原則

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

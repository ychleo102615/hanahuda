# Implementation Plan: 遊戲大廳與操作面板

**Branch**: `007-lobby-settings-panel` | **Date**: 2025-11-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-lobby-settings-panel/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

實作遊戲大廳（Game Lobby）作為首頁與遊戲畫面之間的中轉畫面，提供「Find Match」配對功能。同時建立從螢幕右側滑出的操作面板（Action Panel），根據當前畫面（大廳或遊戲中）動態顯示不同操作選項（返回首頁、退出遊戲等）。此功能屬於前端 User Interface BC 的 Adapter Layer（Vue 組件與路由）與 Application Layer（配對狀態管理）。

## Technical Context

**Language/Version**: TypeScript 5.9
**Primary Dependencies**: Vue 3.5, Pinia (狀態管理), @vueuse/motion (動畫), Vue Router (NEEDS CLARIFICATION: 現有路由結構)
**Storage**: N/A (前端功能，狀態由 Pinia store 管理)
**Testing**: Vitest (單元測試), Vue Test Utils (組件測試)
**Target Platform**: Web (現代瀏覽器，支援 ES2020+)
**Project Type**: Web application (前端 Vue SPA)
**Performance Goals**:
- 操作面板滑出/滑回動畫流暢 (60fps)
- 配對狀態更新即時 (<100ms)
- 路由切換順暢 (<200ms)
**Constraints**:
- 必須與現有 SSE 事件處理機制整合 (NEEDS CLARIFICATION: 現有 SSE 處理架構)
- 必須與現有命令發送機制整合 (NEEDS CLARIFICATION: GameRequestJoin 發送方式)
- 斷線重連時需跳過大廳直接進入遊戲 (NEEDS CLARIFICATION: 現有重連機制)
- 操作面板不得影響遊戲畫面效能
- 響應式設計，支援手機與桌面
**Scale/Scope**:
- 新增 2 個主要 Vue 組件（GameLobby, ActionPanel）
- 新增 1 個 Pinia store (matchmakingStore) (NEEDS CLARIFICATION: 是否需要新 store 或擴充現有 store)
- 修改現有路由配置
- 整合現有 SSE 事件處理 (GameStarted)
- 整合現有命令發送 (GameRequestJoin)

### 需研究的技術細節

以下項目標記為 NEEDS CLARIFICATION，將在 Phase 0 研究階段解決：

1. **現有路由結構**: Vue Router 配置位置、現有路由定義、導航守衛使用情況
2. **現有 SSE 事件處理機制**: 如何訂閱 GameStarted 事件、事件處理位置（store/composable）
3. **現有命令發送機制**: GameRequestJoin 命令如何發送、API endpoint、請求格式
4. **現有重連機制**: ReconnectionBanner 實作方式、如何判斷是重連情境、如何恢復遊戲狀態
5. **現有動畫模式**: @vueuse/motion 使用範例、專案慣用的動畫設定
6. **現有 Pinia store 結構**: store 命名慣例、是否需要新 store 或擴充現有 gameStore
7. **現有組件架構**: TopInfoBar 位置與實作、是否需調整以容納操作選單按鈕
8. **前端專案結構**: 組件放置位置 (src/components/)、composables 位置、store 位置

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Clean Architecture ✅

**評估**: 通過
- **Domain Layer**: N/A（此功能無需 Domain 邏輯，純 UI 導航與狀態管理）
- **Application Layer**: 配對狀態管理邏輯（等待配對、配對中、超時處理）
  - 可能需要 Use Case: HandleMatchmakingTimeout
  - 需整合現有 SSE 事件處理（GameStarted）
- **Adapter Layer**:
  - Vue 組件（GameLobby.vue, ActionPanel.vue）
  - Vue Router 路由配置
  - Pinia store（配對狀態）
  - REST API 整合（GameRequestJoin 命令）

**依賴方向**: Adapter → Application（Pinia store 使用 Use Cases）→ Domain（N/A）
**結論**: 符合 Clean Architecture 分層原則

---

### II. Domain-Driven Development ✅

**評估**: 通過
- **Bounded Context**: 屬於 User Interface BC（遊戲 UI 呈現層）
- **通用語言**:
  - Game Lobby（遊戲大廳）- 符合領域術語
  - Action Panel（操作面板）- 符合領域術語
  - Matchmaking（配對）- 符合領域術語
- **實體識別**:
  - MatchmakingState（配對狀態）- Value Object
  - ActionPanelItem（操作選項）- Value Object
- **無跨 BC 依賴**: 所有邏輯限於 User Interface BC

**結論**: 符合 DDD 原則，使用正確的通用語言

---

### III. Server Authority ✅

**評估**: 通過
- **伺服器權威**:
  - ✅ 配對流程由伺服器控制（GameRequestJoin → GameStarted）
  - ✅ 客戶端僅發送命令，接收事件
  - ✅ 客戶端不執行遊戲邏輯驗證
- **UI 提示驗證例外**: N/A（無需客戶端驗證邏輯）
- **狀態來源**: 伺服器透過 GameStarted 事件推送遊戲開始狀態

**結論**: 完全符合 Server Authority 原則

---

### IV. Command-Event Architecture ✅

**評估**: 通過
- **命令使用**（客戶端 → 伺服器）:
  - ✅ `GameRequestJoin` - 已定義於 `doc/shared/protocol.md` Section IV
  - Payload: `{player_id, session_token}`
- **事件訂閱**（伺服器 → 客戶端）:
  - ✅ `GameStarted` - 已定義於 `doc/shared/protocol.md` Section V.A
  - Payload: `{my_player_id, players, ruleset}`
- **額外整合**:
  - ⚠️ 需確認是否需處理 `GameSnapshotRestore` 事件（斷線重連時跳過大廳）

**結論**: 符合 Command-Event 模式，所有使用的命令/事件均已定義於 protocol.md

---

### V. Test-First Development ✅

**評估**: 通過（需於實作階段執行）
- **測試覆蓋率目標**: Frontend > 60%
- **測試範圍**:
  - Vue 組件測試（GameLobby.vue, ActionPanel.vue）- 使用 Vue Test Utils + Vitest
  - Pinia store 測試（matchmakingStore 狀態轉換）
  - 路由守衛測試（斷線重連跳過大廳邏輯）
  - SSE 事件處理測試（GameStarted 事件接收）
- **TDD 流程**: 撰寫測試 → 紅燈 → 實作 → 綠燈 → 重構

**結論**: 測試計畫符合憲法要求，需在實作時嚴格執行

---

### VI. Bounded Context Isolation ✅

**評估**: 通過
- **BC 歸屬**: User Interface BC（遊戲 UI 呈現層）
- **跨邊界通訊**:
  - ✅ 透過 REST API 發送命令（GameRequestJoin）
  - ✅ 透過 SSE 接收事件（GameStarted, GameSnapshotRestore）
  - ✅ 使用 DTO/Event Payload（不直接依賴後端 Domain Model）
- **無共用 Domain Model**: 前端僅處理 UI 狀態，不共用後端 Domain 物件

**結論**: 完全符合 BC 隔離原則

---

### VII. Microservice-Ready Design ✅

**評估**: 通過（前端功能，無影響）
- **無狀態前端**: 所有遊戲狀態來自伺服器事件
- **UUID 使用**: player_id 已使用字串 ID（符合 UUID 規範）
- **事件驅動**: 完全透過 SSE 事件接收狀態更新

**結論**: 設計符合未來微服務架構需求

---

### VIII. API Contract Adherence ✅

**評估**: 通過
- **命令契約遵循**:
  - ✅ `GameRequestJoin` 定義於 `doc/shared/protocol.md` Section IV
  - ✅ Payload 格式: `{player_id: string, session_token: string}`
- **事件契約遵循**:
  - ✅ `GameStarted` 定義於 `doc/shared/protocol.md` Section V.A
  - ✅ Payload 格式: `{my_player_id: string, players: Player[], ruleset: Ruleset}`
  - ✅ `GameSnapshotRestore` 定義於 `doc/shared/protocol.md` Section VI（重連使用）
- **流程狀態**: N/A（此功能在遊戲會話建立前，不涉及 FlowState 轉換）

**結論**: 嚴格遵循 protocol.md 定義的 API 契約

---

## Gate 評估結果

**✅ 通過所有 Gates - 可進入 Phase 0 研究階段**

所有憲法原則均已滿足，無需填寫 Complexity Tracking 表格（無違反原則）。

---

## Post-Design Constitution Check

*Phase 1 設計完成後重新評估 - 2025-11-30*

### I. Clean Architecture ✅

**重新評估**: 通過

**實際架構**（參考 `data-model.md`）:
- **Application Layer**:
  - Input Ports: `HandleGameErrorPort`, `HandleGameStartedPort`, `HandleReconnectionPort`
  - Output Ports: `MatchmakingStatePort`, `NavigationPort`, `NotificationPort`, `GameStatePort`
  - Use Cases: `HandleGameErrorUseCase`, `HandleGameStartedUseCase`, `HandleReconnectionUseCase`
- **Adapter Layer**:
  - Pinia Stores: `matchmakingState.ts` (實作 MatchmakingStatePort)
  - Vue Components: `GameLobby.vue`, `ActionPanel.vue`
  - Router Guards: `lobbyPageGuard.ts`, `gamePageGuard.ts`
  - DI Container: 註冊所有 Port 實作與 Use Cases

**依賴方向檢查**:
- ✅ Use Cases 依賴 Output Ports（介面）
- ✅ Adapter 實作 Output Ports（具體實現）
- ✅ EventRouter 呼叫 Input Ports（Use Cases）
- ✅ 無循環依賴

**結論**: 完全符合 Clean Architecture 原則，分層清晰，依賴方向正確。

---

### II. Domain-Driven Development ✅

**重新評估**: 通過

**通用語言一致性**:
- ✅ MatchmakingState（配對狀態）- 領域概念
- ✅ MatchmakingStatus: `idle`, `finding`, `error` - 清晰的狀態機
- ✅ GameError 事件代碼（MATCHMAKING_TIMEOUT 等）- 符合業務語意

**BC 歸屬**:
- ✅ 所有邏輯限於 User Interface BC
- ✅ 無跨 BC 依賴

**結論**: DDD 原則符合，通用語言清晰一致。

---

### III. Server Authority ✅

**重新評估**: 通過（強化）

**關鍵設計決策**（參考 `research.md`, `contracts/game-error-event.md`）:
- ✅ 配對超時由**後端判定**，發送 `GameError` 事件
- ✅ 前端倒數計時（30 秒）僅 UX，無實際應用語意
- ✅ `recoverable` 與 `suggested_action` 由伺服器決定
- ✅ 客戶端僅響應事件，不自行判斷超時

**範例流程**:
```
1. Client → Server: GameRequestJoin
2. Client: 啟動 UX 倒數（30s）
3. Server: 30 秒後無配對成功
4. Server → Client: GameError (MATCHMAKING_TIMEOUT)
5. Client: 顯示錯誤，允許重試
```

**結論**: 完全符合 Server Authority 原則，後端為唯一權威來源。

---

### IV. Command-Event Architecture ✅

**重新評估**: 通過（新增事件）

**新增事件契約**:
- ✅ `GameError` 事件已定義於 `contracts/game-error-event.md`
- ✅ 4 種錯誤代碼: MATCHMAKING_TIMEOUT, GAME_EXPIRED, SESSION_INVALID, OPPONENT_DISCONNECTED
- ✅ 事件結構符合現有規範（event_type, event_id, timestamp）

**需執行**:
- ⚠️ 將 `GameError` 事件規格整合至 `doc/shared/protocol.md` Section V.B

**結論**: 符合 Command-Event 架構，事件定義完整，需更新 protocol.md。

---

### V. Test-First Development ✅

**重新評估**: 通過（測試計畫已定義）

**測試範圍**（參考 `quickstart.md`）:
- ✅ 單元測試: `HandleGameErrorUseCase.spec.ts`（Use Cases）
- ✅ Store 測試: `matchmakingState.spec.ts`（Pinia Store）
- ✅ 組件測試: `ActionPanel.spec.ts`, `GameLobby.spec.ts`
- ✅ 整合測試: 完整流程測試（首頁 → 大廳 → 配對 → 遊戲）

**測試覆蓋率目標**: > 70%（Frontend）

**結論**: 測試計畫完整，符合 TDD 要求。

---

### VI. Bounded Context Isolation ✅

**重新評估**: 通過

**BC 邊界檢查**:
- ✅ User Interface BC 透過 REST API 發送命令
- ✅ User Interface BC 透過 SSE 接收事件
- ✅ 無直接依賴後端 Domain Model

**Port 設計檢查**:
- ✅ `MatchmakingStatePort` 限於 UI 狀態管理
- ✅ `NavigationPort` 限於路由操作
- ✅ 無跨 BC 的 Port 依賴

**結論**: BC 隔離完整，符合原則。

---

### VII. Microservice-Ready Design ✅

**重新評估**: 通過

**無狀態設計**:
- ✅ 所有配對狀態來自伺服器（session_token, GameStarted 事件）
- ✅ 前端無本地狀態持久化（重新載入需重新配對）

**事件驅動**:
- ✅ GameError, GameStarted, GameSnapshotRestore 完全事件驅動
- ✅ 適合未來微服務架構（配對服務可獨立拆分）

**結論**: 設計符合微服務架構需求。

---

### VIII. API Contract Adherence ⚠️

**重新評估**: 需補充文檔

**契約狀態**:
- ✅ `GameRequestJoin` 命令已定義於 `protocol.md`
- ✅ `GameStarted` 事件已定義於 `protocol.md`
- ⚠️ `GameError` 事件**尚未**加入 `protocol.md`（已定義於 `contracts/game-error-event.md`）

**需執行**:
1. 將 `contracts/game-error-event.md` 整合至 `doc/shared/protocol.md` Section V.B
2. 更新 protocol.md 版本號

**結論**: 契約定義完整，需更新 protocol.md 文檔。

---

## Post-Design Gate 評估結果

**✅ 通過所有 Gates（附帶待辦事項）**

**待辦事項**（文檔更新，非阻塞）:
1. 將 `GameError` 事件規格整合至 `doc/shared/protocol.md`
2. 更新 protocol.md 版本號

**結論**: 架構設計完全符合所有憲法原則，可進入 Phase 2（Task Generation）。

---

## Project Structure

### Documentation (this feature)

```text
specs/007-lobby-settings-panel/
├── spec.md              # Feature specification (已存在)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

本專案為前端專案，採用 Clean Architecture 分層結構。所有前端程式碼位於 `front-end/` 目錄。

```text
front-end/
├── src/
│   ├── user-interface/              # User Interface BC (Clean Architecture)
│   │   ├── domain/                  # Domain Layer (純業務邏輯)
│   │   │   └── [N/A for this feature]
│   │   ├── application/             # Application Layer (Use Cases)
│   │   │   ├── use-cases/
│   │   │   │   └── [NEW] HandleMatchmakingTimeoutUseCase.ts
│   │   │   ├── ports/
│   │   │   │   └── [NEW] MatchmakingPort.ts (輸出 port 定義)
│   │   │   └── types/
│   │   │       └── [NEW] MatchmakingTypes.ts
│   │   └── adapter/                 # Adapter Layer (外部整合)
│   │       ├── stores/              # Pinia stores
│   │       │   ├── gameState.ts     # 現有 (可能需擴充)
│   │       │   ├── uiState.ts       # 現有 (可能需擴充)
│   │       │   └── [NEW] matchmakingState.ts (統一使用 State 後綴)
│   │       ├── router/              # Vue Router 配置
│   │       │   └── [MODIFY] index.ts (新增 /lobby 路由 + 重連守衛)
│   │       ├── api/
│   │       │   └── GameApiClient.ts # 現有 (已有 joinGame() 方法)
│   │       ├── sse/                 # SSE 事件處理
│   │       │   └── [MODIFY] eventHandlers (GameStarted 處理)
│   │       └── composables/         # Vue composables
│   │           └── [NEW] useMatchmaking.ts
│   ├── views/                       # Vue 頁面組件
│   │   ├── HomePage.vue             # 現有 (需調整「Start Game」導航至 /lobby)
│   │   ├── GamePage.vue             # 現有 (需整合 ActionPanel)
│   │   └── [NEW] GameLobby.vue      # 新增大廳頁面
│   ├── components/                  # 共用 Vue 組件
│   │   ├── NavigationBar.vue        # 現有
│   │   └── [NEW] ActionPanel.vue    # 新增操作面板 (可重用組件)
│   ├── router/                      # 根層級路由 (如有)
│   │   └── index.ts
│   └── types/                       # 全域型別定義
│       └── [NEW] matchmaking.d.ts
└── tests/                           # 測試目錄
    ├── unit/
    │   ├── [NEW] matchmakingState.spec.ts
    │   └── [NEW] HandleMatchmakingTimeoutUseCase.spec.ts
    └── components/
        ├── [NEW] GameLobby.spec.ts
        └── [NEW] ActionPanel.spec.ts
```

**Structure Decision**:

本功能為 **Web Application (Frontend Only)** 結構，遵循 Clean Architecture 分層：

1. **Application Layer** (Use Cases):
   - 新增 `HandleMatchmakingTimeoutUseCase` 處理配對超時邏輯
   - 定義 `MatchmakingPort` 介面供 Adapter 實作

2. **Adapter Layer**:
   - **Pinia Store**: 新增 `matchmakingState.ts` 管理配對狀態（命名統一使用 State 後綴）
   - **Vue Router**: 修改路由配置新增 `/lobby` 路由 + 斷線重連守衛
   - **API Integration**: 使用現有 `GameApiClient.joinGame()` 發送 GameRequestJoin 命令
   - **SSE Integration**: 整合 GameStarted 事件接收與處理

3. **Views & Components**:
   - 新增 `GameLobby.vue` 作為大廳頁面
   - 新增 `ActionPanel.vue` 作為可重用的操作面板組件（根據 props 動態顯示選項）
   - 修改 `HomePage.vue` 將「Start Game」導航至 `/lobby`
   - 修改 `GamePage.vue` 整合 ActionPanel

4. **Tests**:
   - 單元測試: Use Cases、Pinia stores
   - 組件測試: Vue 組件 (GameLobby, ActionPanel)

**關鍵設計決策**:
- ✅ 使用現有 `GameApiClient.joinGame()` 方法，無需新增 API 檔案
- ✅ Store 命名統一為 `matchmakingState.ts`（與 `gameState.ts`, `uiState.ts` 一致）
- ActionPanel 設計為可重用組件，根據 props 動態顯示不同操作選項
- matchmakingState 負責配對狀態管理，與 gameState 分離（單一職責原則）
- 路由守衛處理斷線重連邏輯（重連時跳過大廳直接進入遊戲）

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

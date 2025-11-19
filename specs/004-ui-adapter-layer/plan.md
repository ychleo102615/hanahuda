# Implementation Plan: User Interface BC - Adapter Layer

**Branch**: `004-ui-adapter-layer` | **Date**: 2025-01-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-ui-adapter-layer/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

實作 User Interface Bounded Context 的 Adapter Layer，整合 REST API、SSE、Pinia 狀態管理與 Vue 組件，完成前端與後端的連接。包含：

- **核心通訊層**: REST API 客戶端（4 個命令端點）、SSE 客戶端（13 種事件類型）、指數退避重連機制
- **狀態管理**: GameStateStore（實作 UIStatePort）、UIStateStore（實作 TriggerUIEffectPort 部分）
- **依賴注入**: 自訂輕量級 DI Container，支援三模式切換（Backend / Local / Mock）
- **Vue 組件**: GamePage.vue + 10 個子組件（5 個區域組件 + 5 個互動組件）
- **動畫系統**: AnimationService（P1: Vue Transition 基礎動畫，P3: 複雜特效延後）
- **Mock 模式**: 內建事件腳本，用於開發測試（無需後端）

**技術決策**（已通過使用者確認）：
- **DI Container**: 自訂輕量級實作（零外部依賴，~100 行程式碼）
- **動畫庫**: P1 使用 Vue Transition + CSS（零依賴），P3 延後決定
- **SSE Fallback**: Post-MVP（MVP 僅實作重連機制，不實作短輪詢）
- **Mock 模式**: 內建固定事件腳本（最小實作，不實作 UI 控制面板）

## Technical Context

**Language/Version**: TypeScript 5.9 + Vue 3.5
**Primary Dependencies**:
- 前端框架：Vue 3.5、Vue Router 4.x、Pinia 2.x
- 樣式：Tailwind CSS v4
- HTTP/SSE：原生 Fetch API、EventSource API（不使用第三方庫）
- 測試：Vitest

**Storage**:
- SessionStorage（sessionToken 分頁隔離）
- Pinia Stores（記憶體中狀態管理，不持久化）

**Testing**: Vitest
- Adapter Layer 測試覆蓋率目標 > 70%
- Pinia Stores 測試覆蓋率目標 > 80%
- API 客戶端測試覆蓋率目標 > 85%
- SSE 客戶端測試覆蓋率目標 > 75%

**Target Platform**:
- 現代瀏覽器（Chrome 90+、Firefox 88+、Safari 14+、Edge 90+）
- 支援 ES2020+ 特性
- 響應式設計（桌面優先，手機直向模式支援）

**Project Type**: Web（前端單頁應用）

**Performance Goals**:
- API 回應時間 P95 < 500ms
- SSE 事件推送延遲 < 100ms
- UI 更新時間 < 1s（事件接收到 UI 渲染完成）
- 動畫幀率 > 50 FPS（目標 60 FPS）
- 首次有效繪製 FCP < 1.5s
- 最大內容繪製 LCP < 2.5s

**Constraints**:
- 嚴格遵循 Clean Architecture 分層（Adapter 不包含業務邏輯）
- 所有外部依賴必須通過 Port 抽象
- Output Ports 由 Application Layer 定義，Adapter Layer 僅實作
- 快照恢復採用「強制同步模式」（伺服器權威優先）
- 動畫可在快照恢復時被中斷
- 打包體積限制：第三方動畫庫 < 50KB gzipped（P3 階段）

**Scale/Scope**:
- 支援 18 個 Use Cases（3 個玩家操作 + 15 個事件處理）
- 管理 21 個 Port 介面（18 個 Input Ports + 3 個 Output Ports）
- 處理 13 種 SSE 事件類型
- 10+ Vue 組件（1 個頁面 + 5 個區域 + 5 個互動）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Clean Architecture ✅ PASS

**評估**: 本功能完全符合 Clean Architecture 原則。

- ✅ **依賴規則**: Adapter Layer 依賴 Application Layer（透過 Port 介面），但 Application Layer 不依賴 Adapter
- ✅ **Port 介面定義**: 所有 Output Ports 已由 Application Layer 定義（`SendCommandPort`、`UIStatePort`、`TriggerUIEffectPort`），Adapter Layer 僅負責實作
- ✅ **無業務邏輯**: Adapter Layer 不包含遊戲規則驗證或狀態計算，僅處理外部關注點（REST、SSE、DTOs、UI 渲染）
- ✅ **可測試性**: 所有 Adapter 可透過 Mock Ports 進行測試，無需啟動真實後端或瀏覽器環境

**實作重點**:
- GameApiClient 實作 `SendCommandPort`，僅負責 HTTP 請求與錯誤轉換
- GameStateStore/UIStateStore 實作 `UIStatePort`/`TriggerUIEffectPort`，僅負責狀態更新，不執行業務邏輯
- DI Container 確保依賴反轉原則（依賴抽象而非具體實作）

---

### II. Domain-Driven Development ✅ PASS

**評估**: 本功能位於 Adapter Layer，不涉及新的領域建模，但需遵循 DDD 原則與 Bounded Context 邊界。

- ✅ **Bounded Context 隔離**: Adapter Layer 屬於 User Interface BC，不直接依賴後端 Core Game BC 的 Domain Models
- ✅ **DTOs 轉換**: 所有 REST API 與 SSE 事件使用 DTOs（定義於 `doc/shared/protocol.md`），不暴露前端 Domain Models
- ✅ **通用語言**: 使用領域術語命名（`GameApiClient`、`HandleGameStartedUseCase`、`YakuFormed` 事件），而非技術術語（`DataFetcher`、`EventProcessor`）
- ✅ **與 Local Game BC 整合預留**: DI Container 設計支援三模式切換，但 Local 模式實際實作等待 Local Game BC 完成後整合

**實作重點**:
- API 請求/回應使用 `doc/shared/protocol.md` 定義的 DTOs
- SSE 事件結構嚴格遵循 `protocol.md` 規範（13 種事件型別）
- Local 模式的 Adapter 介面已預留，暫時使用空實作或簡單 Mock 佔位

---

### III. Server Authority ✅ PASS（含例外條款）

**評估**: 本功能完全遵循伺服器權威原則，並正確應用 UI 提示驗證例外條款。

- ✅ **伺服器為唯一真相來源**: 所有遊戲狀態由後端管理，前端僅根據 SSE 事件更新 UI
- ✅ **命令-事件架構**: 前端發送命令（REST API），等待後端事件確認，不自行更新狀態
- ✅ **UI 提示驗證（例外條款）**: 前端可使用 Domain Layer 的配對邏輯高亮可配對牌（即時 UI 回饋），但不影響遊戲狀態，後端仍需重新驗證
- ✅ **快照恢復強制同步**: 重連後以伺服器快照為準，完全覆蓋本地狀態，確保資料一致性

**實作重點**:
- `GameApiClient.playHandCard()` 發送命令後，不立即更新本地狀態，等待 `TurnCompleted` 事件
- `HandleGameStartedUseCase` 等事件處理器僅根據事件 payload 更新狀態，不執行額外驗證
- 配對高亮邏輯使用 Domain Layer 的 `findMatchingCards()` 函數（純函數，無副作用），僅用於 UI 提示

---

### IV. Command-Event Architecture ✅ PASS

**評估**: 本功能嚴格遵循 Command-Event 模式。

- ✅ **Commands（客戶端 → 伺服器）**: 透過 REST API 發送（`POST /api/v1/games/join`、`POST .../commands/play-hand-card` 等）
- ✅ **Events（伺服器 → 客戶端）**: 透過 SSE 接收（13 種事件類型，包含 `event_id` 序列號）
- ✅ **契約遵循**: 所有端點與事件嚴格遵循 `doc/shared/protocol.md` 定義
- ✅ **事件路由**: SSE 事件透過 `EventRouter` 路由到對應的 Use Case Input Port（例如 `GameStarted` → `HandleGameStartedUseCase`）

**實作重點**:
- `GameEventClient` 解析 SSE MessageEvent，提取 `event` 與 `data` 欄位
- `EventRouter` 維護事件類型與 Use Case 的映射表
- 所有事件包含 `event_id`，用於去重與追蹤（未來可擴展）

---

### V. Test-First Development ✅ PASS（需嚴格執行）

**評估**: 本功能將遵循 TDD 原則，但 Adapter Layer 允許較低的覆蓋率（70%）。

- ✅ **測試優先順序**: Pinia Stores > API 客戶端 > SSE 客戶端 > Vue 組件
- ✅ **單元測試**: GameApiClient、GameEventClient、DI Container、AnimationService
- ✅ **整合測試**: Pinia Stores（使用 `setActivePinia` + Mock Ports）
- ✅ **契約測試**: REST API 端點格式、SSE 事件結構（使用 Vitest + Mock Server）
- ✅ **組件測試**: Vue Test Utils 測試關鍵互動路徑（點擊手牌 → 高亮 → 發送命令）

**測試覆蓋率目標**:
- Pinia Stores: > 80%
- API 客戶端: > 85%
- SSE 客戶端: > 75%
- Adapter Layer 整體: > 70%
- Vue 組件: > 60%

---

### VI. Bounded Context Isolation ✅ PASS

**評估**: 本功能維護 User Interface BC 的邊界隔離。

- ✅ **不共用 Domain Models**: 前端有自己的 Domain Layer（卡片邏輯、配對驗證、役種檢測），不依賴後端 Domain Models
- ✅ **通過契約通訊**: 前後端通過 `doc/shared/protocol.md` 定義的 DTOs 通訊
- ✅ **Mapper 組件**: `HandleGameStartedUseCase` 等事件處理器包含隱式的 DTO → Domain 轉換邏輯
- ✅ **與 Local Game BC 隔離**: DI Container 支援三模式切換，Backend/Local/Mock 模式使用不同的 Adapter 實作，BC 之間不直接依賴

**實作重點**:
- SSE 事件 payload（DTO）由 Use Cases 轉換為 Domain 型別後再傳遞給 Domain Layer
- Local 模式的 Adapter（`LocalGameAdapter`）作為 User Interface BC 與 Local Game BC 的防腐層

---

### VII. Microservice-Ready Design ✅ PASS

**評估**: 本功能設計考慮未來微服務拆分。

- ✅ **UUID 使用**: gameId、playerId、sessionToken 皆使用 UUID（後端生成）
- ✅ **無狀態 API 設計**: 前端不在記憶體中保存會話狀態（除了 SessionStorage 的 sessionToken），所有狀態從 SSE 事件恢復
- ✅ **事件驅動通訊**: SSE 事件驅動架構，未來可擴展為 WebSocket 或訊息佇列
- ✅ **最終一致性假設**: 快照恢復機制允許短暫的狀態不一致，但最終以伺服器快照為準

**實作重點**:
- `joinGame` API 返回 sessionToken，保存在 SessionStorage（分頁隔離，符合無狀態設計）
- SSE 重連機制使用 sessionToken 恢復會話，不依賴伺服器端記憶體狀態

---

### VIII. API Contract Adherence ✅ PASS

**評估**: 本功能嚴格遵循 `doc/shared/protocol.md` 規範。

- ✅ **Endpoint URLs**: 所有 REST API 端點完全匹配 protocol.md（例如 `POST /api/v1/games/join`、`POST /api/v1/games/{gameId}/commands/play-hand-card`）
- ✅ **HTTP Methods**: 所有命令使用 POST，未來查詢使用 GET（例如快照 API）
- ✅ **Request/Response 格式**: 所有請求/回應 JSON 結構完全匹配 protocol.md 定義
- ✅ **SSE 事件名稱與 Payloads**: 13 種事件的 `event` 欄位與 `data` 結構完全匹配
- ✅ **FlowStage 狀態機**: 前端狀態轉換邏輯遵循 protocol.md 的 FlowStage 狀態機定義

**實作重點**:
- `GameApiClient` 的請求格式使用 TypeScript 介面嚴格型別化（例如 `PlayHandCardRequest`）
- `GameEventClient` 的事件解析使用 TypeScript 型別守衛（Type Guards）驗證事件結構
- 任何偏離 protocol.md 的情況必須記錄為規格變更

---

### 架構約束檢查

#### 技術棧符合性 ✅ PASS

- ✅ 前端：Vue 3 + TypeScript + Tailwind CSS v4 + Pinia
- ✅ 通訊：REST API（命令）+ Server-Sent Events（事件）
- ✅ 測試：Vitest

#### 效能需求符合性 ✅ PASS

- ✅ API 回應時間 P95 < 500ms（透過重試機制與錯誤處理確保）
- ✅ SSE 事件推送延遲 < 100ms（EventSource 原生支援）
- ✅ UI 更新時間 < 1s（事件處理 + 動畫執行）

#### 安全需求符合性 ✅ PASS

- ✅ 輸入驗證：使用 TypeScript 型別守衛驗證 SSE 事件結構
- ✅ CORS：由後端配置，前端無需額外處理
- ✅ 敏感資料保護：sessionToken 保存在 SessionStorage（不使用 LocalStorage），分頁隔離

#### 可觀測性需求符合性 ✅ PASS

- ✅ 結構化日誌：使用 `console.error()`、`console.warn()`、`console.info()` 記錄關鍵事件
- ✅ 錯誤追蹤：所有 API 錯誤與 SSE 事件錯誤都記錄到 Console
- ✅ 未來擴展：可整合 Sentry 或其他前端錯誤追蹤服務

---

### 總評：✅ PASS ALL GATES

本功能完全符合專案憲法的所有核心原則與架構約束，可進入 Phase 0 研究階段。

---

## Project Structure

### Documentation (this feature)

```text
specs/004-ui-adapter-layer/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (技術決策記錄)
├── data-model.md        # Phase 1 output (Adapter Layer 實體定義)
├── quickstart.md        # Phase 1 output (開發環境設定與指南)
├── contracts/           # Phase 1 output (Adapter 契約規範)
│   ├── api-client.md   # REST API 客戶端契約
│   ├── sse-client.md   # SSE 客戶端契約
│   ├── stores.md       # Pinia Stores 契約
│   ├── animation.md    # 動畫服務契約
│   └── di-container.md # DI Container 契約
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
front-end/src/user-interface/
├── domain/                                  # ✅ 已完成（002-ui-domain-layer）
│   ├── card-database.ts
│   ├── card-logic.ts
│   ├── matching.ts
│   ├── validation.ts
│   ├── yaku-progress.ts
│   └── types.ts
│
├── application/                             # ✅ 已完成（003-ui-application-layer）
│   ├── types/
│   │   ├── events.ts                       # 15+ SSE 事件型別
│   │   ├── commands.ts
│   │   ├── flow-state.ts
│   │   ├── errors.ts
│   │   └── ...
│   ├── ports/
│   │   ├── input/                          # 18 個 Input Ports
│   │   │   ├── player-operations.port.ts
│   │   │   ├── event-handlers.port.ts
│   │   │   └── index.ts
│   │   ├── output/                         # 3 個 Output Ports
│   │   │   ├── send-command.port.ts
│   │   │   ├── ui-state.port.ts
│   │   │   ├── trigger-ui-effect.port.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   └── use-cases/
│       ├── player-operations/              # 3 個玩家操作 Use Cases
│       │   ├── PlayHandCardUseCase.ts
│       │   ├── SelectMatchTargetUseCase.ts
│       │   ├── MakeKoiKoiDecisionUseCase.ts
│       │   └── index.ts
│       ├── event-handlers/                 # 15 個事件處理 Use Cases
│       │   ├── HandleGameStartedUseCase.ts
│       │   ├── HandleRoundDealtUseCase.ts
│       │   ├── HandleTurnCompletedUseCase.ts
│       │   └── ... (12 more)
│       └── index.ts
│
└── adapter/                                 # ❌ 本次實作（004-ui-adapter-layer）
    ├── index.ts                            # 公開 API（導出 setupDI、registerAdapters）
    │
    ├── di/                                 # 自訂輕量級 DI Container
    │   ├── container.ts                    # 核心容器實作（register、resolve、clear）
    │   ├── registry.ts                     # 依賴註冊函數（registerDependencies）
    │   ├── tokens.ts                       # 依賴注入 Token 定義（Symbol 常數）
    │   └── index.ts
    │
    ├── api/                                # REST API 客戶端
    │   ├── GameApiClient.ts                # 實作 SendCommandPort
    │   ├── errors.ts                       # API 錯誤型別（NetworkError、ServerError）
    │   ├── types.ts                        # API 請求/回應型別
    │   └── index.ts
    │
    ├── sse/                                # SSE 客戶端
    │   ├── GameEventClient.ts              # EventSource 封裝 + 重連機制
    │   ├── EventRouter.ts                  # 事件路由器（事件類型 → Use Case）
    │   ├── types.ts                        # SSE 相關型別
    │   └── index.ts
    │
    ├── stores/                             # Pinia Stores（Output Ports 實作）
    │   ├── gameState.ts                    # 實作 UIStatePort（遊戲核心狀態）
    │   ├── uiState.ts                      # 實作 TriggerUIEffectPort（UI 互動狀態）
    │   └── index.ts
    │
    ├── animation/                          # 動畫服務
    │   ├── AnimationService.ts             # 實作 TriggerUIEffectPort.triggerAnimation
    │   ├── AnimationQueue.ts               # FIFO 佇列 + 中斷支援
    │   ├── types.ts                        # 動畫型別定義
    │   └── index.ts
    │
    ├── router/                             # 路由守衛
    │   ├── guards.ts                       # gamePageGuard（模式切換邏輯）
    │   └── index.ts
    │
    └── mock/                               # Mock 模式（開發測試）
        ├── MockApiClient.ts                # Mock SendCommandPort
        ├── MockEventEmitter.ts             # Mock SSE 事件模擬器
        ├── mockEventScript.ts              # 內建遊戲事件序列
        └── index.ts

front-end/src/views/
├── HomePage.vue                            # ✅ 已完成（001-homepage-implementation）
└── GamePage.vue                            # ❌ 本次實作
    └── components/
        ├── TopInfoBar.vue                  # 頂部資訊列
        ├── OpponentDepositoryZone.vue      # 對手已獲得牌區
        ├── FieldZone.vue                   # 場中央牌區
        ├── PlayerDepositoryZone.vue        # 玩家已獲得牌區
        ├── PlayerHandZone.vue              # 玩家手牌區
        ├── CardComponent.vue               # 單張卡片組件
        ├── SelectionOverlay.vue            # 配對選擇 UI
        ├── DecisionModal.vue               # Koi-Koi 決策 Modal
        ├── ErrorToast.vue                  # 錯誤提示
        └── ReconnectionBanner.vue          # 重連提示

front-end/src/
├── main.ts                                 # ❌ 本次修改（DI Container 初始化）
└── router/
    └── index.ts                            # ❌ 本次修改（新增 gamePageGuard）

front-end/tests/adapter/                    # ❌ 本次實作（測試）
├── api/
│   └── GameApiClient.spec.ts
├── sse/
│   ├── GameEventClient.spec.ts
│   └── EventRouter.spec.ts
├── stores/
│   ├── gameState.spec.ts
│   └── uiState.spec.ts
├── animation/
│   └── AnimationService.spec.ts
└── di/
    └── container.spec.ts
```

**Structure Decision**:

採用 Clean Architecture 的標準三層結構（Domain / Application / Adapter），每層職責明確：

1. **Domain Layer**（已完成）: 純業務邏輯，零外部依賴
2. **Application Layer**（已完成）: Use Cases 編排，定義 Port 介面
3. **Adapter Layer**（本次實作）: 實作 Ports，處理外部關注點

Adapter Layer 進一步細分為 6 個子模組：
- **di/**: 依賴注入容器（確保依賴反轉原則）
- **api/**: REST API 客戶端（外部通訊）
- **sse/**: SSE 客戶端（外部通訊）
- **stores/**: Pinia Stores（狀態管理）
- **animation/**: 動畫服務（UI 效果）
- **router/**: 路由守衛（頁面導航）
- **mock/**: Mock 模式（開發測試）

此結構確保：
- ✅ 依賴規則清晰（Adapter → Application → Domain）
- ✅ 模組職責單一（SRP）
- ✅ 可測試性高（每個模組可獨立測試）
- ✅ 可擴展性強（新增 Adapter 不影響內層）

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | 本功能完全符合憲法，無違規項目 | N/A |

**備註**:
- 自訂 DI Container 看似增加複雜度，但避免引入外部依賴（tsyringe ~10KB、inversify ~15KB），符合簡單性原則
- 三模式切換（Backend/Local/Mock）架構預留未來擴展，但當前僅完整實作 Backend 與 Mock 模式，Local 模式等待 Local Game BC 完成後整合
- SSE Fallback 短輪詢機制標記為 Post-MVP，避免過度設計
- P3 複雜動畫延後決定，P1 階段僅實作 Vue Transition 基礎動畫

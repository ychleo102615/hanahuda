# Implementation Plan: User Interface BC - Application Layer

**Branch**: `003-ui-application-layer` | **Date**: 2025-11-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-ui-application-layer/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

實作 User Interface BC 的 Application Layer，負責協調 Domain Layer 與 Adapter Layer 之間的業務流程。包含 18 個 Use Cases（3 個玩家操作流程 + 15 個 SSE 事件處理器）和 21 個 Port 介面（18 Input Ports + 3 Output Ports），採用純 TypeScript 實作，零框架依賴。

**技術方案**: 採用 Port-Adapter 模式實現 Clean Architecture，Use Cases 作為業務流程編排器，通過 Output Ports 與 Adapter Layer 通訊，調用 Domain Layer 的純業務邏輯（卡片配對、役種檢測等）。

## Technical Context

**Language/Version**: TypeScript 5.9
**Primary Dependencies**:
  - User Interface BC - Domain Layer（內部依賴，提供卡片邏輯、配對驗證、役種進度計算）
  - 無外部框架依賴（Application Layer 為框架無關的純業務編排邏輯）
  - Adapter Layer 將實作 Output Ports（使用 Vue 3, Pinia, REST API）

**Storage**: N/A（Application Layer 不處理持久化，由 Adapter Layer 通過 Output Ports 處理）

**Testing**: Vitest（單元測試框架）

**Target Platform**: Web（Vue 3 前端應用，運行於現代瀏覽器）

**Project Type**: web

**Performance Goals**:
  - SSE 事件處理延遲 < 100ms（從接收事件到觸發 UI 更新）
  - 玩家操作響應時間 < 50ms（從 Use Case 調用到返回結果）
  - 網路斷線後 2 秒內偵測並開始重連流程
  - 重連成功後 500ms 內恢復完整遊戲狀態

**Constraints**:
  - 框架無關：不能直接依賴 Vue、Pinia 等框架（必須通過 Port 抽象）
  - 純業務編排：不能包含業務邏輯實作（業務邏輯由 Domain Layer 提供）
  - 可測試性：所有 Use Cases 必須可通過 Mock 依賴獨立測試
  - 伺服器權威：客戶端驗證僅用於即時 UI 反饋，不影響遊戲狀態

**Scale/Scope**:
  - 18 個 Use Cases（3 玩家操作 + 15 事件處理）
  - 21 個 Port 介面（18 Input + 3 Output）
  - 40+ Protocol 型別定義（SSE 事件、命令格式、FlowState 等）
  - 測試覆蓋率目標 > 80%（業務編排邏輯 > 90%）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Clean Architecture (NON-NEGOTIABLE)
**Status**: PASS

- Application Layer 位於正確的架構層次（Domain 之上，Adapter 之下）
- 依賴方向正確：Application 依賴 Domain，不依賴 Adapter
- 通過 Output Ports 抽象外部依賴（SendCommandPort, UpdateUIStatePort, TriggerUIEffectPort）
- Use Cases 僅負責業務流程編排，不包含業務邏輯實作

**Evidence**: spec.md 中明確定義 Port 介面，Use Cases 通過 Ports 與外層通訊

---

### ✅ II. Domain-Driven Development (NON-NEGOTIABLE)
**Status**: PASS

- Use Cases 反映真實的業務流程（PlayHandCardUseCase, HandleGameStartedUseCase 等）
- 使用通用語言（Koi-Koi, Yaku, FlowStage, Selection 等）
- Bounded Context 邊界清晰（User Interface BC 的 Application Layer）
- 業務規則保留在 Domain Layer，Application Layer 僅編排

**Evidence**: 18 個 Use Cases 對應文檔中定義的實際遊戲流程

---

### ✅ III. Server Authority (NON-NEGOTIABLE)
**Status**: PASS（符合例外條款）

- 客戶端驗證僅用於即時 UI 反饋（調用 Domain Layer 的 validateCardExists, validateTargetInList）
- 所有命令通過 SendCommandPort 發送到伺服器進行最終驗證
- SSE 事件是狀態更新的唯一真相來源
- 客戶端驗證結果不影響遊戲狀態

**Evidence**: spec.md FR-005 明確說明「預驗證僅用於即時 UI 反饋」，所有操作仍需發送命令到伺服器

---

### ✅ IV. Command-Event Architecture
**Status**: PASS

- 發送命令到伺服器：TurnPlayHandCard, TurnSelectTarget, RoundMakeDecision（通過 SendCommandPort）
- 處理伺服器推送的 SSE 事件：15 種事件類型（GameStarted, RoundDealt, TurnCompleted 等）
- 所有事件遵循 protocol.md 規範

**Evidence**: spec.md FR-006 到 FR-018 定義完整的 SSE 事件處理流程

---

### ✅ V. Test-First Development (NON-NEGOTIABLE)
**Status**: PASS

- 測試覆蓋率目標：Application Layer > 80%（業務編排邏輯 > 90%）
- 所有 Use Cases 可通過 Mock 依賴獨立測試
- spec.md 包含詳細的測試策略和範例測試程式碼

**Evidence**: spec.md 的 Testing Strategy 章節，SC-001 定義覆蓋率目標

---

### ✅ VI. Bounded Context Isolation
**Status**: PASS

- Application Layer 屬於 User Interface BC
- 通過 Ports 與 Adapter Layer 通訊（不直接調用 Pinia、Vue）
- 通過型別定義與後端通訊（遵循 protocol.md 契約）
- 使用 Domain Layer 的公開 API（不直接存取內部實作）

**Evidence**: spec.md 明確定義 Input/Output Ports 作為邊界介面

---

### ✅ VII. Microservice-Ready Design
**Status**: PASS

- 無狀態設計：Use Cases 不保存狀態，所有狀態通過 UpdateUIStatePort 管理
- 事件驅動：SSE 事件處理器支援未來的事件匯流排整合
- 可獨立測試：不依賴外部服務（通過 Mock）

**Evidence**: Use Cases 為純函數式設計，無副作用

---

### ✅ VIII. API Contract Adherence
**Status**: PASS

- 所有 SSE 事件型別遵循 protocol.md 定義（GameStartedEvent, RoundDealtEvent 等）
- FlowState 狀態機轉換遵循 protocol.md 規範
- 命令格式遵循 protocol.md（TurnPlayHandCard, TurnSelectTarget, RoundMakeDecision）
- 快照恢復使用 GameSnapshotRestore 結構

**Evidence**: spec.md 明確引用 protocol.md，FR-018 定義快照恢復流程

---

### 結論
**GATE STATUS**: ✅ **PASS**

所有憲法原則均符合，無需複雜度證明。Application Layer 嚴格遵循 Clean Architecture 分層，通過 Ports 實現依賴反轉，符合伺服器權威原則的例外條款（僅 UI 提示驗證）。

---

### Phase 1 後重新檢查（2025-11-14）

**檢查範圍**:
- data-model.md - 實體定義
- contracts/ - Port 介面規範
- quickstart.md - 開發指南

**檢查結果**: ✅ **所有原則仍然符合**

#### 設計階段符合性驗證

1. **Clean Architecture**:
   - ✅ data-model.md 定義了清晰的 Use Cases、Ports、Protocol 型別三層分離
   - ✅ contracts/ 明確定義 Input/Output Ports 介面，實現依賴反轉
   - ✅ Use Cases 通過建構子注入依賴，符合 DIP 原則

2. **Domain-Driven Development**:
   - ✅ 18 個 Use Cases 使用通用語言（PlayHandCard, HandleGameStarted 等）
   - ✅ Protocol 型別與 protocol.md 一致，保持 Bounded Context 邊界

3. **Server Authority**:
   - ✅ Output Ports 契約明確所有命令通過 SendCommandPort 發送到伺服器
   - ✅ 客戶端驗證僅用於即時 UI 反饋（DomainServices.validateCardExists）

4. **Test-First Development**:
   - ✅ quickstart.md 包含完整的測試指南和 Mock 工廠函數範例
   - ✅ 測試覆蓋率目標明確（> 80%）

5. **API Contract Adherence**:
   - ✅ contracts/events.md 定義的所有事件型別嚴格遵循 protocol.md
   - ✅ 每個事件介面包含 JSDoc 註解標註 protocol.md 參考位置

**變更內容**:
- 新增 80+ 個型別定義（18 Use Cases, 21 Ports, 40+ Protocol 型別）
- 所有設計決策記錄於 research.md
- 無新的複雜度引入

**結論**: Phase 1 設計階段完成，所有憲法原則驗證通過，可進入 Phase 2（實作階段）。

---

## Project Structure

### Documentation (this feature)

```text
specs/003-ui-application-layer/
├── spec.md              # Feature specification (already created)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── input-ports.md   # Input Ports 介面規範
│   ├── output-ports.md  # Output Ports 介面規範
│   └── events.md        # SSE 事件型別規範
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
front-end/
├── src/
│   ├── user-interface/                      # User Interface BC
│   │   ├── domain/                          # Domain Layer（已完成於 002-ui-domain-layer）
│   │   │   ├── types.ts
│   │   │   ├── card-database.ts
│   │   │   ├── card-logic.ts
│   │   │   ├── matching.ts
│   │   │   ├── validation.ts
│   │   │   ├── yaku-progress.ts
│   │   │   └── index.ts
│   │   │
│   │   └── application/                     # Application Layer（本功能實作）
│   │       ├── index.ts                     # 公開 API 匯出
│   │       │
│   │       ├── types/                       # Protocol 事件型別定義
│   │       │   ├── events.ts               # SSE 事件型別（15+ 種）
│   │       │   ├── commands.ts             # 命令型別
│   │       │   ├── flow-state.ts           # FlowState 枚舉
│   │       │   └── index.ts
│   │       │
│   │       ├── ports/                       # Port 介面定義
│   │       │   ├── input/                  # Input Ports（由 Adapter 呼叫）
│   │       │   │   ├── player-operations.port.ts
│   │       │   │   ├── event-handlers.port.ts
│   │       │   │   └── index.ts
│   │       │   ├── output/                 # Output Ports（由 Use Cases 呼叫）
│   │       │   │   ├── send-command.port.ts
│   │       │   │   ├── update-ui-state.port.ts
│   │       │   │   ├── trigger-ui-effect.port.ts
│   │       │   │   └── index.ts
│   │       │   └── index.ts
│   │       │
│   │       └── use-cases/                   # Use Case 實作
│   │           ├── player-operations/      # 玩家操作 Use Cases（3 個）
│   │           │   ├── PlayHandCardUseCase.ts
│   │           │   ├── SelectMatchTargetUseCase.ts
│   │           │   ├── MakeKoiKoiDecisionUseCase.ts
│   │           │   └── index.ts
│   │           ├── event-handlers/         # 事件處理 Use Cases（15 個）
│   │           │   ├── HandleGameStartedUseCase.ts
│   │           │   ├── HandleRoundDealtUseCase.ts
│   │           │   ├── HandleTurnCompletedUseCase.ts
│   │           │   ├── HandleSelectionRequiredUseCase.ts
│   │           │   ├── HandleTurnProgressAfterSelectionUseCase.ts
│   │           │   ├── HandleDecisionRequiredUseCase.ts
│   │           │   ├── HandleDecisionMadeUseCase.ts
│   │           │   ├── HandleRoundScoredUseCase.ts
│   │           │   ├── HandleRoundDrawnUseCase.ts
│   │           │   ├── HandleRoundEndedInstantlyUseCase.ts
│   │           │   ├── HandleGameFinishedUseCase.ts
│   │           │   ├── HandleTurnErrorUseCase.ts
│   │           │   ├── HandleReconnectionUseCase.ts
│   │           │   └── index.ts
│   │           └── index.ts
│   │
│   └── __tests__/
│       └── user-interface/
│           ├── domain/                       # Domain Layer 測試（已存在）
│           │   ├── card-database.test.ts
│           │   ├── card-logic.test.ts
│           │   ├── matching.test.ts
│           │   ├── validation.test.ts
│           │   └── yaku-progress.test.ts
│           │
│           └── application/                  # Application Layer 測試（本功能實作）
│               ├── use-cases/
│               │   ├── player-operations/
│               │   │   ├── PlayHandCardUseCase.test.ts
│               │   │   ├── SelectMatchTargetUseCase.test.ts
│               │   │   └── MakeKoiKoiDecisionUseCase.test.ts
│               │   └── event-handlers/
│               │       ├── HandleGameStartedUseCase.test.ts
│               │       ├── HandleRoundDealtUseCase.test.ts
│               │       └── ... (12+ 其他事件處理器測試)
│               └── ports/
│                   └── ... (Port 介面測試，如需要)
│
├── vitest.config.ts                          # Vitest 測試配置
└── package.json                              # 專案依賴（TypeScript 5.9, Vitest 3.2.4）
```

**Structure Decision**: 採用 Web 應用架構（前端 Vue 3 專案）。Application Layer 位於 `front-end/src/user-interface/application/`，遵循 Clean Architecture 分層原則，與已完成的 Domain Layer 並列。測試檔案放置於 `front-end/src/__tests__/user-interface/application/`，遵循專案既有的測試目錄結構慣例。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**N/A** - 所有憲法原則均符合，無需複雜度證明。

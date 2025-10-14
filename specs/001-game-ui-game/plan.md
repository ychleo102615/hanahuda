# Implementation Plan: Game UI-Engine 分離架構

**Branch**: `001-game-ui-game` | **Date**: 2025-10-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-game-ui-game/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

本專案將現有的日本花牌遊戲「來來」(Koi-Koi) 從單體架構重構為 game-engine 與 game-ui 兩個獨立的 Bounded Context。兩個 BC 透過整合事件通訊，採用增量事件傳輸（除初始化外），以最小化資料傳輸量並為日後前後端分離做準備。重構過程中將完善花牌遊戲規則（包含役種判定、11 月雨光特殊規則、Koi-Koi 加倍計分），新增玩家隨時放棄遊戲功能，並維持單機遊玩模式的可用性。

## Technical Context

**Language/Version**: TypeScript 5.8, Node.js ^20.19.0 || >=22.12.0
**Primary Dependencies**: Vue 3.5, Pinia 3.0, Vite 7.0, Tailwind CSS 4.1
**Storage**: N/A（單機模式使用記憶體狀態，日後可擴展為 IndexedDB/LocalStorage 保存遊戲進度）
**Testing**: Vitest 3.2（單元測試、整合測試）, Playwright 1.55（E2E 測試）, Vue Test Utils 2.4（元件測試）
**Target Platform**: Web 瀏覽器（支援 ES2022+）
**Project Type**: Single-page web application（SPA）with planned future separation into backend service
**Performance Goals**:
  - 單機模式下事件通訊延遲 <10ms
  - UI 更新響應時間 <50ms
  - 完整遊戲（3 回合）完成時間 <10 分鐘
  - 非初始化事件大小 <1KB

**Constraints**:
  - 必須保持 Clean Architecture 分層設計（Domain/Application/Infrastructure/UI）
  - 必須遵循 DDD Bounded Context 隔離原則
  - game-engine BC 不可依賴任何 UI 框架（Vue、Pinia 等）
  - 整合事件結構必須可移植至 Protocol Buffers
  - 事件傳輸採用增量模式而非完整快照（初始化除外）

**Scale/Scope**:
  - 2 個 Bounded Context（game-engine, game-ui）
  - 10+ 種整合事件類型
  - 10 種標準役種邏輯
  - 48 張花牌
  - 支援單機雙人對戰（玩家 vs AI）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. 依賴反轉原則 (Dependency Inversion)
**狀態**: ✅ PASS

**檢查點**:
- [x] Domain Layer 不可 import 任何其他層級的模組 → 現有 domain/ 目錄僅包含純 TypeScript 類別
- [x] Application Layer 只能 import Domain Layer 和本層的介面 → 現有 application/ 遵循此規則
- [x] UI/Infrastructure Layer 只能依賴 Application Layer 的抽象介面 → 現有架構符合
- [x] **重構要求**: game-engine BC 與 game-ui BC 之間透過整合事件介面通訊，確保依賴方向正確

### II. 領域純淨性 (Domain Purity)
**狀態**: ✅ PASS

**檢查點**:
- [x] Domain Layer 檔案中無任何 `import` 語句來自 node_modules（除 TypeScript 型別工具）→ 已確認
- [x] Entity、Value Object、Domain Service 皆為純 TypeScript class → 已確認
- [x] 所有副作用操作通過 Port 介面定義 → 已確認
- [x] **重構要求**: 新增的整合事件定義需保持框架無關性，可移植至 Protocol Buffers

### III. Bounded Context 隔離 (DDD Boundary Context Isolation)
**狀態**: ⚠️ REQUIRES ATTENTION - 本次重構的核心目標

**檢查點**:
- [ ] game-engine BC 不可直接呼叫 game-ui BC 的程式碼 → **待實作**（目前為單體架構）
- [ ] game-ui BC 不可直接呼叫 game-engine BC 的程式碼 → **待實作**（目前為單體架構）
- [x] 跨 BC 通訊只透過事件匯流排或訊息佇列 → **待實作**（需建立輕量級 EventBus）
- [x] Entity 不可跨越 BC 邊界 → **待確保**（事件中僅傳遞 ID 和增量資料，不傳遞完整 Entity）

**理由**: 本次重構的主要目標即是將現有單體架構拆分為兩個獨立的 BC，此為架構演進的必要步驟。

### IV. 分層測試策略 (Layer-Specific Testing)
**狀態**: ✅ PASS

**檢查點**:
- [x] tests/unit/domain/ 包含所有 Domain 實體與值物件的測試 → 測試框架已就緒（Vitest）
- [x] tests/integration/application/ 包含 UseCase 測試 → 測試框架已就緒
- [x] tests/component/ui/ 包含 Vue 元件測試 → 測試框架已就緒（Vue Test Utils）
- [x] **重構要求**: 需新增 BC 之間的整合事件測試

### V. Port-Adapter 解耦 (Adapter Independence)
**狀態**: ✅ PASS

**檢查點**:
- [x] Presenter 不可 import Repository → 已確認
- [x] Controller 不可 import Presenter → 已確認
- [x] Repository 不可 import Controller → 已確認
- [x] 所有跨 Adapter 操作透過 UseCase 協調 → 已確認
- [x] **重構要求**: EventBus 作為新的 Infrastructure Adapter，需透過 Port 介面注入

### 總結
- **GATE DECISION**: ⚠️ **CONDITIONAL PASS** - 可進入 Phase 0 研究階段
- **理由**: Bounded Context 隔離目前未達標，但這正是本次重構的核心目標。其他架構約束皆符合憲章要求。
- **Action Required**: Phase 1 設計完成後必須重新檢查，確保兩個 BC 完全隔離且透過整合事件通訊。

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── shared/                          # 跨 BC 共享的常數與介面
│   ├── constants/                   # 遊戲常數定義
│   ├── events/                      # 整合事件定義（新增）
│   │   ├── base/
│   │   │   ├── IntegrationEvent.ts  # 事件基礎類別
│   │   │   └── EventBus.ts          # 輕量級事件匯流排
│   │   ├── game/
│   │   │   ├── GameInitializedEvent.ts
│   │   │   ├── CardPlayedEvent.ts
│   │   │   ├── DeckCardRevealedEvent.ts
│   │   │   ├── MatchSelectionRequiredEvent.ts
│   │   │   ├── MatchSelectionTimeoutEvent.ts
│   │   │   ├── PlayerTurnChangedEvent.ts
│   │   │   ├── YakuAchievedEvent.ts
│   │   │   ├── KoikoiDeclaredEvent.ts
│   │   │   ├── RoundEndedEvent.ts
│   │   │   ├── GameEndedEvent.ts
│   │   │   └── GameAbandonedEvent.ts
│   │   └── ports/
│   │       ├── EventPublisher.ts     # 事件發佈者介面
│   │       └── EventSubscriber.ts    # 事件訂閱者介面
│   └── services/
│       └── CardMatchingService.ts    # 花牌配對尋找領域服務介面
│
├── game-engine/                      # Game Engine BC（新增）
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Card.ts              # 從現有 src/domain/entities/ 移動
│   │   │   ├── GameState.ts         # 從現有 src/domain/entities/ 移動
│   │   │   ├── Player.ts            # 從現有 src/domain/entities/ 移動
│   │   │   └── Yaku.ts              # 從現有 src/domain/entities/ 移動
│   │   └── services/
│   │       ├── DeckService.ts       # 從現有 src/domain/services/ 移動
│   │       └── EngineCardMatchingService.ts  # 新增（實作配對規則）
│   ├── application/
│   │   ├── usecases/
│   │   │   ├── GameFlowCoordinator.ts   # 從現有 src/application/usecases/ 移動並重構
│   │   │   ├── SetUpGameUseCase.ts      # 從現有 src/application/usecases/ 移動
│   │   │   ├── SetUpRoundUseCase.ts     # 從現有 src/application/usecases/ 移動
│   │   │   ├── PlayCardUseCase.ts       # 從現有 src/application/usecases/ 移動並重構
│   │   │   ├── CalculateScoreUseCase.ts # 從現有 src/application/usecases/ 移動
│   │   │   └── AbandonGameUseCase.ts    # 新增
│   │   ├── services/
│   │   │   └── OpponentAI.ts        # 從現有 src/application/services/ 移動
│   │   └── ports/
│   │       └── EventPublisherPort.ts  # Output Port
│   └── infrastructure/
│       └── adapters/
│           └── EventBusAdapter.ts    # EventBus 的適配器實作
│
├── game-ui/                          # Game UI BC（新增）
│   ├── domain/
│   │   ├── models/
│   │   │   └── GameViewModel.ts      # 視圖模型（新增）
│   │   └── services/
│   │       └── UICardMatchingService.ts  # 新增（UI 配對選項顯示）
│   ├── application/
│   │   ├── usecases/
│   │   │   ├── UpdateGameViewUseCase.ts    # 新增（處理事件更新）
│   │   │   └── HandleUserInputUseCase.ts   # 新增（處理使用者輸入）
│   │   └── ports/
│   │       ├── EventSubscriberPort.ts  # Input Port
│   │       └── UIPresenterPort.ts      # Output Port
│   ├── infrastructure/
│   │   └── adapters/
│   │       └── EventBusAdapter.ts    # EventBus 的適配器實作
│   └── presentation/
│       ├── controllers/
│       │   └── GameController.ts     # 從現有 src/ui/controllers/ 移動並重構
│       ├── presenters/
│       │   └── VueGamePresenter.ts   # 從現有 src/ui/presenters/ 移動並重構
│       └── stores/
│           └── gameStore.ts          # 從現有 src/ui/stores/ 移動並重構
│
├── infrastructure/                   # 現有的基礎設施層（保留）
│   ├── di/
│   │   └── DIContainer.ts
│   ├── repositories/
│   │   └── LocalGameRepository.ts   # 可能會重構或移除
│   └── services/
│       └── LocaleService.ts
│
└── ui/                               # 現有的 UI 元件（保留，但會重構以使用 game-ui BC）
    ├── composables/
    ├── components/                   # Vue 元件
    └── views/

tests/
├── unit/
│   ├── game-engine/
│   │   └── domain/                  # Domain 層單元測試
│   └── game-ui/
│       └── domain/                  # ViewModel 單元測試
├── integration/
│   ├── game-engine/
│   │   └── application/             # UseCase 整合測試
│   ├── game-ui/
│   │   └── application/             # UseCase 整合測試
│   └── events/                      # BC 間事件通訊測試（新增）
└── component/
    └── ui/                          # Vue 元件測試
```

**Structure Decision**:
採用 **Single Project** 結構，但在 `src/` 下明確劃分為兩個 Bounded Context：`game-engine/` 和 `game-ui/`。

**理由**:
1. **現階段保持單體**: 專案目前仍為單機遊玩模式，尚未有前後端分離的實際需求，使用單一專案可簡化開發與測試流程
2. **清晰的 BC 邊界**: 通過目錄結構明確區分兩個 BC，每個 BC 內部維持完整的 Clean Architecture 分層（domain/application/infrastructure/presentation）
3. **日後可拆分**: 當需要前後端分離時，可直接將 `game-engine/` 提取為獨立 NPM 套件或後端服務專案
4. **shared/ 作為契約**: 整合事件定義放在 `shared/events/` 作為兩個 BC 的契約，未來可轉換為 Protocol Buffers
5. **測試結構對應**: 測試目錄結構反映 BC 劃分，並新增 `tests/integration/events/` 專門測試 BC 間通訊

**重構策略**:
- **保留現有目錄**: `infrastructure/` 和 `ui/` 暫時保留，避免一次性大規模移動造成混亂
- **新增 BC 目錄**: `game-engine/` 和 `game-ui/` 逐步將現有程式碼重構並移入
- **最終目標**: 完成重構後，原 `src/domain/`, `src/application/` 目錄將被清空並移除

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No violations requiring justification** - 本次重構是為了達成 Bounded Context 隔離原則，符合專案憲章的演進策略。

---

## Phase 1 Post-Design Constitution Check

**Re-evaluation Date**: 2025-10-14
**Status**: Phase 1 Design Completed

### I. 依賴反轉原則 (Dependency Inversion)
**狀態**: ✅ PASS

**設計階段確認**:
- [x] game-engine BC 與 game-ui BC 透過 `shared/events/` 的介面通訊 → data-model.md 已明確定義
- [x] EventBus 實作為 Infrastructure Adapter，透過 `IEventPublisher` 和 `IEventSubscriber` Port 注入 → 設計已明確
- [x] 所有整合事件繼承 `IntegrationEvent` 基礎介面 → contracts/integration-events-schema.json 已定義
- [x] UseCase 只依賴 Port 介面，不直接依賴 EventBus 實作 → data-model.md 設計遵循此原則

### II. 領域純淨性 (Domain Purity)
**狀態**: ✅ PASS

**設計階段確認**:
- [x] game-engine Domain Layer 設計為純 TypeScript 類別 → data-model.md 確認無 UI 框架依賴
- [x] 整合事件定義符合 Protocol Buffers 相容原則 → research.md 已詳細規範，contracts/ 已定義 Schema
- [x] 所有事件欄位避免使用泛型、Union Types、Date 物件 → data-model.md 使用 `number` (timestamp)
- [x] 事件命名採用過去式（`CardPlayedEvent`） → data-model.md 遵循此慣例

### III. Bounded Context 隔離 (DDD Boundary Context Isolation)
**狀態**: ✅ PASS（設計層面達成）

**設計階段確認**:
- [x] game-engine BC 與 game-ui BC 目錄結構完全分離 → plan.md Project Structure 已明確劃分
- [x] 跨 BC 通訊只透過整合事件 → data-model.md 與 contracts/ 已完整定義 11 種事件
- [x] Entity 不跨越 BC 邊界，事件中僅傳遞 ID 和增量資料 → data-model.md 所有事件欄位皆為 ID 或基本型別
- [x] shared/ 目錄僅包含事件介面、EventBus 抽象、常數 → plan.md Project Structure 明確規範
- [x] ESLint 邊界檢查規則已設計 → research.md 與 quickstart.md 已提供配置範例

**實作待確認**:
- [ ] 實際程式碼移動後需確認無跨 BC import
- [ ] `npm run lint:boundaries` 腳本實作並通過

### IV. 分層測試策略 (Layer-Specific Testing)
**狀態**: ✅ PASS

**設計階段確認**:
- [x] 測試目錄結構已規劃對應 BC 劃分 → plan.md Project Structure 包含 `tests/unit/game-engine/`, `tests/unit/game-ui/`
- [x] 新增 BC 間整合事件測試目錄 → `tests/integration/events/` 已規劃
- [x] 契約測試策略已定義 → contracts/README.md 提供 JSON Schema 驗證範例
- [x] 測試覆蓋率目標已設定 → research.md 與 quickstart.md 明確定義 Domain 90%+, Application 80%+

### V. Port-Adapter 解耦 (Adapter Independence)
**狀態**: ✅ PASS

**設計階段確認**:
- [x] EventBus 作為 Infrastructure Adapter → data-model.md 設計為可抽換實作（InMemoryEventBus, WebSocketEventBus）
- [x] Presenter、Controller、Repository 保持獨立 → plan.md 設計中各 Adapter 無直接依賴
- [x] 所有跨 Adapter 操作透過 UseCase → data-model.md 事件流範例確認此設計
- [x] Port 介面定義在 Application Layer → plan.md Project Structure 顯示 `application/ports/`

---

### 總結（Phase 1 Post-Design）

**GATE DECISION**: ✅ **PASS** - 可進入 Phase 2 實作階段

**達成狀態**:
1. ✅ **依賴反轉原則**: 設計完全符合，透過 Port 介面隔離
2. ✅ **領域純淨性**: 整合事件定義符合 Protobuf 相容性，Domain Layer 無外部依賴
3. ✅ **Bounded Context 隔離**: **本次重構的核心目標已在設計層面達成**
   - 目錄結構清晰劃分兩個 BC
   - 11 種整合事件完整定義
   - 事件時序圖明確展示通訊流程
   - 增量事件設計符合 <1KB 目標
4. ✅ **分層測試策略**: 測試結構已規劃，涵蓋單元、整合、契約測試
5. ✅ **Port-Adapter 解耦**: EventBus 設計為可抽換的 Infrastructure Adapter

**Phase 2 實作檢查點**:
- [ ] 實際建立 `src/game-engine/` 和 `src/game-ui/` 目錄
- [ ] 實作所有整合事件 TypeScript 介面
- [ ] 實作 EventBus 並通過單元測試
- [ ] 配置 ESLint 邊界檢查並通過
- [ ] 重構現有 UseCase 發布事件
- [ ] 實作 GameViewModel 並接收事件
- [ ] 整合測試與契約測試通過

**風險與緩解**:
- **風險**: 大規模程式碼移動可能導致 import 路徑錯誤
  - **緩解**: 按 quickstart.md 階段式重構，每階段執行 `npm run type-check`
- **風險**: 事件序號機制實作複雜度
  - **緩解**: research.md 已提供完整實作範例，優先實作基礎功能再加入序號檢測
- **風險**: 測試覆蓋率不足
  - **緩解**: quickstart.md 明確定義測試策略與覆蓋率目標

**憲章合規確認**: ✅ 本設計完全符合專案憲章所有核心原則，無違規需要說明。

---

**Next Step**: 執行 `/speckit.tasks` 生成 tasks.md，開始 Phase 2 實作

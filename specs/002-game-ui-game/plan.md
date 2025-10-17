# Implementation Plan: Game-UI 與 Game-Engine BC 徹底分離

**Branch**: `002-game-ui-game` | **Date**: 2025-10-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-game-ui-game/spec.md`

## Summary

徹底分離 game-engine 和 game-ui 兩個 Bounded Context,移除當前架構中的跨 BC 依賴違規。主要工作包含:

1. **移除 game-engine BC 對舊 application 層的依賴** - 建立專屬的 IGameStateRepository 和移除 GamePresenter
2. **完成 game-ui BC 的整合** - 更新 DIContainer, main.ts, GameView.vue 以使用新架構
3. **測試與驗證** - 確保重構後測試通過率 >= 94%, TypeScript 編譯無錯誤
4. **清理舊程式碼** - 移除 src/domain/, src/application/, src/ui/ 等舊目錄

**技術方法**: 採用事件驅動架構,game-engine BC 透過整合事件與 game-ui BC 通訊,完全解耦兩個 BC。

## Technical Context

**Language/Version**: TypeScript 5.8, Node.js 20.19+
**Primary Dependencies**: Vue 3.5, Pinia 3.0, Tailwind CSS 4.1
**Storage**: 記憶體內 (LocalGameRepository),未來可擴展至 IndexedDB 或 Server API
**Testing**: Vitest 3.2 (單元測試), Playwright 1.55 (E2E 測試)
**Target Platform**: Web 瀏覽器 (Chrome, Firefox, Safari - 最新兩個版本)
**Project Type**: 單頁應用 (SPA)
**Performance Goals**:
- 事件處理延遲 < 100ms
- 畫面更新 >= 30 FPS
- 初始載入時間 < 3 秒
**Constraints**:
- 整合事件大小 < 1KB (除 GameInitializedEvent)
- BC 邊界必須嚴格遵守
- 測試通過率必須 >= 94%
**Scale/Scope**:
- 2 個主要 BC (game-engine, game-ui)
- ~2500 行程式碼 (重構範圍)
- 7 種整合事件
- 12 個核心 Use Cases

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Core Principles Compliance

| 原則 | 檢查項目 | 狀態 | 說明 |
|------|---------|------|------|
| I. 依賴反轉原則 | game-engine BC 不依賴 application 層 | ⚠️ 待修復 | 當前有 7 個違規,需要重構 |
| II. 領域純淨性 | Domain Layer 不依賴外部框架 | ✅ 符合 | Domain 層僅使用純 TypeScript |
| III. BC 隔離 | 透過整合事件通訊 | ✅ 符合 | 7 種整合事件已實作 |
| IV. 分層測試策略 | Domain/Application/UI 分層測試 | ✅ 符合 | 測試通過率 94.3% |
| V. Port-Adapter 解耦 | Adapter 互相獨立 | ✅ 符合 | 無 Adapter 互相依賴 |

### 🔍 Gate Evaluation

**Phase 0 (Research) Gate**:
- ✅ 原則 II, III, IV, V 已符合
- ⚠️ 原則 I 待修復 (這是本次重構的目標)
- **決定**: ✅ 通過 - 違規是已知問題,本次重構將解決

**Phase 1 (Design) Re-check**: (研究完成後)
- ✅ 所有設計符合憲章原則
- ✅ 新設計不引入新的違規
- ✅ 測試策略明確

## Project Structure

### Documentation (this feature)

```
specs/002-game-ui-game/
├── plan.md              # ✅ 本檔案 (/speckit.plan 輸出)
├── research.md          # ✅ Phase 0 輸出 (/speckit.plan)
├── data-model.md        # ✅ Phase 1 輸出 (/speckit.plan)
├── quickstart.md        # ✅ Phase 1 輸出 (/speckit.plan)
├── contracts/           # ✅ Phase 1 輸出 (/speckit.plan)
│   └── ports.md        # Port 介面契約
└── tasks.md             # ⏳ Phase 2 輸出 (/speckit.tasks - 尚未建立)
```

### Source Code (repository root)

**當前結構** (重構前):

```
src/
├── domain/                    # ❌ 待刪除
│   ├── entities/
│   │   ├── Card.ts
│   │   ├── GameState.ts
│   │   ├── Player.ts
│   │   └── Yaku.ts
│   └── services/
│       └── DeckService.ts
│
├── application/               # ❌ 待刪除
│   ├── dto/
│   │   └── GameDTO.ts
│   ├── ports/
│   │   ├── presenters/
│   │   │   └── GamePresenter.ts
│   │   └── repositories/
│   │       ├── GameRepository.ts
│   │       └── PlayerInterface.ts
│   ├── services/
│   │   └── OpponentAI.ts
│   └── usecases/
│       └── [7 個舊 Use Cases]
│
├── infrastructure/            # ⚠️ 保留 di/ 和共享 services
│   ├── di/
│   │   └── DIContainer.ts
│   ├── repositories/          # ❌ 待刪除
│   │   └── LocalGameRepository.ts
│   └── services/              # ✅ 保留
│       └── LocaleService.ts
│
├── ui/                        # ❌ 待刪除
│   ├── components/
│   ├── composables/
│   ├── controllers/
│   ├── presenters/
│   ├── stores/
│   ├── utils/
│   └── views/
│
├── game-engine/               # ✅ game-engine BC (已部分完成)
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Card.ts
│   │   │   ├── GameState.ts
│   │   │   ├── Player.ts
│   │   │   └── Yaku.ts
│   │   └── services/
│   │       ├── DeckService.ts
│   │       └── EngineCardMatchingService.ts
│   ├── application/
│   │   ├── ports/
│   │   │   └── IEventPublisher.ts
│   │   ├── services/
│   │   │   └── OpponentAI.ts
│   │   └── usecases/
│   │       ├── GameFlowCoordinator.ts
│   │       ├── PlayCardUseCase.ts
│   │       ├── CalculateScoreUseCase.ts
│   │       ├── SetUpGameUseCase.ts
│   │       ├── SetUpRoundUseCase.ts
│   │       └── AbandonGameUseCase.ts
│   └── infrastructure/
│       └── adapters/
│           └── EventBusAdapter.ts
│
├── game-ui/                   # ✅ game-ui BC (已部分完成)
│   ├── domain/
│   │   ├── models/
│   │   │   ├── GameViewModel.ts
│   │   │   └── PlayerViewModel.ts
│   │   └── services/
│   │       └── UICardMatchingService.ts
│   ├── application/
│   │   ├── ports/
│   │   │   ├── IUIPresenter.ts
│   │   │   └── IEventSubscriber.ts
│   │   └── usecases/
│   │       ├── UpdateGameViewUseCase.ts
│   │       └── HandleUserInputUseCase.ts
│   ├── infrastructure/
│   │   └── adapters/
│   │       └── EventBusAdapter.ts
│   └── presentation/
│       ├── controllers/
│       │   └── GameController.ts
│       ├── presenters/
│       │   └── VueGamePresenter.ts
│       └── stores/
│           └── gameStore.ts
│
└── shared/                    # ✅ 共享定義
    ├── constants/
    │   └── gameConstants.ts
    ├── events/
    │   ├── base/
    │   │   ├── EventBus.ts
    │   │   ├── EventLogger.ts
    │   │   ├── IntegrationEvent.ts
    │   │   ├── MatchResult.ts
    │   │   ├── TurnTransition.ts
    │   │   └── YakuResult.ts
    │   ├── game/
    │   │   ├── GameInitializedEvent.ts
    │   │   ├── CardPlayedEvent.ts
    │   │   ├── MatchSelectedEvent.ts
    │   │   ├── KoikoiDeclaredEvent.ts
    │   │   ├── RoundEndedEvent.ts
    │   │   ├── GameEndedEvent.ts
    │   │   └── GameAbandonedEvent.ts
    │   └── ports/
    │       ├── IEventBus.ts
    │       ├── IEventPublisher.ts
    │       └── IEventSubscriber.ts
    └── services/
        └── ICardMatchingService.ts
```

**目標結構** (重構後):

```
src/
├── game-engine/               # Game Engine BC
│   ├── domain/               # 遊戲核心邏輯
│   ├── application/          # Use Cases + Ports + DTOs
│   │   ├── dto/             # ✅ 新增: Input DTOs
│   │   ├── ports/           # ✅ 新增: IGameStateRepository
│   │   ├── services/
│   │   └── usecases/
│   └── infrastructure/       # EventBusAdapter
│
├── game-ui/                   # Game UI BC
│   ├── domain/               # UI 領域模型
│   ├── application/          # UI Use Cases
│   ├── infrastructure/       # EventBusAdapter
│   └── presentation/         # Vue 元件, Controller, Presenter, Store
│       └── components/       # ✅ 遷移: 從 src/ui/components/
│
├── shared/                    # 共享定義
│   ├── events/               # 整合事件定義
│   └── constants/            # 常數
│
└── infrastructure/            # 共享基礎設施
    ├── di/                   # DIContainer
    └── services/             # LocaleService 等
```

**測試結構**:

```
tests/
├── unit/                      # 單元測試
│   ├── game-engine/
│   │   ├── domain/           # Domain 實體測試
│   │   └── application/      # UseCase 測試
│   ├── game-ui/
│   │   ├── domain/           # ViewModel 測試
│   │   └── application/      # UI UseCase 測試
│   ├── shared/
│   │   └── events/           # 事件測試
│   └── architecture/         # BC 邊界測試
│
├── integration/               # 整合測試
│   └── events/               # 事件端到端測試
│
└── contract/                  # 契約測試
    └── integration-events.contract.test.ts
```

**Structure Decision**:

本專案採用 **單專案 SPA 架構**,但使用 **Bounded Context 模組化** 組織程式碼。選擇此結構的原因:

1. **BC 隔離**: game-engine 和 game-ui 兩個 BC 在同一個 repository 中,但透過事件通訊,保持獨立
2. **共享基礎設施**: EventBus, DIContainer 等共享元件放在 shared/ 和 infrastructure/
3. **測試分層**: 按照 Clean Architecture 分層進行測試 (unit → integration → contract)
4. **易於維護**: 單一 repository 簡化版本管理,但模組化設計保持程式碼組織清晰

## Complexity Tracking

*本節僅在 Constitution Check 有違規需要說明時填寫*

| 違規 | 為何需要 | 為何拒絕更簡單的替代方案 |
|------|----------|-------------------------|
| (無) | N/A | N/A |

**說明**: 當前架構符合專案憲章的所有原則。唯一的問題是 game-engine BC 依賴舊 application 層,但這是已知的技術債,本次重構將解決。不存在需要特別說明的複雜度違規。

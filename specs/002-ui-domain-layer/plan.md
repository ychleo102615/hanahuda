# Implementation Plan: User Interface BC - Domain Layer

**Branch**: `002-ui-domain-layer` | **Date**: 2025-11-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-ui-domain-layer/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

實作 User Interface BC 的 Domain Layer，提供純函數形式的前端遊戲業務邏輯，包括：
1. **卡片核心邏輯**: 語義化卡片常數、卡片驗證、卡片資料庫（48張標準牌）
2. **配對驗證邏輯**: 判斷手牌與場牌的配對關係、處理多重配對情況
3. **客戶端預驗證**: 發送命令前的基本驗證（卡片存在性、目標合法性）
4. **役種進度計算**: 計算距離達成特定役種還差多少張牌

所有邏輯採用純函數設計，零框架依賴，100% 可測試，為前端 UI 提供即時反饋能力，同時遵循伺服器權威原則（客戶端驗證僅用於 UI 提示）。

## Technical Context

**Language/Version**: TypeScript 5.9
**Primary Dependencies**: 無（Pure functions, 零框架依賴）
**Storage**: N/A（Domain Layer 不處理持久化）
**Testing**: Vitest 3.2.4 + @vue/test-utils 2.4.6
**Target Platform**: 現代瀏覽器（ES2020+）、Node.js 20.19+ / 22.12+（用於測試）
**Project Type**: Web（前端 Vue 3 應用）
**Performance Goals**:
- 配對驗證函數 < 1ms（處理 8 張場牌）
- 役種進度計算 < 5ms（處理 12 種役種）
- 客戶端預驗證反饋 < 50ms（UI 響應時間）
**Constraints**:
- 必須是純函數（無副作用、可預測）
- 零外部依賴（不依賴 Vue、Pinia、瀏覽器 API）
- 100% 單元測試覆蓋率（卡片邏輯、配對驗證）
- 可在 Node.js 環境獨立運行
**Scale/Scope**:
- 48 張標準卡片定義
- 12 種標準役種映射
- 約 10-15 個純函數
- 100-150 行核心邏輯代碼
- 200-300 行測試代碼

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Clean Architecture ✅ PASS

- **Domain Layer**: 所有邏輯為純函數，零框架依賴
- **Application Layer**: N/A（此功能僅實作 Domain Layer）
- **Adapter Layer**: N/A（此功能僅實作 Domain Layer）
- **依賴方向**: 無外部依賴，內層定義所有介面

**理由**: 此功能專注於實作 User Interface BC 的 Domain Layer，完全符合 Clean Architecture 的內層原則。

### II. Domain-Driven Development ✅ PASS

- **Aggregate/Entity/Value Object**: Card（Value Object）、YakuProgress（Value Object）
- **通用語言**: 使用花札遊戲術語（Card、Yaku、Match、Depository）
- **Bounded Context 邊界**: 明確屬於 User Interface BC
- **業務規則位置**: 所有配對規則、役種檢測邏輯均在 Domain Layer

**理由**: 嚴格遵循 DDD 原則，使用領域模型和通用語言。

### III. Server Authority ✅ PASS（憲法例外條款適用）

- **伺服器權威**: 所有遊戲狀態和最終驗證由伺服器控制
- **客戶端角色**: 僅用於 UI 提示（高亮可配對牌、顯示役種進度）
- **例外條款適用**: 此功能屬於「UI 提示驗證」，憲法 v1.2.0 明確允許
- **驗證結果**: 不影響遊戲狀態，僅改善 UX

**理由**: 符合憲法 III 的例外條款，客戶端驗證邏輯僅用於即時 UI 反饋。

### IV. Command-Event Architecture ✅ PASS（N/A）

- **此功能不涉及 API 通訊**: Domain Layer 僅提供純函數，不處理 REST 或 SSE
- **未來整合**: Application Layer 將使用這些函數處理 SSE 事件

**理由**: 此功能為純業務邏輯層，不涉及通訊協議。

### V. Test-First Development ✅ PASS

- **TDD 流程**: 將遵循 Red-Green-Refactor
- **覆蓋率目標**:
  - 卡片邏輯 100%
  - 配對驗證 100%
  - 役種進度計算 > 90%
- **測試框架**: Vitest + expect

**理由**: 功能規格已明確所有測試場景，將採用 TDD 開發。

### VI. Bounded Context Isolation ✅ PASS

- **Domain Model**: Card、YakuType、YakuProgress 為 User Interface BC 專用
- **跨邊界通訊**: N/A（此功能僅內部使用）
- **DTO 映射**: 未來 Adapter Layer 將負責 Domain Model ↔ DTO 轉換

**理由**: Domain Model 明確屬於 User Interface BC，不會跨邊界共享。

### VII. Microservice-Ready Design ✅ PASS

- **無狀態設計**: 所有函數為純函數，無共享狀態
- **UUID 使用**: N/A（卡片使用 MMTI 格式 ID，符合 protocol.md）
- **事件驅動**: N/A（Domain Layer 不處理事件）

**理由**: 純函數設計天然支援分散式環境。

### VIII. API Contract Adherence ✅ PASS

- **契約遵循**: Card 結構完全符合 `doc/shared/data-contracts.md`
- **卡片 ID 格式**: 使用 MMTI 格式（month + type + index）
- **YakuType 定義**: 符合 `doc/shared/game-rules.md`

**理由**: 所有資料結構嚴格遵循共用契約。

---

**總結**: ✅ 所有憲法檢查通過，無需複雜度證明。

## Project Structure

### Documentation (this feature)

```text
specs/002-ui-domain-layer/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── card-types.ts    # TypeScript 型別定義
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
front-end/
├── src/
│   ├── user-interface/           # User Interface BC
│   │   └── domain/               # Domain Layer (此功能範圍)
│   │       ├── card-database.ts  # 48 張卡片定義 + 語義化常數
│   │       ├── card-logic.ts     # 卡片驗證邏輯
│   │       ├── matching.ts       # 配對驗證邏輯
│   │       ├── validation.ts     # 客戶端預驗證
│   │       ├── yaku-progress.ts  # 役種進度計算
│   │       └── types.ts          # 型別定義（Card, YakuType, YakuProgress）
│   │
│   └── __tests__/                # 測試目錄
│       └── user-interface/
│           └── domain/
│               ├── card-database.test.ts
│               ├── card-logic.test.ts
│               ├── matching.test.ts
│               ├── validation.test.ts
│               └── yaku-progress.test.ts
│
├── package.json
├── vitest.config.ts
└── tsconfig.json
```

**Structure Decision**:

此專案為 Web 應用，前端位於 `front-end/` 目錄。根據 Clean Architecture 和 DDD 原則：

1. **Bounded Context 分層**: `src/user-interface/domain/` 專注於 User Interface BC 的 Domain Layer
2. **測試並行**: `__tests__/user-interface/domain/` 鏡像源碼結構
3. **純函數模組化**: 每個模組負責單一職責（卡片邏輯、配對、驗證、役種）
4. **型別優先**: `types.ts` 定義所有 Domain 型別，供其他模組導入
5. **未來擴展**: 同級目錄可增加 `application/` 和 `adapter/` 層

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

無違反憲法的複雜度，此表格為空。

---

## Phase 1 Design Review - Constitution Re-evaluation

**Date**: 2025-11-13
**Status**: ✅ PASS（所有憲法檢查通過）

### 設計決策驗證

根據 Phase 1 生成的設計文檔（`research.md`, `data-model.md`, `contracts/`），重新評估憲法符合性：

#### I. Clean Architecture ✅ CONFIRMED

- **純函數設計**: 所有函數無副作用、零框架依賴（見 `research.md` §3）
- **型別定義**: `contracts/domain-types.ts` 使用 `readonly` 確保不可變性
- **資料驗證**: `data-model.md` 定義驗證函數，確保 Domain 邏輯完整性

**結論**: 完全符合 Clean Architecture 內層原則。

#### II. Domain-Driven Development ✅ CONFIRMED

- **Value Objects**: `Card`, `YakuProgress` 明確定義（見 `data-model.md` §核心型別定義）
- **通用語言**: 使用花札術語（MATSU, HIKARI, AKATAN 等）
- **語義化常數**: 48 張卡片使用 `MATSU_HIKARI` 等可讀命名（見 `research.md` §2）

**結論**: 嚴格遵循 DDD 原則，使用領域模型和通用語言。

#### III. Server Authority ✅ CONFIRMED

- **客戶端角色**: 所有函數僅用於 UI 提示（見 `quickstart.md` §場景1-3）
- **驗證目的**: `validateCardExists()` 等函數明確標註「僅用於即時反饋」
- **憲法例外條款**: 符合憲法 v1.2.0 的「UI 提示驗證」例外

**結論**: 設計符合伺服器權威原則，客戶端驗證僅改善 UX。

#### IV-VIII. 其他憲法檢查 ✅ CONFIRMED

- **Command-Event**: N/A（Domain Layer 不處理通訊）
- **Test-First**: 已規劃 100% 覆蓋率測試策略（見 `research.md` §6）
- **BC Isolation**: 型別定義明確屬於 User Interface BC
- **Microservice-Ready**: 純函數設計天然支援分散式
- **API Contract**: `Card` 結構完全符合 `doc/shared/data-contracts.md`（見 `data-model.md` §與共用契約的對應關係）

**結論**: 所有設計決策符合憲法要求。

---

### 關鍵設計亮點

1. **MMTI 卡片 ID 格式**: 與 protocol.md 契約完全一致
2. **語義化常數**: 48 張卡片使用日文羅馬拼音命名，提升可讀性
3. **卡片相等性**: 直接比較 `card_id`（簡化設計，用戶建議）
4. **三光特殊處理**: 明確排除雨光規則（用戶建議）
5. **純函數效能**: 所有函數 < 5ms（見 `quickstart.md` §7）

---

### 未來階段預告

Phase 2 將生成 `tasks.md`（執行 `/speckit.tasks`），分解實作任務並進行依賴排序，開始 TDD 開發。

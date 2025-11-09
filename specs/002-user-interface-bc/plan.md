# Implementation Plan: User Interface BC - Domain Layer

**Branch**: `002-user-interface-bc` | **Date**: 2025-11-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-user-interface-bc/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

本功能實作 **User Interface BC 的 Domain Layer**，提供前端遊戲業務邏輯的純函數運算能力。這是一個完全框架無關的層級，包含：

- **卡片核心邏輯**（P1）：MMTI 格式解析、屬性查詢、分組排序
- **配對驗證邏輯**（P1）：識別可配對的牌、多目標判斷、客戶端預驗證
- **役種檢測邏輯**（P2）：即時檢測 12 種常用役種、役種進度計算、分數預測
- **對手分析邏輯**（P2）：對手役種預測、威脅度評估、卡片分布統計
- **遊戲進度計算**（P3）：剩餘回合計算、分數差距分析

**技術方法**：採用 TypeScript 純函數設計，所有函數無副作用，可獨立測試，目標單元測試覆蓋率 100%（卡片邏輯與配對驗證），90% 以上（役種檢測）。前端驗證邏輯僅用於即時 UI 反饋，伺服器擁有最終驗證權。

## Technical Context

**Language/Version**: TypeScript 5.x（遵循專案現有設定）
**Primary Dependencies**: 無（Domain Layer 為純函數，零框架依賴）
**Storage**: N/A（Domain Layer 不涉及資料持久化）
**Testing**: Vitest + expect（遵循專案測試策略）
**Target Platform**: 現代瀏覽器（ES2020+ 支援環境）
**Project Type**: Web（前端 Vue 3 專案的一部分）
**Performance Goals**:
- 役種檢測單次執行 < 10ms（處理最大情境：24 張牌）
- 卡片解析與配對驗證 < 5ms
- 所有 Domain 函數執行時間 < 50ms（即時 UI 反饋需求）
**Constraints**:
- ✅ 純函數設計：無副作用，同樣輸入保證同樣輸出
- ✅ 框架無關：不依賴 Vue、Pinia、任何 UI 組件
- ✅ 可獨立測試：無需 UI 環境或瀏覽器 API
- ✅ 伺服器權威：前端驗證僅用於即時反饋，最終驗證由後端負責
**Scale/Scope**:
- 48 張標準花札卡片
- 12 種常用役種（MVP 範圍）
- 支援最多 24 張玩家已獲得牌（單局最大情境）
- 單元測試覆蓋率目標：卡片邏輯與配對驗證 100%、役種檢測 90% 以上

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Clean Architecture ✅ PASS

- **Domain Layer 純業務邏輯**：✅ 所有函數為純函數，零框架依賴
- **不依賴外層**：✅ Domain Layer 不依賴 Application、Adapter、Vue、Pinia
- **Repository 介面**：N/A（Domain Layer 不涉及資料持久化）
- **依賴規則**：✅ 完全符合依賴由外向內原則

**驗證方式**：所有 Domain 模組僅 import 基礎型別（string, number 等），不 import 任何框架

### II. Domain-Driven Development ✅ PASS

- **Bounded Context 明確**：✅ 本功能屬於 User Interface BC
- **Value Objects 識別**：✅ Card、YakuScore、MatchStatus、YakuProgress、ThreatLevel
- **通用語言**：✅ 使用問題領域術語（Card、Yaku、Koi-Koi、Match、Depository）
- **業務規則在 Domain**：✅ 所有配對規則、役種檢測邏輯在 Domain Layer

**Context 邊界**：User Interface BC 與 Local Game BC 透過明確介面溝通（未來實作）

### III. Server Authority ✅ PASS

- **伺服器權威**：✅ 前端 Domain Layer 僅用於**即時 UI 反饋**，不進行最終驗證
- **客戶端不執行遊戲規則**：⚠️ **需澄清**：前端 Domain Layer 包含配對驗證與役種檢測，但這些邏輯僅用於 UI 提示，伺服器擁有最終驗證權
- **狀態來源**：✅ 前端狀態完全由 SSE 事件驅動（Application Layer 責任）

**說明**：本 Domain Layer 提供的驗證邏輯僅用於：
1. 即時高亮可配對的場牌（使用者體驗）
2. 顯示役種進度提示（例如「距離赤短還差 1 張」）
3. 前置驗證以避免發送無效命令（減少網路往返）

### IV. Command-Event Architecture ✅ PASS

- **Domain Layer 不涉及通訊**：✅ 命令與事件處理在 Application Layer 與 Adapter Layer
- **事件結構**：N/A（本 Domain Layer 僅提供業務邏輯運算）

### V. Test-First Development ✅ PASS

- **TDD 承諾**：✅ 承諾遵循 TDD 流程（撰寫測試 → 測試失敗 → 實作 → 測試通過）
- **測試覆蓋率目標**：✅ Domain Layer > 90%（卡片邏輯與配對驗證 100%）
- **測試類別**：✅ 純單元測試（無需 Mock、無需 UI 環境）

### VI. Bounded Context Isolation ✅ PASS

- **BC 邊界**：✅ 本功能屬於 User Interface BC - Domain Layer
- **不共用 Domain 物件**：✅ Value Objects（Card、YakuScore）僅在前端 BC 內使用
- **契約通訊**：✅ 前後端透過 protocol.md 定義的 DTO 通訊（Adapter Layer 責任）

### VII. Microservice-Ready Design ✅ PASS

- **Domain Layer 無狀態**：✅ 所有函數為純函數，無內部狀態
- **可序列化**：✅ 所有 Value Objects 可 JSON 序列化（未來跨服務傳輸）
- **UUID**：N/A（卡片 ID 使用 MMTI 格式，遊戲 ID 由後端管理）

### VIII. API Contract Adherence ✅ PASS

- **protocol.md 遵循**：✅ 卡片 ID 編碼（MMTI 格式）、YakuScore 結構遵循 protocol.md
- **資料結構一致**：✅ Card、YakuScore 結構與 data-contracts.md 一致

---

### 總結：✅ ALL GATES PASS

**無憲法違反項目**。本 Domain Layer 完全符合 Clean Architecture、DDD、測試優先原則。

**唯一需要澄清**：Server Authority 原則下，前端 Domain Layer 的驗證邏輯定位已明確說明為「即時 UI 反饋」，不作為最終驗證權威。

## Project Structure

### Documentation (this feature)

```text
specs/002-user-interface-bc/
├── plan.md              # 本文件 (/speckit.plan 指令輸出)
├── research.md          # Phase 0 輸出 (/speckit.plan 指令)
├── data-model.md        # Phase 1 輸出 (/speckit.plan 指令)
├── quickstart.md        # Phase 1 輸出 (/speckit.plan 指令)
├── contracts/           # Phase 1 輸出 (/speckit.plan 指令) - TypeScript 型別定義
└── tasks.md             # Phase 2 輸出 (/speckit.tasks 指令 - 本指令不會建立)
```

### Source Code (repository root)

本專案為 Web 應用程式結構（前端 + 後端分離）。本功能僅涉及**前端 User Interface BC - Domain Layer**。

```text
front-end/                           # Vue 3 前端專案
├── src/
│   ├── user-interface/              # 🆕 User Interface BC（本功能實作）
│   │   └── domain/                  # Domain Layer
│   │       ├── card/                # 卡片核心邏輯（P1）
│   │       │   ├── card-parser.ts
│   │       │   ├── card-attributes.ts
│   │       │   ├── card-grouping.ts
│   │       │   └── index.ts
│   │       ├── matching/            # 配對驗證邏輯（P1）
│   │       │   ├── match-detector.ts
│   │       │   ├── match-validator.ts
│   │       │   └── index.ts
│   │       ├── yaku/                # 役種檢測邏輯（P2）
│   │       │   ├── yaku-detector.ts
│   │       │   ├── yaku-progress.ts
│   │       │   ├── score-calculator.ts
│   │       │   └── index.ts
│   │       ├── opponent/            # 對手分析邏輯（P2）
│   │       │   ├── opponent-analyzer.ts
│   │       │   ├── threat-evaluator.ts
│   │       │   └── index.ts
│   │       ├── progress/            # 遊戲進度計算（P3）
│   │       │   ├── turn-calculator.ts
│   │       │   ├── score-gap-analyzer.ts
│   │       │   └── index.ts
│   │       └── types/               # Value Objects 型別定義
│   │           ├── card.types.ts
│   │           ├── yaku.types.ts
│   │           ├── match.types.ts
│   │           └── index.ts
│   ├── local-game/                  # 🔜 Local Game BC（未來實作，不在本次範圍）
│   ├── components/                  # Vue 組件（現有）
│   ├── views/                       # 頁面（現有）
│   ├── stores/                      # Pinia 狀態管理（現有）
│   ├── router/                      # Vue Router（現有）
│   └── __tests__/                   # 測試目錄
│       └── user-interface/          # 🆕 User Interface BC 測試（本功能實作）
│           └── domain/              # Domain Layer 測試
│               ├── card/
│               │   ├── card-parser.test.ts
│               │   ├── card-attributes.test.ts
│               │   └── card-grouping.test.ts
│               ├── matching/
│               │   ├── match-detector.test.ts
│               │   └── match-validator.test.ts
│               ├── yaku/
│               │   ├── yaku-detector.test.ts
│               │   ├── yaku-progress.test.ts
│               │   └── score-calculator.test.ts
│               ├── opponent/
│               │   ├── opponent-analyzer.test.ts
│               │   └── threat-evaluator.test.ts
│               └── progress/
│                   ├── turn-calculator.test.ts
│                   └── score-gap-analyzer.test.ts
└── vitest.config.ts                 # Vitest 測試配置（現有）

backend/                             # 🔜 後端專案（未來實作，不在本次範圍）
```

**Structure Decision**:

1. **Bounded Context 作為第一層分界**：`user-interface/` 資料夾作為 User Interface BC 的根目錄
2. **Clean Architecture 分層**：在 BC 內按層級劃分（`domain/`、未來的 `application/`、`adapters/`）
3. **功能模組化**：在 Domain Layer 內按功能模組劃分（card、matching、yaku、opponent、progress）
4. **測試鏡像結構**：`__tests__/user-interface/domain/` 完全鏡像 `src/user-interface/domain/` 的目錄結構
5. **型別集中管理**：Value Objects 型別定義在 `domain/types/` 目錄
6. **未來擴展**：`local-game/` BC 將採用相同的結構模式（domain/application/adapters）

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**本功能無憲法違反項目，無需填寫此表格。**

所有設計決策均符合專案憲法的核心原則：
- ✅ Clean Architecture 嚴格分層
- ✅ Domain-Driven Development 明確 BC 劃分
- ✅ 純函數設計，無框架依賴
- ✅ 測試優先開發策略
- ✅ 符合 Server Authority 原則（前端驗證僅用於 UI 反饋）

---

## Phase 1 後憲法符合性重新評估

**評估時間**: 2025-11-09（完成 Phase 1: Design & Contracts）

### 設計產出檢查

✅ **data-model.md**: 定義 4 個 Value Objects（Card、YakuScore、YakuProgress、ThreatLevel）
✅ **contracts/**: TypeScript 型別定義（4 個模組檔案 + index.ts）
✅ **quickstart.md**: TDD 開發指南

### 設計簡化決策

在 Phase 1 期間，基於 YAGNI 原則進行了以下簡化：

1. **移除 MatchStatus Value Object**
   - **原因**: 配對狀態可從陣列長度直接推導（`[]` / `['0141']` / `['0841', '0842']`）
   - **影響**: 減少不必要的抽象，簡化 API
   - **憲法符合性**: ✅ 符合簡單性原則，避免過度設計

2. **移除 TurnProgress Value Object**
   - **原因**: 僅包裝兩個獨立的數字（`remainingTurns`, `roundProgress`），無業務邏輯關聯
   - **影響**: 函數直接返回 `number`，更簡潔
   - **憲法符合性**: ✅ 符合簡單性原則

3. **術語變更**: `DREG` → `PLAIN`
   - **原因**: "Dreg"（渣滓）語義不清，`PLAIN`（普通牌）更直觀
   - **影響**: 更新 protocol.md、data-contracts.md、spec.md
   - **憲法符合性**: ✅ 改善通用語言（Ubiquitous Language）

### 憲法原則驗證

#### I. Clean Architecture ✅ PASS
- contracts/ 中的型別定義完全框架無關
- 使用 TypeScript interface 與 type，無 class 依賴
- 所有 Value Objects 使用 `readonly` 修飾符保證不可變性

#### II. Domain-Driven Development ✅ PASS
- Value Objects 明確定義，語義清晰
- 通用語言改善（PLAIN 取代 DREG）
- 型別定義與 data-model.md 一致

#### III-VIII. 其他原則 ✅ PASS
- Server Authority: data-model.md 明確說明前端驗證僅用於 UI 反饋
- TDD: quickstart.md 提供完整 TDD 範例
- API Contract: 型別定義與 protocol.md 保持一致

### 結論

✅ **Phase 1 設計完全符合專案憲法**

所有簡化決策均基於專案憲法的簡單性原則（避免過度設計、YAGNI），未引入新的複雜度。

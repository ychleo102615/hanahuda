# Tasks: User Interface BC - Domain Layer

**Input**: Design documents from `/specs/002-user-interface-bc/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: 本功能遵循測試優先開發（TDD），所有實作前必須先編寫測試（spec.md - TR-004, TR-005 要求 100% 覆蓋率）

**Organization**: 任務按 User Story 組織，每個 Story 可獨立實作與測試

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行（不同檔案，無相依性）
- **[Story]**: 任務所屬 User Story（US1, US2, US3, US4）
- 所有描述包含明確檔案路徑

## Path Conventions

- **前端專案路徑**: `front-end/src/user-interface/domain/`
- **測試路徑**: `front-end/src/__tests__/user-interface/domain/`
- 遵循 plan.md 定義的目錄結構

---

## Phase 1: Setup (專案初始化)

**Purpose**: 建立 User Interface BC - Domain Layer 的基礎結構

- [ ] T001 在 front-end/src/ 建立 user-interface/domain/ 完整目錄結構（card, matching, yaku, opponent, progress, types）
- [ ] T002 在 front-end/src/__tests__/ 建立 user-interface/domain/ 測試目錄結構（鏡像 src 結構）
- [ ] T003 [P] 複製 specs/002-user-interface-bc/contracts/*.ts 型別定義到 front-end/src/user-interface/domain/types/
- [ ] T004 [P] 驗證 Vitest 測試環境設定（執行 npm run test:unit）

**Checkpoint**: 目錄結構與型別定義就緒

---

## Phase 2: Foundational (基礎設施)

**Purpose**: Domain Layer 的核心 Value Objects 與常數定義，所有 User Stories 依賴此階段

**⚠️ CRITICAL**: 此階段完成前，無法開始任何 User Story 實作

- [ ] T005 [P] 在 front-end/src/user-interface/domain/types/index.ts 建立統一型別匯出
- [ ] T006 [P] 建立卡片資料庫（48 張標準花札）常數在 front-end/src/user-interface/domain/card/card-database.ts
- [ ] T007 [P] 建立役種需求卡片映射（12 種役種）常數在 front-end/src/user-interface/domain/yaku/yaku-requirements.ts

**Checkpoint**: 基礎設施完成，User Story 實作可開始

---

## Phase 3: User Story 1A - 卡片邏輯驗證 (Priority: P1) 🎯 MVP

**Goal**: 實作卡片 ID 解析、屬性查詢、分組排序邏輯，確保卡片核心運算正確

**Independent Test**: 可透過單元測試驗證 48 張卡片 ID 解析 100% 正確、卡片屬性查詢無誤、分組排序符合預期

**來源**: spec.md - User Story 1 (卡片邏輯部分)、FR-001 ~ FR-004

### Tests for User Story 1A (TDD - 先寫測試) ⚠️

> **NOTE: 先寫測試，確認測試 FAIL 後再實作**

- [ ] T008 [P] [US1] 建立 front-end/src/__tests__/user-interface/domain/card/card-parser.test.ts（包含有效 MMTI 解析、無效格式錯誤處理）
- [ ] T009 [P] [US1] 建立 front-end/src/__tests__/user-interface/domain/card/card-attributes.test.ts（包含 48 張卡片屬性查詢測試）
- [ ] T010 [P] [US1] 建立 front-end/src/__tests__/user-interface/domain/card/card-grouping.test.ts（包含按月份/類型/點數分組測試）
- [ ] T011 [US1] 執行測試確認全部 FAIL（npm run test:unit -- card）

### Implementation for User Story 1A

- [ ] T012 [P] [US1] 實作 front-end/src/user-interface/domain/card/card-parser.ts（parseCardId, validateCardId）
- [ ] T013 [P] [US1] 實作 front-end/src/user-interface/domain/card/card-attributes.ts（getCardAttributes, getCardPoints）
- [ ] T014 [P] [US1] 實作 front-end/src/user-interface/domain/card/card-grouping.ts（groupByMonth, groupByType, sortByPoints）
- [ ] T015 [US1] 建立 front-end/src/user-interface/domain/card/index.ts 統一匯出
- [ ] T016 [US1] 執行測試確認 100% 通過（npm run test:unit -- card）
- [ ] T017 [US1] 檢查測試覆蓋率達到 100%（npm run test:coverage -- card）

**Checkpoint**: 卡片邏輯測試 100% 通過，覆蓋率 100%

---

## Phase 4: User Story 1B - 配對驗證邏輯 (Priority: P1) 🎯 MVP

**Goal**: 實作配對檢測與驗證邏輯，確保玩家選牌後可正確識別可配對的場牌

**Independent Test**: 可透過單元測試驗證無配對/單一配對/多重配對情境 100% 正確，邊界情況（空陣列、無效卡片）處理正確

**來源**: spec.md - User Story 1 (配對邏輯部分)、FR-005 ~ FR-009

### Tests for User Story 1B (TDD - 先寫測試) ⚠️

- [ ] T018 [P] [US1] 建立 front-end/src/__tests__/user-interface/domain/matching/match-detector.test.ts（包含 canMatch, findMatchableCards 測試）
- [ ] T019 [P] [US1] 建立 front-end/src/__tests__/user-interface/domain/matching/match-validator.test.ts（包含 validateMatchChoice, validateCardExists 測試）
- [ ] T020 [US1] 執行測試確認全部 FAIL（npm run test:unit -- matching）

### Implementation for User Story 1B

- [ ] T021 [P] [US1] 實作 front-end/src/user-interface/domain/matching/match-detector.ts（canMatch, findMatchableCards）
- [ ] T022 [P] [US1] 實作 front-end/src/user-interface/domain/matching/match-validator.ts（validateMatchChoice, validateCardExists）
- [ ] T023 [US1] 建立 front-end/src/user-interface/domain/matching/index.ts 統一匯出
- [ ] T024 [US1] 執行測試確認 100% 通過（npm run test:unit -- matching）
- [ ] T025 [US1] 檢查測試覆蓋率達到 100%（npm run test:coverage -- matching）

**Checkpoint**: User Story 1 (卡片邏輯 + 配對驗證) 完全實作，測試覆蓋率 100%

---

## Phase 5: User Story 2A - 役種檢測邏輯 (Priority: P1)

**Goal**: 實作 12 種常用役種的即時檢測邏輯，確保玩家獲得牌後正確顯示已形成的役種

**Independent Test**: 可透過單元測試驗證 12 種役種檢測 100% 正確，役種衝突（如四光 vs 雨四光）正確解決，邊界情況（空陣列、單張牌）處理正確

**來源**: spec.md - User Story 2 (役種檢測部分)、FR-010 ~ FR-011

### Tests for User Story 2A (TDD - 先寫測試) ⚠️

- [ ] T026 [P] [US2] 建立 front-end/src/__tests__/user-interface/domain/yaku/yaku-detector.test.ts（包含 12 種役種檢測測試、衝突解決測試）
- [ ] T027 [US2] 執行測試確認全部 FAIL（npm run test:unit -- yaku/yaku-detector）

### Implementation for User Story 2A

- [ ] T028 [US2] 實作 front-end/src/user-interface/domain/yaku/yaku-detector.ts（detectAllYaku, checkYaku, 12 種役種檢測函數）
- [ ] T029 [US2] 執行測試確認 100% 通過（npm run test:unit -- yaku/yaku-detector）
- [ ] T030 [US2] 檢查測試覆蓋率達到 100%（npm run test:coverage -- yaku/yaku-detector）

**Checkpoint**: 役種檢測邏輯 100% 通過，覆蓋率 100%

---

## Phase 6: User Story 2B - 役種進度與分數計算 (Priority: P1)

**Goal**: 實作役種進度計算（距離役種還差幾張）與總分計算邏輯

**Independent Test**: 可透過單元測試驗證役種進度計算正確（已獲得/缺少卡片列表、完成百分比）、總分計算包含所有役種基礎分

**來源**: spec.md - User Story 2 (役種進度部分)、FR-012 ~ FR-014

### Tests for User Story 2B (TDD - 先寫測試) ⚠️

- [ ] T031 [P] [US2] 建立 front-end/src/__tests__/user-interface/domain/yaku/yaku-progress.test.ts（包含 calculateYakuProgress 測試）
- [ ] T032 [P] [US2] 建立 front-end/src/__tests__/user-interface/domain/yaku/score-calculator.test.ts（包含 calculateTotalScore 測試）
- [ ] T033 [US2] 執行測試確認全部 FAIL（npm run test:unit -- yaku）

### Implementation for User Story 2B

- [ ] T034 [P] [US2] 實作 front-end/src/user-interface/domain/yaku/yaku-progress.ts（calculateYakuProgress, getMissingCards）
- [ ] T035 [P] [US2] 實作 front-end/src/user-interface/domain/yaku/score-calculator.ts（calculateTotalScore, calculateYakuScore）
- [ ] T036 [US2] 建立 front-end/src/user-interface/domain/yaku/index.ts 統一匯出
- [ ] T037 [US2] 執行測試確認 100% 通過（npm run test:unit -- yaku）
- [ ] T038 [US2] 檢查測試覆蓋率達到 100%（npm run test:coverage -- yaku）

**Checkpoint**: User Story 2 (役種檢測 + 進度計算) 完全實作，測試覆蓋率 100%

---

## Phase 7: User Story 3 - 對手狀態分析與威脅評估 (Priority: P2)

**Goal**: 實作對手役種分析與威脅等級評估，幫助玩家理解對手策略

**Independent Test**: 可透過設定對手已獲得牌區的卡片，驗證威脅評估邏輯（極高/高/中/低）、對手可能形成的役種預測、卡片類型分布統計

**來源**: spec.md - User Story 3、FR-015 ~ FR-017

### Tests for User Story 3 (TDD - 先寫測試) ⚠️

- [ ] T039 [P] [US3] 建立 front-end/src/__tests__/user-interface/domain/opponent/opponent-analyzer.test.ts（包含 analyzeOpponent, getCardDistribution 測試）
- [ ] T040 [P] [US3] 建立 front-end/src/__tests__/user-interface/domain/opponent/threat-evaluator.test.ts（包含 evaluateThreat, getThreatReasons 測試）
- [ ] T041 [US3] 執行測試確認全部 FAIL（npm run test:unit -- opponent）

### Implementation for User Story 3

- [ ] T042 [P] [US3] 實作 front-end/src/user-interface/domain/opponent/opponent-analyzer.ts（analyzeOpponent, getCardDistribution）
- [ ] T043 [P] [US3] 實作 front-end/src/user-interface/domain/opponent/threat-evaluator.ts（evaluateThreat, calculateThreatLevel）
- [ ] T044 [US3] 建立 front-end/src/user-interface/domain/opponent/index.ts 統一匯出
- [ ] T045 [US3] 執行測試確認 100% 通過（npm run test:unit -- opponent）
- [ ] T046 [US3] 檢查測試覆蓋率達到 100%（npm run test:coverage -- opponent）

**Checkpoint**: User Story 3 (對手分析) 完全實作，測試覆蓋率 100%

---

## Phase 8: User Story 4 - 遊戲進度與分數差距提示 (Priority: P3)

**Goal**: 實作剩餘回合計算與分數差距分析，提供策略建議

**Independent Test**: 可透過設定牌堆剩餘張數與雙方分數，驗證回合計算正確、進度百分比正確、策略建議（激進/平衡/保守）符合分數差距

**來源**: spec.md - User Story 4、FR-018 ~ FR-021

### Tests for User Story 4 (TDD - 先寫測試) ⚠️

- [ ] T047 [P] [US4] 建立 front-end/src/__tests__/user-interface/domain/progress/turn-calculator.test.ts（包含 calculateRemainingTurns, calculateProgress 測試）
- [ ] T048 [P] [US4] 建立 front-end/src/__tests__/user-interface/domain/progress/score-gap-analyzer.test.ts（包含 analyzeScoreGap, suggestStrategy 測試）
- [ ] T049 [US4] 執行測試確認全部 FAIL（npm run test:unit -- progress）

### Implementation for User Story 4

- [ ] T050 [P] [US4] 實作 front-end/src/user-interface/domain/progress/turn-calculator.ts（calculateRemainingTurns, calculateProgress）
- [ ] T051 [P] [US4] 實作 front-end/src/user-interface/domain/progress/score-gap-analyzer.ts（analyzeScoreGap, determineAdvantage, suggestStrategy）
- [ ] T052 [US4] 建立 front-end/src/user-interface/domain/progress/index.ts 統一匯出
- [ ] T053 [US4] 執行測試確認 100% 通過（npm run test:unit -- progress）
- [ ] T054 [US4] 檢查測試覆蓋率達到 100%（npm run test:coverage -- progress）

**Checkpoint**: User Story 4 (遊戲進度計算) 完全實作，測試覆蓋率 100%

---

## Phase 9: Polish & Cross-Cutting Concerns (收尾與優化)

**Purpose**: 整體驗證、文檔更新、效能檢查

- [ ] T055 [P] 執行完整測試套件確認所有模組 100% 通過（npm run test:unit -- user-interface/domain）
- [ ] T056 [P] 驗證整體測試覆蓋率達到目標（卡片邏輯 100%、配對驗證 100%、役種檢測 100%）
- [ ] T057 [P] 效能測試：驗證役種檢測（24 張牌）< 10ms、卡片解析 < 5ms（參考 plan.md 效能目標）
- [ ] T058 [P] 為所有公開函數新增 JSDoc 文檔（參數、返回值、範例）
- [ ] T059 [P] TypeScript 型別檢查：確認無 any 使用、嚴格模式零錯誤
- [ ] T060 執行 quickstart.md 驗證：按照 quickstart.md 步驟驗證開發流程可行
- [ ] T061 建立 front-end/src/user-interface/domain/README.md（模組總覽、使用範例、設計原則）

**Checkpoint**: User Interface BC - Domain Layer 完整實作完成，測試覆蓋率達標，文檔齊全

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無依賴 - 立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成 - **阻塞所有 User Stories**
- **User Stories (Phase 3-8)**: 全部依賴 Foundational 完成
  - 可按優先級順序執行：US1A → US1B → US2A → US2B → US3 → US4
  - 或平行執行（需要多人協作）：US1, US2, US3, US4 同時進行
- **Polish (Phase 9)**: 依賴所有 User Stories 完成

### User Story Dependencies

- **User Story 1A (P1 - 卡片邏輯)**: Foundational 完成後可立即開始 - 無其他 Story 依賴
- **User Story 1B (P1 - 配對驗證)**: Foundational 完成後可立即開始 - 無其他 Story 依賴
- **User Story 2A (P1 - 役種檢測)**: Foundational 完成後可立即開始 - 無其他 Story 依賴
- **User Story 2B (P1 - 役種進度)**: 依賴 US2A 完成 - 需要 detectAllYaku 函數
- **User Story 3 (P2 - 對手分析)**: 依賴 US2A 完成 - 需要役種檢測邏輯
- **User Story 4 (P3 - 遊戲進度)**: Foundational 完成後可立即開始 - 無其他 Story 依賴

### Within Each User Story

- **TDD 流程**: Tests FIRST → 確認 FAIL → Implementation → 確認 PASS
- **檔案順序**: 型別定義 → 測試 → 實作 → 匯出 → 覆蓋率檢查
- **驗證順序**: 單元測試通過 → 覆蓋率達標 → Checkpoint 完成

### Parallel Opportunities

- **Phase 1**: T003, T004 可平行執行（不同操作）
- **Phase 2**: T005, T006, T007 可平行執行（不同檔案）
- **User Story 測試階段**: 同一 Story 內標記 [P] 的測試可平行撰寫
- **User Story 實作階段**: 同一 Story 內標記 [P] 的實作可平行進行
- **跨 Story 平行**: 若團隊有多人，US1, US2, US3, US4 可同時進行（需協調 Foundational 完成）

---

## Parallel Example: User Story 2A (役種檢測)

```bash
# 測試階段（平行）
Task T026: 建立 yaku-detector.test.ts

# 實作階段（單一檔案，順序執行）
Task T028: 實作 yaku-detector.ts（包含 12 種役種檢測函數）

# 驗證階段（順序執行）
Task T029: 執行測試
Task T030: 檢查覆蓋率
```

---

## Parallel Example: Multiple User Stories (多人團隊)

```bash
# Foundational 完成後，可平行啟動：
Developer A: User Story 1 (Phase 3-4) - 卡片邏輯與配對驗證
Developer B: User Story 2 (Phase 5-6) - 役種檢測與進度計算
Developer C: User Story 4 (Phase 8) - 遊戲進度計算（US3 需等 US2A 完成）

# US2A 完成後：
Developer C: 切換至 User Story 3 (Phase 7) - 對手分析
```

---

## Implementation Strategy

### MVP First (僅 User Story 1 + User Story 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3-4: User Story 1 (卡片邏輯 + 配對驗證)
4. **STOP and VALIDATE**: 測試 US1 獨立功能
5. Complete Phase 5-6: User Story 2 (役種檢測 + 進度計算)
6. **STOP and VALIDATE**: 測試 US1 + US2 整合功能
7. 部署/展示 MVP（P1 功能完整）

### Incremental Delivery (逐步交付)

1. Setup + Foundational → 基礎就緒
2. Add User Story 1 → 測試獨立功能 → 展示卡片邏輯與配對提示
3. Add User Story 2 → 測試獨立功能 → 展示役種檢測與進度提示
4. Add User Story 3 → 測試獨立功能 → 展示對手威脅評估
5. Add User Story 4 → 測試獨立功能 → 展示遊戲進度計算
6. Polish → 完整 Domain Layer 就緒

### Parallel Team Strategy (多人協作)

1. 團隊共同完成 Setup + Foundational
2. Foundational 完成後分工：
   - Developer A: US1 (Phase 3-4)
   - Developer B: US2A (Phase 5) → US2B (Phase 6)
   - Developer C: US4 (Phase 8) → 等 US2A 完成後做 US3 (Phase 7)
3. 各 Story 獨立完成與整合
4. 團隊共同完成 Polish (Phase 9)

---

## Success Criteria Summary

### 測試覆蓋率（spec.md - TR-004, TR-005）
- ✅ 卡片邏輯（card/）：100%
- ✅ 配對驗證（matching/）：100%
- ✅ 役種檢測（yaku/）：100%
- ✅ 對手分析（opponent/）：100%
- ✅ 遊戲進度（progress/）：100%

### 效能指標（plan.md）
- ✅ 役種檢測（24 張牌）：< 10ms
- ✅ 卡片解析與配對驗證：< 5ms
- ✅ 所有 Domain 函數：< 50ms

### 功能正確性（spec.md - SC-001 ~ SC-007）
- ✅ 48 張卡片 ID 解析 100% 正確
- ✅ 配對驗證所有場景 100% 正確
- ✅ 12 種役種檢測 100% 正確
- ✅ 役種衝突解決 100% 正確
- ✅ 邊界值測試 100% 通過
- ✅ 純函數保證（相同輸入 100 次相同輸出）

---

## Notes

- **[P] 任務** = 不同檔案，無依賴，可平行執行
- **[Story] 標籤** = 追溯任務所屬 User Story
- **TDD 嚴格執行** = 先寫測試 → 測試 FAIL → 實作 → 測試 PASS
- **每個 User Story 可獨立完成與測試** = 支援增量交付
- **Checkpoint 驗證** = 每個 Phase 結束後停下來驗證功能正確性
- **避免** = 模糊任務、同一檔案衝突、跨 Story 依賴破壞獨立性
- **測試覆蓋率目標** = 100%（卡片、配對、役種），遵循專案憲法 TDD 原則
- **效能驗證** = Phase 9 執行效能測試，確保符合 plan.md 目標

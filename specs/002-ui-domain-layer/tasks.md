# Tasks: User Interface BC - Domain Layer

**Input**: Design documents from `/specs/002-ui-domain-layer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/domain-types.ts

**Organization**: Tasks are grouped by user story (P1-P2 from spec.md) to enable independent implementation and testing. All tasks follow TDD workflow (test first, implement after).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

此專案為 Web 應用,前端位於 `front-end/` 目錄:
- **Source**: `front-end/src/user-interface/domain/`
- **Tests**: `front-end/src/__tests__/user-interface/domain/`

---

## Phase 1: Setup (專案初始化)

**Purpose**: 建立 Domain Layer 目錄結構和測試環境

- [X] T001 建立 Domain Layer 目錄結構 front-end/src/user-interface/domain/
- [X] T002 驗證 Vitest 測試環境配置 (vitest.config.ts, tsconfig.json)
- [X] T003 [P] 建立測試目錄結構 front-end/src/__tests__/user-interface/domain/

---

## Phase 2: Foundational (基礎型別與卡片資料庫)

**Purpose**: 定義核心型別和卡片資料,這是所有 User Stories 的共用基礎

**⚠️ CRITICAL**: 所有 User Stories 都依賴此階段的型別定義和卡片資料庫

- [X] T004 建立型別定義檔 front-end/src/user-interface/domain/types.ts (從 contracts/domain-types.ts 複製並調整)
- [X] T005 [P] 建立卡片資料庫骨架 front-end/src/user-interface/domain/card-database.ts (48 張語義化常數佔位符)
- [X] T006 [US1] 完整實作 48 張卡片語義化常數定義 (MATSU_HIKARI, UME_AKATAN 等) in front-end/src/user-interface/domain/card-database.ts
- [X] T007 [US1] 實作 ALL_CARDS 陣列 (包含全部 48 張卡片) in front-end/src/user-interface/domain/card-database.ts

**Checkpoint**: 基礎型別與卡片資料庫完成,User Story 實作可並行開始

---

## Phase 3: User Story 1 - 卡片識別與驗證 (Priority: P1) 🎯 MVP

**Goal**: 提供卡片識別、驗證和查詢功能,確保用戶操作的卡片符合標準花札牌組規則

**Independent Test**: 提供任意卡片數據 (month, type, index) 測試是否能正確識別有效性,並能通過語義化常數快速查詢卡片屬性

### Tests for User Story 1 (TDD - 先寫測試)

> **NOTE: 先寫測試,確保測試 FAIL 後再實作**

- [X] T008 [P] [US1] 卡片資料庫測試 front-end/src/__tests__/user-interface/domain/card-database.test.ts
  - 語義化常數查詢正確性 (如 MATSU_HIKARI 返回 month=1, type=BRIGHT)
  - ALL_CARDS 包含 48 張牌
  - 每月卡片數量正確 (每月 4 張)
- [X] T009 [P] [US1] 卡片邏輯測試 front-end/src/__tests__/user-interface/domain/card-logic.test.ts
  - isValidCard() 對有效卡片返回 true (如 {month:1, type:"BRIGHT", index:1})
  - isValidCard() 對無效卡片返回 false (如 {month:13, ...})
  - getCardById() 正確查詢卡片
  - areCardsEqual() 基於 card_id 比較

### Implementation for User Story 1

- [X] T010 [US1] 實作 card-logic.ts 中的 isValidCard() in front-end/src/user-interface/domain/card-logic.ts
  - 驗證 card_id 格式 (MMTI 4 位數字)
  - 驗證 month 範圍 (1-12)
  - 驗證 type 枚舉合法性
  - 驗證卡片存在於 ALL_CARDS 中
- [X] T011 [P] [US1] 實作 getCardById() 查詢函數 in front-end/src/user-interface/domain/card-logic.ts
- [X] T012 [P] [US1] 實作 areCardsEqual() 卡片相等性判斷 (比較 card_id) in front-end/src/user-interface/domain/card-logic.ts
- [X] T013 [US1] 執行測試驗證 User Story 1 完成 (npm run test:unit -- card-database.test.ts card-logic.test.ts)

**Checkpoint**: User Story 1 完成 - 卡片識別與驗證功能可獨立運作

---

## Phase 4: User Story 2 - 配對規則驗證 (Priority: P1)

**Goal**: 即時判斷手牌與場牌是否可配對 (相同月份),提供 UI 高亮反饋

**Independent Test**: 提供一張手牌和一組場牌,測試系統是否正確返回所有可配對場牌 (空陣列/單一配對/多重配對三種情況)

### Tests for User Story 2 (TDD - 先寫測試)

> **NOTE: 先寫測試,確保測試 FAIL 後再實作**

- [ ] T014 [US2] 配對邏輯測試 front-end/src/__tests__/user-interface/domain/matching.test.ts
  - canMatch() 對相同月份返回 true (如 1月光牌 vs 1月短冊)
  - canMatch() 對不同月份返回 false (如 1月 vs 2月)
  - findMatchableCards() 返回空陣列 (無配對)
  - findMatchableCards() 返回單一配對
  - findMatchableCards() 返回多重配對 (場上 3 張同月份)
  - 邊界情況: 空場牌陣列返回空陣列

### Implementation for User Story 2

- [ ] T015 [P] [US2] 實作 canMatch() 函數 (月份相等檢查) in front-end/src/user-interface/domain/matching.ts
- [ ] T016 [P] [US2] 實作 findMatchableCards() 函數 (filter + canMatch) in front-end/src/user-interface/domain/matching.ts
- [ ] T017 [US2] 執行測試驗證 User Story 2 完成 (npm run test:unit -- matching.test.ts)

**Checkpoint**: User Story 2 完成 - 配對規則驗證功能可獨立運作

---

## Phase 5: User Story 3 - 客戶端操作預驗證 (Priority: P1)

**Goal**: 發送命令到伺服器前進行基本驗證 (卡片存在性、目標合法性),提供即時反饋

**Independent Test**: 提供手牌列表、待驗證卡片和可配對目標列表,測試驗證函數是否正確判斷操作合法性

### Tests for User Story 3 (TDD - 先寫測試)

> **NOTE: 先寫測試,確保測試 FAIL 後再實作**

- [ ] T018 [US3] 客戶端驗證測試 front-end/src/__tests__/user-interface/domain/validation.test.ts
  - validateCardExists() 當卡片在手牌中返回 {valid: true}
  - validateCardExists() 當卡片不在手牌中返回 {valid: false, reason: "..."}
  - validateTargetInList() 當目標在列表中返回 {valid: true}
  - validateTargetInList() 當目標不在列表中返回 {valid: false, reason: "..."}
  - 邊界情況: 空手牌陣列返回 false

### Implementation for User Story 3

- [ ] T019 [P] [US3] 實作 validateCardExists() 函數 (使用 areCardsEqual 檢查) in front-end/src/user-interface/domain/validation.ts
- [ ] T020 [P] [US3] 實作 validateTargetInList() 函數 in front-end/src/user-interface/domain/validation.ts
- [ ] T021 [US3] 執行測試驗證 User Story 3 完成 (npm run test:unit -- validation.test.ts)

**Checkpoint**: User Story 3 完成 - 客戶端預驗證功能可獨立運作

---

## Phase 6: User Story 4 - 役種進度計算 (Priority: P2)

**Goal**: 計算並顯示用戶距離達成特定役種還差多少張牌,幫助用戶做出策略決策

**Independent Test**: 提供役種類型和已獲得牌組,測試系統是否正確計算缺少的卡片和完成百分比

### Tests for User Story 4 (TDD - 先寫測試)

> **NOTE: 先寫測試,確保測試 FAIL 後再實作**

- [ ] T022 [US4] 役種進度計算測試 front-end/src/__tests__/user-interface/domain/yaku-progress.test.ts
  - 固定役種 (赤短): 已有 2 張返回 progress=66.67, missing=[SAKURA_AKATAN]
  - 固定役種 (豬鹿蝶): 未獲得任何卡片返回 progress=0, missing=[全部 3 張]
  - 固定役種 (五光): 已完成返回 progress=100, missing=[]
  - 動態役種 (短冊): 已有 3 張返回 progress=60% (3/5)
  - 動態役種 (かす): 已有 5 張返回 progress=50% (5/10)
  - 特殊役種 (三光): 已有 2 張非雨光返回 progress=66.67 (2/3)
  - 特殊役種 (三光): 已有雨光不計入進度

### Implementation for User Story 4

- [ ] T023 [US4] 實作 YAKU_REQUIREMENTS 常數映射 in front-end/src/user-interface/domain/yaku-progress.ts
  - 短冊系: AKATAN, AOTAN
  - 光牌系: GOKO, SHIKO, AMESHIKO (包含雨光邏輯)
  - 種牌系: INOSHIKACHO, TSUKIMI, HANAMI
- [ ] T024 [P] [US4] 實作 calculateYakuProgress() 函數 (固定役種) in front-end/src/user-interface/domain/yaku-progress.ts
  - 計算 obtained (集合交集)
  - 計算 missing (集合差集)
  - 計算 progress 百分比
- [ ] T025 [P] [US4] 實作 calculateDynamicYakuProgress() 函數 (TAN, KASU, TANE) in front-end/src/user-interface/domain/yaku-progress.ts
- [ ] T026 [P] [US4] 實作 calculateSankoProgress() 函數 (三光特殊處理) in front-end/src/user-interface/domain/yaku-progress.ts
  - 排除雨光 (YANAGI_HIKARI)
  - 從 4 張非雨光中任選 3 張
- [ ] T027 [US4] 執行測試驗證 User Story 4 完成 (npm run test:unit -- yaku-progress.test.ts)

**Checkpoint**: User Story 4 完成 - 役種進度計算功能可獨立運作

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 跨 User Story 的改進與文檔更新

- [ ] T028 [P] 執行所有單元測試並驗證覆蓋率 (npm run test:unit)
  - 卡片邏輯: 100%
  - 配對驗證: 100%
  - 役種進度: > 90%
- [ ] T029 [P] 執行型別檢查 (npm run type-check)
- [ ] T030 [P] 執行 ESLint 並修正問題 (npm run lint)
- [ ] T031 導出所有公開 API from front-end/src/user-interface/domain/index.ts
  - 導出型別: Card, CardType, YakuType, YakuProgress, ValidationResult
  - 導出常數: ALL_CARDS, 語義化常數 (MATSU_HIKARI 等), YAKU_REQUIREMENTS
  - 導出函數: isValidCard, canMatch, findMatchableCards, validateCardExists, calculateYakuProgress 等
- [ ] T032 驗證 quickstart.md 所有使用場景可執行

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無依賴 - 可立即開始
- **Foundational (Phase 2)**: 依賴 Setup - **阻塞所有 User Stories**
- **User Stories (Phase 3-6)**: 全部依賴 Foundational 完成
  - User Stories 可並行進行 (若團隊人力充足)
  - 或按優先順序依序進行 (P1 → P1 → P1 → P2)
- **Polish (Phase 7)**: 依賴所有 User Stories 完成

### User Story Dependencies

- **User Story 1 (P1 - 卡片識別)**: Foundational 完成後可開始 - 無其他 Story 依賴
- **User Story 2 (P1 - 配對驗證)**: 依賴 US1 (需要 areCardsEqual) - **須等 US1 完成**
- **User Story 3 (P1 - 客戶端驗證)**: 依賴 US1 (需要 areCardsEqual) 和 US2 (可選) - **須等 US1 完成**
- **User Story 4 (P2 - 役種進度)**: 依賴 US1 (需要 areCardsEqual) - **須等 US1 完成**

### Within Each User Story

TDD 工作流程:
1. **先寫測試** → 測試 FAIL (Red)
2. **實作函數** → 測試 PASS (Green)
3. **重構優化** → 測試仍 PASS (Refactor)
4. **執行測試驗證** → Story 完成

執行順序:
- Tests → Models → Services → 驗證
- Story 完成後再進入下一個 Priority

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 可並行
- **Phase 2**: T005, T006, T007 可並行 (T004 須先完成)
- **Phase 3 (US1)**: T008, T009 可並行 (測試); T011, T012 可並行 (實作)
- **Phase 4 (US2)**: T015, T016 可並行
- **Phase 5 (US3)**: T019, T020 可並行
- **Phase 6 (US4)**: T024, T025, T026 可並行
- **Phase 7**: T028, T029, T030 可並行

**注意**: User Stories 之間有依賴關係,建議依序完成 US1 → US2 → US3 → US4

---

## Parallel Example: User Story 1

```bash
# 並行啟動 User Story 1 的所有測試 (TDD - Red 階段):
Task: "T008 [P] [US1] 卡片資料庫測試"
Task: "T009 [P] [US1] 卡片邏輯測試"

# 測試失敗後,並行實作無依賴的函數 (Green 階段):
Task: "T011 [P] [US1] 實作 getCardById()"
Task: "T012 [P] [US1] 實作 areCardsEqual()"
```

---

## Implementation Strategy

### MVP First (User Story 1-3 Only)

**理由**: User Story 1-3 為 P1 優先級,提供核心卡片識別、配對驗證、客戶端預驗證功能

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational (CRITICAL - 阻塞所有 Stories)
3. 完成 Phase 3: User Story 1 (卡片識別)
4. 完成 Phase 4: User Story 2 (配對驗證)
5. 完成 Phase 5: User Story 3 (客戶端驗證)
6. **STOP and VALIDATE**: 測試 US1-3 獨立運作
7. 部署/Demo (MVP!)

### Incremental Delivery

1. Setup + Foundational → 基礎就緒
2. 增加 User Story 1 → 獨立測試 → 部署/Demo (卡片識別)
3. 增加 User Story 2 → 獨立測試 → 部署/Demo (配對驗證)
4. 增加 User Story 3 → 獨立測試 → 部署/Demo (客戶端驗證) **← MVP**
5. 增加 User Story 4 → 獨立測試 → 部署/Demo (役種進度)
6. 每個 Story 增加價值,不破壞先前功能

### Sequential Strategy (推薦)

**理由**: User Stories 之間存在依賴關係 (US2-4 依賴 US1),建議依序完成

1. 團隊完成 Setup + Foundational
2. 完成 User Story 1 (基礎 - 其他 Story 依賴)
3. 完成 User Story 2 (依賴 US1)
4. 完成 User Story 3 (依賴 US1)
5. 完成 User Story 4 (依賴 US1)
6. Stories 依序整合並測試

---

## Notes

- **[P] 任務**: 不同檔案、無依賴,可並行執行
- **[Story] 標籤**: 追溯任務所屬 User Story
- **TDD 工作流程**: Red (測試失敗) → Green (實作通過) → Refactor (重構優化)
- **獨立測試**: 每個 User Story 應可獨立完成和測試
- **Checkpoint**: 每個階段結束驗證 Story 獨立運作
- **提交頻率**: 每個任務或邏輯群組完成後提交
- **避免**: 模糊任務、相同檔案衝突、破壞獨立性的跨 Story 依賴

---

## Task Summary

- **Total Tasks**: 32
- **Setup Tasks**: 3 (T001-T003)
- **Foundational Tasks**: 4 (T004-T007)
- **User Story 1 Tasks**: 6 (T008-T013) - 卡片識別與驗證
- **User Story 2 Tasks**: 4 (T014-T017) - 配對規則驗證
- **User Story 3 Tasks**: 4 (T018-T021) - 客戶端操作預驗證
- **User Story 4 Tasks**: 6 (T022-T027) - 役種進度計算
- **Polish Tasks**: 5 (T028-T032)

**Parallel Opportunities**: 15 tasks marked [P]

**MVP Scope**: User Stories 1-3 (T001-T021) = 17 tasks

**Full Feature Scope**: All User Stories (T001-T032) = 32 tasks

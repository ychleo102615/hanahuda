# Tasks: 花牌遊戲網站首頁

**Feature**: 001-homepage-implementation
**Generated**: 2025-10-23
**Input**: Design documents from `/specs/001-homepage-implementation/`

**Organization**: 本任務列表按照使用者故事分組，確保每個故事能夠獨立實作與測試。

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: 可並行執行（不同檔案、無依賴）
- **[Story]**: 所屬的使用者故事（例如 US1、US2、US3）
- 所有任務包含明確的檔案路徑

## Path Conventions

本專案採用 Web application 結構：
- 前端代碼：`front-end/src/`
- 測試：`front-end/src/__tests__/`
- 靜態資源：`front-end/src/assets/`

---

## Phase 1: Setup (專案初始化)

**目的**: 建立專案基礎結構與開發環境

- [X] T001 驗證 Node.js 18+ 和 npm 已安裝
- [X] T002 檢查 front-end/ 目錄結構，確認 Vue 3 + TypeScript + Vite 專案已存在
- [X] T003 [P] 檢查並配置 tailwind.config.js 設計 token（色彩、字體、間距）
- [X] T004 [P] 配置 ESLint 和 Prettier 規則
- [X] T005 [P] 驗證 Vitest 和 Vue Test Utils 測試環境配置
- [X] T006 建立組件目錄結構 front-end/src/components/
- [X] T007 建立 composables 目錄 front-end/src/composables/
- [X] T008 建立資料目錄 front-end/src/data/
- [X] T009 建立靜態資源目錄 front-end/src/assets/icons/hanafuda/

**Checkpoint**: ✅ 開發環境就緒，可開始組件實作

---

## Phase 2: Foundational (核心基礎設施)

**目的**: 建立所有使用者故事共用的基礎功能

**⚠️ CRITICAL**: 此階段完成前，無法開始任何使用者故事實作

- [X] T010 建立 Vue Router 配置，新增首頁路由 / → HomePage in front-end/src/router/index.ts
- [X] T011 建立常數檔案解析器，從 doc/rule.md 讀取規則內容 in front-end/src/data/rules.json
- [X] T012 建立常數檔案解析器，從 doc/rule.md 讀取役種資料 in front-end/src/data/yaku.json
- [X] T013 實作 useScrollTo composable，提供平滑滾動功能 in front-end/src/composables/useScrollTo.ts
- [X] T014 [P] 配置全域 Tailwind CSS 樣式 in front-end/src/assets/styles/main.css
- [X] T015 [P] 建立 TypeScript 介面定義檔 front-end/src/types/index.ts（NavigationLink, HeroSectionProps 等）

**Checkpoint**: ✅ 基礎設施完成，使用者故事可開始並行實作

---

## Phase 3: User Story 1 - 快速了解遊戲並開始體驗 (Priority: P1) 🎯 MVP

**Goal**: 新手玩家首次訪問網站時，能夠立即理解這是一個什麼樣的遊戲，並在視覺吸引下快速開始第一次遊戲體驗。

**Independent Test**: 使用者在 5 秒內看到遊戲標題、副標題和「開始遊戲」按鈕，點擊按鈕可導航至遊戲頁面。

### 實作 User Story 1

- [X] T016 [US1] 建立 HeroSection 組件骨架 in front-end/src/components/HeroSection.vue
- [X] T017 [US1] 實作 HeroSection Props 介面（title, subtitle, ctaText, ctaTarget）
- [X] T018 [US1] 實作 HeroSection 桌面版佈局（Flexbox 置中，大標題）
- [X] T019 [US1] 實作 HeroSection 手機版響應式佈局（單欄，標題縮小）
- [X] T020 [US1] 實作「開始遊戲」CTA 按鈕，使用 Vue Router 導航至 /game
- [X] T021 [US1] 新增 Hero Section 背景設計（傳統花牌意象融合現代風格）
- [X] T022 [US1] 實作防止重複點擊邏輯（使用 ref 追蹤導航狀態）
- [X] T023 [US1] 新增鍵盤導航支援（Tab + Enter）和 ARIA 標籤 in HeroSection.vue
- [X] T024 [US1] 建立 HomePage 頁面組件 in front-end/src/views/HomePage.vue
- [X] T025 [US1] 整合 HeroSection 到 HomePage

**測試 User Story 1**:
- [X] T026 [P] [US1] 撰寫 HeroSection 單元測試（渲染、Props 驗證、CTA 點擊）in front-end/src/__tests__/components/HeroSection.spec.ts
- [X] T027 [P] [US1] 撰寫 HeroSection 鍵盤導航測試 in front-end/src/__tests__/components/HeroSection.spec.ts

**Checkpoint**: User Story 1 完整功能可測試（Hero Section 顯示、CTA 導航）

---

## Phase 4: User Story 2 - 學習遊戲規則 (Priority: P2)

**Goal**: 對花牌遊戲不熟悉的國際玩家能夠透過清晰的規則說明快速理解遊戲玩法。

**Independent Test**: 使用者能夠展開規則說明，閱讀遊戲目標、牌組構成、牌的分類、基本役種和遊戲流程。

### 實作 User Story 2

- [X] T028 [P] [US2] 建立 RulesSection 組件骨架 in front-end/src/components/RulesSection.vue
- [X] T029 [P] [US2] 建立 YakuCarousel 組件骨架（役種輪播圖）in front-end/src/components/YakuCarousel.vue
- [X] T030 [US2] 實作 RulesSection Props 介面（categories, yakuList）
- [X] T031 [US2] 實作規則分類折疊/展開狀態管理（ref + Set<string>）in RulesSection.vue
- [X] T032 [US2] 實作規則分類切換邏輯（toggleCategory）in RulesSection.vue
- [X] T033 [US2] 實作規則分類 UI（標題 + 展開按鈕 + 內容區）in RulesSection.vue
- [X] T034 [US2] 實作 CSS transition 動畫（max-height + transition-all）in RulesSection.vue
- [X] T035 [US2] 實作 ARIA 標籤（aria-expanded, aria-controls）in RulesSection.vue
- [X] T036 [US2] 實作 YakuCarousel 狀態管理（currentIndex）in YakuCarousel.vue
- [X] T037 [US2] 實作 YakuCarousel 上一張/下一張邏輯 in YakuCarousel.vue
- [X] T038 [US2] 實作 YakuCarousel UI（卡片顯示 + 導航按鈕）in YakuCarousel.vue
- [X] T039 [US2] 載入規則內容資料（從 front-end/src/data/rules.json）
- [X] T040 [US2] 載入役種資料（從 front-end/src/data/yaku.json）
- [X] T041 [US2] 整合 RulesSection 到 HomePage
- [X] T042 [US2] 整合 YakuCarousel 到 RulesSection

**測試 User Story 2**:
- [X] T043 [P] [US2] 撰寫 RulesSection 單元測試（展開/折疊邏輯）in front-end/src/__tests__/components/RulesSection.spec.ts
- [X] T044 [P] [US2] 撰寫 RulesSection ARIA 標籤測試 in front-end/src/__tests__/components/RulesSection.spec.ts
- [X] T045 [P] [US2] 撰寫 YakuCarousel 單元測試（上一張/下一張）in front-end/src/__tests__/components/YakuCarousel.spec.ts

**Checkpoint**: User Story 2 完整功能可測試（規則區塊展開、役種輪播）

---

## Phase 5: User Story 3 - 瀏覽網站與獲取資訊 (Priority: P3)

**Goal**: 使用者能夠透過導航列快速存取網站的不同區塊。

**Independent Test**: 使用者點擊導航列連結能夠平滑滾動至對應區塊，且「規則」連結會自動展開規則說明。

### 實作 User Story 3

- [X] T046 [US3] 建立 NavigationBar 組件骨架 in front-end/src/components/NavigationBar.vue
- [X] T047 [US3] 實作 NavigationBar Props 介面（logo, links, transparent）
- [X] T048 [US3] 實作 NavigationBar 桌面版佈局（Logo + 導航連結）in NavigationBar.vue
- [X] T049 [US3] 實作 NavigationBar 手機版 hamburger menu in NavigationBar.vue
- [X] T050 [US3] 實作 mobile menu 狀態管理（isMobileMenuOpen）in NavigationBar.vue
- [X] T051 [US3] 實作 mobile menu 切換邏輯（toggleMobileMenu）in NavigationBar.vue
- [X] T052 [US3] 實作 sticky header 滾動偵測（isSticky）in NavigationBar.vue
- [X] T053 [US3] 實作導航連結點擊處理（使用 useScrollTo）in NavigationBar.vue
- [X] T054 [US3] 實作「規則」連結特殊邏輯（滾動 + 自動展開）in NavigationBar.vue
- [X] T055 [US3] 實作「開始遊戲」連結導航至 /game in NavigationBar.vue
- [X] T056 [US3] 新增鍵盤導航支援（Tab, Enter, Escape）in NavigationBar.vue
- [X] T057 [US3] 新增 ARIA 標籤（role="navigation", aria-label）in NavigationBar.vue
- [X] T058 [US3] 整合 NavigationBar 到 HomePage（頂部位置）
- [X] T059 [US3] 建立 HomePage 區塊 ID（#hero, #rules, #about）for 錨點導航

**測試 User Story 3**:
- [X] T060 [P] [US3] 撰寫 NavigationBar 單元測試（渲染、mobile menu 切換）in front-end/src/__tests__/components/NavigationBar.spec.ts
- [X] T061 [P] [US3] 撰寫 NavigationBar 響應式測試（桌面/手機切換）in front-end/src/__tests__/components/NavigationBar.spec.ts
- [X] T062 [P] [US3] 撰寫 useScrollTo composable 單元測試 in front-end/src/__tests__/composables/useScrollTo.spec.ts

**Checkpoint**: User Story 3 完整功能可測試（導航列、平滑滾動）

---

## Phase 6: User Story 4 - 查看版權與授權資訊 (Priority: P3)

**Goal**: 使用者能夠透明地了解網站使用的美術資源來源和授權資訊。

**Independent Test**: 使用者滾動至頁面底部能看到完整的版權聲明和資源 attribution。

### 實作 User Story 4

- [X] T063 [US4] 建立 Footer 組件骨架 in front-end/src/components/Footer.vue
- [X] T064 [US4] 實作 Footer Props 介面（copyrightYear, projectName, attributions）
- [X] T065 [US4] 實作 Footer 桌面版佈局（左右排版）in Footer.vue
- [X] T066 [US4] 實作 Footer 手機版響應式佈局（堆疊內容）in Footer.vue
- [X] T067 [US4] 實作版權聲明文字顯示 in Footer.vue
- [X] T068 [US4] 實作資源 attribution 列表（名稱、來源、授權、連結）in Footer.vue
- [X] T069 [US4] 新增外部連結圖示和 target="_blank" in Footer.vue
- [X] T070 [US4] 整合 Footer 到 HomePage（底部位置）

**測試 User Story 4**:
- [X] T071 [P] [US4] 撰寫 Footer 單元測試（渲染、連結驗證）in front-end/src/__tests__/components/Footer.spec.ts

**Checkpoint**: User Story 4 完整功能可測試（Footer 顯示、連結正確）

---

## Phase 7: Polish & Cross-Cutting Concerns (整合與優化)

**目的**: 跨使用者故事的整合、優化與測試

- [X] T072 [P] 建立 HomePage 整合測試（所有組件正確渲染）in front-end/src/__tests__/views/HomePage.spec.ts
- [X] T073 [P] 撰寫無障礙測試（鍵盤導航完整流程）in front-end/src/__tests__/a11y/keyboard-navigation.spec.ts
- [ ] T074 實作圖像延遲載入優化（使用 import.meta.glob）in front-end/src/assets/images/index.ts
- [X] T075 [P] 配置字體預載入 in front-end/index.html
- [ ] T076 [P] 優化 Tailwind CSS（移除未使用樣式）
- [X] T077 執行 Lighthouse 測試，確認 FCP < 1.5s 和 Score > 90
- [ ] T078 [P] 跨瀏覽器測試（Chrome、Firefox、Safari、Edge）
- [ ] T079 [P] 手機裝置測試（iOS Safari、Android Chrome）
- [ ] T080 [P] 建立 E2E 測試（可選）：完整使用者流程 in front-end/e2e/homepage.spec.ts
- [X] T081 程式碼清理與重構（移除 console.log、未使用變數）
- [X] T082 更新 quickstart.md 驗證步驟（確認所有指令正確）
- [ ] T083 建立 Pull Request 並填寫 PR 描述
- [X] T084 執行最終測試覆蓋率檢查（目標 > 60%）

**Checkpoint**: 所有使用者故事整合完成，產品就緒

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無依賴 - 可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成 - **阻塞所有使用者故事**
- **User Stories (Phase 3-6)**: 所有依賴 Foundational 完成
  - 使用者故事可並行實作（如有多位開發者）
  - 或按優先級依序實作（P1 → P2 → P3）
- **Polish (Phase 7)**: 依賴所有目標使用者故事完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 完成後可開始 - 無其他故事依賴
- **User Story 2 (P2)**: Foundational 完成後可開始 - 獨立可測試
- **User Story 3 (P3)**: Foundational 完成後可開始 - 需整合 User Story 2（自動展開規則）
- **User Story 4 (P3)**: Foundational 完成後可開始 - 無其他故事依賴

### Within Each User Story

- 組件骨架 → Props 介面 → 桌面版佈局 → 手機版響應式 → 互動邏輯 → ARIA 支援 → 測試
- 測試應在實作完成後立即撰寫（TDD 原則：Red-Green-Refactor）
- 每個故事完成後應獨立驗證功能

### Parallel Opportunities

- Phase 1: T003, T004, T005 可並行
- Phase 2: T014, T015 可並行
- Phase 3: T026, T027 (測試) 可並行
- Phase 4: T028, T029 可並行；T043, T044, T045 (測試) 可並行
- Phase 5: T060, T061, T062 (測試) 可並行
- Phase 7: T072, T073, T075, T076, T078, T079, T080 可並行

---

## Parallel Example: User Story 1

```bash
# 並行執行 User Story 1 測試撰寫（實作完成後）：
Task T026: "撰寫 HeroSection 單元測試"
Task T027: "撰寫 HeroSection 鍵盤導航測試"
```

---

## Parallel Example: Foundational Phase

```bash
# 並行執行基礎設施任務：
Task T014: "配置全域 Tailwind CSS 樣式"
Task T015: "建立 TypeScript 介面定義檔"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational (**CRITICAL** - 阻塞所有故事)
3. 完成 Phase 3: User Story 1
4. **STOP and VALIDATE**: 獨立測試 User Story 1
5. 準備就緒即可部署/展示

### Incremental Delivery

1. 完成 Setup + Foundational → 基礎就緒
2. 新增 User Story 1 → 獨立測試 → 部署/展示 (**MVP!**)
3. 新增 User Story 2 → 獨立測試 → 部署/展示
4. 新增 User Story 3 → 獨立測試 → 部署/展示
5. 新增 User Story 4 → 獨立測試 → 部署/展示
6. 每個故事增加價值，不破壞先前功能

### Parallel Team Strategy

若有多位開發者：

1. 團隊共同完成 Setup + Foundational
2. Foundational 完成後：
   - 開發者 A: User Story 1
   - 開發者 B: User Story 2
   - 開發者 C: User Story 3 + 4
3. 故事獨立完成並整合

---

## Edge Cases & Error Handling

根據 spec.md 定義的邊界情況：

- **規則說明內容過長**: RulesSection 展開狀態提供內部滾動（max-height + overflow-y: auto）
- **小螢幕設備（手機）**: NavigationBar 折疊為 hamburger menu（md:hidden / md:flex）
- **瀏覽器禁用 JavaScript**: Hero Section 和規則說明應能正常顯示靜態內容（考慮 SSR 或 noscript 標籤）
- **圖片資源載入失敗**: 使用 @error 事件處理器，顯示替代文字和 fallback 背景色
- **快速點擊多次「開始遊戲」**: 使用 ref 追蹤導航狀態，防止重複導航（isNavigating flag）
- **鍵盤導航**: 所有互動元素支援 Tab 鍵和 Enter 鍵操作（tabindex、@keydown.enter）

---

## Notes

- **[P]** 標記 = 不同檔案、無依賴，可並行執行
- **[Story]** 標記 = 任務所屬的使用者故事，便於追蹤
- 每個使用者故事應獨立完成並可測試
- 遵循 TDD 原則：先寫測試再實作
- 在每個 Checkpoint 停下來驗證故事獨立性
- 每完成一個任務或邏輯群組即 commit
- 避免：模糊任務、同檔案衝突、跨故事依賴破壞獨立性

---

## Testing Notes

根據 research.md 第 8 節測試策略：

- **目標覆蓋率**: 前端組件 > 60%
- **測試框架**: Vitest + Vue Test Utils
- **測試優先級**:
  - **High Priority** (必須實作): useScrollTo、NavigationBar 響應式、RulesSection 折疊/展開
  - **Medium Priority** (建議實作): HeroSection 渲染、Footer 連結、無障礙測試
  - **Low Priority** (可選): E2E 完整流程、視覺回歸測試

---

## Performance Goals

根據 spec.md Success Criteria：

- **SC-006**: 頁面載入時間（First Contentful Paint）< 1.5 秒
- **Lighthouse Performance Score**: > 90
- **Bundle Size (JS)**: < 150KB (gzipped)

驗證方式：執行 T077 Lighthouse 測試

---

## Accessibility Requirements

根據 spec.md FR-014 和 research.md 第 6 節：

- 所有互動元素支援 Tab 鍵導航
- 所有按鈕和連結支援 Enter 鍵觸發
- Mobile menu 支援 Escape 鍵關閉
- 明確的 focus 指示器（:focus-visible）
- ARIA 標籤：role="navigation", aria-expanded, aria-controls, aria-label
- 語義化 HTML：<header>, <nav>, <main>, <section>, <footer>
- 色彩對比度：WCAG AA 標準（4.5:1 一般文字，3:1 大文字）

---

## Total Task Count

- **Phase 1 (Setup)**: 9 tasks
- **Phase 2 (Foundational)**: 6 tasks
- **Phase 3 (User Story 1)**: 12 tasks
- **Phase 4 (User Story 2)**: 18 tasks
- **Phase 5 (User Story 3)**: 17 tasks
- **Phase 6 (User Story 4)**: 9 tasks
- **Phase 7 (Polish)**: 13 tasks

**總計**: 84 tasks

**預估時間**:
- User Story 1: 2-3 小時
- User Story 2: 4-5 小時
- User Story 3: 3-4 小時
- User Story 4: 1 小時
- Setup + Foundational: 1-2 小時
- Polish: 3-4 小時
- **總計**: 14-19 小時（約 2-3 個工作天）

---

## Suggested MVP Scope

**MVP = User Story 1 Only (Phase 1 + 2 + 3)**

這將提供：
- 完整的 Hero Section
- 「開始遊戲」CTA 導航功能
- 響應式設計（桌面 + 手機）
- 基本無障礙支援

後續可漸進式新增 User Story 2（規則說明）、User Story 3（導航列）、User Story 4（Footer）。

---

## Format Validation

✅ 所有任務遵循 checklist 格式：`- [ ] [TaskID] [P?] [Story?] Description with file path`
✅ 任務按使用者故事組織，確保獨立實作與測試
✅ 清晰的 Phase 結構：Setup → Foundational → User Stories → Polish
✅ 明確的依賴關係與並行機會
✅ 每個 Phase 包含 Checkpoint 驗證點

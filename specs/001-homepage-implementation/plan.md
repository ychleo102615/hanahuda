# Implementation Plan: 花牌遊戲網站首頁

**Branch**: `001-homepage-implementation` | **Date**: 2025-10-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-homepage-implementation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

實作花牌遊戲網站的首頁，包含 Hero Section、規則介紹區、導航列和版權聲明區。採用現代日式簡約風格（Modern Japanese Minimalist），融合傳統花牌意象與現代設計風格。前端使用 Vue 3 + TypeScript + Tailwind CSS 實作響應式設計，確保桌面和移動端的良好體驗。

## Technical Context

**Language/Version**: TypeScript 5.x + Vue 3.x
**Primary Dependencies**: Vue 3, TypeScript, Tailwind CSS, Vue Router
**Storage**: N/A (靜態首頁，無資料持久化需求)
**Testing**: Vitest (單元測試), Playwright (可選的 E2E 測試)
**Target Platform**: 現代瀏覽器 (Chrome, Firefox, Safari, Edge)，支援桌面和移動端
**Project Type**: Web (前端靜態頁面)
**Performance Goals**:
- First Contentful Paint (FCP) < 1.5 秒
- 頁面完全載入 < 3 秒
- Lighthouse Performance Score > 90
**Constraints**:
- 響應式設計支援手機、平板、桌面裝置
- 無障礙支援（鍵盤導航、ARIA 標籤）
- 瀏覽器相容性：支援最新兩個主要版本
**Scale/Scope**:
- 單一首頁 (Home Page)
- 預估 4-5 個主要 Vue 組件
- 不涉及後端 API 整合

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Clean Architecture
**Status**: ✅ PASS (with clarification)
- 首頁為純前端靜態頁面，不涉及複雜業務邏輯
- 組件結構將遵循 Vue 3 最佳實踐（Composition API）
- 可複用的 UI 組件將獨立抽離
- **Note**: 由於此功能不涉及後端邏輯，Clean Architecture 的 4 層架構主要應用於後端。前端將遵循 Vue 3 組件化設計原則。

### II. Domain-Driven Development
**Status**: ✅ PASS (with clarification)
- 首頁不涉及核心遊戲邏輯（Game Domain）
- 主要為展示性內容（Hero Section, Rules, Footer）
- 使用清晰的領域語言（如：HeroSection, RulesSection, NavigationBar, Footer）
- **Note**: 此功能屬於 UI/UX 層，不涉及 Aggregates 或 Entities 建模。

### III. Server Authority
**Status**: ✅ PASS
- 首頁為純前端靜態頁面，不涉及遊戲狀態或驗證邏輯
- 「開始遊戲」按鈕導航至遊戲頁面，遊戲邏輯由後端控制
- **Note**: 符合 Server Authority 原則，首頁不執行任何遊戲規則驗證。

### IV. Command-Event Architecture
**Status**: ✅ PASS
- 首頁不涉及與後端的命令-事件通訊
- 僅包含頁面內互動（導航、折疊/展開、平滑滾動）
- **Note**: 此功能不涉及 REST API 或 SSE 通訊。

### V. Test-First Development (TDD)
**Status**: ✅ PASS
- 將為關鍵互動功能編寫單元測試：
  - 導航列的響應式行為（hamburger menu）
  - 規則說明區的折疊/展開邏輯
  - 平滑滾動至指定區塊功能
  - 鍵盤導航功能
- 目標測試覆蓋率：前端組件 > 60%
- **Note**: 遵循 TDD 原則，先寫測試再實作。

### VI. Bounded Context Isolation
**Status**: ✅ PASS
- 首頁屬於 Frontend Bounded Context
- 與遊戲頁面透過 Vue Router 進行導航分離
- 不直接暴露或依賴 Backend Domain Models
- **Note**: 首頁與遊戲頁面為獨立的 Vue 組件，透過 Router 解耦。

### VII. Microservice-Ready Design
**Status**: ✅ PASS
- 首頁為無狀態靜態頁面，天然支援水平擴展
- 未來可部署至 CDN，無需修改架構
- **Note**: 靜態首頁設計天然符合微服務架構原則。

### VIII. API Contract Adherence
**Status**: ✅ PASS
- 首頁不涉及 `doc/game-flow.md` 定義的 API 或 SSE 事件
- **Note**: 此功能不涉及後端通訊，無需遵循 API 契約。

**Overall Gate Status**: ✅ PASS - All principles are satisfied within the scope of a static frontend homepage.

---

### Post-Design Re-evaluation (Phase 1 Complete)

**Re-evaluation Date**: 2025-10-22
**Status**: ✅ PASS - No violations introduced during design phase

**Design Artifacts Reviewed**:
- ✅ research.md: 技術決策符合 Clean Architecture 原則，採用 Vue 3 Composition API
- ✅ data-model.md: 資料結構清晰，組件 Props 介面遵循 DDD 語言
- ✅ quickstart.md: TDD workflow 清楚定義，符合 Constitution V

**Key Confirmations**:
1. **No Backend Logic Added**: 仍為純前端靜態頁面，未引入後端邏輯
2. **No API Contracts Needed**: 不涉及 REST API 或 SSE，符合設計預期
3. **Test Strategy Defined**: Vitest + Vue Test Utils，目標覆蓋率 > 60%
4. **Technology Stack Aligned**: Vue 3 + TypeScript + Tailwind CSS，符合專案技術棧
5. **SVG Assets**: 採用 SVG 格式，MMTI 命名規則 (MM=月份, T=牌型1-4, I=索引)
6. **Data from Constants**: 規則內容和役種資料從常數檔案讀取，避免硬編碼

**No New Complexity Introduced**: 設計階段未引入額外複雜度，維持簡單原則。

**Conclusion**: 所有 Constitution 原則在 Phase 1 設計後仍完全符合，可進入 Phase 2 (Task Generation)。

## Project Structure

### Documentation (this feature)

```text
specs/001-homepage-implementation/
├── plan.md              # This file (/speckit.plan command output)
├── plan-input.md        # Design input from user (已提供)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command) - N/A for static homepage
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
front-end/
├── src/
│   ├── components/           # Vue 組件
│   │   ├── NavigationBar.vue # 導航列組件
│   │   ├── HeroSection.vue   # Hero Section 組件
│   │   ├── RulesSection.vue  # 規則介紹區組件
│   │   └── Footer.vue        # 版權聲明區組件
│   ├── views/                # 頁面級組件
│   │   └── HomePage.vue      # 首頁組件（整合所有區塊）
│   ├── router/
│   │   └── index.ts          # Vue Router 配置（已存在，需新增 / 路由）
│   ├── assets/               # 靜態資源
│   │   ├── images/           # 花牌圖像資源
│   │   └── styles/           # 全域樣式（Tailwind CSS 配置）
│   ├── composables/          # Vue Composition API composables
│   │   └── useScrollTo.ts    # 平滑滾動至指定區塊
│   ├── App.vue               # 根組件（已存在）
│   └── main.ts               # 應用程式入口（已存在）
├── src/__tests__/            # 測試目錄
│   ├── components/           # 組件測試
│   │   ├── NavigationBar.spec.ts
│   │   ├── HeroSection.spec.ts
│   │   ├── RulesSection.spec.ts
│   │   └── Footer.spec.ts
│   └── views/
│       └── HomePage.spec.ts  # 首頁整合測試
├── public/                   # 公開靜態資源
│   └── favicon.ico
├── e2e/                      # E2E 測試（可選）
│   └── homepage.spec.ts
├── package.json              # 專案依賴（已存在）
├── vite.config.ts            # Vite 配置（已存在）
├── tsconfig.json             # TypeScript 配置（已存在）
└── tailwind.config.js        # Tailwind CSS 配置（需檢查是否存在）
```

**Structure Decision**:
- 採用 **Option 2: Web application** 結構，但此功能僅涉及前端 (front-end/)
- 專案使用 Vue 3 + TypeScript + Vite + Tailwind CSS
- 前端代碼位於 `front-end/` 目錄（已存在）
- 後端代碼位於 `backend/` 目錄（未來實作，本功能不涉及）
- 組件設計遵循 Vue 3 Composition API 最佳實踐
- 測試使用 Vitest + Vue Test Utils

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: 無違規事項

本功能為純前端靜態首頁實作，完全符合專案 Constitution 的所有核心原則。無需引入額外複雜度或違反任何設計原則。

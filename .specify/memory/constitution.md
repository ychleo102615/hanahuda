<!--
Sync Impact Report:
- Version change: [NEW] → 1.0.0
- Modified principles: N/A (Initial constitution)
- Added sections:
  * Core Principles (5 principles covering Clean Architecture + DDD fundamentals)
  * Architecture Constraints (Layer dependency and adapter rules)
  * Testing Requirements (Layer-specific testing strategy)
  * Governance (Amendment and compliance procedures)
- Removed sections: N/A
- Templates requiring updates:
  * ✅ plan-template.md - Constitution Check section present
  * ✅ spec-template.md - User Scenarios aligned with independent testability
  * ✅ tasks-template.md - Test-first and phase organization supported
- Follow-up TODOs: None
-->

# Hanahuda (花牌遊戲「來來」) 專案憲章

## 核心原則

### I. 依賴反轉原則 (Dependency Inversion)
**規則**: 高層模組 MUST NOT 依賴低層模組；兩者都 MUST 依賴於抽象介面。依賴方向 MUST 嚴格遵循由外向內。

**理由**: 確保核心業務邏輯獨立於框架、UI、資料庫等外部細節，提高可測試性與可維護性。此為 Clean Architecture 的基石。

**檢查點**:
- Domain Layer 不可 import 任何其他層級的模組
- Application Layer 只能 import Domain Layer 和本層的介面
- UI/Infrastructure Layer 只能依賴 Application Layer 的抽象介面

### II. 領域純淨性 (Domain Purity - NON-NEGOTIABLE)
**規則**: Domain Layer MUST 完全獨立，不得依賴任何外部框架或函式庫（Vue、Pinia、Tailwind 等）。Domain 層只能包含純 TypeScript 類別與介面。

**理由**: 領域邏輯是專案的核心資產，必須與技術實現細節完全隔離。這確保業務規則可以在不同技術棧間移植，並且可以在隔離環境中測試。

**檢查點**:
- Domain Layer 檔案中無任何 `import` 語句來自 node_modules（except TypeScript type utilities）
- Entity、Value Object、Domain Service 皆為純 TypeScript class
- 所有副作用操作通過 Port 介面定義

### III. Bounded Context 隔離 (DDD Boundary Context Isolation)
**規則**: 不同 Bounded Context MUST 保持互相不可知。BC 之間 MUST 只透過整合事件（Integration Events）通訊。跨 BC 的資料傳遞 MUST 使用 Value Object 或 DTO，NEVER 直接傳遞 Entity。

**理由**: 維持各 BC 的自主性與演化能力。game-engine 與 game-ui 兩個 BC 可獨立開發、測試與部署。

**檢查點**:
- game-engine BC 不可直接呼叫 game-ui BC 的程式碼
- game-ui BC 不可直接呼叫 game-engine BC 的程式碼
- 跨 BC 通訊只透過事件匯流排或訊息佇列
- Entity 不可跨越 BC 邊界

### IV. 分層測試策略 (Layer-Specific Testing - NON-NEGOTIABLE)
**規則**: 每個架構層 MUST 有對應的測試策略：
- **Domain Layer**: 單元測試（純函式測試，無 mock）
- **Application Layer**: 整合測試（UseCase 編排測試）
- **UI Layer**: 元件測試（Vue Test Utils）

**理由**: 不同層級的測試目標與策略不同。Domain 測試商業邏輯正確性；Application 測試流程編排；UI 測試使用者互動。

**檢查點**:
- tests/unit/domain/ 包含所有 Domain 實體與值物件的測試
- tests/integration/application/ 包含 UseCase 測試
- tests/component/ui/ 包含 Vue 元件測試
- 所有新增的 Domain Entity MUST 有對應單元測試

### V. Port-Adapter 解耦 (Adapter Independence)
**規則**: Adapter（Presenter、Controller、Repository）之間 MUST 互相保持獨立，MUST NOT 互相依賴。Adapter 之間 ONLY 透過 UseCase 互動。

**理由**: 避免適配器層產生耦合。Presenter 不應知道 Repository 的存在，反之亦然。所有協調邏輯應在 UseCase 中完成。

**檢查點**:
- Presenter 不可 import Repository
- Controller 不可 import Presenter
- Repository 不可 import Controller
- 所有跨 Adapter 操作透過 UseCase 協調

## 架構約束

### 層級定義與依賴規則

**Domain Layer** (src/domain/)
- 不依賴任何其他層級
- 包含: Entity, Value Object, Domain Service, Domain Event
- 允許: 純 TypeScript, 型別定義
- 禁止: Vue, Pinia, 任何 UI 框架, HTTP 函式庫, 資料庫函式庫

**Application Layer** (src/application/)
- 只能依賴 Domain Layer 和本層的介面
- 包含: UseCase, Input/Output Ports, DTO
- UseCase 透過 Output Port 與外部世界互動
- DTO 命名慣例: `XXXRequest` (input), `XXXResponse` (output)

**Infrastructure Layer** (src/infrastructure/)
- 實作 Application Layer 的 Port 介面
- 可依賴 Domain 與 Application
- 包含: Repository 實作, 外部服務適配器, API Client

**UI Layer** (src/ui/ 或 src/presentation/)
- 只依賴 Application Layer（UseCase 與 Port）
- 不可直接依賴 Infrastructure
- 由 Composition Root 注入 Infrastructure 實作
- 包含: Vue 元件, Composables, Presenters

### 特例規則

- **shared/** 資料夾可包含全專案共同依賴的常數定義，但 MUST NOT 包含業務邏輯
- 型別定義檔案（.d.ts）可放置在任何層級以支援型別推斷

## 測試需求

### 測試覆蓋率目標

- Domain Layer: 90%+ 程式碼覆蓋率
- Application Layer: 80%+ 程式碼覆蓋率
- UI Layer: 70%+ 元件覆蓋率

### 測試執行策略

- 單元測試: 使用 Vitest，必須快速執行（< 5 秒）
- 整合測試: 可使用 mock 外部依賴，專注流程驗證
- E2E 測試: 使用 Playwright，驗證使用者旅程

## 治理規範

### 憲章修訂程序

1. 提出修訂建議，說明理由與影響範圍
2. 團隊審查與討論（所有核心開發者參與）
3. 達成共識後更新憲章版本
4. 更新所有依賴憲章的模板文件（plan-template.md, spec-template.md, tasks-template.md）
5. 發布修訂公告並更新專案文件

### 版本規則

- **MAJOR**: 移除或重新定義核心原則，造成不相容變更
- **MINOR**: 新增原則或擴展指導方針
- **PATCH**: 文字修正、澄清說明、非語意變更

### 合規審查

- 所有 Pull Request MUST 在 Description 中包含「憲章合規確認」檢查清單
- Code Review MUST 驗證是否違反架構約束
- 若需要違反原則，MUST 在 PR 中明確說明理由與替代方案評估
- 使用 `/speckit.plan` 生成的 plan.md 中的「Constitution Check」區段進行預先檢查

### 開發指引

- 主要開發指引文件: `CLAUDE.md`
- 本憲章定義「不可妥協的原則」
- CLAUDE.md 提供「實踐細節與範例」
- 發生衝突時，本憲章優先

**版本**: 1.0.0 | **核准日期**: 2025-10-13 | **最後修訂**: 2025-10-13

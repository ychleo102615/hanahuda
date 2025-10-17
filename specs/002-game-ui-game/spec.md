# Feature Specification: Game-UI 與 Game-Engine BC 徹底分離

**Feature Branch**: `002-game-ui-game`
**Created**: 2025-10-17
**Status**: Draft
**Input**: User description: "上一階段的領域分離沒有完全成功，請參考以下階段規劃，徹底分離 game-ui, game-engine BC"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - game-engine BC 完全獨立化 (Priority: P1)

身為開發者，我需要 game-engine BC 完全獨立運作，不依賴任何外部 BC 的 application 層，以便實現真正的領域隔離。

**Why this priority**: 這是整個重構的基礎。game-engine 必須先完全獨立，才能讓其他 BC 正確地透過整合事件與之溝通。這確保了 DDD 的 Bounded Context 邊界原則。

**Independent Test**: 可以透過 TypeScript 編譯檢查來驗證 - 檢查 `src/game-engine/` 底下所有檔案是否不再有 `import ... from '@/application/'` 或 `import ... from '@/infrastructure/'` 的情況（除了整合事件相關的 shared 部分）。

**Acceptance Scenarios**:

1. **Given** game-engine BC 的任一 Use Case，**When** 檢查其 import 語句，**Then** 應只依賴 `@/game-engine/` 和 `@/shared/` 路徑
2. **Given** game-engine BC 需要 Repository，**When** Use Case 注入依賴，**Then** 應使用 `@/game-engine/application/ports/` 定義的 port interface
3. **Given** game-engine BC 需要傳遞資料，**When** Use Case 執行，**Then** 應使用 `@/game-engine/application/dto/` 定義的 DTO
4. **Given** game-engine BC 需要通知外部，**When** 遊戲狀態變更，**Then** 應發送整合事件而非呼叫 GamePresenter

---

### User Story 2 - game-ui BC 完整實現並接管 UI 層 (Priority: P2)

身為開發者，我需要所有 UI 相關的程式碼都遷移到 game-ui BC 底下，並透過新的 DIContainer 配置來運作，以實現 UI 關注點的完整隔離。

**Why this priority**: 在 game-engine 獨立後，UI 層必須切換到使用新的 BC 架構。這確保所有 presentation 邏輯集中在 game-ui BC，透過整合事件接收 game-engine 的通知。

**Independent Test**: 可以透過檢查 `src/ui/` 目錄是否已清空（或僅剩極少數待移除檔案），以及 `src/game-ui/presentation/components/` 是否包含所有 UI components 來驗證。同時檢查 GameView.vue 是否使用新的 DIContainer 配置。

**Acceptance Scenarios**:

1. **Given** 需要更新 DI 配置，**When** 建立或更新 DIContainer，**Then** 應使用 game-ui BC 的 Controller 和 Store
2. **Given** GameView.vue 需要顯示遊戲，**When** 載入頁面，**Then** 應使用 game-ui BC 的 Controller 而非舊的 UI Controller
3. **Given** UI components 需要重新組織，**When** 執行遷移，**Then** 所有 components（CardComponent, GameBoard, PlayerHand 等）應從 `src/ui/components/` 移至 `src/game-ui/presentation/components/`
4. **Given** main.ts 需要初始化應用，**When** 啟動應用，**Then** 應使用新的 DI 設定來注入 game-ui BC 的相依元件

---

### User Story 3 - 測試驗證與問題修復 (Priority: P3)

身為開發者，我需要確保重構後所有測試仍然通過，且遊戲功能正常運作，以保證程式碼品質和使用者體驗不受影響。

**Why this priority**: 重構可能引入新的問題，必須在刪除舊程式碼前確保所有功能正常，避免破壞現有功能。

**Independent Test**: 執行 `npm run test` 並確認通過率維持在 94% 以上，手動測試遊戲流程（開始遊戲、出牌、回合結束、遊戲結束）全部正常。

**Acceptance Scenarios**:

1. **Given** 重構完成後，**When** 執行所有單元測試，**Then** 測試通過率應 >= 94.3%（82/87）
2. **Given** 重構完成後，**When** 執行 TypeScript 編譯，**Then** 應無編譯錯誤
3. **Given** 使用者開始新遊戲，**When** 執行完整遊戲流程，**Then** 所有遊戲階段（setup, playing, koikoi, round_end, game_end）應正常運作
4. **Given** 發現遷移後的問題，**When** 分析問題原因，**Then** 應修復問題並重新驗證

---

### User Story 4 - 刪除舊程式碼並清理專案 (Priority: P4)

身為開發者，我需要移除所有舊的、未使用的程式碼目錄，以保持專案結構清晰，避免未來的混淆和維護負擔。

**Why this priority**: 這是清理工作，必須在確認新架構完全正常後才能執行，避免誤刪仍在使用的程式碼。

**Independent Test**: 檢查 `src/domain/`, `src/application/`, `src/infrastructure/repositories/`, `src/ui/` 是否已刪除，且 TypeScript 編譯仍然通過。

**Acceptance Scenarios**:

1. **Given** game-engine BC 已獨立，**When** 刪除 `src/domain/`，**Then** 應無編譯錯誤（因為已使用 `src/game-engine/domain/`）
2. **Given** game-ui BC 已接管 UI，**When** 刪除 `src/ui/`，**Then** 應無編譯錯誤（因為已使用 `src/game-ui/presentation/`）
3. **Given** 需要保留部分共享服務，**When** 刪除 `src/infrastructure/`，**Then** 應保留 `src/infrastructure/di/` 和共享的 services（如果仍需要）
4. **Given** 所有 DTOs 已遷移，**When** 刪除 `src/application/`，**Then** 應檢查是否有任何 DTO 需要保留或遷移到 shared

---

### Edge Cases

- **跨 BC 的循環依賴**: 確保 game-engine 和 game-ui 之間沒有直接的相互依賴，僅透過整合事件通訊
- **測試中的依賴注入**: 某些測試可能仍依賴舊的 DIContainer 配置，需要更新測試的 setup
- **整合事件的型別定義**: 確保整合事件的型別定義在 `@/shared/events/` 中，兩個 BC 都可以安全使用
- **現有功能的向後相容**: 重構過程中可能需要暫時保留某些舊的 adapter，確保分階段遷移不會破壞現有功能
- **Repository 實作的重複**: LocalGameRepository 可能需要為 game-engine BC 建立專屬的實作，或確保透過 port interface 正確隔離

## Requirements *(mandatory)*

### Functional Requirements

#### 階段 1：game-engine BC 獨立化

- **FR-001**: game-engine BC 必須在 `src/game-engine/application/ports/` 建立自己的 Repository port interface
- **FR-002**: game-engine BC 必須在 `src/game-engine/application/dto/` 建立所有需要的 DTOs
- **FR-003**: 所有 game-engine Use Cases 必須將依賴從 `@/application/` 改為 `@/game-engine/application/`
- **FR-004**: game-engine BC 必須移除所有對 GamePresenter port 的使用，改用整合事件發送通知
- **FR-005**: game-engine BC 的所有 Use Cases 必須僅依賴 `@/game-engine/` 和 `@/shared/` 路徑

#### 階段 2：UI 切換到新的 game-ui BC

- **FR-006**: 必須建立或更新 DIContainer 以使用新的 game-ui BC 元件
- **FR-007**: GameView.vue 必須切換到使用 game-ui BC 的 Controller 和 Store
- **FR-008**: 所有 UI components（CardComponent.vue, GameBoard.vue, PlayerHand.vue 等）必須遷移到 `src/game-ui/presentation/components/`
- **FR-009**: main.ts 必須更新為使用新的 DI 設定，注入 game-ui BC 的相依元件
- **FR-010**: game-ui BC 必須透過整合事件訂閱來接收 game-engine 的狀態更新

#### 階段 3：測試與驗證

- **FR-011**: 所有單元測試和整合測試必須執行並通過（維持 >= 94% 通過率）
- **FR-012**: TypeScript 編譯必須成功，無跨 BC 非法依賴錯誤
- **FR-013**: 必須手動測試完整的遊戲流程，確保所有功能正常（開始遊戲、出牌、宣告來來、回合結束、遊戲結束、放棄遊戲）
- **FR-014**: 發現的任何遷移後問題必須被修復並重新驗證

#### 階段 4：刪除舊程式碼

- **FR-015**: 必須刪除 `src/domain/` 目錄（game-engine BC 已有自己的 domain）
- **FR-016**: 必須刪除 `src/application/` 目錄（可保留需要的 DTOs，但應遷移到適當位置）
- **FR-017**: 必須刪除 `src/infrastructure/repositories/`（保留 di/ 和共享 services）
- **FR-018**: 必須刪除 `src/ui/` 目錄（所有 UI 已遷移到 game-ui BC）

### Key Entities

由於這是重構任務，主要涉及程式碼結構調整而非新的業務實體。以下是涉及的關鍵概念：

- **Bounded Context (BC)**: game-engine 和 game-ui 兩個獨立的限界上下文，各自擁有完整的 Clean Architecture 分層
- **Integration Events**: 跨 BC 通訊的唯一機制，定義在 `@/shared/events/` 中
- **Repository Ports**: game-engine BC 內部定義的資料存取抽象介面
- **DTOs (Data Transfer Objects)**: 在 BC 內部和透過整合事件傳遞的資料傳輸物件
- **DIContainer**: 相依注入容器，負責組裝和注入各 BC 的元件

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: TypeScript 編譯成功，無任何跨 BC 直接依賴的錯誤（可透過 `npm run type-check` 或 `tsc --noEmit` 驗證）
- **SC-002**: 測試通過率維持在 94% 以上（82/87 個測試通過），確保重構未破壞現有功能
- **SC-003**: 靜態分析確認 game-engine BC 的所有檔案（`src/game-engine/**/*.ts`）不包含 `import ... from '@/application/'` 或 `import ... from '@/domain/'`（舊路徑）
- **SC-004**: 靜態分析確認 game-ui BC 的所有檔案（`src/game-ui/**/*.ts`）不包含對 game-engine 內部實作的直接 import（僅允許 `@/shared/events/`）
- **SC-005**: 手動測試確認完整遊戲流程可正常執行（從遊戲設定、出牌、回合結束到遊戲結束，至少完成 3 回合的完整遊戲）
- **SC-006**: 專案目錄中不再存在 `src/domain/`, `src/application/dto/`, `src/ui/components/` 等舊的目錄結構
- **SC-007**: 開發伺服器可正常啟動並運作（`npm run dev` 成功啟動且無 runtime 錯誤）

## Assumptions

1. **整合事件機制已就緒**: 假設 `@/shared/events/` 中的整合事件機制已正確實作且穩定，可供兩個 BC 使用
2. **測試涵蓋率足夠**: 假設現有的 94% 測試通過率已涵蓋主要業務邏輯，重構後測試失敗可快速定位問題
3. **Vue 元件遷移不影響行為**: 假設將 Vue components 從 `src/ui/components/` 遷移到 `src/game-ui/presentation/components/` 僅涉及檔案移動和 import 路徑更新，不需要修改元件內部邏輯
4. **DIContainer 配置可靈活調整**: 假設現有的 DIContainer 設計已支援靈活的元件注入，可以無痛切換到新的 BC 元件
5. **不需要資料遷移**: 這是程式碼結構重構，不涉及使用者資料或持久化資料的格式變更

## Dependencies

- **整合事件系統**: 必須依賴 `@/shared/events/` 的 EventBus 和整合事件定義
- **TypeScript 編譯器**: 用於驗證架構邊界和型別正確性
- **測試框架**: 用於驗證重構後功能完整性（Vitest）
- **現有的 Clean Architecture 分層**: 兩個 BC 內部都必須遵循既有的 Domain -> Application -> Infrastructure/Presentation 分層

## Constraints

- **不可破壞現有功能**: 重構過程中必須確保遊戲的所有功能持續可用
- **必須遵循 DDD 和 Clean Architecture 原則**:
  - Bounded Context 之間嚴格隔離
  - 依賴方向由外向內（Domain <- Application <- Infrastructure/Presentation）
  - 僅透過整合事件跨 BC 通訊
- **測試通過率不可降低**: 重構後測試通過率必須 >= 94%
- **TypeScript 嚴格模式**: 必須在 TypeScript 嚴格模式下通過編譯
- **最小化檔案變更**: 盡可能保留現有程式碼的邏輯，僅調整結構和依賴關係

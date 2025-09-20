# 日本花牌遊戲「來來」(Koi-Koi) 專案

## 專案概述

使用 Vue 3 + TypeScript + Tailwind CSS 開發的日本花牌遊戲，採用 Clean Architecture 架構設計，支援多種 UI 實現方式（HTML DOM 或 WebGL/PixiJS）及遊戲邏輯切換（本地邏輯或服務器 API）。

## 技術棧

- **前端框架**: Vue 3 (Composition API)
- **程式語言**: TypeScript
- **樣式框架**: Tailwind CSS
- **架構模式**: Clean Architecture
- **未來擴展**: PixiJS/WebGL 支援，Server API 整合

## Clean Architecture 分層設計

### 1. Domain Layer (領域層)

- **Entities**: 遊戲核心實體
  - Card (花牌)
  - Player (玩家)
  - GameState (遊戲狀態)
  - Yaku (役種組合)
- **Value Objects**: 值對象
  - CardSuit (花牌花色)
  - Score (分數)
  - GamePhase (遊戲階段)
- **Domain Services**: 領域服務 (複雜業務規則)
  - YakuCalculator (役種計算)
  - CardMatchingService (配對邏輯)

### 2. Application Layer (應用層)

- **Use Cases**: 應用用例 (業務流程編排)
  - PlayCardUseCase (出牌流程)
  - CalculateScoreUseCase (計分流程)
  - StartGameUseCase (開始遊戲)
  - EndRoundUseCase (結束回合)
- **DTOs**: 資料傳輸對象
  - PlayCardInputDTO / PlayCardOutputDTO
  - CalculateScoreInputDTO / CalculateScoreOutputDTO
  - StartGameInputDTO / StartGameOutputDTO
  - EndRoundInputDTO / EndRoundOutputDTO
- **Ports**: 對外介面定義
  - Repositories (資料存取介面)
    - GameStateRepository (遊戲狀態儲存)
    - PlayerRepository (玩家資料)
  - Presenters (OutputBoundary：通知 UI 更新的介面)
    - GamePresenter (呈現 PlayCard/Score/Flow 的 ViewModel)

### 3. Infrastructure Layer (基礎設施層)

- **Repositories**: 資料存取實現
  - InMemoryGameStateRepository (記憶體儲存)
  - LocalStorageGameStateRepository (瀏覽器儲存)
  - APIGameStateRepository (遠端 API)
- **External Services**: 外部服務實現
  - WebSocketGameService (WebSocket 連線)
  - RESTAPIGameService (REST API)
- **Adapters**: 介面轉接器
  - GameAPIAdapter (API 轉接)
  - EventBusAdapter (事件匯流排)

### 4. UI Layer (使用者介面層)

- **Vue Components**: Vue 元件
  - GameBoard (遊戲板)
  - PlayerHand (玩家手牌)
  - CardComponent.vue
  - ScoreDisplay (分數顯示)
- **Stores**: 狀態管理 (Pinia)
  - GameStore (遊戲狀態)
  - UIStore (介面狀態)
- **Composables**: 組合式函數
  - useGameLogic (遊戲邏輯)
  - useRenderer (渲染器)
- **Controllers**: 控制器
  - GameController (遊戲控制)
  - InputController (輸入處理)
- Presenters (Adapters)
  - VueGamePresenter (實作 GamePresenter，將 OutputDTO 寫入 Store)
- **Rendering**: 支援多種渲染方式
  - 目前：Vue 元件負責 DOM 渲染（透過 Presenter 架構）
  - 未來：可擴展 PixiJS/WebGL 渲染器
  - 使用 Tailwind CSS 進行 DOM 樣式控制

## 開發目標

### Phase 1: 基礎架構建立

- [ ] 設置 Vue 3 + TypeScript + Tailwind 專案
- [ ] 實現 Clean Architecture 基礎結構
- [ ] 建立花牌實體與基本遊戲邏輯
- [ ] 實現 Vue 元件版本的 UI

### Phase 2: 遊戲功能完善

- [ ] 完整的來來遊戲規則實現
- [ ] 計分系統與役種判定
- [ ] 遊戲流程控制
- [ ] 基本 AI 對手

### Phase 3: UI 擴展

- [ ] 實現 PixiJS/WebGL 渲染器
- [ ] UI 渲染器切換功能
- [ ] 動畫與特效系統

### Phase 4: 網路功能

- [ ] 實現遠端 API 介面
- [ ] 多人遊戲支援
- [ ] 離線/線上模式切換

## 開發指導原則

### Clean Architecture 核心原則

1. **依賴反轉**: 高層模組不依賴低層模組，都依賴於抽象
2. **單一責任**: 每個類別只有一個變更的理由
3. **開閉原則**: 對擴展開放，對修改關閉
4. **介面隔離**: 依賴於抽象而非具體實現

### 分層依賴規則

- **Domain Layer**: 不依賴任何其他層級，完全獨立
- **Application Layer**: 只能依賴 Domain Layer
- **Infrastructure Layer**: 實作 Application/Ports（Repositories/外部服務），可依賴 Domain 與 Application
- **UI Layer**: 僅依賴 Application 層（Use Cases/Ports），不直接依賴 Infrastructure；由 Composition Root 注入實作

### 架構修正要點

1. **Use Cases 遷移**: 從 `domain/usecases/` 移至 `application/use-cases/`
2. **介面分離**: Repository 介面移至 Application/Ports；Presenter Port 新增於 Application/Ports；渲染方式由具體實現決定
3. **DTOs 引入**: 使用資料傳輸對象隔離層級間的資料流
4. **依賴注入**: 使用 DI 容器管理依賴關係
5. **Ports & Adapters**: 明確定義對外介面與實現

## 配置說明

### Vite 配置

- TypeScript 嚴格模式
- Path aliases 設定
- Tailwind CSS 整合

### Vue 配置

- Composition API 優先
- TypeScript 支援
- Pinia 狀態管理

### 測試策略

- Domain 層單元測試（核心邏輯）
- Application 層整合測試
- UI 層元件測試

## 注意事項

### 架構約束

- **Domain Layer 純度**: 領域層不可依賴任何外部框架或庫
- **Use Cases 位置**: 用例屬於 Application Layer，負責編排業務流程
- **介面分離原則**: UI/Presenter 相關介面不應出現在 Domain Layer；Presenter Port 位於 Application
- **依賴方向**: 必須嚴格遵循由外向內的依賴方向

### 重構指導

1. **現有 Use Cases**: 需從 `domain/usecases/` 遷移至 `application/use-cases/`
2. **Repository 介面**: 簡化為純資料存取，移除業務邏輯方法，並移至 **application/ports/repositories/**
3. **Presenter Port**: 新增 \
   application/ports/presenters/GamePresenter.ts；由 ui/presenters/VueGamePresenter.ts 實作
4. **UI 介面**: 從 `domain/interfaces/` 移至 `infrastructure/renderers/`
5. **依賴注入**: 建立 DI 容器統一管理依賴關係

這個修正後的架構設計讓你可以：

1. 維持真正的 Clean Architecture 原則
2. 輕鬆切換 DOM 和 WebGL 渲染
3. 無痛轉換本地邏輯到伺服器 API
4. 確保各層級責任清晰分離
5. 提升程式碼的可測試性和可維護性
6. 支援依賴注入和控制反轉

# 日本花牌遊戲「來來」(Koi-Koi) 專案

## 專案概述

使用 Vue 3 + TypeScript + Tailwind CSS 開發的日本花牌遊戲，嚴格採用 Clean Architecture 架構設計，支援多種 UI 實現方式（HTML DOM 或 WebGL/PixiJS）及遊戲邏輯切換（本地邏輯或服務器 API）。支持多語系顯示。

## 技術棧

- **前端框架**: Vue 3 (Composition API)
- **程式語言**: TypeScript
- **樣式框架**: Tailwind CSS
- **架構模式**: Clean Architecture
- **未來擴展**: PixiJS/WebGL 支援，Server API 整合

## Clean Architecture 分層設計

**🚨 這些規則絕對不可忽略**

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

### 架構約束

- **依賴方向**: 必須嚴格遵循由外向內的依賴方向
- **Domain Layer**: 最內層。不依賴任何其他層級，完全獨立。領域層不可依賴任何外部框架或庫
- **Application Layer**: Domain外層。只能依賴 Domain Layer。用例屬於 Application Layer，負責編排業務流程
- **Infrastructure Layer**: Application外層。實作 Application/Ports（Repositories/外部服務），可依賴 Domain 與 Application
- **UI Layer**: Application外層。僅依賴 Application 層（Use Cases/Ports），不直接依賴 Infrastructure；由 Composition Root 注入實作
- 適配器不可互相依賴，presenter, controller, repository應互相保持獨立，只透過usecase互動。

# 任務完成檢查清單

請在完成每個任務後確認：

- [ ] 是否遵循架構約束?

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

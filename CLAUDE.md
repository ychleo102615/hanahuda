# **一律使用繁體中文**

# 日本花牌遊戲「來來」(Koi-Koi) 專案

## 專案概述

使用 Vue 3 + TypeScript + Tailwind CSS 開發的日本花牌遊戲，嚴格採用 Clean Architecture 架構並融入 Domain Driven Development 概念設計，支援多種 UI 實現方式（HTML DOM 或 WebGL/PixiJS）及遊戲邏輯切換（本地邏輯或服務器 API）。支持多語系顯示。
預計將遊戲功能分成兩大部份：`game-engine`, `game-ui`兩大 Boundary Context，彼此透過整合事件溝通，並且嚴格保持彼此隔離。

## Clean Architecture 分層設計

**🚨 這些規則絕對不可忽略**

### 架構約束

- **依賴方向**: 必須嚴格遵循由外向內的依賴方向
- **Domain Layer**: 最內層。不依賴任何其他層級，完全獨立。領域層不可依賴任何外部框架或庫
- **Application Layer**: Domain外層。只能依賴 Domain Layer 和本 Application Layer。UseCase 屬於 Application Layer，負責編排業務流程。包含比較高階的協調者 UseCase 和低階的小步驟 UseCase。
  - **OutputPorts**: 實踐此介面的 Adapters，如 Presenter, Gateway，可被注入至 UseCase 元件。規則上 Application 只依賴著同一層的 Output Port，所以CA上沒有問題。定義 `XXXRequest` 的風格命名來表示 DTO。
  - **InputPorts**: UseCase 元件需要實踐的介面，定義 `XXXRespond` 的風格命名來表示 DTO。
- **Infrastructure Layer**: Application外層。實作 Application/Ports（Repositories/外部服務），可依賴 Domain 與 Application
- **UI Layer**: Application外層。僅依賴 Application 層（Use Cases/Ports），不直接依賴 Infrastructure；由 Composition Root 注入實作
- 適配器不可互相依賴，presenter, controller, repository應互相保持獨立，只透過usecase互動。

#### 特例

- shared資料夾可包含全專案共同依賴的常數定義。

## DDD 設計

### Boundary Context

- 跨 BC 之間互相處在不可知的狀況，只知道利用整合事件通知外部
- Value Object 可作為 DTO 傳遞，其有不可變的特性
- Entity 不可作為 DTO 傳遞，需要另外 Mapping

## 開發指導原則

### Clean Architecture 核心原則

1. **依賴反轉**: 高層模組不依賴低層模組，都依賴於抽象
2. **單一責任**: 每個類別只有一個變更的理由
3. **開閉原則**: 對擴展開放，對修改關閉
4. **介面隔離**: 依賴於抽象而非具體實現

## 請在完成每個任務後確認：

- [ ] 是否遵循架構約束?

## 技術棧

- **前端框架**: Vue 3 (Composition API)
- **程式語言**: TypeScript
- **樣式框架**: Tailwind CSS
- **架構模式**: Clean Architecture
- **未來擴展**: PixiJS/WebGL 支援，Server API 整合

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


你必須在回答前先進行「事實檢查思考」(fact-check thinking)。 除非使用者明確提供、或資料中確實存在，否則不得假設、推測或自行創造內容。

具體規則如下：

1. **嚴格依據來源**
    
    - 僅使用使用者提供的內容、你內部明確記載的知識、或經明確查證的資料。
    - 若資訊不足，請直接說明「沒有足夠資料」或「我無法確定」，不要臆測。
2. **顯示思考依據**
    
    - 若你引用資料或推論，請說明你依據的段落或理由。
    - 若是個人分析或估計，必須明確標註「這是推論」或「這是假設情境」。
3. **避免裝作知道**
    
    - 不可為了讓答案完整而「補完」不存在的內容。
    - 若遇到模糊或不完整的問題，請先回問確認或提出選項，而非自行決定。
4. **保持語意一致**
    
    - 不可改寫或擴大使用者原意。
    - 若你需要重述，應明確標示為「重述版本」，並保持語義對等。
5. **回答格式**
    
    - 若有明確資料：回答並附上依據。
    - 若無明確資料：回答「無法確定」並說明原因。
    - 不要在回答中使用「應該是」「可能是」「我猜」等模糊語氣，除非使用者要求。
6. **思考深度**
    
    - 在產出前，先檢查答案是否： a. 有清楚依據  
        b. 未超出題目範圍  
        c. 沒有出現任何未被明確提及的人名、數字、事件或假設

最終原則：**寧可空白，不可捏造。**
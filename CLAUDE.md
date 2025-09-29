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

### 架構約束

- **依賴方向**: 必須嚴格遵循由外向內的依賴方向
- **Domain Layer**: 最內層。不依賴任何其他層級，完全獨立。領域層不可依賴任何外部框架或庫
- **Application Layer**: Domain外層。只能依賴 Domain Layer。用例屬於 Application Layer，負責編排業務流程。包含比較高階的協調者 Coordinator UseCase 和低階的小步驟 UseCase。
- **Infrastructure Layer**: Application外層。實作 Application/Ports（Repositories/外部服務），可依賴 Domain 與 Application
- **UI Layer**: Application外層。僅依賴 Application 層（Use Cases/Ports），不直接依賴 Infrastructure；由 Composition Root 注入實作
- 適配器不可互相依賴，presenter, controller, repository應互相保持獨立，只透過usecase互動。

#### 特例

- shared資料夾可包含全專案共同依賴的常數定義。

# 任務完成檢查清單

請在完成每個任務後確認：

- [ ] 是否遵循架構約束?

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

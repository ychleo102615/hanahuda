# Research Document: User Interface BC - Domain Layer

**Feature**: User Interface BC - Domain Layer
**Branch**: `002-user-interface-bc`
**Date**: 2025-11-09

## 研究總結

**結論**：所有技術細節已從專案文檔中明確獲得，**無需額外研究**。

本 Domain Layer 的所有技術決策均基於以下文檔：
- `doc/readme.md` - 專案概述與技術棧
- `doc/frontend/user-interface/domain.md` - Domain Layer 規格
- `doc/shared/protocol.md` - 卡片 ID 編碼規則
- `doc/shared/data-contracts.md` - 數據結構定義
- `doc/shared/game-rules.md` - 遊戲規則與役種定義
- `doc/quality/testing-strategy.md` - 測試策略與覆蓋率目標
- `doc/quality/metrics.md` - 效能指標
- `.specify/memory/constitution.md` - 專案憲法

---

## 技術決策記錄

### 1. 語言與版本

**決策**: TypeScript 5.x

**理由**:
- 專案已採用 TypeScript（`doc/readme.md` 明確定義）
- Domain Layer 需要強型別保證，避免運行時錯誤
- TypeScript 5.x 支援最新 ES2020+ 特性

**依據文檔**: `doc/readme.md` - 技術棧定義

---

### 2. 依賴管理

**決策**: 零框架依賴（Pure TypeScript）

**理由**:
- Clean Architecture 原則：Domain Layer 不依賴任何外部框架（`.specify/memory/constitution.md` - Principle I）
- 純函數設計，僅使用 TypeScript 基礎型別（`doc/frontend/user-interface/domain.md` - 核心原則）
- 確保可測試性與可維護性

**依據文檔**:
- `.specify/memory/constitution.md` - Clean Architecture 原則
- `doc/frontend/user-interface/domain.md` - 核心原則

---

### 3. 測試框架

**決策**: Vitest + expect

**理由**:
- 專案測試策略明確定義使用 Vitest（`doc/quality/testing-strategy.md`）
- Vitest 原生支援 TypeScript，無需額外配置
- 內建 expect 斷言庫，語法與 Jest 相容
- 快速執行，適合 Domain Layer 單元測試

**依據文檔**: `doc/quality/testing-strategy.md` - Domain Layer 測試

---

### 4. 目標平台

**決策**: 現代瀏覽器（ES2020+ 支援環境）

**理由**:
- 專案假設文檔明確說明不需考慮 IE11 相容性（`specs/002-user-interface-bc/spec.md` - Assumptions）
- ES2020+ 支援所有現代瀏覽器（Chrome 80+、Firefox 72+、Safari 13.1+、Edge 80+）
- 可使用現代 JavaScript 特性（Optional Chaining、Nullish Coalescing 等）

**依據文檔**: `specs/002-user-interface-bc/spec.md` - Assumptions

---

### 5. 效能目標

**決策**:
- 役種檢測單次執行 < 10ms（處理最大情境：24 張牌）
- 卡片解析與配對驗證 < 5ms
- 所有 Domain 函數執行時間 < 50ms

**理由**:
- UI 即時反饋需求：使用者選擇手牌後，場牌高亮需在 50ms 內完成（`specs/002-user-interface-bc/spec.md` - Success Criteria SC-011）
- 役種檢測效能標準：24 張牌情境下 < 10ms（`doc/quality/metrics.md` - 前端效能）
- 確保流暢的使用者體驗

**依據文檔**:
- `specs/002-user-interface-bc/spec.md` - Success Criteria
- `doc/quality/metrics.md` - 效能指標

---

### 6. 設計約束

**決策**:
- ✅ 純函數設計：無副作用，同樣輸入保證同樣輸出
- ✅ 框架無關：不依賴 Vue、Pinia、任何 UI 組件
- ✅ 可獨立測試：無需 UI 環境或瀏覽器 API
- ✅ 伺服器權威：前端驗證僅用於即時反饋，最終驗證由後端負責

**理由**:
- **純函數設計**: Clean Architecture Domain Layer 要求（`.specify/memory/constitution.md` - Principle I）
- **框架無關**: 確保 Domain Layer 可移植性與可測試性（`doc/frontend/user-interface/domain.md` - 核心原則）
- **可獨立測試**: Domain Layer 測試覆蓋率目標 100%，需要無需 UI 環境即可測試（`doc/quality/testing-strategy.md`）
- **伺服器權威**: 專案憲法明確定義（`.specify/memory/constitution.md` - Principle III）

**依據文檔**:
- `.specify/memory/constitution.md` - 核心原則 I, III
- `doc/frontend/user-interface/domain.md` - 核心原則
- `doc/quality/testing-strategy.md` - 測試策略

---

### 7. 規模與範圍

**決策**:
- 48 張標準花札卡片
- 12 種常用役種（MVP 範圍）
- 支援最多 24 張玩家已獲得牌（單局最大情境）
- 單元測試覆蓋率目標：卡片邏輯與配對驗證 100%、役種檢測 90% 以上

**理由**:
- **48 張卡片**: 花札標準規格（`doc/shared/game-rules.md`）
- **12 種役種**: MVP 階段範圍（`doc/readme.md` - MVP 功能需求）
- **24 張已獲得牌**: 單局最大情境（雙方各最多獲得 24 張）
- **測試覆蓋率**: 專案測試策略明確定義（`doc/quality/testing-strategy.md`、`doc/quality/metrics.md`）

**依據文檔**:
- `doc/shared/game-rules.md` - 卡片列表
- `doc/readme.md` - MVP 功能需求
- `doc/quality/testing-strategy.md` - 測試覆蓋率目標
- `doc/quality/metrics.md` - 測試指標

---

## 關鍵技術模式選擇

### Value Objects 設計

**決策**: 使用 TypeScript interface 定義不可變 Value Objects

**理由**:
- DDD 最佳實踐：Value Objects 代表無身份的值（`Card`、`YakuScore`、`MatchStatus`）
- TypeScript interface 提供型別安全與編譯時檢查
- 配合 `readonly` 修飾符確保不可變性
- 輕量級，無運行時開銷

**替代方案**: 使用 class 定義 Value Objects
**拒絕原因**: class 會增加運行時開銷，且 Domain Layer 不需要方法（純函數設計）

**依據文檔**:
- `.specify/memory/constitution.md` - Principle II (DDD)
- `specs/002-user-interface-bc/spec.md` - Key Entities

---

### 卡片 ID 編碼

**決策**: 使用 MMTI 格式（4 位字串）

**理由**:
- 專案協議明確定義（`doc/shared/protocol.md` - I. 卡片 ID 編碼規則）
- 前後端共用編碼規則，確保一致性
- 緊湊格式，易於傳輸與儲存
- 人類可讀（例如：`0111` = 1 月光牌第 1 張）

**依據文檔**: `doc/shared/protocol.md` - 卡片 ID 編碼規則

---

### 役種檢測策略

**決策**: 為每種役種實作獨立檢測函數，統一由 `detectAllYaku` 編排

**理由**:
- 單一職責原則：每個函數只負責一種役種檢測
- 易於測試：每種役種可獨立測試
- 易於擴展：新增役種時僅需增加新函數
- 清晰的業務邏輯表達

**替代方案**: 使用配置驅動的通用檢測器
**拒絕原因**: 役種規則差異大（光牌系 vs 短冊系 vs 種牌系），通用檢測器會增加複雜度

**依據文檔**: `doc/shared/game-rules.md` - 役種列表

---

## 未解決項目

**無**。所有技術細節已明確定義於專案文檔中。

---

## 下一步行動

✅ **Phase 0 完成** - 無需額外研究
➡️ **進入 Phase 1** - 生成 data-model.md、contracts/、quickstart.md

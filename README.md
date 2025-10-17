# 花牌來來 (Koi-Koi Hanafuda)

一款使用 Vue 3 + TypeScript + Tailwind CSS 開發的日本花牌遊戲，採用 Clean Architecture 和 Domain-Driven Design 設計，支援單機遊玩模式。

## 專案特色

- ✅ **Clean Architecture**: 清晰的分層架構，易於維護和擴展
- ✅ **Bounded Context 分離**: game-engine 和 game-ui 兩個獨立領域
- ✅ **事件驅動架構**: 使用整合事件進行 BC 間通訊
- ✅ **完整遊戲規則**: 實施所有 10 種標準役種和特殊規則
- ✅ **單機遊玩**: 支援對抗 AI 的本地遊戲模式
- ✅ **多語系支援**: 支援繁體中文和日文

## 技術棧

- **前端框架**: Vue 3 (Composition API)
- **程式語言**: TypeScript
- **樣式框架**: Tailwind CSS
- **架構模式**: Clean Architecture + DDD
- **測試框架**: Vitest + Playwright

## 專案結構

```
src/
├── game-engine/          # 遊戲引擎 BC（遊戲邏輯）
│   ├── domain/           # 領域層（實體、值物件、領域服務）
│   ├── application/      # 應用層（Use Cases）
│   └── infrastructure/   # 基礎設施層（適配器）
├── game-ui/              # 遊戲 UI BC（使用者介面）
│   ├── domain/           # UI 視圖模型
│   ├── application/      # UI Use Cases
│   ├── infrastructure/   # UI 適配器
│   └── presentation/     # 呈現層（Vue 元件、控制器）
└── shared/               # 共享層（整合事件、常數）
    ├── events/           # 整合事件定義
    └── constants/        # 遊戲常數
```

## 快速開始

### 安裝依賴

```sh
npm install
```

### 開發模式（熱重載）

```sh
npm run dev
```

### 生產建置

```sh
npm run build
```

### 執行測試

```sh
# 單元測試
npm run test:unit

# E2E 測試
npm run test:e2e

# 檢查 BC 邊界
npm run lint:boundaries
```

### 程式碼品質檢查

```sh
# TypeScript 型別檢查
npm run type-check

# ESLint 檢查並自動修復
npm run lint

# Prettier 格式化
npm run format
```

## 遊戲規則

花牌來來 (Koi-Koi) 是一款傳統的日本紙牌遊戲，使用 48 張花牌進行。

### 基本規則

- 兩位玩家輪流出牌，嘗試與場上的牌配對並捕獲
- 捕獲的牌可以組成「役種」(Yaku) 獲得分數
- 當玩家湊成役種時可選擇：
  - **Koi-Koi**: 繼續遊玩以獲得更高分數（有風險）
  - **Shobu**: 結束回合並獲得當前分數

### 役種 (10 種)

1. **五光** (15分): 所有 5 張光牌
2. **四光** (8分): 4 張光牌（不含 11 月雨光）
3. **雨四光** (7分): 4 張光牌（包含 11 月雨光）
4. **三光** (5分): 3 張光牌（不含 11 月雨光）
5. **猪鹿蝶** (5分): 7月豬、10月鹿、6月蝶
6. **赤短** (5分): 松竹梅的短冊（1、2、3月）
7. **青短** (5分): 6、9、10月的青短冊
8. **種** (1分): 5張以上種牌，每多1張加1分
9. **短** (1分): 5張以上短冊，每多1張加1分
10. **カス** (1分): 10張以上カス牌，每多1張加1分

## 架構說明

### Bounded Context 分離

- **game-engine BC**: 負責所有遊戲邏輯、規則驗證、狀態管理
- **game-ui BC**: 負責所有 UI 呈現、使用者輸入、動畫效果

兩個 BC 完全隔離，只透過**整合事件**進行通訊，確保關注點分離。

### 整合事件

系統定義了 7 種核心整合事件：

1. `GameInitializedEvent` - 遊戲初始化（包含完整狀態快照）
2. `CardPlayedEvent` - 出牌事件（增量資訊）
3. `MatchSelectedEvent` - 配對選擇事件
4. `KoikoiDeclaredEvent` - Koi-Koi 宣告事件
5. `RoundEndedEvent` - 回合結束事件
6. `GameEndedEvent` - 遊戲結束事件
7. `GameAbandonedEvent` - 遊戲放棄事件

所有事件大小 < 1KB，滿足最小傳輸量設計。

## 開發指南

### Clean Architecture 規則

1. **依賴方向**: 由外向內（Domain ← Application ← Infrastructure/UI）
2. **BC 隔離**: game-engine 和 game-ui 不可互相依賴
3. **事件驅動**: 跨 BC 通訊必須使用整合事件
4. **測試優先**: Domain 層單元測試覆蓋率 > 90%

### 驗證 BC 邊界

執行以下指令檢查是否違反 BC 邊界規則：

```sh
npm run lint:boundaries
```

### IDE 設定

推薦使用 VS Code 並安裝以下擴充套件：

- ESLint
- Prettier
- Vue Language Features (Volar)
- TypeScript Vue Plugin (Volar)

## 相關文件

- [Feature Specification](./specs/001-game-ui-game/spec.md) - 功能規格說明
- [Implementation Plan](./specs/001-game-ui-game/plan.md) - 實作計劃
- [Quick Start Guide](./specs/001-game-ui-game/quickstart.md) - 快速開始指南
- [Project Instructions](./CLAUDE.md) - 專案開發指引

## License

本專案採用 MIT 授權條款。

## Contributors

- Leo Huang ([@leo.huang](https://github.com/leo-huang))

---

**遊戲預覽**: 在瀏覽器中開啟 http://localhost:5174 即可開始遊玩！

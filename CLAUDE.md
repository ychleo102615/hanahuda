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
- **Use Cases**: 遊戲業務邏輯
  - PlayCard (出牌)
  - CalculateScore (計分)
  - CheckWinCondition (勝負判定)
  - ManageGameFlow (遊戲流程)

### 2. Application Layer (應用層)
- **Services**: 應用服務
  - GameService (遊戲服務)
  - ScoreService (計分服務)
- **Interfaces**: 抽象介面
  - GameRepository (遊戲資料介面)
  - UIRenderer (UI 渲染介面)

### 3. Infrastructure Layer (基礎設施層)
- **Repositories**: 資料存取實現
  - LocalGameRepository (本地遊戲邏輯)
  - RemoteGameRepository (遠端 API)
- **UI Implementations**: UI 實現
  - DOMRenderer (HTML DOM 渲染)
  - WebGLRenderer (PixiJS/WebGL 渲染)

### 4. Presentation Layer (表現層)
- **Vue Components**: Vue 元件
- **Stores**: 狀態管理 (Pinia)
- **Composables**: 可複用邏輯

## 專案結構

```
src/
├── domain/                    # 領域層
│   ├── entities/
│   │   ├── Card.ts
│   │   ├── Player.ts
│   │   ├── GameState.ts
│   │   └── Yaku.ts
│   ├── usecases/
│   │   ├── PlayCardUseCase.ts
│   │   ├── CalculateScoreUseCase.ts
│   │   └── GameFlowUseCase.ts
│   └── interfaces/
│       ├── GameRepository.ts
│       └── UIRenderer.ts
├── application/               # 應用層
│   ├── services/
│   │   ├── GameService.ts
│   │   └── ScoreService.ts
│   └── dto/
│       └── GameDTO.ts
├── infrastructure/            # 基礎設施層
│   ├── repositories/
│   │   ├── LocalGameRepository.ts
│   │   └── RemoteGameRepository.ts
│   └── renderers/
│       ├── DOMRenderer.ts
│       └── WebGLRenderer.ts
├── presentation/              # 表現層
│   ├── components/
│   │   ├── GameBoard.vue
│   │   ├── PlayerHand.vue
│   │   ├── CardComponent.vue
│   │   └── ScoreBoard.vue
│   ├── stores/
│   │   └── gameStore.ts
│   ├── composables/
│   │   ├── useGame.ts
│   │   └── useRenderer.ts
│   └── views/
│       └── GameView.vue
├── shared/                    # 共享工具
│   ├── constants/
│   │   └── gameConstants.ts
│   └── utils/
│       └── gameUtils.ts
└── main.ts
```

## 開發目標

### Phase 1: 基礎架構建立
- [ ] 設置 Vue 3 + TypeScript + Tailwind 專案
- [ ] 實現 Clean Architecture 基礎結構
- [ ] 建立花牌實體與基本遊戲邏輯
- [ ] 實現 HTML DOM 版本的 UI

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

## 注意事項

- 遊戲規則領域與前端領域完全分離
- UI 渲染器可熱插拔切換
- 遊戲邏輯可在本地/遠端間切換
- 保持各層級間的清晰界線

這個架構設計讓你可以：
1. 輕鬆切換 DOM 和 WebGL 渲染
2. 無痛轉換本地邏輯到伺服器 API
3. 未來擴展成離線遊戲功能
4. 維持程式碼的可測試性和可維護性
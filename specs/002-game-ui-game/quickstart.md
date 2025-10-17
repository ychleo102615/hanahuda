# Quick Start Guide: Game-UI 與 Game-Engine BC 徹底分離

**Feature Branch**: `002-game-ui-game`
**Date**: 2025-10-17
**Status**: Ready for Implementation

## Prerequisites

確認以下環境已安裝:

- **Node.js**: v20.19.0 或以上
- **npm**: v10.0.0 或以上
- **Git**: v2.30 或以上

## 專案設置

### 1. Clone 專案並切換分支

```bash
cd /Users/leo.huang/personal/hanahuda

# 確認當前在正確分支
git branch
# 應該顯示: * 002-game-ui-game
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 驗證環境

```bash
# TypeScript 編譯檢查
npm run type-check

# 執行測試
npm run test

# 執行 BC 邊界檢查
npm run lint:boundaries
```

**預期結果**:
- ✅ TypeScript 編譯: 可能有跨 BC 依賴警告 (這是我們要修復的)
- ✅ 測試通過率: >= 94% (82/87)
- ⚠️ BC 邊界檢查: 預期有 7 個違規 (game-engine BC 依賴舊 application 層)

---

## 開發環境

### 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器訪問: `http://localhost:5173`

**預期行為**:
- ✅ 應用正常啟動
- ✅ 可以開始新遊戲
- ✅ 可以進行完整遊戲流程

### 開發工具

**VS Code 推薦擴展**:
- Vue - Official (Vue Language Features)
- TypeScript Vue Plugin (Volar)
- Tailwind CSS IntelliSense
- ESLint
- Prettier

**Chrome DevTools**:
- Vue Devtools 3.0+ (用於檢查 Pinia store 和元件狀態)

---

## 專案結構導覽

### 當前結構 (重構前)

```
src/
├── domain/                    # ❌ 待刪除 - 遷移到 game-engine/domain
├── application/               # ❌ 待刪除 - 遷移到各 BC
├── infrastructure/            # ⚠️ 保留 di/ 和共享 services
├── ui/                        # ❌ 待刪除 - 遷移到 game-ui/presentation
├── game-engine/               # ✅ game-engine BC
│   ├── domain/               # 遊戲核心邏輯
│   ├── application/          # Use Cases + Ports + DTOs
│   └── infrastructure/       # EventBusAdapter
├── game-ui/                   # ✅ game-ui BC
│   ├── domain/               # UI 領域模型
│   ├── application/          # UI Use Cases
│   ├── infrastructure/       # EventBusAdapter
│   └── presentation/         # Vue 元件, Controller, Presenter, Store
└── shared/                    # ✅ 共享定義
    ├── events/               # 整合事件定義
    └── constants/            # 常數
```

### 目標結構 (重構後)

```
src/
├── game-engine/               # Game Engine BC
├── game-ui/                   # Game UI BC
├── shared/                    # 共享定義
└── infrastructure/            # 共享基礎設施
    └── di/                   # DIContainer
```

---

## 驗證架構邊界

### 執行 BC 邊界檢查

```bash
npm run lint:boundaries
```

**當前預期輸出** (重構前):

```
❌ BC Boundary Violations Found:

game-engine BC violations:
1. src/game-engine/application/usecases/GameFlowCoordinator.ts
   - imports from @/application/ports/repositories/GameRepository
   - imports from @/application/ports/presenters/GamePresenter
   - imports from @/application/dto/GameDTO

2. src/game-engine/application/usecases/SetUpGameUseCase.ts
   - imports from @/application/ports/repositories/GameRepository

3. src/game-engine/application/usecases/SetUpRoundUseCase.ts
   - imports from @/application/ports/repositories/GameRepository

4. src/game-engine/application/usecases/PlayCardUseCase.ts
   - imports from @/application/ports/repositories/GameRepository

5. src/game-engine/application/usecases/CalculateScoreUseCase.ts
   - imports from @/application/dto/GameDTO

6. src/game-engine/application/usecases/AbandonGameUseCase.ts
   - imports from @/application/ports/repositories/GameRepository

7. src/game-engine/application/services/OpponentAI.ts
   - imports from @/application/dto/GameDTO

Total violations: 7
```

**重構後預期輸出**:

```
✅ No BC boundary violations found!

Checked:
- game-engine BC: 15 files
- game-ui BC: 11 files

All boundaries are clean.
```

### 手動驗證 Import 路徑

**檢查 game-engine BC**:

```bash
grep -r "from '@/application/" src/game-engine/
```

**預期**: 重構前有結果,重構後無結果

**檢查 game-ui BC**:

```bash
grep -r "from '@/game-engine/" src/game-ui/ | grep -v "@/game-engine/domain/entities/Card"
```

**預期**: 僅允許 import Card (Value Object),其他都不允許

---

## 執行測試

### 所有測試

```bash
npm run test
```

**預期結果**: 通過率 >= 94% (82/87 測試通過)

### 特定測試套件

**Domain 層測試** (遊戲邏輯):
```bash
npm run test -- src/game-engine/domain
```

**Application 層測試** (Use Cases):
```bash
npm run test -- src/game-engine/application
```

**整合事件測試**:
```bash
npm run test -- tests/contract/integration-events
```

**BC 邊界測試**:
```bash
npm run test -- tests/unit/architecture/bc-boundaries.test.ts
```

### 測試覆蓋率

```bash
npm run test -- --coverage
```

**預期覆蓋率**:
- Domain Layer: ~90%
- Application Layer: ~85%
- Infrastructure Layer: ~70%

---

## 開發工作流程

### 1. 理解當前狀態

閱讀以下文件:
1. `specs/002-game-ui-game/research.md` - 研究報告
2. `specs/002-game-ui-game/data-model.md` - 資料模型設計
3. `specs/002-game-ui-game/contracts/ports.md` - Port 介面契約

### 2. 建立開發分支

```bash
# 從 002-game-ui-game 建立 feature 分支
git checkout -b feature/remove-game-presenter-dependency
```

### 3. 實施重構

按照 `research.md` 中的優先級:

**Phase 1: 移除 GamePresenter 依賴**
- 移除 GameFlowCoordinator 的 `presenter` 參數
- 確認所有整合事件已正確發布
- 更新測試

**Phase 2: 創建 IGameStateRepository**
- 建立新 Port 介面
- 更新所有 UseCase 的 import
- 更新 Infrastructure 層實作

**Phase 3: 重組 DTO 結構**
- 建立 `game-engine/application/dto/` 目錄
- 移動 Input DTOs
- 移除 Output DTOs (改用整合事件)

**Phase 4: 完成 game-ui BC 整合**
- 更新 DIContainer 配置
- 改造 main.ts 初始化邏輯
- 更新 GameView.vue

### 4. 驗證重構

每完成一個 Phase,執行:

```bash
# TypeScript 編譯
npm run type-check

# 測試
npm run test

# BC 邊界檢查
npm run lint:boundaries

# 手動測試
npm run dev
```

### 5. 提交變更

```bash
git add .
git commit -m "feat: [Phase X] 描述變更"
git push origin feature/remove-game-presenter-dependency
```

---

## 常見問題排查

### Q1: TypeScript 編譯錯誤 - 找不到模組

**症狀**:
```
Cannot find module '@/game-engine/application/ports/IGameStateRepository'
```

**解決**:
1. 確認檔案是否存在
2. 檢查 `tsconfig.app.json` 中的 path aliases
3. 重啟 TypeScript 伺服器 (VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server")

### Q2: 測試失敗 - Mock 注入錯誤

**症狀**:
```
Service not registered: Symbol(GameRepository)
```

**解決**:
1. 更新測試的 DIContainer 設定
2. 確認 Mock 服務已正確註冊
3. 檢查 Symbol 名稱是否正確

### Q3: 開發伺服器無法啟動

**症狀**:
```
Error: Port 5173 is already in use
```

**解決**:
```bash
# 找出佔用 port 的程序
lsof -i :5173

# 終止程序
kill -9 [PID]

# 或使用不同 port
npm run dev -- --port 5174
```

### Q4: Vue Devtools 無法連接

**解決**:
1. 確認使用 Chrome 或 Firefox
2. 安裝 Vue Devtools 擴展 (3.0+ 版本)
3. 重新啟動瀏覽器

### Q5: Pinia Store 狀態未更新

**檢查**:
1. 確認 DIContainer 已正確設置
2. 檢查事件訂閱是否已配置
3. 使用 Vue Devtools 檢查 Pinia store 狀態
4. 檢查 console 是否有錯誤

---

## 效能監控

### 事件處理效能

**檢查事件延遲**:
```bash
npm run test -- tests/integration/events/event-latency.spec.ts
```

**預期**: 所有事件處理 < 100ms

### 事件大小驗證

**檢查事件大小**:
```bash
npm run test -- tests/integration/events/event-size.spec.ts
```

**預期**: 所有事件 < 1KB (除 GameInitializedEvent)

### 記憶體使用

開啟 Chrome DevTools → Performance → 記錄遊戲流程

**預期**:
- 記憶體使用 < 100MB
- 無記憶體洩漏
- GC 頻率正常

---

## 有用的指令

### 開發

```bash
# 啟動開發伺服器
npm run dev

# TypeScript 編譯檢查
npm run type-check

# Lint 檢查
npm run lint

# 格式化程式碼
npm run format
```

### 測試

```bash
# 執行所有測試
npm run test

# 執行測試並產生覆蓋率報告
npm run test -- --coverage

# 監視模式 (檔案變更時自動執行)
npm run test -- --watch

# 執行特定測試檔案
npm run test -- path/to/test.spec.ts
```

### 建置

```bash
# 建置生產版本
npm run build

# 預覽建置結果
npm run preview
```

### 架構驗證

```bash
# BC 邊界檢查
npm run lint:boundaries

# 檢查 import 循環依賴
# (需要安裝 madge)
npx madge --circular src/
```

---

## 下一步

1. ✅ 閱讀完整的研究報告 (`research.md`)
2. ✅ 理解資料模型設計 (`data-model.md`)
3. ✅ 閱讀 Port 介面契約 (`contracts/ports.md`)
4. ⚠️ 執行 `/speckit.tasks` 生成詳細實施任務清單
5. 🚀 開始實施重構!

---

## 參考資源

### 專案文件
- `CLAUDE.md` - 專案開發指導原則
- `.specify/memory/constitution.md` - 專案憲章
- `specs/002-game-ui-game/plan.md` - 實施計畫

### 技術文件
- [Vue 3 Documentation](https://vuejs.org/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)

### 架構模式
- Clean Architecture (Robert C. Martin)
- Domain-Driven Design (Eric Evans)
- Event-Driven Architecture
- Bounded Context Pattern

---

**快速入門指南版本**: 1.0
**最後更新**: 2025-10-17
**維護者**: Claude Code

# Project Overview: hanahuda

This is a Vue 3 project built with Vite, designed as a single-page application (SPA) for a game called "hanahuda". It leverages TypeScript for type safety, Pinia for state management, and Vue Router for navigation. Styling is handled using Tailwind CSS. The project includes configurations for unit testing with Vitest, end-to-end testing with Playwright, and code quality enforcement with ESLint and Prettier.

## Technologies Used:

- **Framework:** Vue 3
- **Build Tool:** Vite
- **Language:** TypeScript
- **State Management:** Pinia
- **Routing:** Vue Router
- **Styling:** Tailwind CSS
- **Unit Testing:** Vitest
- **End-to-End Testing:** Playwright
- **Linting:** ESLint
- **Code Formatting:** Prettier

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
- Rendering
  - DOMRenderer (HTML DOM 渲染)
  - PixiJSRenderer (WebGL 渲染)

## Building and Running:

### Setup:

```sh
npm install
```

### Compile and Hot-Reload for Development:

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production:

```sh
npm run build
```

### Run Unit Tests with Vitest:

```sh
npm run test:unit
```

### Run End-to-End Tests with Playwright:

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
npm run test:e2e
```

### Linting and Formatting:

```sh
npm run lint
npm run format
```

## Development Conventions:

- **Code Style:** Enforced by ESLint and Prettier. Refer to `.eslintrc.cjs` and `.prettierrc.json` for specific rules.
- **Type Checking:** TypeScript is used throughout the project, with `vue-tsc` for type checking `.vue` imports.
- **Testing:** Unit tests are written using Vitest, and end-to-end tests are written using Playwright.
- **Component Structure:** Vue components are organized within the `src/ui/components` and `src/ui/views` directories.

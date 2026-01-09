# Hanahuda Koikoi Card Game

## Quick Facts
- **Stack**: Nuxt 4, PostgreSQL, Drizzle ORM
- **Test Command**: `pnpm --prefix front-end test:unit`
- **Lint Command**: `pnpm --prefix front-end lint`
- **Dev Server**: `pnpm --prefix front-end dev`

## Architecture
- 使用 Clean Architecture, Domain-Driven Design 架構

### Architecture Skills
- `/architecture-check` - 檢查 CA/DDD 架構違反（依賴方向、Port 方向、UseCase 違反、DI Container 等）
- `/create-bounded-context` - 建立新 BC 的模板與指導（目錄結構、檔案模板、DI Container 設計）

## Key Directories
- `front-end/app/user-interface` - 前端使用者介面 BC
- `front-end/server/gateway` - 後端入口
- `front-end/server/identity` - 後端使用者身份 BC
- `front-end/server/core-game` - 後端核心遊戲 BC
- `front-end/server/core-game/adapter/opponent`  - 後端對手 AI BC，未來計畫遷移
- `front-end/server/matchmaking` - 後端配對 BC

## Code Style
 - SSOT principle
 - No dock typing。
 - No `any` - use `unknown`
 - No hard coding

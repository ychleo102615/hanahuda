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
- `front-end/app/game-client` - 前端遊戲客戶端 BC
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

## Design Context

### Users
日本傳統花札愛好者與桌遊玩家，在休閒或競技場合下進行線上對局。核心任務是專注比賽、判讀手牌、做出策略決策。他們希望介面「消失」在遊戲體驗之中，不因 UI 干擾而分心。

### Brand Personality
**典雅 · 沉穩 · 精緻**

情緒目標：讓玩家在完成役種、贏得對局時感受到**滿足與成就**——低調但真實的悅感，非過度誇張的慶祝動畫。

### Aesthetic Direction
**金箔蒔絵 × 現代極簡**（Kinpaku Maki-e meets Quiet Luxury）

- 深墨色底（#0d1f17, #111827）+ 克制金色（#D4AF37）點綴，主色調冷藍灰系
- 日本傳統紋樣（青海波、麻の葉）作為背景肌理，不喧賓奪主
- 玻璃擬態用於導覽與 Modal，深色層疊 + 輕量 backdrop-blur
- 動畫 ease-in-out，200ms–600ms，服務資訊傳達而非娛樂表演
- 深色模式唯一；現有設計系統已成熟，新設計保持一致

### Design Principles
1. **介面即退場** — 減少視覺噪音，讓牌面與遊戲資訊成為主角
2. **克制的裝飾性** — 金色與花紋是點綴，每個裝飾元素都需有語意理由
3. **成就感的精確傳達** — 動效強化役種達成與勝局的悅感，不製造噪音
4. **一致性優於創意** — 擴充元件時優先沿用現有設計語言（kinpaku-frame、glass topbar、gold-border tokens）
5. **WCAG AA 為底線** — 色彩對比度、鍵盤可操作性、focus-visible 為必要條件

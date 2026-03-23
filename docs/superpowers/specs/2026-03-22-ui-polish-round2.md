# UI Polish Round 2 — Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修正 impeccable:critique 提出的優先與次要問題，並實作確認的 CTA 按鈕設計與勝利 Modal 動畫。

**Architecture:** 純 UI 修改，無架構變動。涉及 CSS token 新增、元件樣式更新、RoundEndModal 的 getYakuName 重構。

**Tech Stack:** Nuxt 4, Vue 3, Tailwind CSS v4 (`@theme { }`)

---

## 設計決策（已確認）

### 1. 勝利文字漸層動畫
- `GameFinishedModal.vue` 的 "Victory!" 標題使用 `background-clip: text` 金屬漸層
- `background-size: 250% 100%`，用 `background-position` 動畫模擬光源掃過
- Keyframe：`120% 50%` → `28% 50%` → `22% 50%` → `25% 50%`（微小過衝後回彈）
- `animation-fill-mode: forwards`，播一次，停在最終位置
- Modal 入場：`scale(0.86) → scale(1)`，`cubic-bezier(0.34, 1.4, 0.64, 1)`，只播一次

### 2. CTA 按鈕樣式（漆黑描金框）
- 適用：HeroSection 的「開始遊戲」按鈕、NavigationBar 的 CTA 連結
- 樣式：`bg-transparent border border-gold-light text-gold-light` + `hover:bg-gold-light/10`
- 在深色背景上有足夠對比，語意不與紅色的危險操作混淆

### 3. 遊戲 Modal 按鈕統一規則
| 角色 | 樣式 |
|------|------|
| 主要行動（Koi-Koi, Continue, Rematch, Return to Lobby） | 金色漸層 `from-gold-light to-gold-dark` + 黑色文字 |
| 中立離開（Leave Game, Close） | `bg-game-table-light/80 text-gray-300 border border-gold-dark/20` |
| 危險確認（End Round） | `bg-accent-red text-white`（保留紅色，語意專屬） |

---

## 修改檔案清單

### Token 新增
- `front-end/app/assets/styles/main.css` — 在 `@theme` 新增 `--color-status-turn`

### 元件修改
1. `front-end/app/pages/index/components/HeroSection.vue`
2. `front-end/app/pages/index/components/NavigationBar.vue`
3. `front-end/app/pages/game/components/GameFinishedModal.vue`
4. `front-end/app/pages/game/components/DecisionModal.vue`
5. `front-end/app/pages/game/components/RoundEndModal.vue`
6. `front-end/app/pages/game/components/GameTopInfoBar.vue`

---

## Tasks

### Task 1：新增 `--color-status-turn` token + 修正 GameTopInfoBar

**Files:**
- Modify: `front-end/app/assets/styles/main.css`
- Modify: `front-end/app/pages/game/components/GameTopInfoBar.vue`

- [ ] 在 `main.css` 的 `@theme { }` 區塊「文字層次 token」後面新增：
  ```css
  --color-status-turn: #D4AF37;
  ```
- [ ] `GameTopInfoBar.vue` 將 `'text-yellow-400'` 改為 `'text-status-turn'`
- [ ] 確認 `:class="{ 'text-yellow-400': isMyTurnStatus }"` → `'text-status-turn'`
- [ ] 執行 lint：`pnpm --prefix front-end lint`

### Task 2：CTA 按鈕改為漆黑描金框

**Files:**
- Modify: `front-end/app/pages/index/components/HeroSection.vue`
- Modify: `front-end/app/pages/index/components/NavigationBar.vue`

**HeroSection.vue 修改：**
- [ ] 找到 CTA button 的 class：目前包含 `bg-accent-red ... hover:bg-red-600`
- [ ] 替換為：
  ```
  border border-gold-light text-gold-light
  hover:bg-gold-light/10 hover:shadow-lg hover:shadow-gold-light/20
  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light
  ```
  移除原本的 `bg-accent-red hover:bg-red-600`

**NavigationBar.vue 修改：**
- [ ] 找到 CTA link（`v-if="link.isCta"`）的 desktop 版：`bg-accent-red ... hover:bg-accent-red/90`
- [ ] 替換為：`border border-gold-light text-gold-light hover:bg-gold-light/10 rounded-md`
- [ ] 同樣修改 mobile 版 CTA link（`bg-accent-red` → 相同處理）
- [ ] 執行 lint

### Task 3：GameFinishedModal 勝利動畫

**Files:**
- Modify: `front-end/app/pages/game/components/GameFinishedModal.vue`

- [ ] 在 `<style scoped>` 新增：
  ```css
  /* 勝利 Modal 入場（只在勝利時套用） */
  @keyframes victoryModalIn {
    from { transform: scale(0.86) translateY(12px); opacity: 0; }
    to   { transform: scale(1) translateY(0); opacity: 1; }
  }

  /* 金屬漸層文字高光掃過 */
  @keyframes victoryGradientSettle {
    0%   { background-position: 120% 50%; }
    65%  { background-position: 28% 50%; }
    80%  { background-position: 22% 50%; }
    100% { background-position: 25% 50%; }
  }

  .victory-modal-panel {
    animation: victoryModalIn 0.55s cubic-bezier(0.34, 1.4, 0.64, 1) both;
  }

  .victory-title {
    background: linear-gradient(
      105deg,
      #5a3f05  0%,
      #8B6914 12%,
      #C49A27 25%,
      #D4AF37 34%,
      #F5E090 46%,
      #FFFBE8 50%,
      #F5E090 54%,
      #D4AF37 66%,
      #B8860B 78%,
      #7a5a08 90%,
      #4a3004 100%
    );
    background-size: 250% 100%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: victoryGradientSettle 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s both;
  }
  ```
- [ ] 找到現有的 `.modal-fade-enter-active .modal-panel` 規則，改為排除勝利版本，避免動畫衝突：
  ```css
  /* 原本是 .modal-fade-enter-active .modal-panel，改為加 :not() */
  .modal-fade-enter-active .modal-panel:not(.victory-modal-panel) {
    animation: modal-scale-up 0.3s ease;
  }
  ```
- [ ] 找到 modal panel div（`class="modal-panel rounded-lg max-w-md w-full mx-4 overflow-hidden transform transition-all"`），將靜態 class 改為動態綁定，勝利時附加 `victory-modal-panel`：
  ```html
  :class="['modal-panel rounded-lg max-w-md w-full mx-4 overflow-hidden transform transition-all',
    uiStateStore.gameFinishedModalData.isPlayerWinner && 'victory-modal-panel']"
  ```
- [ ] 找到 `<h2 id="game-finished-title" class="text-2xl font-bold font-serif text-gold-light text-center">`，**完整替換** `class=""` 為 `:class` 動態綁定（移除靜態 class 屬性）：
  ```html
  <h2
    id="game-finished-title"
    :class="['text-2xl font-bold font-serif text-center',
      uiStateStore.gameFinishedModalData.isPlayerWinner ? 'victory-title' : 'text-gold-light']"
  >
  ```
- [ ] 執行 lint

### Task 4：遊戲 Modal 按鈕統一（DecisionModal + RoundEndModal + GameFinishedModal）

**Files:**
- Modify: `front-end/app/pages/game/components/DecisionModal.vue`
- Modify: `front-end/app/pages/game/components/RoundEndModal.vue`
- Modify: `front-end/app/pages/game/components/GameFinishedModal.vue`

**DecisionModal.vue：**
- [ ] Koi-Koi 按鈕：`bg-green-600 hover:bg-green-500 focus:ring-green-500` →
  `bg-gradient-to-b from-gold-light to-gold-dark text-lacquer-black hover:brightness-110 focus:ring-gold-light`
- [ ] End Round 按鈕：保留 `bg-red-600`（危險語意正確），但改 focus ring：`focus:ring-accent-red`

**RoundEndModal.vue：**
- [ ] Continue 按鈕一（`continueConfirmationState === 'AWAITING_INPUT'` 狀態，`bg-green-600`）→ 金色漸層
- [ ] Leave Game 按鈕（`bg-gray-700`）→ `bg-game-table-light/80 text-gray-300 border border-gold-dark/20 hover:bg-game-table-light`
- [ ] Continue 按鈕二（`pendingGameFinishedData` 狀態，`bg-blue-600`）→ 金色漸層
- [ ] Processing... 的 spinner 顏色 `text-gray-300` → 保持不變（中性狀態）

**GameFinishedModal.vue：**
- [ ] Close 按鈕（`bg-gray-700`）→ `bg-game-table-light/80 text-gray-300 border border-gold-dark/20`
- [ ] Return to Lobby 按鈕（`bg-blue-600`）→ 金色漸層
- [ ] Rematch 按鈕（`bg-blue-600`）→ 金色漸層
- [ ] 執行 lint

### Task 5：RoundEndModal getYakuName 改用 getYakuInfo（SSOT 修正）

**Files:**
- Modify: `front-end/app/pages/game/components/RoundEndModal.vue`
- Modify: `front-end/app/game-client/domain/yaku-info.ts`

**先補充 yaku-info.ts 的 mapping：**
- [ ] 在 `YAKU_TYPE_MAP` 的「種牌系」區塊，`'INOSHIKACHO': 'inoshikacho'` 前面新增：
  ```ts
  'INOU_SHIKO': 'inoshikacho',
  ```
  （RoundEndModal 的本地查詢表用的是 `INOU_SHIKO` 這個 key）

**再更新 RoundEndModal.vue：**
- [ ] 在 `<script setup>` 加入 import：
  ```ts
  import { getYakuInfo } from '~/game-client/domain/yaku-info'
  ```
- [ ] 移除本地 `getYakuName()` 函式（整個 Record 查詢表）
- [ ] 改用：`function getYakuName(yakuType: string): string { return getYakuInfo(yakuType)?.name ?? yakuType }`
- [ ] 執行 lint + 單元測試：`pnpm --prefix front-end test:unit`

### Task 6：commit

- [ ] `git add` 所有修改過的檔案
- [ ] commit message：
  ```
  feat(ui): CTA 改漆黑描金框、勝利動畫、Modal 按鈕統一設計系統
  ```

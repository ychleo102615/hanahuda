# Quickstart Guide: 花牌遊戲網站首頁

**Feature**: 001-homepage-implementation
**Date**: 2025-10-22
**Audience**: 開發者

## Overview

本指南協助開發者快速設置環境並開始實作花牌遊戲網站首頁。預計完成時間：**10-15 分鐘**。

---

## 1. 環境需求

### 必需工具
| 工具 | 最低版本 | 建議版本 | 用途 |
|------|---------|---------|------|
| Node.js | 18.x | 20.x | JavaScript Runtime |
| npm | 9.x | 10.x | 套件管理器 |
| Git | 2.x | 最新 | 版本控制 |
| VSCode | 最新 | 最新 | 程式編輯器 (建議) |

### 建議的 VSCode 擴充套件
- **Volar** (Vue.volar): Vue 3 語法支援
- **TypeScript Vue Plugin** (Vue.vscode-typescript-vue-plugin): TypeScript 整合
- **ESLint** (dbaeumer.vscode-eslint): Linting
- **Prettier** (esbenp.prettier-vscode): 程式碼格式化
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss): Tailwind 自動補全

---

## 2. 安裝步驟

### 2.1 Clone 專案 (如果尚未 clone)

```bash
git clone <repository-url>
cd hanahuda
```

### 2.2 切換到 Feature Branch

```bash
git checkout 001-homepage-implementation
```

### 2.3 安裝前端依賴

```bash
cd front-end
npm install
```

**預期輸出**:
```
added 1234 packages in 30s
```

### 2.4 驗證安裝

```bash
npm run type-check  # 驗證 TypeScript 配置
npm run lint        # 驗證 ESLint 配置
```

如果看到錯誤，請參考 [常見問題排解](#8-常見問題排解)。

---

## 3. 開發伺服器

### 3.1 啟動 Dev Server

```bash
npm run dev
```

**預期輸出**:
```
  VITE v5.x.x  ready in 300 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
  ➜  press h + enter to show help
```

### 3.2 驗證首頁

1. 開啟瀏覽器訪問 `http://localhost:5173/`
2. 確認看到預設的 Vue 3 歡迎頁面
3. 保持 Dev Server 運行

---

## 4. 專案結構概覽

```
front-end/
├── src/
│   ├── components/       # 📁 組件目錄 (本功能的核心)
│   │   ├── NavigationBar.vue   # ⚠️ 待建立
│   │   ├── HeroSection.vue     # ⚠️ 待建立
│   │   ├── RulesSection.vue    # ⚠️ 待建立
│   │   └── Footer.vue          # ⚠️ 待建立
│   ├── views/            # 📁 頁面組件目錄
│   │   └── HomePage.vue        # ⚠️ 待建立
│   ├── assets/           # 📁 靜態資源
│   │   ├── icons/
│   │   │   └── hanafuda/       # ⚠️ 待新增 SVG 圖示
│   │   └── images/
│   ├── data/             # 📁 常數資料 (從檔案讀取)
│   │   ├── rules.ts            # ⚠️ 待建立
│   │   └── yaku.ts             # ⚠️ 待建立
│   ├── composables/      # 📁 Composables
│   │   └── useScrollTo.ts      # ⚠️ 待建立
│   ├── router/
│   │   └── index.ts      # ✅ 已存在，需新增 / 路由
│   ├── App.vue           # ✅ 已存在
│   └── main.ts           # ✅ 已存在
└── src/__tests__/        # 📁 測試目錄
    ├── components/       # ⚠️ 待建立測試
    └── views/            # ⚠️ 待建立測試
```

**圖示說明**:
- ✅ 已存在
- ⚠️ 待建立
- 📁 目錄

---

## 5. 建立第一個組件 (範例)

### 5.1 建立 NavigationBar 組件

```bash
# 在 front-end/src/components/ 建立檔案
touch src/components/NavigationBar.vue
```

### 5.2 基本組件骨架

```vue
<!-- src/components/NavigationBar.vue -->
<script setup lang="ts">
import { ref } from 'vue';

interface NavigationLink {
  label: string;
  target: string;
  isCta?: boolean;
}

// Props
const props = defineProps<{
  logo: string;
  links: NavigationLink[];
}>();

// State
const isMobileMenuOpen = ref(false);

// Methods
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};
</script>

<template>
  <nav class="bg-primary-900 text-white p-4">
    <div class="container mx-auto flex justify-between items-center">
      <!-- Logo -->
      <div class="text-xl font-bold">{{ logo }}</div>

      <!-- Desktop Links -->
      <div class="hidden md:flex gap-4">
        <a
          v-for="link in links"
          :key="link.label"
          :href="link.target"
          :class="[
            'px-4 py-2',
            link.isCta
              ? 'bg-accent-red text-white rounded'
              : 'hover:text-accent-pink',
          ]"
        >
          {{ link.label }}
        </a>
      </div>

      <!-- Mobile Menu Button -->
      <button
        class="md:hidden"
        @click="toggleMobileMenu"
        aria-label="Toggle menu"
      >
        ☰
      </button>
    </div>

    <!-- Mobile Menu -->
    <div v-if="isMobileMenuOpen" class="md:hidden mt-4">
      <a
        v-for="link in links"
        :key="link.label"
        :href="link.target"
        class="block py-2 hover:bg-primary-800"
      >
        {{ link.label }}
      </a>
    </div>
  </nav>
</template>
```

### 5.3 在頁面中使用

```vue
<!-- src/views/HomePage.vue -->
<script setup lang="ts">
import NavigationBar from '@/components/NavigationBar.vue';

const navLinks = [
  { label: 'Rules', target: '#rules', isCta: false },
  { label: 'About', target: '#about', isCta: false },
  { label: 'Start Game', target: '/game', isCta: true },
];
</script>

<template>
  <div class="homepage">
    <NavigationBar logo="Hanafuda Koi-Koi" :links="navLinks" />
    <!-- 其他區塊 -->
  </div>
</template>
```

### 5.4 熱重載驗證

儲存檔案後，瀏覽器應自動刷新並顯示新組件。

---

## 6. 執行測試

### 6.1 執行所有測試

```bash
npm run test:unit
```

### 6.2 執行測試（Watch 模式）

```bash
npm run test:unit -- --watch
```

### 6.3 建立測試檔案範例

```bash
touch src/components/__tests__/NavigationBar.spec.ts
```

```typescript
// src/components/__tests__/NavigationBar.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import NavigationBar from '../NavigationBar.vue';

// Mock router (NavigationBar 使用 Vue Router)
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/game', component: { template: '<div>Game</div>' } },
  ],
});

describe('NavigationBar', () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    wrapper = mount(NavigationBar, {
      props: {
        logo: 'Hanafuda Koi-Koi',
        links: [
          { label: 'Rules', target: '#rules', isCta: false },
          { label: 'Start Game', target: '/game', isCta: true },
        ],
        transparent: false,
      },
      global: {
        plugins: [router],
      },
    });
  });

  it('should render logo text', () => {
    expect(wrapper.text()).toContain('Hanafuda Koi-Koi');
  });

  it('should toggle mobile menu on button click', async () => {
    const menuButton = wrapper.find('[aria-label="Toggle navigation menu"]');

    // 初始狀態：menu 關閉
    expect(menuButton.attributes('aria-expanded')).toBe('false');

    // 點擊按鈕
    await menuButton.trigger('click');

    // 驗證 menu 打開
    expect(menuButton.attributes('aria-expanded')).toBe('true');
  });
});
```

---

## 7. 開發工作流程

### 7.1 TDD 循環 (Test-Driven Development)

根據 Constitution V，必須遵循 **Red-Green-Refactor** 循環：

```
1. RED    → 寫測試 (測試失敗)
2. GREEN  → 寫最少代碼讓測試通過
3. REFACTOR → 重構代碼，保持測試通過
```

**範例流程**:
```bash
# 1. 建立測試檔案
touch src/components/__tests__/HeroSection.spec.ts

# 2. 寫測試 (RED)
# 編輯 HeroSection.spec.ts

# 3. 執行測試，確認失敗
npm run test:unit

# 4. 建立組件 (GREEN)
touch src/components/HeroSection.vue

# 5. 實作最少代碼讓測試通過
# 編輯 HeroSection.vue

# 6. 執行測試，確認通過
npm run test:unit

# 7. 重構 (REFACTOR)
# 優化代碼，保持測試通過
```

### 7.2 Commit 流程

```bash
# 1. 檢查狀態
git status

# 2. 新增變更
git add src/components/NavigationBar.vue
git add src/components/__tests__/NavigationBar.spec.ts

# 3. Commit (遵循 Conventional Commits)
git commit -m "feat: implement NavigationBar component with mobile menu"

# 4. 推送至遠端
git push origin 001-homepage-implementation
```

**Commit Message 格式**:
- `feat: ...` - 新功能
- `fix: ...` - 修復錯誤
- `test: ...` - 新增或修改測試
- `refactor: ...` - 重構代碼
- `style: ...` - 樣式調整
- `docs: ...` - 文件更新

---

## 8. 常見問題排解

### 8.1 Port 5173 已被佔用

**錯誤訊息**:
```
Port 5173 is in use, trying another one...
```

**解決方案**:
```bash
# 停止佔用 port 的程序
lsof -ti:5173 | xargs kill -9

# 或指定其他 port
npm run dev -- --port 3000
```

### 8.2 TypeScript 錯誤: Cannot find module '@/...'

**錯誤訊息**:
```
Cannot find module '@/components/NavigationBar.vue'
```

**解決方案**:
```typescript
// 檢查 vite.config.ts 是否有 alias 設定
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
```

### 8.3 Tailwind CSS 樣式未生效

**症狀**: 使用 Tailwind class 但沒有樣式

**解決方案**:
```bash
# 1. 確認 tailwind.config.js 存在
ls tailwind.config.js

# 2. 確認 main.ts 有導入 Tailwind CSS
cat src/main.ts | grep tailwind

# 3. 如果沒有，新增導入
echo "import './assets/main.css'" >> src/main.ts

# 4. 重啟 Dev Server
npm run dev
```

### 8.4 測試執行失敗 (Vitest not found)

**錯誤訊息**:
```
'vitest' is not recognized as an internal or external command
```

**解決方案**:
```bash
# 重新安裝依賴
rm -rf node_modules package-lock.json
npm install

# 驗證 vitest 安裝
npm list vitest
```

### 8.5 SVG 圖示無法載入

**錯誤訊息**:
```
Failed to load module: @/assets/icons/hanafuda/0111.svg
```

**解決方案**:
```bash
# 1. 確認 SVG 檔案存在
ls src/assets/icons/hanafuda/0111.svg

# 2. 確認 Vite 配置支援 SVG import
# vite.config.ts 應包含:
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // SVG 支援已內建，無需額外配置
});

# 3. 使用 ?component 後綴載入 SVG
import CardIcon from '@/assets/icons/hanafuda/0111.svg?component';
```

---

## 9. 檢查清單

開始開發前，確認以下項目：

- [ ] Node.js 18+ 已安裝
- [ ] 已切換到 `001-homepage-implementation` branch
- [ ] `npm install` 成功執行
- [ ] Dev Server 可正常啟動 (`npm run dev`)
- [ ] 瀏覽器可訪問 `http://localhost:5173/`
- [ ] VSCode 已安裝建議擴充套件
- [ ] 已閱讀 `spec.md` 和 `data-model.md`
- [ ] 已閱讀 `research.md` 的技術決策

---

## 10. 下一步

開發順序建議：

1. **NavigationBar** (最高優先級)
   - 實作桌面版導航列
   - 實作 mobile menu (hamburger)
   - 撰寫單元測試

2. **HeroSection**
   - 實作標題、副標題、CTA 按鈕
   - 整合背景設計
   - 撰寫單元測試

3. **RulesSection**
   - 實作折疊/展開邏輯
   - 整合規則內容 (從常數檔案讀取)
   - 實作 YakuCarousel
   - 撰寫單元測試

4. **Footer**
   - 實作版權聲明
   - 實作 attribution 連結
   - 撰寫單元測試

5. **HomePage**
   - 整合所有組件
   - 實作平滑滾動 (`useScrollTo`)
   - 撰寫整合測試

6. **優化與測試**
   - 執行 Lighthouse 測試
   - 跨瀏覽器測試
   - 無障礙測試

---

## 11. 相關文件

| 文件 | 用途 |
|-----|------|
| [spec.md](./spec.md) | 功能需求與 Acceptance Criteria |
| [plan.md](./plan.md) | 實作計畫與架構決策 |
| [research.md](./research.md) | 技術研究與最佳實踐 |
| [data-model.md](./data-model.md) | 資料結構定義 |
| [/doc/readme.md](../../doc/readme.md) | 產品需求文檔 (PRD) |
| [/CLAUDE.md](../../CLAUDE.md) | 專案指南 |

---

## 12. 需要協助？

- **技術問題**: 參考 [research.md](./research.md) 的技術決策
- **需求釐清**: 參考 [spec.md](./spec.md) 的 Acceptance Scenarios
- **架構問題**: 參考 [plan.md](./plan.md) 的 Project Structure
- **測試問題**: 參考 [research.md](./research.md) 第 8 節測試策略

**預估開發時間**:
- NavigationBar: 2-3 小時
- HeroSection: 1-2 小時
- RulesSection: 4-5 小時
- Footer: 1 小時
- HomePage 整合: 2-3 小時
- 測試: 3-4 小時
- **總計**: 13-18 小時 (約 2-3 個工作天)

祝開發順利！🎴

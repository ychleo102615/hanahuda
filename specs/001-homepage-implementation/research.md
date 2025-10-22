# Research: 花牌遊戲網站首頁

**Feature**: 001-homepage-implementation
**Date**: 2025-10-22
**Status**: Complete

## Overview

本文檔記錄首頁實作的技術研究成果，包括 Vue 3 最佳實踐、Tailwind CSS 設計模式、響應式設計策略和無障礙支援。

## 1. Vue 3 Composition API 最佳實踐

### Decision
採用 Vue 3 Composition API (`<script setup>` 語法) 進行組件開發。

### Rationale
- **類型安全**: TypeScript 整合更好，提供完整的類型推導
- **代碼組織**: 邏輯按功能分組，而非選項 (Options API)
- **可複用性**: Composables 提供跨組件的邏輯複用
- **性能**: 更少的運行時開銷，更好的 Tree-shaking
- **官方推薦**: Vue 3 官方文件推薦新專案使用 Composition API

### Alternatives Considered
1. **Options API**:
   - 優點: 更傳統，對 Vue 2 開發者友善
   - 缺點: TypeScript 支援較弱，邏輯分散在不同選項中
   - **拒絕原因**: 不符合專案 TypeScript 優先原則

2. **Class-based Components** (vue-class-component):
   - 優點: 類似 Angular 風格
   - 缺點: 需要額外依賴，Vue 3 不再官方推薦
   - **拒絕原因**: 已被 Composition API 取代

### Implementation Pattern
```vue
<script setup lang="ts">
import { ref, computed } from 'vue';

// Props
const props = defineProps<{
  title: string;
}>();

// Emits
const emit = defineEmits<{
  (e: 'click', id: string): void;
}>();

// State
const isExpanded = ref(false);

// Computed
const buttonText = computed(() =>
  isExpanded.value ? 'Collapse' : 'Expand'
);

// Methods
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};
</script>
```

---

## 2. Tailwind CSS 整合與設計系統

### Decision
使用 Tailwind CSS 進行樣式設計，並建立自訂設計 token（色彩、間距、字體）。

### Rationale
- **Utility-first**: 快速開發，減少自訂 CSS
- **響應式**: 內建 responsive modifiers (`sm:`, `md:`, `lg:`)
- **一致性**: 透過 `tailwind.config.js` 統一設計 token
- **Tree-shaking**: 自動移除未使用的樣式，減少 bundle size
- **開發體驗**: VSCode 插件提供自動補全

### Design Tokens (tailwind.config.js)
```javascript
export default {
  theme: {
    extend: {
      colors: {
        // 主色調 (深海軍藍/墨黑)
        primary: {
          50: '#f5f7fa',
          100: '#e8ecf1',
          200: '#d1d9e3',
          // ... (從 plan-input.md 色彩計畫)
          900: '#1a202c', // 深木紋色
        },
        // 輔助色 (花牌鮮紅、櫻粉、亮綠)
        accent: {
          red: '#dc2626',    // 光牌太陽紅
          pink: '#fbcfe8',   // 櫻粉色
          green: '#10b981',  // 草牌綠
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans', 'sans-serif'],
        serif: ['Noto Serif', 'serif'],
        jp: ['Noto Sans JP', 'sans-serif'],
      },
      spacing: {
        // 根據 plan-input.md 的「大量留白」原則
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
};
```

### Alternatives Considered
1. **Pure CSS / SCSS**:
   - 優點: 完全控制樣式
   - 缺點: 需要手動管理響應式、設計一致性困難
   - **拒絕原因**: 開發效率低，不符合專案時程

2. **CSS-in-JS (styled-components, Emotion)**:
   - 優點: 動態樣式、TypeScript 支援
   - 缺點: Runtime overhead, bundle size 較大
   - **拒絕原因**: 效能不如 Tailwind CSS

3. **UI Framework (Vuetify, Element Plus)**:
   - 優點: 現成組件庫
   - 缺點: 客製化困難，不符合「Modern Japanese Minimalist」風格
   - **拒絕原因**: 設計風格不可控

---

## 3. 響應式設計與 Breakpoints

### Decision
採用 Mobile-first 設計策略，使用 Tailwind 預設 breakpoints。

### Rationale
- **Mobile-first**: 優先保證手機體驗，再增強桌面版
- **標準 breakpoints**: Tailwind 預設符合常見裝置
- **漸進增強**: 從小螢幕向大螢幕擴展功能
- **效能**: 避免載入不必要的桌面樣式到手機

### Breakpoints Strategy
```typescript
// Tailwind 預設 breakpoints
const breakpoints = {
  sm: '640px',   // 手機橫向 / 小平板
  md: '768px',   // 平板
  lg: '1024px',  // 筆電 / 小桌機
  xl: '1280px',  // 桌機
  '2xl': '1536px', // 大桌機
};

// 導航列響應式範例
// <nav class="flex md:hidden"> → 手機顯示
// <nav class="hidden md:flex"> → 桌面顯示
```

### Component-specific Responsive Rules
| 組件 | 手機 (<768px) | 桌面 (≥768px) |
|------|--------------|--------------|
| NavigationBar | Hamburger menu | 展開導航連結 |
| HeroSection | 單欄，標題較小 | 置中，標題放大 |
| RulesSection | 堆疊卡片 | 2-3 欄網格 |
| Footer | 堆疊內容 | 左右排版 |

### Alternatives Considered
1. **Desktop-first**:
   - 缺點: 手機體驗常是「縮減版」，非「優化版」
   - **拒絕原因**: 違反現代設計趨勢（手機流量佔比高）

2. **自訂 breakpoints**:
   - 缺點: 增加複雜度，不符合標準裝置
   - **拒絕原因**: Tailwind 預設已涵蓋 95% 場景

---

## 4. 平滑滾動與錨點導航

### Decision
使用原生 `scrollIntoView()` API 搭配 `behavior: 'smooth'`，封裝為 `useScrollTo` composable。

### Rationale
- **原生 API**: 無需外部依賴，瀏覽器原生支援
- **Composable 模式**: 符合 Vue 3 最佳實踐，可複用
- **無障礙**: 支援鍵盤導航，符合 WCAG 標準
- **效能**: 瀏覽器底層優化，比 JS 動畫效能好

### Implementation
```typescript
// src/composables/useScrollTo.ts
import { ref } from 'vue';

export function useScrollTo() {
  const isScrolling = ref(false);

  const scrollTo = (elementId: string, offset = 0) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    isScrolling.value = true;
    const y = element.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({
      top: y,
      behavior: 'smooth',
    });

    // 重置 scrolling 狀態
    setTimeout(() => {
      isScrolling.value = false;
    }, 1000);
  };

  return { scrollTo, isScrolling };
}
```

### Alternatives Considered
1. **Vue Router hash navigation** (`#rules`):
   - 優點: URL 帶有錨點，可分享
   - 缺點: 無法控制 offset（sticky header 遮擋），無平滑動畫
   - **拒絕原因**: UX 較差

2. **第三方庫** (vue-scrollto):
   - 優點: 更多配置選項
   - 缺點: 增加依賴，原生 API 已足夠
   - **拒絕原因**: 不必要的依賴

3. **CSS-only** (`scroll-behavior: smooth`):
   - 優點: 最簡單
   - 缺點: 無法動態控制、無法處理 offset
   - **拒絕原因**: 功能不足（無法自動展開規則區塊）

---

## 5. 規則區塊折疊/展開邏輯

### Decision
使用 Vue 3 `ref` 管理展開狀態，搭配 CSS transition 實現動畫。

### Rationale
- **響應式狀態**: Vue 的 `ref` 提供響應式狀態管理
- **原生 CSS transition**: 效能優於 JS 動畫庫
- **無障礙**: 搭配 ARIA 屬性 (`aria-expanded`, `aria-controls`)
- **簡單**: 不需要第三方動畫庫

### Implementation Pattern
```vue
<script setup lang="ts">
import { ref } from 'vue';

const isExpanded = ref(false);

const toggle = () => {
  isExpanded.value = !isExpanded.value;
};
</script>

<template>
  <section>
    <button
      @click="toggle"
      :aria-expanded="isExpanded"
      aria-controls="rules-content"
      class="flex items-center justify-between w-full"
    >
      <h2>Rules</h2>
      <span>{{ isExpanded ? '−' : '+' }}</span>
    </button>

    <div
      id="rules-content"
      class="overflow-hidden transition-all duration-300"
      :class="isExpanded ? 'max-h-screen' : 'max-h-0'"
    >
      <!-- 規則內容 -->
    </div>
  </section>
</template>
```

### Alternatives Considered
1. **Vue Transition Component**:
   - 優點: Vue 內建，支援 enter/leave hooks
   - 缺點: 對簡單展開/折疊過於複雜
   - **拒絕原因**: 功能過剩

2. **第三方動畫庫** (GSAP, Anime.js):
   - 優點: 複雜動畫能力
   - 缺點: 增加 bundle size，簡單動畫不需要
   - **拒絕原因**: 不必要的依賴

---

## 6. 無障礙 (Accessibility) 支援

### Decision
實作 WCAG 2.1 AA 級無障礙標準，包含鍵盤導航、ARIA 標籤和語義化 HTML。

### Rationale
- **法律要求**: 許多國家要求網站符合無障礙標準
- **用戶體驗**: 改善所有用戶（不僅是身障者）的體驗
- **SEO**: 語義化 HTML 有助於搜索引擎理解內容
- **Constitution 符合**: spec.md FR-014 明確要求鍵盤導航

### Key Implementation Points

#### 6.1 鍵盤導航
- **Tab 鍵**: 按邏輯順序 focus 所有互動元素
- **Enter 鍵**: 觸發按鈕和連結
- **Escape 鍵**: 關閉 hamburger menu
- **Focus Visible**: 明確的 focus 指示器

```vue
<!-- 範例: NavigationBar -->
<nav role="navigation" aria-label="Main navigation">
  <a href="#rules" @keydown.enter="scrollToRules" tabindex="0">
    Rules
  </a>
</nav>
```

#### 6.2 ARIA 標籤
| 元素 | ARIA 屬性 | 用途 |
|------|----------|------|
| 導航列 | `role="navigation"`, `aria-label="Main"` | 標識主導航 |
| Hamburger menu | `aria-expanded`, `aria-controls` | 表示展開/折疊狀態 |
| 規則區塊 | `aria-expanded`, `aria-controls` | 表示內容可見性 |
| CTA 按鈕 | `aria-label="Start game"` | 描述按鈕用途 |

#### 6.3 語義化 HTML
```html
<!-- 正確範例 -->
<header>
  <nav><a href="#rules">Rules</a></nav>
</header>
<main>
  <section aria-labelledby="hero-title">
    <h1 id="hero-title">Hanafuda Koi-Koi</h1>
  </section>
</main>
<footer>
  <p>&copy; 2025 Hanafuda Project</p>
</footer>

<!-- ❌ 錯誤範例 -->
<div class="header">
  <div class="nav"><span onclick="...">Rules</span></div>
</div>
```

#### 6.4 色彩對比度
- **文字對比度**: WCAG AA 要求 4.5:1（一般文字），3:1（大文字）
- **按鈕對比度**: 3:1（與背景）
- **工具**: 使用 Chrome DevTools 或 WebAIM Contrast Checker 驗證

### Alternatives Considered
1. **忽略無障礙**:
   - **拒絕原因**: spec.md FR-014 明確要求，Constitution 原則強調用戶體驗

2. **僅支援螢幕閱讀器**:
   - 缺點: 鍵盤導航同樣重要
   - **拒絕原因**: 不完整的無障礙支援

---

## 7. 花牌圖像資源管理

### Decision
使用 Vite 的 `import.meta.glob` 動態載入圖像，優化初始載入時間。

### Rationale
- **延遲載入**: 避免首頁載入所有花牌圖像
- **Vite 原生**: 無需第三方 loader
- **類型安全**: TypeScript 支援
- **效能**: 達成 FCP < 1.5 秒目標

### Implementation
```typescript
// src/assets/images/index.ts
const images = import.meta.glob<{ default: string }>(
  './hanafuda/*.png',
  { eager: false }
);

export const loadImage = async (name: string): Promise<string> => {
  const path = `./hanafuda/${name}.png`;
  const module = await images[path]();
  return module.default;
};

// 使用範例
const heroCardImage = await loadImage('01-01'); // 1月光牌
```

### Alternatives Considered
1. **全部 eager import**:
   - 缺點: 首頁載入時間過長，違反 FCP < 1.5 秒目標
   - **拒絕原因**: 效能不符合需求

2. **CDN 託管**:
   - 優點: 減少 bundle size
   - 缺點: 額外基礎設施成本，離線無法使用
   - **拒絕原因**: MVP 階段過度設計

---

## 8. 測試策略

### Decision
採用分層測試策略：單元測試 (Vitest) + 組件測試 (Vue Test Utils) + E2E 測試 (Playwright, 可選)。

### Rationale
- **TDD 原則**: Constitution V 要求 Test-First Development
- **覆蓋率目標**: 前端組件 > 60%
- **測試金字塔**: 大量單元測試，少量 E2E 測試
- **快速反饋**: Vitest 提供快速測試執行

### Test Coverage Plan

#### 8.1 單元測試 (Vitest)
**目標**: 測試純邏輯 composables

```typescript
// src/composables/__tests__/useScrollTo.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { useScrollTo } from '../useScrollTo';

describe('useScrollTo', () => {
  it('should scroll to element with smooth behavior', () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo');
    const { scrollTo } = useScrollTo();

    // Create mock element
    document.body.innerHTML = '<div id="test-section"></div>';

    scrollTo('test-section');

    expect(scrollToSpy).toHaveBeenCalledWith({
      top: expect.any(Number),
      behavior: 'smooth',
    });
  });
});
```

#### 8.2 組件測試 (Vue Test Utils)
**目標**: 測試組件互動和渲染

```typescript
// src/components/__tests__/RulesSection.spec.ts
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import RulesSection from '../RulesSection.vue';

describe('RulesSection', () => {
  it('should toggle expand/collapse on button click', async () => {
    const wrapper = mount(RulesSection);

    // 初始狀態應為折疊
    expect(wrapper.find('[data-testid="rules-content"]').isVisible()).toBe(false);

    // 點擊展開按鈕
    await wrapper.find('[data-testid="toggle-button"]').trigger('click');

    // 驗證內容可見
    expect(wrapper.find('[data-testid="rules-content"]').isVisible()).toBe(true);

    // 驗證 ARIA 屬性
    expect(wrapper.find('[data-testid="toggle-button"]').attributes('aria-expanded')).toBe('true');
  });
});
```

#### 8.3 E2E 測試 (Playwright, 可選)
**目標**: 測試完整用戶流程

```typescript
// e2e/homepage.spec.ts
import { test, expect } from '@playwright/test';

test('user can navigate to rules section from navbar', async ({ page }) => {
  await page.goto('/');

  // 點擊導航列的 Rules 連結
  await page.click('nav a[href="#rules"]');

  // 驗證平滑滾動至規則區塊
  await expect(page.locator('#rules')).toBeInViewport();

  // 驗證規則區塊自動展開
  await expect(page.locator('[data-testid="rules-content"]')).toBeVisible();
});
```

### Test Priority
1. **High Priority** (必須實作):
   - `useScrollTo` composable 測試
   - `NavigationBar` 響應式行為測試
   - `RulesSection` 折疊/展開測試

2. **Medium Priority** (建議實作):
   - `HeroSection` 渲染測試
   - `Footer` 連結測試
   - 無障礙測試 (鍵盤導航、ARIA)

3. **Low Priority** (可選):
   - E2E 完整流程測試
   - 視覺回歸測試 (Visual Regression)

### Alternatives Considered
1. **僅 E2E 測試**:
   - 缺點: 執行慢、維護成本高、難以定位錯誤
   - **拒絕原因**: 違反測試金字塔原則

2. **Jest + Testing Library**:
   - 優點: 更成熟的生態系
   - 缺點: Vite 原生支援 Vitest，配置更簡單
   - **拒絕原因**: Vitest 與專案技術棧更契合

---

## 9. 效能優化策略

### Decision
採用 Vite 內建優化 + 手動圖像延遲載入 + 字體預載入。

### Rationale
- **FCP < 1.5 秒**: spec.md 成功標準 SC-006
- **Lighthouse Score > 90**: spec.md 效能目標
- **使用者體驗**: 快速首屏渲染，減少跳出率

### Optimization Checklist

#### 9.1 Vite 內建優化
- ✅ **Code Splitting**: Vite 自動將組件拆分為獨立 chunk
- ✅ **Tree Shaking**: 移除未使用的代碼
- ✅ **Minification**: 生產環境自動壓縮 JS/CSS
- ✅ **CSS Purging**: Tailwind CSS 自動移除未使用樣式

#### 9.2 圖像優化
```typescript
// 僅在 Hero Section 使用的圖像採用 eager import
import heroImage from '@/assets/images/hero-card.png';

// 規則區塊的圖像延遲載入
const rulesImages = import.meta.glob<{ default: string }>(
  '@/assets/images/yaku/*.png',
  { eager: false }
);
```

#### 9.3 字體優化
```html
<!-- index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  rel="preload"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Noto+Sans+JP:wght@400;700&display=swap"
  as="style"
  onload="this.onload=null;this.rel='stylesheet'"
>
```

#### 9.4 Critical CSS
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    cssCodeSplit: true, // 將 CSS 拆分為多個文件
  },
});
```

### Performance Metrics Target
| Metric | Target | 測量工具 |
|--------|--------|---------|
| First Contentful Paint (FCP) | < 1.5s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |
| Total Blocking Time (TBT) | < 200ms | Lighthouse |
| Bundle Size (JS) | < 150KB (gzipped) | Vite build report |

### Alternatives Considered
1. **Server-Side Rendering (SSR)**:
   - 優點: 更快的 FCP
   - 缺點: 增加架構複雜度，MVP 不需要
   - **拒絕原因**: 靜態首頁不需要 SSR

2. **Progressive Image Loading (Blur-up)**:
   - 優點: 更好的視覺體驗
   - 缺點: 增加實作複雜度
   - **拒絕原因**: MVP 階段非必要

---

## 10. 跨瀏覽器相容性

### Decision
支援最新兩個主要版本的 Chrome、Firefox、Safari、Edge。

### Rationale
- **spec.md 假設 A-001**: 主要使用現代桌面瀏覽器
- **市場佔有率**: 涵蓋 95%+ 用戶
- **維護成本**: 避免支援舊版瀏覽器（如 IE11）

### Browser Support Matrix
| 瀏覽器 | 最低支援版本 | 測試重點 |
|--------|------------|---------|
| Chrome | 最新 2 版 | Flexbox, Grid, CSS Variables |
| Firefox | 最新 2 版 | Smooth scroll, Transitions |
| Safari | 最新 2 版 | Webkit-specific prefixes |
| Edge | 最新 2 版 | (基於 Chromium) |

### Compatibility Testing Strategy
1. **手動測試**: 在 Chrome、Firefox、Safari 上手動驗證 UI
2. **Autoprefixer**: PostCSS 自動添加 vendor prefixes
3. **Browserslist**: 在 `package.json` 定義目標瀏覽器

```json
// package.json
{
  "browserslist": [
    "last 2 Chrome versions",
    "last 2 Firefox versions",
    "last 2 Safari versions",
    "last 2 Edge versions"
  ]
}
```

### Known Issues & Workarounds
1. **Safari smooth scroll**: 部分舊版 Safari 不支援 `scroll-behavior: smooth`
   - **解決方案**: 使用 polyfill 或 JS fallback

2. **iOS Safari viewport height**: `100vh` 在 iOS 包含地址欄高度
   - **解決方案**: 使用 `-webkit-fill-available` 或 `dvh` (dynamic viewport height)

---

## Summary

所有技術決策已完成研究並記錄。關鍵結論：

1. ✅ **Vue 3 Composition API**: 提供最佳 TypeScript 支援和代碼組織
2. ✅ **Tailwind CSS**: 快速開發，一致性設計系統
3. ✅ **Mobile-first**: 優先保證手機體驗
4. ✅ **原生 API**: 最大化使用瀏覽器原生功能（scrollIntoView, CSS transitions）
5. ✅ **無障礙優先**: WCAG 2.1 AA 級標準
6. ✅ **效能優化**: 延遲載入、字體預載入、Vite 內建優化
7. ✅ **測試策略**: Vitest + Vue Test Utils，覆蓋率 > 60%
8. ✅ **瀏覽器支援**: 最新兩個主要版本

所有決策均無技術阻礙，可直接進入 Phase 1 設計階段。

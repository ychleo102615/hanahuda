# Data Model: 花牌遊戲網站首頁

**Feature**: 001-homepage-implementation
**Date**: 2025-10-22
**Status**: Complete

## Overview

本文檔定義首頁所需的資料結構。由於首頁為純前端靜態頁面，不涉及後端資料持久化，此處主要定義前端組件的 **Props 介面**、**狀態管理**和**靜態資料結構**。

---

## 1. 組件 Props 介面

### 1.1 NavigationBar

**檔案**: `front-end/src/components/NavigationBar.vue`

```typescript
export interface NavigationLink {
  /** 連結顯示文字 */
  label: string;
  /** 連結目標 (href 或錨點 ID) */
  target: string;
  /** 是否為外部連結 (http/https) */
  external?: boolean;
  /** 是否為 CTA 按鈕樣式 */
  isCta?: boolean;
}

export interface NavigationBarProps {
  /** Logo 文字或圖片路徑 */
  logo: string;
  /** 導航連結列表 */
  links: NavigationLink[];
  /** 是否為透明背景 (用於 sticky header) */
  transparent?: boolean;
}
```

**範例資料**:
```typescript
const navigationData: NavigationBarProps = {
  logo: 'Hanafuda Koi-Koi',
  links: [
    { label: 'Rules', target: '#rules', isCta: false },
    { label: 'About', target: '#about', isCta: false },
    { label: 'Start Game', target: '/game', isCta: true },
  ],
  transparent: true,
};
```

---

### 1.2 HeroSection

**檔案**: `front-end/src/components/HeroSection.vue`

```typescript
export interface HeroSectionProps {
  /** 遊戲標題 */
  title: string;
  /** 副標題 */
  subtitle: string;
  /** 主要 CTA 按鈕文字 */
  ctaText: string;
  /** 主要 CTA 按鈕導航目標 */
  ctaTarget: string;
  /** 背景圖片路徑 (optional) */
  backgroundImage?: string;
}
```

**範例資料**:
```typescript
const heroData: HeroSectionProps = {
  title: 'Hanafuda Koi-Koi',
  subtitle: 'Experience the classic Japanese card game online',
  ctaText: 'Start Playing',
  ctaTarget: '/game',
  backgroundImage: '/assets/images/hero-background.png',
};
```

---

### 1.3 RulesSection

**檔案**: `front-end/src/components/RulesSection.vue`

```typescript
export interface RuleCategory {
  /** 分類標題 (e.g., "Game Objective", "Card Types") */
  title: string;
  /** 分類內容 (Markdown 或 HTML) */
  content: string;
  /** 是否預設展開 */
  defaultExpanded?: boolean;
}

export interface YakuCard {
  /** 役種名稱 (英文) */
  name: string;
  /** 役種名稱 (日文，可選) */
  nameJa?: string;
  /** 得分 */
  points: number;
  /** 組成牌面列表 (卡片 ID，從常數檔案讀取) */
  cardIds: string[];
  /** 說明文字 */
  description: string;
}

export interface RulesSectionProps {
  /** 規則分類列表 */
  categories: RuleCategory[];
  /** 役種列表 (用於輪播圖) */
  yakuList: YakuCard[];
}
```

**範例資料**:
```typescript
const rulesData: RulesSectionProps = {
  categories: [
    {
      title: 'Game Objective',
      content: 'The goal of Koi-Koi is to capture cards from the field...',
      defaultExpanded: true,
    },
    {
      title: 'Card Deck',
      content: 'The Hanafuda deck consists of 48 cards, 4 cards per month...',
      defaultExpanded: false,
    },
    {
      title: 'Card Types',
      content: '- **Hikari (光札)**: Bright cards, 20 points...',
      defaultExpanded: false,
    },
  ],
  yakuList: [
    {
      name: 'Five Brights',
      nameJa: '五光',
      points: 15,
      cardIds: ['0111', '0311', '0811', '1111', '1211'], // MMTI 格式，從常數檔案讀取
      description: 'Collect all 5 bright cards',
    },
    {
      name: 'Cherry Blossom Viewing',
      nameJa: '花見酒',
      points: 3,
      cardIds: ['0311', '0921'],
      description: 'Cherry blossom curtain + Sake cup',
    },
    // ... 其他役種
  ],
};
```

---

### 1.4 Footer

**檔案**: `front-end/src/components/Footer.vue`

```typescript
export interface AttributionLink {
  /** 資源名稱 (e.g., "Hanafuda Images") */
  name: string;
  /** 資源來源 (e.g., "Wikimedia Commons") */
  source: string;
  /** 授權類型 (e.g., "Public Domain", "CC BY-SA 4.0") */
  license: string;
  /** 授權頁面連結 */
  licenseUrl: string;
}

export interface FooterProps {
  /** 版權年分 */
  copyrightYear: number;
  /** 專案名稱 */
  projectName: string;
  /** 第三方資源 attribution 列表 */
  attributions: AttributionLink[];
}
```

**範例資料**:
```typescript
const footerData: FooterProps = {
  copyrightYear: 2025,
  projectName: 'Hanafuda Koi-Koi',
  attributions: [
    {
      name: 'Hanafuda Card SVG Icons',
      source: 'Custom Design',
      license: 'MIT',
      licenseUrl: 'https://opensource.org/licenses/MIT',
    },
  ],
};
```

---

## 2. 狀態管理 (Reactive State)

### 2.1 NavigationBar 狀態

```typescript
// front-end/src/components/NavigationBar.vue
import { ref } from 'vue';

/** 是否顯示 mobile menu (hamburger 展開狀態) */
const isMobileMenuOpen = ref(false);

/** 是否為 sticky header (滾動時縮小/變透明) */
const isSticky = ref(false);

/** 切換 mobile menu */
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

/** 監聽滾動事件，更新 sticky 狀態 */
onMounted(() => {
  window.addEventListener('scroll', () => {
    isSticky.value = window.scrollY > 100;
  });
});
```

**狀態轉換圖**:
```
初始狀態 (isMobileMenuOpen = false)
    ↓ [點擊 hamburger icon]
展開狀態 (isMobileMenuOpen = true)
    ↓ [點擊 menu item 或外部區域]
初始狀態
```

---

### 2.2 RulesSection 狀態

```typescript
// front-end/src/components/RulesSection.vue
import { ref } from 'vue';

/** 展開的分類 ID (可多選) */
const expandedCategories = ref<Set<string>>(new Set());

/** 切換分類展開/折疊 */
const toggleCategory = (categoryId: string) => {
  if (expandedCategories.value.has(categoryId)) {
    expandedCategories.value.delete(categoryId);
  } else {
    expandedCategories.value.add(categoryId);
  }
};

/** 檢查分類是否展開 */
const isCategoryExpanded = (categoryId: string): boolean => {
  return expandedCategories.value.has(categoryId);
};

/** 自動展開規則區塊 (當從導航列點擊 "Rules" 時) */
const expandAll = () => {
  expandedCategories.value = new Set(
    rulesData.categories.map((_, index) => `category-${index}`)
  );
};
```

**狀態轉換圖**:
```
初始狀態 (所有分類折疊)
    ↓ [點擊某分類標題]
部分展開 (該分類展開)
    ↓ [點擊其他分類標題]
部分展開 (多個分類展開)
    ↓ [從導航列點擊 "Rules"]
全部展開 (所有分類展開)
```

---

### 2.3 Yaku Carousel 狀態

```typescript
// front-end/src/components/YakuCarousel.vue
import { ref, computed } from 'vue';

/** 當前顯示的役種索引 */
const currentIndex = ref(0);

/** 役種列表 */
const yakuList = ref<YakuCard[]>([]);

/** 當前顯示的役種 */
const currentYaku = computed(() => yakuList.value[currentIndex.value]);

/** 下一張 */
const next = () => {
  currentIndex.value = (currentIndex.value + 1) % yakuList.value.length;
};

/** 上一張 */
const prev = () => {
  currentIndex.value =
    (currentIndex.value - 1 + yakuList.value.length) % yakuList.value.length;
};
```

---

## 3. 靜態資料結構

### 3.1 花牌圖像資源 (SVG)

**目錄結構**:
```
front-end/src/assets/icons/
├── hanafuda/              # 48 張花牌 SVG 圖示
│   ├── 0111.svg           # 1月光牌 (松鶴) - MMTI: 01 (月份) + 1 (光牌) + 1 (索引)
│   ├── 0121.svg           # 1月種牌
│   ├── 0131.svg           # 1月短冊
│   ├── 0141.svg           # 1月カス
│   ├── ...
│   └── 1241.svg           # 12月カス
└── decorative/            # 裝飾性 SVG 圖示 (如 Hero Section 背景元素)
    ├── flower-pattern.svg
    └── wave-pattern.svg
```

**命名規則 (MMTI 格式)**:
- 格式: `MMTI.svg`
- `MM`: 月份 (01-12)
- `T`: 牌型 (1=光牌, 2=種牌, 3=短冊, 4=カス)
- `I`: 索引 (1-4，但每個月份的每種牌型可能不足 4 張)
- 範例:
  - `0311.svg` = 3月光牌 (櫻幕)
  - `0921.svg` = 9月種牌 (菊盃)

**SVG 載入方式**:
```typescript
// 使用 Vite 的動態 import
const loadCardIcon = async (cardId: string): Promise<string> => {
  const module = await import(`@/assets/icons/hanafuda/${cardId}.svg`);
  return module.default;
};

// 或使用 component 方式
import Card0111 from '@/assets/icons/hanafuda/0111.svg?component';
```

**注意事項**:
- SVG 圖示將從常數檔案（如 `doc/rule.md`）定義的卡片清單動態載入
- 卡片屬性（月份、牌型、點數、花卉名稱）在常數檔案中維護，前端透過程式讀取
- 首頁僅展示部分代表性卡片（如役種範例），不載入全部 48 張

---

### 3.2 規則說明內容

**資料來源**: 從常數檔案讀取並轉換

**實作方式**:
```typescript
// front-end/src/data/rules.ts
// 此檔案從常數檔案解析並轉換為前端可用的資料結構

/**
 * 從常數檔案解析規則內容
 * 注意: 實際實作時，可使用 marked 或 markdown-it 等套件解析
 */
export const loadRulesContent = async (): Promise<RuleCategory[]> => {
  // 從常數檔案讀取規則內容
  // 解析為 RuleCategory[]
  // 回傳給 RulesSection 組件
  return [
    {
      title: 'Game Objective',
      content: '...', // 從常數檔案讀取
      defaultExpanded: true,
    },
    // ...
  ];
};
```

**資料格式**:
```typescript
// 從常數檔案解析後的結構
export const RULES_CATEGORIES: RuleCategory[] = [
  {
    title: 'Game Objective',
    content: `
      The goal of Koi-Koi is to form **Yaku** (役, scoring combinations) by capturing cards from the playing field.
      When you form a Yaku, you can choose to:
      - **Continue (Koi-Koi)**: Keep playing to form more Yaku and multiply your score.
      - **Stop**: End the round and claim your current points.
    `,
    defaultExpanded: true,
  },
  {
    title: 'Card Deck',
    content: `
      The Hanafuda deck consists of **48 cards**, with **4 cards per month** (January to December).
      Each month represents a specific flower or plant.
    `,
    defaultExpanded: false,
  },
  // ... 其他分類從常數檔案讀取
];
```

**注意事項**:
- 規則內容不硬編碼在組件中，而是從常數檔案動態載入
- 可使用 Markdown 解析器將常數檔案內容轉換為 HTML
- 前端僅負責展示，不維護規則內容本身

---

### 3.3 役種資料

**資料來源**: 從常數檔案讀取

**實作方式**:
```typescript
// front-end/src/data/yaku.ts
// 從常數檔案解析役種資料

/**
 * 從常數檔案解析役種列表
 */
export const loadYakuList = async (): Promise<YakuCard[]> => {
  // 從常數檔案讀取役種資料
  // 解析為 YakuCard[]
  // 回傳給 RulesSection 組件
  return [
    {
      name: 'Five Brights',
      nameJa: '五光',
      points: 15,
      cardIds: ['0111', '0311', '0811', '1111', '1211'],
      description: 'Collect all 5 bright cards',
    },
    // ...
  ];
};
```

**資料格式**:
```typescript
// 從常數檔案解析後的結構
export const YAKU_LIST: YakuCard[] = [
  {
    name: 'Five Brights',
    nameJa: '五光',
    points: 15,
    cardIds: ['0111', '0311', '0811', '1111', '1211'], // MMTI 格式
    description: 'Collect all 5 bright cards',
  },
  {
    name: 'Four Brights',
    nameJa: '四光',
    points: 10,
    cardIds: ['0111', '0311', '0811', '1211'], // 不含雨 (1111)
    description: 'Collect 4 bright cards (excluding Rain Man)',
  },
  {
    name: 'Cherry Blossom Viewing',
    nameJa: '花見酒',
    points: 3,
    cardIds: ['0311', '0921'], // 櫻幕 + 菊盃
    description: 'Cherry blossom curtain + Sake cup',
  },
  // ... 其他役種從常數檔案讀取
];
```

**注意事項**:
- 役種資料從常數檔案讀取，確保前後端定義一致
- `cardIds` 使用 MMTI 格式（對應 SVG 檔名）
- 首頁僅展示部分代表性役種（如前 7 種），不需要載入全部

---

## 4. 表單驗證規則 (N/A)

首頁不涉及表單輸入，此節不適用。

---

## 5. 資料流向圖

```
HomePage.vue (頁面組件)
    │
    ├─→ NavigationBar.vue
    │      ├─ Props: { logo, links }
    │      └─ State: { isMobileMenuOpen, isSticky }
    │
    ├─→ HeroSection.vue
    │      ├─ Props: { title, subtitle, ctaText, ctaTarget }
    │      └─ State: (無狀態管理)
    │
    ├─→ RulesSection.vue
    │      ├─ Props: { categories, yakuList } ← 從常數檔案讀取
    │      ├─ State: { expandedCategories }
    │      └─ Child: YakuCarousel.vue
    │             ├─ Props: { yakuList }
    │             └─ State: { currentIndex }
    │
    └─→ Footer.vue
           ├─ Props: { copyrightYear, projectName, attributions }
           └─ State: (無狀態管理)

常數檔案來源:
  常數檔案 → 程式讀取 → { RULES_CATEGORIES, YAKU_LIST }
```

---

## 6. 資料驗證與錯誤處理

### 6.1 Props 驗證

```typescript
// NavigationBar.vue
defineProps<NavigationBarProps>({
  logo: {
    type: String,
    required: true,
    validator: (value: string) => value.length > 0,
  },
  links: {
    type: Array as PropType<NavigationLink[]>,
    required: true,
    validator: (value: NavigationLink[]) => value.length > 0,
  },
});
```

### 6.2 SVG 載入錯誤處理

```vue
<template>
  <component
    :is="cardIcon"
    class="hanafuda-card"
    @error="handleIconError"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const cardIcon = ref<Component | null>(null);

onMounted(async () => {
  try {
    const module = await import(`@/assets/icons/hanafuda/${props.cardId}.svg?component`);
    cardIcon.value = module.default;
  } catch (error) {
    console.error(`Failed to load card icon: ${props.cardId}`, error);
    // 使用 fallback 圖示
    cardIcon.value = FallbackCardIcon;
  }
});
</script>
```

---

## 7. 關鍵資料約束

| 資料欄位 | 約束 | 驗證方式 |
|---------|-----|---------|
| `NavigationLink.label` | 非空字串 | TypeScript 必填 |
| `NavigationLink.target` | 非空字串，必須為有效 URL 或錨點 | TypeScript + Runtime 驗證 |
| `YakuCard.points` | 正整數 | TypeScript number |
| `YakuCard.cardIds` | 至少包含 1 個卡片 ID | Array.length >= 1 |
| `YakuCard.cardIds[i]` | MMTI 格式 (如 "0311") | Regex: `/^\d{2}[1-4][1-4]$/` |
| `RuleCategory.content` | 非空字串 | TypeScript 必填 |

---

## Summary

首頁資料模型主要包含：

1. ✅ **組件 Props 介面**: 定義 4 個核心組件的資料輸入
2. ✅ **狀態管理**: 定義互動狀態（mobile menu、規則展開、輪播索引）
3. ✅ **靜態資料結構**:
   - 花牌圖示使用 SVG 格式，檔名遵循 MMTI 格式 (MM=月份, T=牌型1-4, I=索引1-4)
   - 規則內容從常數檔案讀取並透過程式解析
   - 役種資料從常數檔案讀取並透過程式解析
4. ✅ **資料驗證**: 定義 Props 驗證和錯誤處理邏輯
5. ✅ **資料流向**: 明確組件間的資料傳遞關係

**關鍵設計原則**:
- 花牌圖示採用 SVG 格式，檔名為 MMTI 格式 (如 `0311.svg`)
- 規則內容和役種資料從常數檔案讀取，避免硬編碼
- 前端不維護卡片屬性定義，統一從常數檔案讀取
- 使用程式動態載入資料，而非靜態物件定義

所有資料結構已完成定義，可進入實作階段。

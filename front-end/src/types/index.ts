/**
 * 全域 TypeScript 介面定義
 * 定義所有組件共用的資料結構
 */

// ========================================
// Navigation 相關介面
// ========================================

/**
 * 導航連結介面
 */
export interface NavigationLink {
  /** 連結顯示文字 */
  label: string
  /** 連結目標 (href 或錨點 ID) */
  target: string
  /** 是否為外部連結 */
  external?: boolean
  /** 是否為 CTA 按鈕樣式 */
  isCta?: boolean
}

/**
 * NavigationBar 組件 Props
 */
export interface NavigationBarProps {
  /** Logo 文字或圖片路徑 */
  logo: string
  /** 導航連結列表 */
  links: NavigationLink[]
  /** 是否為透明背景 */
  transparent?: boolean
}

// ========================================
// Hero Section 相關介面
// ========================================

/**
 * HeroSection 組件 Props
 */
export interface HeroSectionProps {
  /** 遊戲標題 */
  title: string
  /** 副標題 */
  subtitle: string
  /** 主要 CTA 按鈕文字 */
  ctaText: string
  /** 主要 CTA 按鈕導航目標 */
  ctaTarget: string
  /** 背景圖片路徑 */
  backgroundImage?: string
}

// ========================================
// Rules Section 相關介面
// ========================================

/**
 * 規則內容段落類型
 */
export type RuleSectionType = 'paragraph' | 'list' | 'ordered-list'

/**
 * 有序列表項目（支援嵌套子項目）
 */
export interface OrderedListItem {
  /** 項目標題 */
  title: string
  /** 項目說明文字 */
  text: string
  /** 子項目列表 */
  subItems?: string[]
}

/**
 * 規則內容段落
 */
export interface RuleSection {
  /** 段落類型 */
  type: RuleSectionType
  /** 段落文字（用於 paragraph） */
  text?: string
  /** 列表項目（用於 list） */
  items?: string[]
  /** 有序列表項目（用於 ordered-list） */
  orderedItems?: OrderedListItem[]
}

/**
 * 規則分類
 */
export interface RuleCategory {
  /** 分類 ID */
  id: string
  /** 分類標題 */
  title: string
  /** 是否預設展開 */
  defaultExpanded?: boolean
  /** 分類內容段落 */
  sections: RuleSection[]
}

/**
 * RulesSection 組件 Props
 */
export interface RulesSectionProps {
  /** 規則分類列表 */
  categories: RuleCategory[]
  /** 役種列表（用於輪播圖） */
  yakuList: YakuCard[]
}

// ========================================
// Yaku (役種) 相關介面
// ========================================

/**
 * 役種分類
 */
export type YakuCategory = 'hikari' | 'tanzaku' | 'tane' | 'kasu'

/**
 * 役種卡片
 */
export interface YakuCard {
  /** 役種唯一 ID */
  id: string
  /** 役種名稱（英文） */
  name: string
  /** 役種名稱（日文） */
  nameJa: string
  /** 役種分類 */
  category: YakuCategory
  /** 得分 */
  points: number
  /** 組成牌面列表（MMTI 格式卡片 ID） */
  cardIds?: string[]
  /** 最少需要的卡片數量（用於累積型役種） */
  minimumCards?: number
  /** 說明文字 */
  description: string
}

/**
 * YakuCarousel 組件 Props
 */
export interface YakuCarouselProps {
  /** 役種列表 */
  yakuList: YakuCard[]
}

// ========================================
// Footer 相關介面
// ========================================

/**
 * 第三方資源 Attribution
 */
export interface AttributionLink {
  /** 資源名稱 */
  name: string
  /** 資源來源 */
  source: string
  /** 授權類型 */
  license: string
  /** 授權頁面連結 */
  licenseUrl: string
}

/**
 * Footer 組件 Props
 */
export interface FooterProps {
  /** 版權年分 */
  copyrightYear: number
  /** 專案名稱 */
  projectName: string
  /** 第三方資源 attribution 列表 */
  attributions: AttributionLink[]
}

/**
 * Global TypeScript interface definitions
 * Defines data structures shared across all components
 */

// ========================================
// Navigation related interfaces
// ========================================

/**
 * Navigation link interface
 */
export interface NavigationLink {
  /** Link display text */
  label: string
  /** Link target (href or anchor ID) */
  target: string
  /** Whether this is an external link */
  external?: boolean
  /** Whether this uses CTA button styling */
  isCta?: boolean
}

/**
 * NavigationBar component Props
 */
export interface NavigationBarProps {
  /** Logo text or image path */
  logo: string
  /** Navigation link list */
  links: NavigationLink[]
  /** Whether to use transparent background */
  transparent?: boolean
}

// ========================================
// Hero Section related interfaces
// ========================================

/**
 * HeroSection component Props
 */
export interface HeroSectionProps {
  /** Game title */
  title: string
  /** Subtitle */
  subtitle: string
  /** Primary CTA button text */
  ctaText: string
  /** Primary CTA button navigation target */
  ctaTarget: string
  /** Background image path */
  backgroundImage?: string
}

// ========================================
// Rules Section related interfaces
// ========================================

/**
 * Rule content section type
 */
export type RuleSectionType = 'paragraph' | 'list' | 'ordered-list'

/**
 * Ordered list item (supports nested sub-items)
 */
export interface OrderedListItem {
  /** Item title */
  title: string
  /** Item description text */
  text: string
  /** Sub-item list */
  subItems?: string[]
}

/**
 * Rule content section
 */
export interface RuleSection {
  /** Section type */
  type: RuleSectionType
  /** Section text (for paragraph) */
  text?: string
  /** List items (for list) */
  items?: string[]
  /** Ordered list items (for ordered-list) */
  orderedItems?: OrderedListItem[]
}

/**
 * Rule category
 */
export interface RuleCategory {
  /** Category ID */
  id: string
  /** Category title */
  title: string
  /** Whether expanded by default */
  defaultExpanded?: boolean
  /** Category content sections */
  sections: RuleSection[]
}

/**
 * RulesSection component Props
 */
export interface RulesSectionProps {
  /** Rule category list */
  categories: RuleCategory[]
  /** Yaku list (for carousel) */
  yakuList: YakuCard[]
}

// ========================================
// Yaku (役種) related interfaces
// ========================================

/**
 * Yaku category
 */
export type YakuCategory = 'hikari' | 'tanzaku' | 'tane' | 'kasu'

/**
 * Yaku card
 */
export interface YakuCard {
  /** Yaku unique ID */
  id: string
  /** Yaku name (English) */
  name: string
  /** Yaku name (Japanese) */
  nameJa: string
  /** Yaku category */
  category: YakuCategory
  /** Points */
  points: number
  /** Card composition list (MMTI format card IDs) */
  cardIds?: string[]
  /** Minimum number of cards required (for cumulative yaku) */
  minimumCards?: number
  /** Description text */
  description: string
}

/**
 * YakuCarousel component Props
 */
export interface YakuCarouselProps {
  /** Yaku list */
  yakuList: YakuCard[]
}

// ========================================
// Footer related interfaces
// ========================================

/**
 * Third-party resource Attribution
 */
export interface AttributionLink {
  /** Resource name */
  name: string
  /** Resource source */
  source: string
  /** License type */
  license: string
  /** License page link */
  licenseUrl: string
}

/**
 * Footer component Props
 */
export interface FooterProps {
  /** Copyright year */
  copyrightYear: number
  /** Project name */
  projectName: string
  /** Third-party resource attribution list */
  attributions: AttributionLink[]
}

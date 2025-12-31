// TypeScript interfaces for Rules and Yaku data structures

// ============================================
// Legacy types (保留向後相容)
// ============================================

export interface RuleSection {
  type: 'paragraph' | 'list' | 'ordered-list';
  text?: string;
  items?: string[] | OrderedListItem[];
}

export interface OrderedListItem {
  title: string;
  text: string;
  subItems?: string[];
}

export interface RuleCategory {
  id: string;
  title: string;
  defaultExpanded: boolean;
  sections: RuleSection[];
}

// ============================================
// Enhanced types (新增獨立型別)
// ============================================

// 關鍵字 span 類型
export type KeywordSpanType = 'text' | 'keyword-ja' | 'keyword-en';

export interface KeywordSpan {
  type: KeywordSpanType;
  content: string;
}

// ===== Game Objective =====
export type GameObjectiveSectionType = 'rich-paragraph' | 'list';

export interface GameObjectiveSection {
  type: GameObjectiveSectionType;
  spans?: KeywordSpan[];
  items?: KeywordSpan[][];
}

export interface GameObjectiveCategory {
  id: 'game-objective';
  title: string;
  defaultExpanded: boolean;
  sections: GameObjectiveSection[];
}

// ===== Card Deck =====
export interface MonthData {
  month: number;
  nameJa: string;
  nameRomaji: string;
  flowerJa: string;
  flowerEn: string;
  cardIds: [string, string, string, string];
}

export interface CardDeckCategory {
  id: 'card-deck';
  title: string;
  defaultExpanded: boolean;
  introText: string;
  months: MonthData[];
}

// ===== Card Types =====
export interface CardTypeSubType {
  name: string;
  nameJa: string;
  cardIds: string[];
}

export type CardTypeId = 'hikari' | 'tane' | 'tanzaku' | 'kasu';

export interface CardTypeInfo {
  typeId: CardTypeId;
  nameJa: string;
  nameEn: string;
  points: number;
  count: number;
  description: string;
  cardIds: string[];
  subTypes?: CardTypeSubType[];
}

export interface CardTypesCategory {
  id: 'card-types';
  title: string;
  defaultExpanded: boolean;
  introText: string;
  types: CardTypeInfo[];
}

// ===== How To Play =====
export interface HowToPlayStep {
  title: string;
  content: KeywordSpan[];
  subItems?: KeywordSpan[][];
}

export interface HowToPlayCategory {
  id: 'how-to-play';
  title: string;
  defaultExpanded: boolean;
  steps: HowToPlayStep[];
}

// ===== Scoring Rules =====
export interface ScoringRulesCategory {
  id: 'scoring-rules';
  title: string;
  defaultExpanded: boolean;
  rules: KeywordSpan[][];
}

// ===== Union Type =====
export type RuleCategoryUnion =
  | GameObjectiveCategory
  | CardDeckCategory
  | CardTypesCategory
  | HowToPlayCategory
  | ScoringRulesCategory;

// ============================================
// Yaku types
// ============================================

export interface YakuCard {
  id: string;
  name: string;
  nameJa: string;
  category: string;
  points: number;
  cardIds?: string[];
  minimumCards?: number;
  description: string;
}

export interface RulesData {
  categories: RuleCategory[];
}

export interface EnhancedRulesData {
  categories: RuleCategoryUnion[];
}

export interface YakuData {
  yakuList: YakuCard[];
}

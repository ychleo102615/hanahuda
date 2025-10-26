// TypeScript interfaces for Rules and Yaku data structures

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

export interface YakuData {
  yakuList: YakuCard[];
}

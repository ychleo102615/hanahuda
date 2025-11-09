/**
 * Card Type Definitions
 *
 * 卡片相關型別定義，遵循 MMTI 編碼格式
 * 來源: doc/shared/protocol.md, doc/shared/data-contracts.md
 */

/**
 * 卡片類型
 */
export type CardType = 'BRIGHT' | 'ANIMAL' | 'RIBBON' | 'PLAIN'

/**
 * 卡片 Value Object
 *
 * 不可變物件，代表一張花札卡片
 */
export interface Card {
  /** 卡片 ID（MMTI 格式，4 位字串） */
  readonly cardId: string
  /** 月份（1-12） */
  readonly month: number
  /** 卡片類型 */
  readonly type: CardType
  /** 顯示名稱（如「松鶴」） */
  readonly displayName: string
}

/**
 * 卡片點數映射
 */
export const CARD_POINTS: Record<CardType, number> = {
  BRIGHT: 20,
  ANIMAL: 10,
  RIBBON: 5,
  PLAIN: 1,
} as const

/**
 * 卡片類型映射（MMTI 格式中的 T 值）
 */
export const CARD_TYPE_CODE: Record<CardType, string> = {
  BRIGHT: '1',
  ANIMAL: '2',
  RIBBON: '3',
  PLAIN: '4',
} as const

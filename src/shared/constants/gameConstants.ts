export const HANAFUDA_CARDS = {
  JANUARY: {
    MONTH: 1,
    CARDS: [
      { id: 1, suit: 1, type: 'bright', points: 20, name: 'jan_bright_1' },
      { id: 2, suit: 1, type: 'ribbon', points: 5, name: 'jan_ribbon_1' },
      { id: 3, suit: 1, type: 'plain', points: 1, name: 'jan_plain_1' },
      { id: 4, suit: 1, type: 'plain', points: 1, name: 'jan_plain_2' }
    ]
  },
  FEBRUARY: {
    MONTH: 2,
    CARDS: [
      { id: 5, suit: 2, type: 'animal', points: 10, name: 'feb_animal_1' },
      { id: 6, suit: 2, type: 'ribbon', points: 5, name: 'feb_ribbon_1' },
      { id: 7, suit: 2, type: 'plain', points: 1, name: 'feb_plain_1' },
      { id: 8, suit: 2, type: 'plain', points: 1, name: 'feb_plain_2' }
    ]
  },
  MARCH: {
    MONTH: 3,
    CARDS: [
      { id: 9, suit: 3, type: 'bright', points: 20, name: 'mar_bright_1' },
      { id: 10, suit: 3, type: 'ribbon', points: 5, name: 'mar_ribbon_1' },
      { id: 11, suit: 3, type: 'plain', points: 1, name: 'mar_plain_1' },
      { id: 12, suit: 3, type: 'plain', points: 1, name: 'mar_plain_2' }
    ]
  },
  APRIL: {
    MONTH: 4,
    CARDS: [
      { id: 13, suit: 4, type: 'animal', points: 10, name: 'apr_animal_1' },
      { id: 14, suit: 4, type: 'ribbon', points: 5, name: 'apr_ribbon_1' },
      { id: 15, suit: 4, type: 'plain', points: 1, name: 'apr_plain_1' },
      { id: 16, suit: 4, type: 'plain', points: 1, name: 'apr_plain_2' }
    ]
  },
  MAY: {
    MONTH: 5,
    CARDS: [
      { id: 17, suit: 5, type: 'animal', points: 10, name: 'may_animal_1' },
      { id: 18, suit: 5, type: 'ribbon', points: 5, name: 'may_ribbon_1' },
      { id: 19, suit: 5, type: 'plain', points: 1, name: 'may_plain_1' },
      { id: 20, suit: 5, type: 'plain', points: 1, name: 'may_plain_2' }
    ]
  },
  JUNE: {
    MONTH: 6,
    CARDS: [
      { id: 21, suit: 6, type: 'animal', points: 10, name: 'jun_animal_1' },
      { id: 22, suit: 6, type: 'ribbon', points: 5, name: 'jun_ribbon_1' },
      { id: 23, suit: 6, type: 'plain', points: 1, name: 'jun_plain_1' },
      { id: 24, suit: 6, type: 'plain', points: 1, name: 'jun_plain_2' }
    ]
  },
  JULY: {
    MONTH: 7,
    CARDS: [
      { id: 25, suit: 7, type: 'animal', points: 10, name: 'jul_animal_1' },
      { id: 26, suit: 7, type: 'ribbon', points: 5, name: 'jul_ribbon_1' },
      { id: 27, suit: 7, type: 'plain', points: 1, name: 'jul_plain_1' },
      { id: 28, suit: 7, type: 'plain', points: 1, name: 'jul_plain_2' }
    ]
  },
  AUGUST: {
    MONTH: 8,
    CARDS: [
      { id: 29, suit: 8, type: 'bright', points: 20, name: 'aug_bright_1' },
      { id: 30, suit: 8, type: 'animal', points: 10, name: 'aug_animal_1' },
      { id: 31, suit: 8, type: 'plain', points: 1, name: 'aug_plain_1' },
      { id: 32, suit: 8, type: 'plain', points: 1, name: 'aug_plain_2' }
    ]
  },
  SEPTEMBER: {
    MONTH: 9,
    CARDS: [
      { id: 33, suit: 9, type: 'animal', points: 10, name: 'sep_animal_1' },
      { id: 34, suit: 9, type: 'ribbon', points: 5, name: 'sep_ribbon_1' },
      { id: 35, suit: 9, type: 'plain', points: 1, name: 'sep_plain_1' },
      { id: 36, suit: 9, type: 'plain', points: 1, name: 'sep_plain_2' }
    ]
  },
  OCTOBER: {
    MONTH: 10,
    CARDS: [
      { id: 37, suit: 10, type: 'animal', points: 10, name: 'oct_animal_1' },
      { id: 38, suit: 10, type: 'ribbon', points: 5, name: 'oct_ribbon_1' },
      { id: 39, suit: 10, type: 'plain', points: 1, name: 'oct_plain_1' },
      { id: 40, suit: 10, type: 'plain', points: 1, name: 'oct_plain_2' }
    ]
  },
  NOVEMBER: {
    MONTH: 11,
    CARDS: [
      { id: 41, suit: 11, type: 'bright', points: 20, name: 'nov_bright_1' },
      { id: 42, suit: 11, type: 'animal', points: 10, name: 'nov_animal_1' },
      { id: 43, suit: 11, type: 'ribbon', points: 5, name: 'nov_ribbon_1' },
      { id: 44, suit: 11, type: 'plain', points: 1, name: 'nov_plain_1' }
    ]
  },
  DECEMBER: {
    MONTH: 12,
    CARDS: [
      { id: 45, suit: 12, type: 'bright', points: 20, name: 'dec_bright_1' },
      { id: 46, suit: 12, type: 'plain', points: 1, name: 'dec_plain_1' },
      { id: 47, suit: 12, type: 'plain', points: 1, name: 'dec_plain_2' },
      { id: 48, suit: 12, type: 'plain', points: 1, name: 'dec_plain_3' }
    ]
  }
} as const

export const CARD_TYPES = {
  BRIGHT: 'bright',
  ANIMAL: 'animal', 
  RIBBON: 'ribbon',
  PLAIN: 'plain'
} as const

export const YAKU_COMBINATIONS = {
  GOKO: { name: '五光', points: 10, requiredCards: ['bright'], minCount: 5 },
  SHIKO: { name: '四光', points: 8, requiredCards: ['bright'], minCount: 4, excludeCards: [11] },
  AME_SHIKO: { name: '雨四光', points: 7, requiredCards: ['bright'], minCount: 4, includeCards: [11] },
  SANKO: { name: '三光', points: 5, requiredCards: ['bright'], minCount: 3, excludeCards: [11] },
  INO_SHIKA_CHO: { name: '猪鹿蝶', points: 5, requiredCards: ['animal'], specific: [7, 10, 6] },
  AKA_TAN: { name: '赤短', points: 5, requiredCards: ['ribbon'], specific: [1, 2, 3] },
  AO_TAN: { name: '青短', points: 5, requiredCards: ['ribbon'], specific: [6, 9, 10] },
  TANE: { name: 'タネ', points: 1, requiredCards: ['animal'], minCount: 5 },
  TAN: { name: 'タン', points: 1, requiredCards: ['ribbon'], minCount: 5 },
  KASU: { name: 'カス', points: 1, requiredCards: ['plain'], minCount: 10 }
} as const

export const GAME_SETTINGS = {
  CARDS_PER_PLAYER: 8,
  CARDS_ON_FIELD: 8,
  MAX_ROUNDS: 12,
  WINNING_SCORE: 3
} as const
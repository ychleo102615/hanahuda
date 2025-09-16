export const HANAFUDA_CARDS = {
  JANUARY: {
    MONTH: 1,
    CARDS: [
      { suit: 1, type: 'bright', points: 20, name: '松に鶴' },
      { suit: 1, type: 'ribbon', points: 5, name: '松に赤短' },
      { suit: 1, type: 'plain', points: 1, name: '松のカス' },
      { suit: 1, type: 'plain', points: 1, name: '松のカス' }
    ]
  },
  FEBRUARY: {
    MONTH: 2,
    CARDS: [
      { suit: 2, type: 'animal', points: 10, name: '梅にうぐいす' },
      { suit: 2, type: 'ribbon', points: 5, name: '梅に赤短' },
      { suit: 2, type: 'plain', points: 1, name: '梅のカス' },
      { suit: 2, type: 'plain', points: 1, name: '梅のカス' }
    ]
  },
  MARCH: {
    MONTH: 3,
    CARDS: [
      { suit: 3, type: 'bright', points: 20, name: '桜に幕' },
      { suit: 3, type: 'ribbon', points: 5, name: '桜に赤短' },
      { suit: 3, type: 'plain', points: 1, name: '桜のカス' },
      { suit: 3, type: 'plain', points: 1, name: '桜のカス' }
    ]
  },
  APRIL: {
    MONTH: 4,
    CARDS: [
      { suit: 4, type: 'animal', points: 10, name: '藤にほととぎす' },
      { suit: 4, type: 'ribbon', points: 5, name: '藤に短冊' },
      { suit: 4, type: 'plain', points: 1, name: '藤のカス' },
      { suit: 4, type: 'plain', points: 1, name: '藤のカス' }
    ]
  },
  MAY: {
    MONTH: 5,
    CARDS: [
      { suit: 5, type: 'animal', points: 10, name: '菖蒲にやつはし' },
      { suit: 5, type: 'ribbon', points: 5, name: '菖蒲に短冊' },
      { suit: 5, type: 'plain', points: 1, name: '菖蒲のカス' },
      { suit: 5, type: 'plain', points: 1, name: '菖蒲のカス' }
    ]
  },
  JUNE: {
    MONTH: 6,
    CARDS: [
      { suit: 6, type: 'animal', points: 10, name: '牡丹に蝶' },
      { suit: 6, type: 'ribbon', points: 5, name: '牡丹に青短' },
      { suit: 6, type: 'plain', points: 1, name: '牡丹のカス' },
      { suit: 6, type: 'plain', points: 1, name: '牡丹のカス' }
    ]
  },
  JULY: {
    MONTH: 7,
    CARDS: [
      { suit: 7, type: 'animal', points: 10, name: '萩にいのしし' },
      { suit: 7, type: 'ribbon', points: 5, name: '萩に短冊' },
      { suit: 7, type: 'plain', points: 1, name: '萩のカス' },
      { suit: 7, type: 'plain', points: 1, name: '萩のカス' }
    ]
  },
  AUGUST: {
    MONTH: 8,
    CARDS: [
      { suit: 8, type: 'bright', points: 20, name: '芒に月' },
      { suit: 8, type: 'animal', points: 10, name: '芒に雁' },
      { suit: 8, type: 'plain', points: 1, name: '芒のカス' },
      { suit: 8, type: 'plain', points: 1, name: '芒のカス' }
    ]
  },
  SEPTEMBER: {
    MONTH: 9,
    CARDS: [
      { suit: 9, type: 'animal', points: 10, name: '菊に杯' },
      { suit: 9, type: 'ribbon', points: 5, name: '菊に青短' },
      { suit: 9, type: 'plain', points: 1, name: '菊のカス' },
      { suit: 9, type: 'plain', points: 1, name: '菊のカス' }
    ]
  },
  OCTOBER: {
    MONTH: 10,
    CARDS: [
      { suit: 10, type: 'animal', points: 10, name: '紅葉に鹿' },
      { suit: 10, type: 'ribbon', points: 5, name: '紅葉に青短' },
      { suit: 10, type: 'plain', points: 1, name: '紅葉のカス' },
      { suit: 10, type: 'plain', points: 1, name: '紅葉のカス' }
    ]
  },
  NOVEMBER: {
    MONTH: 11,
    CARDS: [
      { suit: 11, type: 'bright', points: 20, name: '柳に小野道風' },
      { suit: 11, type: 'animal', points: 10, name: '柳に燕' },
      { suit: 11, type: 'ribbon', points: 5, name: '柳に短冊' },
      { suit: 11, type: 'plain', points: 1, name: '柳のカス' }
    ]
  },
  DECEMBER: {
    MONTH: 12,
    CARDS: [
      { suit: 12, type: 'bright', points: 20, name: '桐に鳳凰' },
      { suit: 12, type: 'plain', points: 1, name: '桐のカス' },
      { suit: 12, type: 'plain', points: 1, name: '桐のカス' },
      { suit: 12, type: 'plain', points: 1, name: '桐のカス' }
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
  SHIKO: { name: '四光', points: 8, requiredCards: ['bright'], minCount: 4 },
  SANKO: { name: '三光', points: 5, requiredCards: ['bright'], minCount: 3 },
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
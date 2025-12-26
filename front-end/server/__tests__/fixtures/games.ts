/**
 * Game State Test Fixtures
 *
 * @description
 * 測試用遊戲狀態，用於 Domain 和 Application Layer 單元測試。
 * 提供各種遊戲階段的標準狀態快照。
 *
 * @module server/__tests__/fixtures/games
 */

import type { Game } from '~/server/domain/game/game'
import type { Round, PlayerRoundState } from '~/server/domain/round/round'
import type { KoiStatus } from '~/server/domain/round/koiStatus'
import type { Ruleset, YakuSetting } from '#shared/contracts'
import { HAND_STANDARD, FIELD_MIXED_CARDS } from './cards'

// ============================================================
// 玩家 ID 常數
// ============================================================

export const PLAYER_1_ID = 'player-1'
export const PLAYER_2_ID = 'player-2'
export const AI_PLAYER_ID = 'ai-opponent'

export const GAME_ID = 'test-game-id'
export const SESSION_TOKEN = 'test-session-token'

// ============================================================
// 役種設定
// ============================================================

/**
 * 預設役種設定（全部啟用）
 */
export const DEFAULT_YAKU_SETTINGS: readonly YakuSetting[] = Object.freeze([
  { yaku_type: 'GOKOU', base_points: 15, enabled: true },
  { yaku_type: 'SHIKOU', base_points: 10, enabled: true },
  { yaku_type: 'AME_SHIKOU', base_points: 8, enabled: true },
  { yaku_type: 'SANKOU', base_points: 6, enabled: true },
  { yaku_type: 'INOSHIKACHO', base_points: 5, enabled: true },
  { yaku_type: 'AKATAN', base_points: 5, enabled: true },
  { yaku_type: 'AOTAN', base_points: 5, enabled: true },
  { yaku_type: 'TANZAKU', base_points: 1, enabled: true },
  { yaku_type: 'TANE', base_points: 1, enabled: true },
  { yaku_type: 'KASU', base_points: 1, enabled: true },
  { yaku_type: 'HANAMI_ZAKE', base_points: 3, enabled: true },
  { yaku_type: 'TSUKIMI_ZAKE', base_points: 3, enabled: true },
])

/**
 * 預設規則集
 */
export const DEFAULT_RULESET: Ruleset = Object.freeze({
  total_rounds: 12,
  yaku_settings: DEFAULT_YAKU_SETTINGS,
  special_rules: Object.freeze({
    teshi_enabled: true,
    kuttsuki_enabled: true,
    field_teshi_enabled: true,
  }),
})

// ============================================================
// KoiStatus 工廠函數
// ============================================================

/**
 * 建立初始 KoiStatus
 */
export function createTestKoiStatus(playerId: string, timesContinued = 0): KoiStatus {
  return Object.freeze({
    player_id: playerId,
    times_continued: timesContinued,
    last_yaku_snapshot: [],
  })
}

// ============================================================
// PlayerRoundState 工廠函數
// ============================================================

/**
 * 建立玩家局狀態
 */
export function createTestPlayerState(
  playerId: string,
  hand: readonly string[] = HAND_STANDARD,
  depository: readonly string[] = []
): PlayerRoundState {
  return Object.freeze({
    playerId,
    hand,
    depository,
  })
}

// ============================================================
// Round 工廠函數
// ============================================================

/**
 * 建立測試用 Round
 */
export function createTestRound(overrides: Partial<Round> = {}): Round {
  const defaultRound: Round = {
    dealerId: PLAYER_1_ID,
    field: [...FIELD_MIXED_CARDS],
    deck: [
      '0942', '1021', '1031', '1041', '1042',
      '1111', '1121', '1131', '1141',
      '1211', '1241', '1242', '1243',
    ],
    playerStates: Object.freeze([
      createTestPlayerState(PLAYER_1_ID),
      createTestPlayerState(PLAYER_2_ID),
    ]),
    flowState: 'AWAITING_HAND_PLAY',
    activePlayerId: PLAYER_1_ID,
    koiStatuses: Object.freeze([
      createTestKoiStatus(PLAYER_1_ID),
      createTestKoiStatus(PLAYER_2_ID),
    ]),
    pendingSelection: null,
    pendingDecision: null,
  }

  return Object.freeze({
    ...defaultRound,
    ...overrides,
  })
}

/**
 * 建立等待選擇配對的 Round
 */
export function createRoundAwaitingSelection(overrides: Partial<Round> = {}): Round {
  return createTestRound({
    flowState: 'AWAITING_SELECTION',
    pendingSelection: {
      drawnCard: '0131',
      possibleTargets: Object.freeze(['0131', '0141']),
      handCardPlay: {
        played_card_id: '0142',
        captured_card_ids: [],
        placed_on_field: true,
      },
    },
    ...overrides,
  })
}

/**
 * 建立等待 Koi-Koi 決策的 Round
 */
export function createRoundAwaitingDecision(overrides: Partial<Round> = {}): Round {
  return createTestRound({
    flowState: 'AWAITING_DECISION',
    ...overrides,
    pendingDecision: {
      activeYaku: Object.freeze([
        {
          yaku_type: 'AKATAN',
          base_points: 5,
          contributing_cards: ['0131', '0231', '0331'],
        },
      ]),
    },
  })
}

// ============================================================
// Game 工廠函數
// ============================================================

/**
 * 建立測試用 Game（等待中）
 */
export function createTestWaitingGame(overrides: Partial<Game> = {}): Game {
  const now = new Date()
  const defaultGame: Game = {
    id: GAME_ID,
    sessionToken: SESSION_TOKEN,
    players: Object.freeze([
      { id: PLAYER_1_ID, name: 'Player 1', isAi: false },
    ]),
    ruleset: DEFAULT_RULESET,
    cumulativeScores: Object.freeze([
      { player_id: PLAYER_1_ID, score: 0 },
    ]),
    roundsPlayed: 0,
    totalRounds: 12,
    currentRound: null,
    status: 'WAITING',
    playerConnectionStatuses: Object.freeze([
      { player_id: PLAYER_1_ID, status: 'CONNECTED' as const },
    ]),
    pendingContinueConfirmations: Object.freeze([]),
    createdAt: now,
    updatedAt: now,
  }

  return Object.freeze({
    ...defaultGame,
    ...overrides,
  })
}

/**
 * 建立測試用 Game（進行中）
 */
export function createTestInProgressGame(overrides: Partial<Game> = {}): Game {
  const now = new Date()
  const defaultGame: Game = {
    id: GAME_ID,
    sessionToken: SESSION_TOKEN,
    players: Object.freeze([
      { id: PLAYER_1_ID, name: 'Player 1', isAi: false },
      { id: PLAYER_2_ID, name: 'Player 2', isAi: false },
    ]),
    ruleset: DEFAULT_RULESET,
    cumulativeScores: Object.freeze([
      { player_id: PLAYER_1_ID, score: 0 },
      { player_id: PLAYER_2_ID, score: 0 },
    ]),
    roundsPlayed: 0,
    totalRounds: 12,
    currentRound: createTestRound(),
    status: 'IN_PROGRESS',
    playerConnectionStatuses: Object.freeze([
      { player_id: PLAYER_1_ID, status: 'CONNECTED' as const },
      { player_id: PLAYER_2_ID, status: 'CONNECTED' as const },
    ]),
    pendingContinueConfirmations: Object.freeze([]),
    createdAt: now,
    updatedAt: now,
  }

  return Object.freeze({
    ...defaultGame,
    ...overrides,
  })
}

/**
 * 建立測試用 Game（含 AI 對手）
 */
export function createTestGameWithAi(overrides: Partial<Game> = {}): Game {
  return createTestInProgressGame({
    players: Object.freeze([
      { id: PLAYER_1_ID, name: 'Player 1', isAi: false },
      { id: AI_PLAYER_ID, name: 'AI Opponent', isAi: true },
    ]),
    cumulativeScores: Object.freeze([
      { player_id: PLAYER_1_ID, score: 0 },
      { player_id: AI_PLAYER_ID, score: 0 },
    ]),
    playerConnectionStatuses: Object.freeze([
      { player_id: PLAYER_1_ID, status: 'CONNECTED' as const },
      { player_id: AI_PLAYER_ID, status: 'CONNECTED' as const },
    ]),
    ...overrides,
  })
}

/**
 * 建立測試用 Game（已結束）
 */
export function createTestFinishedGame(
  winnerId: string = PLAYER_1_ID,
  overrides: Partial<Game> = {}
): Game {
  const now = new Date()
  const defaultGame: Game = {
    id: GAME_ID,
    sessionToken: SESSION_TOKEN,
    players: Object.freeze([
      { id: PLAYER_1_ID, name: 'Player 1', isAi: false },
      { id: PLAYER_2_ID, name: 'Player 2', isAi: false },
    ]),
    ruleset: DEFAULT_RULESET,
    cumulativeScores: Object.freeze([
      { player_id: PLAYER_1_ID, score: winnerId === PLAYER_1_ID ? 15 : 0 },
      { player_id: PLAYER_2_ID, score: winnerId === PLAYER_2_ID ? 15 : 0 },
    ]),
    roundsPlayed: 12,
    totalRounds: 12,
    currentRound: null,
    status: 'FINISHED',
    playerConnectionStatuses: Object.freeze([
      { player_id: PLAYER_1_ID, status: 'CONNECTED' as const },
      { player_id: PLAYER_2_ID, status: 'CONNECTED' as const },
    ]),
    pendingContinueConfirmations: Object.freeze([]),
    createdAt: now,
    updatedAt: now,
  }

  return Object.freeze({
    ...defaultGame,
    ...overrides,
  })
}

// ============================================================
// 特殊情況
// ============================================================

/**
 * 建立中途回合的 Game（已打過幾局）
 */
export function createMidGameState(roundsPlayed: number = 6): Game {
  return createTestInProgressGame({
    roundsPlayed,
    cumulativeScores: Object.freeze([
      { player_id: PLAYER_1_ID, score: 15 },
      { player_id: PLAYER_2_ID, score: 10 },
    ]),
  })
}

/**
 * 建立最後一局的 Game
 */
export function createLastRoundGame(): Game {
  return createTestInProgressGame({
    roundsPlayed: 11,
    totalRounds: 12,
  })
}

/**
 * Mock Event Script for Selection - 測試翻牌雙重配對選擇
 *
 * @description
 * 專門用於測試 SelectMatchTargetUseCase 的事件腳本。
 * 模擬翻牌時出現雙重配對，需要玩家選擇目標的場景。
 *
 * 流程:
 * 1. GameStarted - 遊戲開始
 * 2. RoundDealt - 發牌（場上預先安排多張同月份牌）
 * 3. SelectionRequired - 翻牌雙重配對，需要選擇
 * 4. TurnProgressAfterSelection - 選擇後繼續
 * 5. 重複測試多次選擇場景
 */

import type { MockEventItem } from './mockEventScript'

/**
 * 選擇測試腳本
 *
 * 場景設計:
 * - 場牌包含: 2月かす×2 (0241, 0242), 3月かす×2 (0341, 0342)
 * - 玩家手牌包含: 2月赤短 (0231)
 * - 牌堆頂: 2月鶯 (0221) - 會觸發三重配對
 */
export const mockEventScriptForSelection: MockEventItem[] = [
  // 1. 遊戲開始
  {
    eventType: 'GameStarted',
    payload: {
      event_type: 'GameStarted',
      event_id: 'sel-evt-001',
      timestamp: new Date().toISOString(),
      game_id: 'mock-selection-test',
      players: [
        { player_id: 'player-1', player_name: 'Player 1', is_ai: false },
        { player_id: 'player-2', player_name: 'AI Opponent', is_ai: true },
      ],
      ruleset: {
        target_score: 7,
        yaku_settings: [
          { yaku_type: 'GOKO', base_points: 10, enabled: true },
          { yaku_type: 'AKA_TAN', base_points: 6, enabled: true },
          { yaku_type: 'AO_TAN', base_points: 6, enabled: true },
          { yaku_type: 'TAN_ZAKU', base_points: 1, enabled: true },
          { yaku_type: 'TANE', base_points: 1, enabled: true },
          { yaku_type: 'KASU', base_points: 1, enabled: true },
        ],
        special_rules: {
          teshi_enabled: true,
          field_kuttsuki_enabled: true,
        },
      },
      starting_player_id: 'player-1',
    },
    delay: 500,
  },

  // 2. 發牌 - 場上有多張同月份牌（3張2月牌）
  {
    eventType: 'RoundDealt',
    payload: {
      event_type: 'RoundDealt',
      event_id: 'sel-evt-002',
      timestamp: new Date().toISOString(),
      dealer_id: 'player-1',
      // 場牌: 2月×3（種+かす×2）, 3月×2, 其他月份各一張
      field: [
        '0221', // 2月種（梅上鶯）
        '0241', // 2月かす1
        '0242', // 2月かす2
        '0341', // 3月かす1
        '0342', // 3月かす2
        '0541', // 5月かす
        '0641', // 6月かす
        '0741', // 7月かす
      ],
      hands: [
        {
          player_id: 'player-1',
          // 玩家手牌: 不含2月牌，避免衝突
          cards: ['0111', '0331', '0431', '0531', '0631', '0731', '1131', '0931'],
        },
        {
          player_id: 'player-2',
          cards: ['0131', '0211', '0311', '0411', '0511', '0611', '0711', '0811'],
        },
      ],
      deck_remaining: 24,
      next_state: {
        state_type: 'AWAITING_HAND_PLAY',
        active_player_id: 'player-1',
      },
    },
    delay: 3000,
  },

  // 3. SelectionRequired - 玩家打出1月光，無配對
  // 翻牌翻出2月短（0231），場上有3張2月牌可選
  {
    eventType: 'SelectionRequired',
    payload: {
      event_type: 'SelectionRequired',
      event_id: 'sel-evt-003',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      hand_card_play: {
        played_card: '0111', // 1月光（松上鶴）
        matched_card: null, // 場上無1月牌，無配對
        captured_cards: [],
      },
      drawn_card: '0231', // 翻出 2月赤短
      possible_targets: ['0221', '0241', '0242'], // 3張2月牌可選！
      deck_remaining: 23,
    },
    delay: 3000,
  },

  // 4. TurnProgressAfterSelection - 玩家選擇了 0241
  {
    eventType: 'TurnProgressAfterSelection',
    payload: {
      event_type: 'TurnProgressAfterSelection',
      event_id: 'sel-evt-004',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      selection: {
        source_card: '0231', // 翻出的 2月赤短（與SelectionRequired一致）
        selected_target: '0241', // 選擇的目標
        captured_cards: ['0231', '0241'], // 獲得翻出的牌 + 選擇的牌
      },
      draw_card_play: {
        played_card: '0231', // 翻出的牌
        matched_card: '0241', // 配對的牌
        captured_cards: ['0231', '0241'], // 翻牌階段獲得的牌
      },
      yaku_update: null, // 此回合未形成役種
      deck_remaining: 23,
      next_state: {
        state_type: 'AWAITING_HAND_PLAY',
        active_player_id: 'player-2',
      },
    },
    delay: 3000,
  },

  /*
  // 5. 對手回合完成 - 配對走1月和3月牌
  {
    eventType: 'TurnCompleted',
    payload: {
      event_type: 'TurnCompleted',
      event_id: 'sel-evt-005',
      timestamp: new Date().toISOString(),
      player_id: 'player-2',
      hand_card_play: {
        played_card: '0131', // 1月短
        matched_card: '0111', // 配對場上的1月光
        captured_cards: ['0131', '0111'],
      },
      draw_card_play: {
        played_card: '0311', // 翻出 3月光
        matched_card: '0341', // 配對場上的3月かす1
        captured_cards: ['0311', '0341'],
      },
      deck_remaining: 22,
      next_state: {
        state_type: 'AWAITING_HAND_PLAY',
        active_player_id: 'player-1',
      },
    },
    delay: 3000,
  },

  // 6. 第二次 SelectionRequired - 手牌有配對，翻牌複數配對
  // 玩家打出3月短配對場上3月牌，翻牌翻出2月牌，場上有2張2月牌可選
  {
    eventType: 'SelectionRequired',
    payload: {
      event_type: 'SelectionRequired',
      event_id: 'sel-evt-006',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      hand_card_play: {
        played_card: '0331', // 3月短（櫻赤短）
        matched_card: '0342', // 配對場上的3月かす2
        captured_cards: ['0331', '0342'], // 手牌階段獲得的牌
      },
      drawn_card: '0211', // 翻出 2月牌
      possible_targets: ['0221', '0242'], // 場上有2張2月牌可選！
      deck_remaining: 21,
    },
    delay: 3000,
  },

  // 7. TurnProgressAfterSelection - 玩家選擇了 0221
  {
    eventType: 'TurnProgressAfterSelection',
    payload: {
      event_type: 'TurnProgressAfterSelection',
      event_id: 'sel-evt-007',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      selection: {
        source_card: '0211', // 翻出的2月牌
        selected_target: '0221', // 選擇配對2月種
        captured_cards: ['0211', '0221'], // 翻牌階段獲得的牌
      },
      draw_card_play: {
        played_card: '0211',
        matched_card: '0221',
        captured_cards: ['0211', '0221'],
      },
      yaku_update: null, // 此回合未形成役種
      deck_remaining: 21,
      next_state: {
        state_type: 'AWAITING_HAND_PLAY',
        active_player_id: 'player-2',
      },
    },
    delay: 3000,
  },
  // 完整版腳本到此結束（包含2次 SelectionRequired 測試場景）
  */
]

/**
 * 極簡版選擇測試腳本
 * 只包含最核心的選擇流程，用於快速測試
 */
export const mockEventScriptForSelectionMinimal: MockEventItem[] = [
  // 1. 遊戲開始
  {
    eventType: 'GameStarted',
    payload: {
      event_type: 'GameStarted',
      event_id: 'min-sel-001',
      timestamp: new Date().toISOString(),
      game_id: 'mock-minimal-selection',
      players: [
        { player_id: 'player-1', player_name: 'Player 1', is_ai: false },
        { player_id: 'player-2', player_name: 'AI', is_ai: true },
      ],
      ruleset: {
        target_score: 7,
        yaku_settings: [],
        special_rules: {
          teshi_enabled: false,
          field_kuttsuki_enabled: false,
        },
      },
      starting_player_id: 'player-1',
    },
    delay: 3000,
  },

  // 2. 發牌（場上放3張2月牌）
  {
    eventType: 'RoundDealt',
    payload: {
      event_type: 'RoundDealt',
      event_id: 'min-sel-002',
      timestamp: new Date().toISOString(),
      dealer_id: 'player-1',
      field: ['0221', '0241', '0242', '0341', '0441', '0541', '0641', '0741'],
      hands: [
        {
          player_id: 'player-1',
          cards: ['0111', '0331', '0431', '0531', '0631', '0731', '1131', '0931'],
        },
        {
          player_id: 'player-2',
          cards: ['0131', '0211', '0311', '0411', '0511', '0611', '0711', '0811'],
        },
      ],
      deck_remaining: 24,
      next_state: {
        state_type: 'AWAITING_HAND_PLAY',
        active_player_id: 'player-1',
      },
    },
    delay: 3000,
  },

  // 3. SelectionRequired - 手牌無配對，翻牌時場上有3張2月牌
  {
    eventType: 'SelectionRequired',
    payload: {
      event_type: 'SelectionRequired',
      event_id: 'min-sel-003',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      hand_card_play: {
        played_card: '0111', // 1月光
        matched_card: null, // 場上無1月牌
        captured_cards: [],
      },
      drawn_card: '0231', // 翻出2月短
      possible_targets: ['0221', '0241', '0242'], // 3張2月牌可選
      deck_remaining: 23,
    },
    delay: 3000,
  },

  // 4. TurnProgressAfterSelection - 玩家選擇了0241
  {
    eventType: 'TurnProgressAfterSelection',
    payload: {
      event_type: 'TurnProgressAfterSelection',
      event_id: 'min-sel-004',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      selection: {
        source_card: '0231', // 翻出的2月短
        selected_target: '0241', // 選擇配對2月かす1
        captured_cards: ['0231', '0241'],
      },
      draw_card_play: {
        played_card: '0231',
        matched_card: '0241',
        captured_cards: ['0231', '0241'],
      },
      yaku_update: null,
      deck_remaining: 23,
      next_state: {
        state_type: 'AWAITING_HAND_PLAY',
        active_player_id: 'player-2',
      },
    },
    delay: 3000,
  },
]

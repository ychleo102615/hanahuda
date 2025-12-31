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
 * 選擇測試腳本（完整版）
 *
 * 場景設計:
 * - 場牌: 2月×3 (0221種, 0241かす, 0242かす), 3月×2 (0341かす, 0342かす), 其他月份
 * - 第一次選擇: 玩家翻出 0231(2月短)，場上有3張2月牌可選
 * - 第二次選擇: 玩家翻出 0311(3月光)，場上有2張3月牌可選
 *
 * 卡牌分配（總計48張）:
 * - 場牌8張: 0221, 0241, 0242, 0341, 0342, 0541, 0641, 0741
 * - 玩家手牌8張: 0111, 0331, 0431, 0531, 0631, 0731, 0931, 1031
 * - 對手手牌8張: 0131, 0421, 0521, 0621, 0721, 0821, 0921, 1021
 * - 牌堆24張（前3張: 0231, 0141, 0311...）
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
        total_rounds: 2,
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
          field_teshi_enabled: true,
        },
        total_deck_cards: 48,
      },
      starting_player_id: 'player-1',
    },
    delay: 500,
  },

  // 2. 發牌 - 場上有多張同月份牌（3張2月牌、2張3月牌）
  {
    eventType: 'RoundDealt',
    payload: {
      event_type: 'RoundDealt',
      event_id: 'sel-evt-002',
      timestamp: new Date().toISOString(),
      dealer_id: 'player-1',
      // 場牌: 2月×3（種+かす×2）, 3月×2（かす×2）, 其他月份各一張
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
          // 玩家手牌: 0111(1月光), 0331(3月短), 0431(4月短), 0531, 0631, 0731, 0931, 1031
          cards: ['0111', '0331', '0431', '0531', '0631', '0731', '0931', '1031'],
        },
        {
          player_id: 'player-2',
          // 對手手牌: 0131(1月短), 0421-1021(種牌)
          cards: ['0131', '0421', '0521', '0621', '0721', '0821', '0921', '1021'],
        },
      ],
      deck_remaining: 24,
      next_state: {
        state_type: 'AWAITING_HAND_PLAY',
        active_player_id: 'player-1',
      },
      timeout_seconds: 30,
    },
    delay: 3000,
  },

  // 3. SelectionRequired（第一次選擇）
  // 玩家打出 0111(1月光)，場上無1月牌，無配對
  // 翻牌翻出 0231(2月短)，場上有3張2月牌可選
  {
    eventType: 'SelectionRequired',
    payload: {
      event_type: 'SelectionRequired',
      event_id: 'sel-evt-003',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      hand_card_play: {
        played_card: '0111', // 1月光（松上鶴）
        matched_cards: [], // 場上無1月牌，無配對
      },
      drawn_card: '0231', // 翻出 2月短（梅赤短）
      possible_targets: ['0221', '0241', '0242'], // 3張2月牌可選
      deck_remaining: 23,
      timeout_seconds: 15,
    },
    delay: 3000,
  },

  // 4. TurnProgressAfterSelection（第一次選擇完成）
  // 玩家選擇了 0241，捕獲 0231 + 0241
  // 場上剩餘: 0221, 0242, 0341, 0342, 0541, 0641, 0741, 0111
  {
    eventType: 'TurnProgressAfterSelection',
    payload: {
      event_type: 'TurnProgressAfterSelection',
      event_id: 'sel-evt-004',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      selection: {
        source_card: '0231', // 翻出的 2月短
        selected_target: '0241', // 選擇配對 2月かす1
      },
      draw_card_play: {
        played_card: '0231', // 翻出的牌
        matched_cards: ['0241'], // 配對的場牌
      },
      yaku_update: null, // 此回合未形成役種
      deck_remaining: 23,
      next_state: {
        state_type: 'AWAITING_HAND_PLAY',
        active_player_id: 'player-2',
      },
      timeout_seconds: 30,
    },
    delay: 3000,
  },

  // 5. 對手回合完成
  // 對手打 0131(1月短) 配對場上的 0111(1月光)
  // 對手翻 0141(1月かす)，場上無1月牌，留在場上
  // 場上剩餘: 0221, 0242, 0341, 0342, 0541, 0641, 0741, 0141
  {
    eventType: 'TurnCompleted',
    payload: {
      event_type: 'TurnCompleted',
      event_id: 'sel-evt-005',
      timestamp: new Date().toISOString(),
      player_id: 'player-2',
      hand_card_play: {
        played_card: '0131', // 1月短
        matched_cards: ['0111'], // 配對場上的1月光
      },
      draw_card_play: {
        played_card: '0141', // 翻出 1月かす
        matched_cards: [], // 場上無1月牌（已被捕獲）
      },
      deck_remaining: 22,
      next_state: {
        state_type: 'AWAITING_HAND_PLAY',
        active_player_id: 'player-1',
      },
      timeout_seconds: 30,
    },
    delay: 3000,
  },

  // 6. 第二次 SelectionRequired
  // 玩家打 0431(4月短)，場上無4月牌，留在場上
  // 翻牌翻出 0311(3月光)，場上有2張3月牌(0341, 0342)可選
  {
    eventType: 'SelectionRequired',
    payload: {
      event_type: 'SelectionRequired',
      event_id: 'sel-evt-006',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      hand_card_play: {
        played_card: '0431', // 4月短（藤短）
        matched_cards: [], // 場上無4月牌
      },
      drawn_card: '0311', // 翻出 3月光（櫻上幕）
      possible_targets: ['0341', '0342'], // 場上有2張3月牌可選
      deck_remaining: 21,
      timeout_seconds: 15,
    },
    delay: 3000,
  },

  // 7. TurnProgressAfterSelection（第二次選擇完成）
  // 玩家選擇了 0341，捕獲 0311 + 0341
  // 場上剩餘: 0221, 0242, 0342, 0541, 0641, 0741, 0141, 0431
  {
    eventType: 'TurnProgressAfterSelection',
    payload: {
      event_type: 'TurnProgressAfterSelection',
      event_id: 'sel-evt-007',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      selection: {
        source_card: '0311', // 翻出的 3月光
        selected_target: '0341', // 選擇配對 3月かす1
      },
      draw_card_play: {
        played_card: '0311',
        matched_cards: ['0341'], // 配對的場牌
      },
      yaku_update: null, // 此回合未形成役種
      deck_remaining: 21,
      next_state: {
        state_type: 'AWAITING_HAND_PLAY',
        active_player_id: 'player-2',
      },
      timeout_seconds: 30,
    },
    delay: 3000,
  },
  // 完整版腳本到此結束（包含2次 SelectionRequired 測試場景）
]

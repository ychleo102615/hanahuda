/**
 * Mock Event Script - Mock 事件腳本
 *
 * @description
 * 定義完整的遊戲事件序列,用於 Mock 模式開發測試。
 * 包含從遊戲開始到結束的所有事件。
 *
 * 資料結構參考: front-end/src/user-interface/application/types/shared.ts
 */

import type { SSEEventType } from '#shared/contracts'

/**
 * Mock 事件項目
 */
export interface MockEventItem {
  /** 事件類型（SSOT: 來自 shared/contracts） */
  eventType: SSEEventType
  /** 事件 payload */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
  /** 延遲時間 (毫秒),預設 1000ms */
  delay?: number
}

/**
 * Mock 事件腳本
 *
 * @description
 * 模擬一局完整的遊戲流程。
 * 事件順序: GameStarted → RoundDealt → (遊戲進行中的事件...)
 *
 * 卡片 ID 格式: {月份2位}{類型1位}{序號1位}
 * 類型: 1=光牌, 2=種牌, 3=短冊, 4=かす
 *
 * CardPlay.captured_cards 說明:
 * - 配對成功: 包含 played_card + matched_card（兩張牌都進入獲得區）
 * - 無配對: 空陣列（played_card 留在場上）
 */
export const mockEventScript: MockEventItem[] = [
  // 1. 遊戲開始
  {
    eventType: 'GameStarted',
    payload: {
      event_type: 'GameStarted',
      event_id: 'evt-001',
      timestamp: new Date().toISOString(),
      game_id: 'mock-game-123',
      players: [
        { player_id: 'player-1', player_name: 'Player 1', is_ai: false },
        { player_id: 'player-2', player_name: 'AI Opponent', is_ai: true },
      ],
      ruleset: {
        total_rounds: 2,
        yaku_settings: [
          { yaku_type: 'GOKO', base_points: 10, enabled: true },
          { yaku_type: 'SHIKO', base_points: 8, enabled: true },
          { yaku_type: 'AME_SHIKO', base_points: 7, enabled: true },
          { yaku_type: 'SANKO', base_points: 5, enabled: true },
          { yaku_type: 'INOSHIKACHO', base_points: 5, enabled: true },
          { yaku_type: 'AKA_TAN', base_points: 6, enabled: true },
          { yaku_type: 'AO_TAN', base_points: 6, enabled: true },
          { yaku_type: 'TAN_ZAKU', base_points: 1, enabled: true },
          { yaku_type: 'TANE', base_points: 1, enabled: true },
          { yaku_type: 'KASU', base_points: 1, enabled: true },
          { yaku_type: 'TSUKIMI_ZAKE', base_points: 5, enabled: true },
          { yaku_type: 'HANAMI_ZAKE', base_points: 5, enabled: true },
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

  // 2. 發牌
  {
    eventType: 'RoundDealt',
    payload: {
      event_type: 'RoundDealt',
      event_id: 'evt-002',
      timestamp: new Date().toISOString(),
      dealer_id: 'player-1',
      // 場牌: 1-8月各一張かす
      field: ['0141', '0241', '0341', '0441', '0541', '0641', '0741', '0841'],
      hands: [
        {
          // 玩家手牌: 赤短3張 + 其他
          player_id: 'player-1',
          cards: ['0131', '0231', '0331', '0431', '0531', '0631', '0731', '0821'],
        },
        {
          // 對手手牌
          player_id: 'player-2',
          cards: ['0111', '0221', '0311', '0421', '0521', '0621', '0721', '0811'],
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

  // 3. 玩家出牌完成 (松赤短配對松かす)
  {
    eventType: 'TurnCompleted',
    payload: {
      event_type: 'TurnCompleted',
      event_id: 'evt-003',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      hand_card_play: {
        played_card: '0131', // 松赤短
        matched_card: '0141', // 配對松かす1
        captured_cards: ['0131', '0141'], // 兩張都進入獲得區
      },
      draw_card_play: {
        played_card: '0142', // 松かす2
        matched_card: null, // 無配對
        captured_cards: [], // 空陣列，牌留在場上
      },
      deck_remaining: 23,
      next_state: {
        state_type: 'AWAITING_HAND_PLAY',
        active_player_id: 'player-2',
      },
      timeout_seconds: 30,
    },
    delay: 3000,
  },

  // 4. 對手出牌完成 (松光配對松かす2)
  {
    eventType: 'TurnCompleted',
    payload: {
      event_type: 'TurnCompleted',
      event_id: 'evt-004',
      timestamp: new Date().toISOString(),
      player_id: 'player-2',
      hand_card_play: {
        played_card: '0111', // 松光
        matched_card: '0142', // 配對松かす2
        captured_cards: ['0111', '0142'],
      },
      draw_card_play: {
        played_card: '0931', // 菊青短
        matched_card: null,
        captured_cards: [],
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

  // 5. 玩家出牌完成 (梅赤短配對梅かす)
  {
    eventType: 'TurnCompleted',
    payload: {
      event_type: 'TurnCompleted',
      event_id: 'evt-005',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      hand_card_play: {
        played_card: '0231', // 梅赤短
        matched_card: '0241', // 配對梅かす1
        captured_cards: ['0231', '0241'],
      },
      draw_card_play: {
        played_card: '0242', // 梅かす2
        matched_card: null,
        captured_cards: [],
      },
      deck_remaining: 21,
      next_state: {
        state_type: 'AWAITING_HAND_PLAY',
        active_player_id: 'player-2',
      },
      timeout_seconds: 30,
    },
    delay: 3000,
  },

  // 6. 對手出牌完成（梅鶯配對梅かす2，菊かす配對菊青短）
  {
    eventType: 'TurnCompleted',
    payload: {
      event_type: 'TurnCompleted',
      event_id: 'evt-006',
      timestamp: new Date().toISOString(),
      player_id: 'player-2',
      hand_card_play: {
        played_card: '0221', // 梅鶯
        matched_card: '0242', // 配對梅かす2
        captured_cards: ['0221', '0242'],
      },
      draw_card_play: {
        played_card: '0941', // 菊かす1
        matched_card: '0931', // 配對菊青短（場上的九月牌）
        captured_cards: ['0941', '0931'], // 兩張都進入獲得區
      },
      deck_remaining: 20,
      next_state: {
        state_type: 'AWAITING_HAND_PLAY',
        active_player_id: 'player-1',
      },
      timeout_seconds: 30,
    },
    delay: 3000,
  },

  // 7. 玩家出牌完成 (櫻赤短配對櫻かす) - 形成赤短役
  {
    eventType: 'TurnCompleted',
    payload: {
      event_type: 'TurnCompleted',
      event_id: 'evt-007',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      hand_card_play: {
        played_card: '0331', // 櫻赤短
        matched_card: '0341', // 配對櫻かす1
        captured_cards: ['0331', '0341'],
      },
      draw_card_play: {
        played_card: '0342', // 櫻かす2
        matched_card: null,
        captured_cards: [],
      },
      deck_remaining: 19,
      next_state: {
        state_type: 'AWAITING_HAND_PLAY',
        active_player_id: 'player-1', // 繼續玩家回合因為形成役
      },
      timeout_seconds: 30,
    },
    delay: 3000,
  },

  // 8. 需要 Koi-Koi 決策 (赤短役形成)
  {
    eventType: 'DecisionRequired',
    payload: {
      event_type: 'DecisionRequired',
      event_id: 'evt-008',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      hand_card_play: {
        played_card: '0331',
        matched_card: '0341',
        captured_cards: ['0331', '0341'],
      },
      draw_card_play: {
        played_card: '0342',
        matched_card: null,
        captured_cards: [],
      },
      yaku_update: {
        newly_formed_yaku: [
          {
            yaku_type: 'AKA_TAN',
            base_points: 6,
            contributing_cards: ['0131', '0231', '0331'], // 松梅櫻赤短
          },
        ],
        all_active_yaku: [
          {
            yaku_type: 'AKA_TAN',
            base_points: 6,
            contributing_cards: ['0131', '0231', '0331'],
          },
        ],
      },
      current_multipliers: {
        player_multipliers: {
          'player-1': 1,
          'player-2': 1,
        },
      },
      deck_remaining: 19,
      timeout_seconds: 20,
    },
    delay: 3000,
  },

  // 9. 回合結束（使用 RoundEnded 統一事件）
  {
    eventType: 'RoundEnded',
    payload: {
      event_type: 'RoundEnded',
      event_id: 'evt-010',
      timestamp: new Date().toISOString(),
      reason: 'SCORED',
      updated_total_scores: [
        { player_id: 'player-1', score: 6 },
        { player_id: 'player-2', score: 0 },
      ],
      scoring_data: {
        winner_id: 'player-1',
        yaku_list: [
          {
            yaku_type: 'AKA_TAN',
            base_points: 6,
            contributing_cards: ['0131', '0231', '0331'],
          },
        ],
        base_score: 6,
        final_score: 6,
        multipliers: {
          player_multipliers: {
            'player-1': 1,
            'player-2': 1,
          },
        },
      },
      timeout_seconds: 5,
      require_continue_confirmation: false,
    },
    delay: 3000,
  },

  /*
  // 10. 遊戲結束
  {
    eventType: 'GameFinished',
    payload: {
      event_type: 'GameFinished',
      event_id: 'evt-011',
      timestamp: new Date().toISOString(),
      winner_id: 'player-1',
      final_scores: [
        { player_id: 'player-1', score: 6 },
        { player_id: 'player-2', score: 0 },
      ],
    },
    delay: 3000,
  },
  */
]

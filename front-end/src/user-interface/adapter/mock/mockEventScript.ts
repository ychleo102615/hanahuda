/**
 * Mock Event Script - Mock 事件腳本
 *
 * @description
 * 定義完整的遊戲事件序列,用於 Mock 模式開發測試。
 * 包含從遊戲開始到結束的所有事件。
 */

/**
 * Mock 事件項目
 */
export interface MockEventItem {
  /** 事件類型 */
  eventType: string
  /** 事件 payload */
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
        { player_id: 'player-1', name: 'Player 1', is_local: true },
        { player_id: 'player-2', name: 'AI Opponent', is_local: false },
      ],
      ruleset: {
        min_players: 2,
        max_players: 2,
        target_score: 7,
        deck_composition: 'HANAFUDA_48',
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
        state_type: 'PLAYING_HAND_CARD',
        active_player_id: 'player-1',
      },
    },
    delay: 1000,
  },

  // 3. 玩家出牌完成 (松赤短配對松かす)
  {
    eventType: 'TurnCompleted',
    payload: {
      event_type: 'TurnCompleted',
      event_id: 'evt-003',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      hand_card: '0131', // 松赤短
      deck_card: '0142', // 松かす2
      hand_match: { source: '0131', target: '0141' }, // 配對松かす1
      deck_match: null,
      captured: ['0131', '0141'],
      discarded: ['0142'],
      next_state: {
        state_type: 'PLAYING_HAND_CARD',
        active_player_id: 'player-2',
      },
    },
    delay: 2000,
  },

  // 4. 對手出牌完成 (松光配對松かす2)
  {
    eventType: 'TurnCompleted',
    payload: {
      event_type: 'TurnCompleted',
      event_id: 'evt-004',
      timestamp: new Date().toISOString(),
      player_id: 'player-2',
      hand_card: '0111', // 松光
      deck_card: '0931', // 菊青短
      hand_match: { source: '0111', target: '0142' },
      deck_match: null,
      captured: ['0111', '0142'],
      discarded: ['0931'],
      next_state: {
        state_type: 'PLAYING_HAND_CARD',
        active_player_id: 'player-1',
      },
    },
    delay: 1500,
  },

  // 5. 玩家出牌完成 (梅赤短配對梅かす)
  {
    eventType: 'TurnCompleted',
    payload: {
      event_type: 'TurnCompleted',
      event_id: 'evt-005',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      hand_card: '0231', // 梅赤短
      deck_card: '0242', // 梅かす2
      hand_match: { source: '0231', target: '0241' }, // 配對梅かす1
      deck_match: null,
      captured: ['0231', '0241'],
      discarded: ['0242'],
      next_state: {
        state_type: 'PLAYING_HAND_CARD',
        active_player_id: 'player-2',
      },
    },
    delay: 1500,
  },

  // 6. 對手出牌完成
  {
    eventType: 'TurnCompleted',
    payload: {
      event_type: 'TurnCompleted',
      event_id: 'evt-006',
      timestamp: new Date().toISOString(),
      player_id: 'player-2',
      hand_card: '0221', // 梅鶯
      deck_card: '0941', // 菊かす1
      hand_match: { source: '0221', target: '0242' },
      deck_match: null,
      captured: ['0221', '0242'],
      discarded: ['0941'],
      next_state: {
        state_type: 'PLAYING_HAND_CARD',
        active_player_id: 'player-1',
      },
    },
    delay: 1500,
  },

  // 7. 玩家出牌完成 (櫻赤短配對櫻かす) - 形成赤短役
  {
    eventType: 'TurnCompleted',
    payload: {
      event_type: 'TurnCompleted',
      event_id: 'evt-007',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      hand_card: '0331', // 櫻赤短
      deck_card: '0342', // 櫻かす2
      hand_match: { source: '0331', target: '0341' }, // 配對櫻かす1
      deck_match: null,
      captured: ['0331', '0341'],
      discarded: ['0342'],
      next_state: {
        state_type: 'PLAYING_HAND_CARD',
        active_player_id: 'player-1', // 繼續玩家回合因為形成役
      },
    },
    delay: 1500,
  },

  // 8. 需要 Koi-Koi 決策 (赤短役形成)
  {
    eventType: 'DecisionRequired',
    payload: {
      event_type: 'DecisionRequired',
      event_id: 'evt-008',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      hand_card_play: null,
      draw_card_play: null,
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
      deck_remaining: 16,
    },
    delay: 2000,
  },

  // 9. 玩家選擇結束 (赤短 6 分已達標)
  {
    eventType: 'DecisionMade',
    payload: {
      event_type: 'DecisionMade',
      event_id: 'evt-009',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      decision: 'END_ROUND',
      updated_multipliers: {
        player_multipliers: {
          'player-1': 1,
          'player-2': 1,
        },
      },
      next_state: {
        state_type: 'ROUND_ENDED',
        active_player_id: null,
      },
    },
    delay: 1000,
  },

  // 10. 回合計分
  {
    eventType: 'RoundScored',
    payload: {
      event_type: 'RoundScored',
      event_id: 'evt-010',
      timestamp: new Date().toISOString(),
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
      updated_total_scores: [
        { player_id: 'player-1', score: 6 },
        { player_id: 'player-2', score: 0 },
      ],
    },
    delay: 2000,
  },

  // 11. 遊戲結束
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
    delay: 1000,
  },
]

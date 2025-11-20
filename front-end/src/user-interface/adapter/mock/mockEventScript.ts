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
      field: ['0111', '0211', '0311', '0411', '0511', '0611', '0711', '0811'],
      hands: [
        {
          player_id: 'player-1',
          cards: ['0112', '0212', '0312', '0412', '0512', '0612', '0712', '0812'],
        },
        {
          player_id: 'player-2',
          cards: ['0121', '0221', '0321', '0421', '0521', '0621', '0721', '0821'],
        },
      ],
      deck_remaining: 24,
      next_state: {
        flow_stage: 'PLAYING_HAND_CARD',
        current_player_id: 'player-1',
        round_number: 1,
        turn_number: 1,
      },
    },
    delay: 1000,
  },

  // 3. 玩家出牌完成 (手牌配對場牌)
  {
    eventType: 'TurnCompleted',
    payload: {
      event_type: 'TurnCompleted',
      event_id: 'evt-003',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      hand_card: '0112',
      deck_card: '0113',
      hand_match: { source: '0112', target: '0111' },
      deck_match: null,
      captured: ['0112', '0111'],
      discarded: ['0113'],
      next_state: {
        flow_stage: 'PLAYING_HAND_CARD',
        current_player_id: 'player-2',
        round_number: 1,
        turn_number: 2,
      },
    },
    delay: 2000,
  },

  // 4. 對手出牌完成
  {
    eventType: 'TurnCompleted',
    payload: {
      event_type: 'TurnCompleted',
      event_id: 'evt-004',
      timestamp: new Date().toISOString(),
      player_id: 'player-2',
      hand_card: '0121',
      deck_card: '0122',
      hand_match: null,
      deck_match: null,
      captured: [],
      discarded: ['0121', '0122'],
      next_state: {
        flow_stage: 'PLAYING_HAND_CARD',
        current_player_id: 'player-1',
        round_number: 1,
        turn_number: 3,
      },
    },
    delay: 1500,
  },

  // 5. 玩家出牌需要選擇配對 (多張同月牌)
  {
    eventType: 'SelectionRequired',
    payload: {
      event_type: 'SelectionRequired',
      event_id: 'evt-005',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      source_card: '0212',
      selection_type: 'HAND_MATCH',
      options: ['0211', '0113'],
    },
    delay: 1000,
  },

  // 6. 選擇後的回合進度
  {
    eventType: 'TurnProgressAfterSelection',
    payload: {
      event_type: 'TurnProgressAfterSelection',
      event_id: 'evt-006',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      selected_target: '0211',
      captured: ['0212', '0211'],
      deck_card: '0214',
      deck_match: null,
      discarded: ['0214'],
      next_state: {
        flow_stage: 'PLAYING_HAND_CARD',
        current_player_id: 'player-2',
        round_number: 1,
        turn_number: 4,
      },
    },
    delay: 1500,
  },

  // 7. 繼續遊戲...對手回合
  {
    eventType: 'TurnCompleted',
    payload: {
      event_type: 'TurnCompleted',
      event_id: 'evt-007',
      timestamp: new Date().toISOString(),
      player_id: 'player-2',
      hand_card: '0221',
      deck_card: '0223',
      hand_match: null,
      deck_match: null,
      captured: [],
      discarded: ['0221', '0223'],
      next_state: {
        flow_stage: 'PLAYING_HAND_CARD',
        current_player_id: 'player-1',
        round_number: 1,
        turn_number: 5,
      },
    },
    delay: 1500,
  },

  // 8. 需要 Koi-Koi 決策 (役種形成時)
  {
    eventType: 'DecisionRequired',
    payload: {
      event_type: 'DecisionRequired',
      event_id: 'evt-008',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      current_yaku: [
        {
          yaku_id: 'TANZAKU',
          name: '短冊',
          points: 1,
          cards: ['0112', '0212', '0312'],
        },
      ],
      current_points: 1,
      potential_yaku: ['AKA_TAN', 'AO_TAN'],
    },
    delay: 2000,
  },

  // 9. 玩家選擇繼續 (Koi-Koi)
  {
    eventType: 'DecisionMade',
    payload: {
      event_type: 'DecisionMade',
      event_id: 'evt-009',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      decision: 'KOI_KOI',
      accumulated_points: 1,
      next_state: {
        flow_stage: 'PLAYING_HAND_CARD',
        current_player_id: 'player-2',
        round_number: 1,
        turn_number: 6,
      },
    },
    delay: 1000,
  },

  // 10. 對手回合
  {
    eventType: 'TurnCompleted',
    payload: {
      event_type: 'TurnCompleted',
      event_id: 'evt-010',
      timestamp: new Date().toISOString(),
      player_id: 'player-2',
      hand_card: '0321',
      deck_card: '0322',
      hand_match: { source: '0321', target: '0311' },
      deck_match: null,
      captured: ['0321', '0311'],
      discarded: ['0322'],
      next_state: {
        flow_stage: 'PLAYING_HAND_CARD',
        current_player_id: 'player-1',
        round_number: 1,
        turn_number: 7,
      },
    },
    delay: 1500,
  },

  // 11. 再次需要決策 (形成更高分役種)
  {
    eventType: 'DecisionRequired',
    payload: {
      event_type: 'DecisionRequired',
      event_id: 'evt-011',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      current_yaku: [
        {
          yaku_id: 'TANZAKU',
          name: '短冊',
          points: 1,
          cards: ['0112', '0212', '0312'],
        },
        {
          yaku_id: 'AKA_TAN',
          name: '赤短',
          points: 6,
          cards: ['0112', '0212', '0312'],
        },
      ],
      current_points: 7,
      potential_yaku: [],
    },
    delay: 2000,
  },

  // 12. 玩家選擇結束
  {
    eventType: 'DecisionMade',
    payload: {
      event_type: 'DecisionMade',
      event_id: 'evt-012',
      timestamp: new Date().toISOString(),
      player_id: 'player-1',
      decision: 'END_ROUND',
      accumulated_points: 7,
      next_state: {
        flow_stage: 'ROUND_ENDED',
        current_player_id: null,
        round_number: 1,
        turn_number: 7,
      },
    },
    delay: 1000,
  },

  // 13. 回合計分
  {
    eventType: 'RoundScored',
    payload: {
      event_type: 'RoundScored',
      event_id: 'evt-013',
      timestamp: new Date().toISOString(),
      winner_id: 'player-1',
      loser_id: 'player-2',
      points_awarded: 7,
      end_reason: 'PLAYER_ENDED',
      scores: [
        { player_id: 'player-1', round_score: 7, total_score: 7 },
        { player_id: 'player-2', round_score: 0, total_score: 0 },
      ],
    },
    delay: 2000,
  },

  // 14. 遊戲結束
  {
    eventType: 'GameFinished',
    payload: {
      event_type: 'GameFinished',
      event_id: 'evt-014',
      timestamp: new Date().toISOString(),
      winner_id: 'player-1',
      final_scores: [
        { player_id: 'player-1', total_score: 7 },
        { player_id: 'player-2', total_score: 0 },
      ],
      total_rounds: 1,
      end_reason: 'TARGET_SCORE_REACHED',
    },
    delay: 1000,
  },
]

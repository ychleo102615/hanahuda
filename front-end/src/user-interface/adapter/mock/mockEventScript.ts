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
interface MockEventItem {
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

  // 3. (TODO) 後續事件將在 User Story 2-5 實作時新增
  // - TurnCompleted
  // - SelectionRequired
  // - DecisionRequired
  // - YakuFormed
  // - RoundScored
  // - GameFinished
]

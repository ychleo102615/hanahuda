// ============ 事件類型常數 ============

/**
 * 遊戲整合事件類型常數
 * 使用 const object 而非 string literals 以提供類型安全和 IDE 自動完成
 */
export const IntegrationEventType = {
  GameCreated: 'GameCreated',
  RoundStarted: 'RoundStarted',
  CardPlayed: 'CardPlayed',
  YakuAchieved: 'YakuAchieved',
  PlayerTurnChanged: 'PlayerTurnChanged',
  KoikoiDecisionMade: 'KoikoiDecisionMade',
  RoundEnded: 'RoundEnded',
  GameEnded: 'GameEnded',
} as const

/**
 * 事件類型的聯合類型
 */
export type IntegrationEventTypeValue =
  (typeof IntegrationEventType)[keyof typeof IntegrationEventType]

// ============ 基礎接口 ============

export interface IntegrationEvent {
  readonly eventId: string
  readonly eventType: IntegrationEventTypeValue
  readonly occurredAt: string
  readonly aggregateId: string // gameId
  readonly version: number
}

// ============ 卡牌 DTO ============

export interface CardDTO {
  readonly id: string
  readonly suit: number
  readonly type: string
  readonly points: number
  readonly name: string
  readonly month: number
}

// ============ 玩家 DTO ============

export interface PlayerStateDTO {
  readonly id: string
  readonly name: string
  readonly isHuman: boolean
  readonly handCards: CardDTO[] // 手牌
  readonly capturedCards: CardDTO[] // 捕獲的牌
  readonly score: number
}

// ============ 遊戲整合事件 ============

/**
 * 遊戲創建事件
 * 職責：通知遊戲已創建，包含玩家基本資訊
 * 時機：SetUpGameUseCase 執行後
 */
export interface GameCreatedEventData extends IntegrationEvent {
  readonly eventType: typeof IntegrationEventType.GameCreated
  readonly payload: {
    readonly gameId: string
    readonly players: Array<{
      readonly id: string
      readonly name: string
      readonly isHuman: boolean
    }>
  }
}

/**
 * 回合開始事件
 * 職責：通知新回合開始，包含完整的遊戲狀態（卡牌、玩家等）
 * 時機：SetUpRoundUseCase 執行後（第一回合或新回合）
 */
export interface RoundStartedEventData extends IntegrationEvent {
  readonly eventType: typeof IntegrationEventType.RoundStarted
  readonly payload: {
    readonly gameId: string
    readonly round: number
    readonly currentPlayerId: string
    readonly currentPlayerName: string
    readonly players: PlayerStateDTO[] // 完整玩家狀態（包含手牌）
    readonly fieldCards: CardDTO[] // 場上的牌
    readonly deckCount: number // 牌堆剩餘數量
  }
}

/**
 * 卡牌出牌事件
 * 職責：通知玩家出牌及配對結果
 * 時機：PlayCardUseCase 執行後
 */
export interface CardPlayedEventData extends IntegrationEvent {
  readonly eventType: typeof IntegrationEventType.CardPlayed
  readonly payload: {
    readonly gameId: string
    readonly playerId: string
    readonly playerName: string
    readonly playedCard: CardDTO // 玩家打出的牌
    readonly selectedFieldCardId?: string // 玩家選擇的場牌 ID（如果有多張可配對）
    readonly capturedCards: CardDTO[] // 所有捕獲的牌（包含玩家牌+場牌+牌堆牌）
    readonly deckCard?: CardDTO // 從牌堆翻出的牌
    readonly deckCardCaptured: boolean // 牌堆牌是否被捕獲
    readonly remainingDeckCount: number // 剩餘牌堆數量
  }
}

/**
 * 役種達成事件
 * 職責：通知玩家達成役種
 * 時機：PlayCardUseCase 檢測到役種後
 */
export interface YakuAchievedEventData extends IntegrationEvent {
  readonly eventType: typeof IntegrationEventType.YakuAchieved
  readonly payload: {
    readonly gameId: string
    readonly playerId: string
    readonly playerName: string
    readonly yakuResults: Array<{
      readonly name: string
      readonly score: number
      readonly cardIds: string[]
    }>
    readonly totalScore: number
    readonly canDeclareKoikoi: boolean // 是否還有手牌可繼續
  }
}

/**
 * Koikoi 決策事件
 * 職責：通知玩家的 Koikoi 決策
 * 時機：玩家做出 Koikoi 決策後
 */
export interface KoikoiDecisionMadeEventData extends IntegrationEvent {
  readonly eventType: typeof IntegrationEventType.KoikoiDecisionMade
  readonly payload: {
    readonly gameId: string
    readonly playerId: string
    readonly playerName: string
    readonly continueGame: boolean // true = 宣告 Koikoi 繼續, false = 結束回合
  }
}

/**
 * 回合結束事件
 * 職責：通知回合結束及結算結果
 * 時機：endRound 執行後
 */
export interface RoundEndedEventData extends IntegrationEvent {
  readonly eventType: typeof IntegrationEventType.RoundEnded
  readonly payload: {
    readonly gameId: string
    readonly round: number
    readonly winnerId: string | null
    readonly winnerName: string | null
    readonly score: number
    readonly yakuResults: Array<{
      readonly name: string
      readonly score: number
      readonly cardIds: string[]
    }>
    readonly koikoiDeclared: boolean
    readonly players: Array<{
      // 更新後的玩家總分
      readonly id: string
      readonly name: string
      readonly totalScore: number
    }>
  }
}

/**
 * 遊戲結束事件
 * 職責：通知遊戲結束及最終勝者
 * 時機：達到最大回合數或玩家決定結束遊戲
 */
export interface GameEndedEventData extends IntegrationEvent {
  readonly eventType: typeof IntegrationEventType.GameEnded
  readonly payload: {
    readonly gameId: string
    readonly winnerId: string | null
    readonly winnerName: string | null
    readonly finalScores: Array<{
      readonly playerId: string
      readonly playerName: string
      readonly score: number
    }>
    readonly totalRounds: number
  }
}

/**
 * 玩家切換事件
 * 職責：通知當前玩家切換
 * 時機：出牌完成後（沒有役種的情況）
 */
export interface PlayerTurnChangedEventData extends IntegrationEvent {
  readonly eventType: typeof IntegrationEventType.PlayerTurnChanged
  readonly payload: {
    readonly gameId: string
    readonly currentPlayerId: string
    readonly currentPlayerName: string
  }
}

// 聯合類型
export type GameIntegrationEvent =
  | GameCreatedEventData
  | RoundStartedEventData
  | CardPlayedEventData
  | YakuAchievedEventData
  | KoikoiDecisionMadeEventData
  | RoundEndedEventData
  | GameEndedEventData
  | PlayerTurnChangedEventData
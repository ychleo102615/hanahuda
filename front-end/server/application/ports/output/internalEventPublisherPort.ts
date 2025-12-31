/**
 * InternalEventPublisherPort - Output Port
 *
 * @description
 * Application Layer 定義的內部事件發佈介面，由 Adapter Layer 實作。
 *
 * 語意：此介面僅用於 ROOM_CREATED 事件，通知「有新房間被建立」。
 * 不用於遊戲進行中的事件（TurnCompleted, SelectionRequired 等），
 * 遊戲事件透過 EventPublisherPort 路由到對應通道。
 *
 * @module server/application/ports/output/internalEventPublisherPort
 */

/**
 * 房間建立事件 Payload
 */
export interface RoomCreatedPayload {
  /** 遊戲 ID */
  readonly gameId: string
  /** 等待中玩家的 ID */
  readonly waitingPlayerId: string
}

/**
 * 內部事件發佈器介面
 *
 * Application Layer 透過此介面發佈內部事件，
 * 供 OpponentService 等內部訂閱者監聽。
 */
export interface InternalEventPublisherPort {
  /**
   * 發佈房間建立事件
   *
   * 觸發時機：JoinGameUseCase 建立新遊戲（WAITING 狀態）時
   * 用途：通知 OpponentService 有新房間需要 AI 加入
   *
   * @param payload - 房間建立事件 Payload
   */
  publishRoomCreated(payload: RoomCreatedPayload): void
}

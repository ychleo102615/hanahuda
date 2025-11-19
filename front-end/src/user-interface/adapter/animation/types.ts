/**
 * Animation Types
 *
 * 定義所有動畫相關的型別
 */

/**
 * 動畫類型
 * P1 階段: DEAL_CARDS, CARD_MOVE
 * P3 階段: MATCH_HIGHLIGHT, YAKU_FORMED, SCORE_UPDATE
 */
export type AnimationType =
  | 'DEAL_CARDS'      // 發牌動畫
  | 'CARD_MOVE';      // 卡片移動動畫
  // P3 階段擴展:
  // | 'MATCH_HIGHLIGHT' // 配對高亮閃爍
  // | 'YAKU_FORMED'     // 役種形成發光特效
  // | 'SCORE_UPDATE';   // 分數滾動動畫

/**
 * 動畫參數聯合型別
 */
export type AnimationParams = DealCardsParams | CardMoveParams;

/**
 * 發牌動畫參數
 */
export interface DealCardsParams {
  targetZones: Zone[];
  delay: number;        // 每張牌之間的延遲 (ms)
  duration: number;     // 每張牌的動畫時間 (ms)
}

/**
 * 卡片移動動畫參數
 */
export interface CardMoveParams {
  cardId: string;
  from: Position;
  to: Position;
  duration: number;     // 動畫時間 (ms)
}

/**
 * 位置座標
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * 卡片區域
 */
export type Zone =
  | 'player-hand'
  | 'opponent-hand'
  | 'field'
  | 'player-depository'
  | 'opponent-depository'
  | 'deck';

/**
 * 動畫實體
 */
export interface Animation {
  id: string;                  // UUID
  type: AnimationType;
  params: AnimationParams;
  status: AnimationStatus;
  callback?: () => void;       // 動畫完成後的回調
}

/**
 * 動畫狀態
 */
export type AnimationStatus =
  | 'pending'      // 等待執行
  | 'running'      // 執行中
  | 'completed'    // 已完成
  | 'interrupted'; // 已中斷

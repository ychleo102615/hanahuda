/**
 * Z-Index Constants
 *
 * @description
 * 全域 z-index 層級定義，確保 UI 元素正確疊加順序。
 * 所有需要 z-index 的元件都應引用此常數檔案。
 *
 * 層級設計原則：
 * - 數值間隔 100，便於未來插入新層級
 * - ActionPanel 和 Modal 高於動畫層，確保可操作性
 * - ReconnectionBanner 為最高層級，確保連線提示可見
 */

export const Z_INDEX = {
  /** 一般內容層（預設） */
  BASE: 0,

  /** 下拉選單 */
  DROPDOWN: 100,

  /** 固定導航列 */
  STICKY: 200,

  /** 卡片動畫層 */
  ANIMATION: 500,

  /** 遮罩層（半透明背景） */
  OVERLAY: 1000,

  /** Modal 對話框 */
  MODAL: 1100,

  /** 遊戲公告（Koi-Koi、役種） */
  ANNOUNCEMENT: 1150,

  /** 側邊面板（ActionPanel 內容） */
  PANEL: 1200,

  /** Toast 訊息 */
  TOAST: 1300,

  /** Tooltip 提示 */
  TOOLTIP: 1400,

  /** 重連提示（最高優先級） */
  RECONNECTION: 1500,
} as const

export type ZIndexLevel = keyof typeof Z_INDEX
export type ZIndexValue = (typeof Z_INDEX)[ZIndexLevel]

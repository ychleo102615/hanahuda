/**
 * MenuItem Type - 選單項目類型
 *
 * @description
 * BC 內部使用的選單項目類型定義。
 * 由 Adapter 層 composables 使用，避免依賴根層級 components。
 *
 * @module game-client/adapter/types/menu-item
 */

export interface MenuItem {
  /** 唯一識別符 */
  id: string
  /** 顯示文字 */
  label: string
  /** 圖示名稱 */
  icon?: string
  /** 點擊處理函數 */
  onClick: () => void
  /** 是否禁用 */
  disabled?: boolean
}

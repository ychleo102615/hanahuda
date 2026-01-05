/**
 * 選單項目類型
 *
 * @description
 * 用於定義選單中的單一項目，包含 ID、標籤、圖示、點擊處理和禁用狀態。
 */
export interface MenuItem {
  /** 唯一識別符 */
  id: string
  /** 顯示文字 */
  label: string
  /** 圖示名稱（對應 iconPaths）或 emoji */
  icon?: string
  /** 點擊處理函數 */
  onClick: () => void
  /** 是否禁用 */
  disabled?: boolean
}

/**
 * SVG Path 映射表
 *
 * @description
 * 將圖示名稱映射到 SVG path 字串，用於渲染內嵌 SVG 圖示。
 * 使用 Heroicons 風格的 24x24 viewBox。
 */
export const iconPaths: Record<string, string> = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  'door-exit': 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
}

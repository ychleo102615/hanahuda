/**
 * NavigationPort - Output Port
 *
 * @description
 * 負責路由導航操作。
 * 由 Application Layer 定義，Adapter Layer 使用 Vue Router 實作。
 *
 * @example
 * ```typescript
 * // Adapter Layer 實作
 * class VueRouterNavigationAdapter implements NavigationPort {
 *   constructor(private router: Router) {}
 *
 *   navigateToLobby(): void {
 *     this.router.push({ name: 'lobby' })
 *   }
 *
 *   navigateToGame(): void {
 *     this.router.push({ name: 'game' })
 *   }
 *
 *   navigateToHome(): void {
 *     this.router.push({ name: 'home' })
 *   }
 * }
 * ```
 */
export interface NavigationPort {
  /**
   * 導航至遊戲大廳
   */
  navigateToLobby(): void

  /**
   * 導航至遊戲畫面
   */
  navigateToGame(): void

  /**
   * 導航至首頁
   */
  navigateToHome(): void
}

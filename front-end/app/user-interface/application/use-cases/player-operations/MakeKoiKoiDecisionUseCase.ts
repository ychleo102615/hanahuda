/**
 * MakeKoiKoiDecisionUseCase
 *
 * @description
 * 處理 Koi-Koi 決策的業務流程編排 Use Case。
 *
 * 業務流程：
 * 0. 檢查動畫狀態：若動畫進行中則阻止操作
 * 1. 計算當前分數：加總所有役種的基礎分數並套用 Koi-Koi 倍率
 * 2. 可選功能：若選擇繼續（KOI_KOI），計算下一倍率的潛在分數
 * 3. 發送決策命令：調用 SendCommandPort 發送 RoundMakeDecision 命令到後端
 *
 * Clean Architecture 原則：
 * - 依賴反轉：通過 Output Ports 與外部通訊
 * - 單一職責：僅負責業務流程編排，不包含業務邏輯實作
 * - 可測試性：所有依賴可通過 Mock 替換
 *
 * @implements {MakeKoiKoiDecisionPort}
 */

import type {
  MakeKoiKoiDecisionPort,
  MakeKoiKoiDecisionInput,
  MakeKoiKoiDecisionOutput,
} from '../../ports/input/player-operations.port'
import type { SendCommandPort, AnimationPort, NotificationPort } from '../../ports/output'
import type { YakuScore } from '#shared/contracts'
import type { DomainFacade } from '../../types/domain-facade'
import type { Result } from '../../types/result'

/**
 * MakeKoiKoiDecisionUseCase 實作
 */
export class MakeKoiKoiDecisionUseCase implements MakeKoiKoiDecisionPort {
  /**
   * 建構子
   *
   * @param sendCommandPort - 發送命令到後端的 Output Port
   * @param domainFacade - Domain Layer 業務邏輯門面（預留，可用於役種驗證）
   * @param animationPort - 動畫系統 Output Port（用於檢查動畫狀態）
   * @param notification - 通知系統 Output Port（用於停止倒數計時）
   */
  constructor(
    private readonly sendCommandPort: SendCommandPort,
    private readonly domainFacade: DomainFacade,
    private readonly animationPort: AnimationPort,
    private readonly notification: NotificationPort
  ) {}

  /**
   * 執行 Koi-Koi 決策操作
   *
   * @param input - 決策輸入參數
   * @returns 操作結果（成功/失敗）
   */
  execute(input: MakeKoiKoiDecisionInput): Result<MakeKoiKoiDecisionOutput> {
    // Step 0: 檢查動畫狀態 - 若動畫進行中則阻止操作
    if (this.animationPort.isAnimating()) {
      return {
        success: false,
        error: 'ANIMATION_IN_PROGRESS',
      }
    }

    // 停止 Modal 倒數（DecisionModal 使用 displayCountdown）
    this.notification.stopCountdown()

    // Step 1: Calculate current score
    // 加總所有役種的基礎分數
    const baseScore = this.calculateBaseScore(input.currentYaku)

    // 套用 Koi-Koi 倍率
    const currentScore = baseScore * input.koiKoiMultiplier

    // Step 2: Calculate potential score (optional feature for KOI_KOI decision)
    let potentialScore: number | undefined = undefined

    if (input.decision === 'KOI_KOI') {
      // 計算下一倍率的潛在分數（用於決策建議）
      const nextMultiplier = input.koiKoiMultiplier + 1
      potentialScore = baseScore * nextMultiplier
    }

    // Step 3: Send decision command to backend
    this.sendCommandPort.makeDecision(input.decision)

    // Step 4: Return result
    return {
      success: true,
      value: {
        decision: input.decision,
        currentScore,
        potentialScore,
      },
    }
  }

  /**
   * 計算基礎分數（加總所有役種的基礎分數）
   *
   * @param yakuList - 役種列表
   * @returns 基礎分數總和
   * @private
   */
  private calculateBaseScore(yakuList: YakuScore[]): number {
    return yakuList.reduce((total, yaku) => total + yaku.base_points, 0)
  }
}

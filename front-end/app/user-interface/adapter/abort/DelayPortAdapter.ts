/**
 * DelayPortAdapter - DelayPort 的 Adapter 實作
 *
 * @description
 * 將 AbortableDelay 模組的 delay 函數適配為 DelayPort 介面。
 * 無狀態的輕量級適配器。
 *
 * @module user-interface/adapter/abort/DelayPortAdapter
 */

import type { DelayPort } from '../../application/ports/output/delay.port'
import { delay as delayImpl } from './AbortableDelay'

export class DelayPortAdapter implements DelayPort {
  delay(ms: number, signal?: AbortSignal): Promise<void> {
    return delayImpl(ms, signal)
  }
}

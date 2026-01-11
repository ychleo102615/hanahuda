/**
 * LayoutPortAdapter - LayoutPort 的 Adapter 實作
 *
 * @description
 * 將 AbortableDelay 模組的 waitForLayout 函數適配為 LayoutPort 介面。
 * 無狀態的輕量級適配器。
 *
 * @module user-interface/adapter/abort/LayoutPortAdapter
 */

import type { LayoutPort } from '../../application/ports/output/layout.port'
import { waitForLayout as waitForLayoutImpl } from './AbortableDelay'

export class LayoutPortAdapter implements LayoutPort {
  waitForLayout(frames?: number, signal?: AbortSignal): Promise<void> {
    return waitForLayoutImpl(frames, signal)
  }
}

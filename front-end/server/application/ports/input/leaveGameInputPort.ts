/**
 * LeaveGameInputPort - Application Layer
 *
 * @description
 * 離開遊戲用例的輸入端口介面。
 *
 * @module server/application/ports/input/leaveGameInputPort
 */

import type { LeaveGameInput, LeaveGameOutput } from '../../use-cases/leaveGameUseCase'

/**
 * 離開遊戲輸入端口
 */
export interface LeaveGameInputPort {
  execute(input: LeaveGameInput): Promise<LeaveGameOutput>
}

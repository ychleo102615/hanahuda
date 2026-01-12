/**
 * Identity BC Dependency Injection Container
 *
 * @description
 * 管理 Identity BC 的依賴注入。
 * 提供 Use Cases 的工廠函數。
 *
 * 參考: specs/010-player-account/plan.md - Adapter Layer
 */

import { db } from '~~/server/utils/db'
import { DrizzlePlayerRepository } from '../persistence/drizzle-player-repository'
import { DrizzleAccountRepository } from '../persistence/drizzle-account-repository'
import { DrizzleOAuthLinkRepository } from '../persistence/drizzle-oauth-link-repository'
import { getSessionStore } from '../session/in-memory-session-store'
import { BcryptPasswordHasher } from '../crypto/bcrypt-password-hasher'
import { playerStatsRepository } from '~~/server/core-game/adapters/persistence/drizzlePlayerStatsRepository'
import { CreateGuestUseCase } from '../../application/use-cases/create-guest-use-case'
import { GetCurrentPlayerUseCase } from '../../application/use-cases/get-current-player-use-case'
import { RegisterAccountUseCase } from '../../application/use-cases/register-account-use-case'
import { LoginUseCase } from '../../application/use-cases/login-use-case'
import { LogoutUseCase } from '../../application/use-cases/logout-use-case'
import { ExternalAuthLoginUseCase } from '../../application/use-cases/external-auth-login-use-case'
import { LinkAccountUseCase } from '../../application/use-cases/link-account-use-case'
import { DeleteAccountUseCase } from '../../application/use-cases/delete-account-use-case'
import { TelegramInitDataValidator } from '../telegram/telegram-init-data-validator'
import type { PlayerRepositoryPort } from '../../application/ports/output/player-repository-port'
import type { AccountRepositoryPort } from '../../application/ports/output/account-repository-port'
import type { OAuthLinkRepositoryPort } from '../../application/ports/output/oauth-link-repository-port'
import type { SessionStorePort } from '../../application/ports/output/session-store-port'
import type { PasswordHashPort } from '../../application/ports/output/password-hash-port'

// =============================================================================
// Container Interface
// =============================================================================

/**
 * Identity BC Container
 */
export interface IdentityContainer {
  // Ports
  playerRepository: PlayerRepositoryPort
  accountRepository: AccountRepositoryPort
  oauthLinkRepository: OAuthLinkRepositoryPort
  sessionStore: SessionStorePort
  passwordHasher: PasswordHashPort

  // Use Cases
  createGuestUseCase: CreateGuestUseCase
  getCurrentPlayerUseCase: GetCurrentPlayerUseCase
  registerAccountUseCase: RegisterAccountUseCase
  loginUseCase: LoginUseCase
  logoutUseCase: LogoutUseCase
  externalAuthLoginUseCase: ExternalAuthLoginUseCase
  linkAccountUseCase: LinkAccountUseCase
  deleteAccountUseCase: DeleteAccountUseCase

  // Telegram Adapters
  telegramValidator: TelegramInitDataValidator | null
}

// =============================================================================
// Container Factory
// =============================================================================

let container: IdentityContainer | null = null

/**
 * 建立或取得 Identity Container
 *
 * 使用單例模式確保整個應用程式使用相同的依賴
 */
export function getIdentityContainer(): IdentityContainer {
  if (container) {
    return container
  }

  // 建立依賴
  const playerRepository = new DrizzlePlayerRepository(db)
  const accountRepository = new DrizzleAccountRepository(db)
  const oauthLinkRepository = new DrizzleOAuthLinkRepository(db)
  const sessionStore = getSessionStore()
  const passwordHasher = new BcryptPasswordHasher()

  // 建立 Use Cases
  const createGuestUseCase = new CreateGuestUseCase(playerRepository, sessionStore)
  const getCurrentPlayerUseCase = new GetCurrentPlayerUseCase(playerRepository, sessionStore)
  const registerAccountUseCase = new RegisterAccountUseCase(playerRepository, accountRepository, sessionStore, passwordHasher)
  const loginUseCase = new LoginUseCase(playerRepository, accountRepository, sessionStore, passwordHasher)
  const logoutUseCase = new LogoutUseCase(sessionStore)

  // ExternalAuthLoginUseCase：核心第三方認證登入邏輯
  const externalAuthLoginUseCase = new ExternalAuthLoginUseCase(
    playerRepository,
    accountRepository,
    oauthLinkRepository,
    sessionStore
  )

  const linkAccountUseCase = new LinkAccountUseCase(playerRepository, accountRepository, oauthLinkRepository, sessionStore, passwordHasher)
  const deleteAccountUseCase = new DeleteAccountUseCase(playerRepository, accountRepository, oauthLinkRepository, sessionStore, passwordHasher, playerStatsRepository)

  // Telegram Validator（僅在有設定 TELEGRAM_BOT_TOKEN 時建立）
  let telegramValidator: TelegramInitDataValidator | null = null
  if (process.env.TELEGRAM_BOT_TOKEN) {
    telegramValidator = new TelegramInitDataValidator(process.env.TELEGRAM_BOT_TOKEN)
  }

  container = {
    playerRepository,
    accountRepository,
    oauthLinkRepository,
    sessionStore,
    passwordHasher,
    createGuestUseCase,
    getCurrentPlayerUseCase,
    registerAccountUseCase,
    loginUseCase,
    logoutUseCase,
    externalAuthLoginUseCase,
    linkAccountUseCase,
    deleteAccountUseCase,
    telegramValidator,
  }

  return container
}

/**
 * 重置 Container（僅用於測試）
 */
export function resetIdentityContainer(): void {
  container = null
}

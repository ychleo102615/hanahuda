import { LocalGameRepository } from '@/infrastructure/repositories/LocalGameRepository'
import { GameFlowUseCase } from '@/application/usecases/GameFlowUseCase'
import { PlayCardUseCase } from '@/application/usecases/PlayCardUseCase'
import { CalculateScoreUseCase } from '@/application/usecases/CalculateScoreUseCase'
import { ResetGameUseCase } from '@/application/usecases/ResetGameUseCase'
import { GameController } from '@/ui/controllers/GameController'
import { InputController } from '@/ui/controllers/InputController'
import { VueGamePresenter } from '@/ui/presenters/VueGamePresenter'
import { LocalStorageLocaleService } from '@/infrastructure/services/LocaleService'

type ServiceKey = string | symbol
type ServiceFactory<T = unknown> = () => T

export class DIContainer {
  private services = new Map<ServiceKey, ServiceFactory>()
  private singletons = new Map<ServiceKey, unknown>()

  // Service keys
  static readonly GAME_REPOSITORY = Symbol('GameRepository')
  static readonly GAME_PRESENTER = Symbol('GamePresenter')
  static readonly LOCALE_SERVICE = Symbol('LocaleService')
  static readonly GAME_FLOW_USE_CASE = Symbol('GameFlowUseCase')
  static readonly PLAY_CARD_USE_CASE = Symbol('PlayCardUseCase')
  static readonly CALCULATE_SCORE_USE_CASE = Symbol('CalculateScoreUseCase')
  static readonly RESET_GAME_USE_CASE = Symbol('ResetGameUseCase')
  static readonly GAME_CONTROLLER = Symbol('GameController')
  static readonly INPUT_CONTROLLER = Symbol('InputController')

  // Register a service factory
  register<T>(key: ServiceKey, factory: () => T): void {
    this.services.set(key, factory)
  }

  // Register a singleton service factory
  registerSingleton<T>(key: ServiceKey, factory: () => T): void {
    this.register(key, () => {
      if (!this.singletons.has(key)) {
        this.singletons.set(key, factory())
      }
      return this.singletons.get(key)
    })
  }

  // Register an instance directly
  registerInstance<T>(key: ServiceKey, instance: T): void {
    this.singletons.set(key, instance)
    this.register(key, () => instance)
  }

  // Resolve a service
  resolve<T>(key: ServiceKey): T {
    const factory = this.services.get(key)
    if (!factory) {
      throw new Error(`Service not registered: ${String(key)}`)
    }
    return factory() as T
  }

  // Check if a service is registered
  has(key: ServiceKey): boolean {
    return this.services.has(key)
  }

  // Clear all services
  clear(): void {
    this.services.clear()
    this.singletons.clear()
  }

  // Setup default services
  setupDefaultServices(gameStore?: ReturnType<typeof import('@/ui/stores/gameStore').useGameStore>): void {
    // Infrastructure layer
    this.registerSingleton(DIContainer.GAME_REPOSITORY, () => new LocalGameRepository())
    this.registerSingleton(DIContainer.LOCALE_SERVICE, () => new LocalStorageLocaleService())

    // Application layer
    this.registerSingleton(DIContainer.CALCULATE_SCORE_USE_CASE, () =>
      new CalculateScoreUseCase(this.resolve(DIContainer.GAME_REPOSITORY))
    )

    this.registerSingleton(DIContainer.RESET_GAME_USE_CASE, () =>
      new ResetGameUseCase(
        this.resolve(DIContainer.GAME_REPOSITORY),
        gameStore ? this.resolve(DIContainer.GAME_PRESENTER) : undefined
      )
    )

    this.registerSingleton(DIContainer.PLAY_CARD_USE_CASE, () =>
      new PlayCardUseCase(
        this.resolve(DIContainer.GAME_REPOSITORY),
        gameStore ? this.resolve(DIContainer.GAME_PRESENTER) : undefined
      )
    )

    this.registerSingleton(DIContainer.GAME_FLOW_USE_CASE, () =>
      new GameFlowUseCase(
        this.resolve(DIContainer.GAME_REPOSITORY),
        this.resolve(DIContainer.CALCULATE_SCORE_USE_CASE),
        gameStore ? this.resolve(DIContainer.GAME_PRESENTER) : undefined,
        this.resolve(DIContainer.PLAY_CARD_USE_CASE)
      )
    )

    // UI layer - only register if gameStore is provided
    if (gameStore) {
      this.registerSingleton(DIContainer.GAME_PRESENTER, () =>
        new VueGamePresenter(gameStore, this.resolve(DIContainer.LOCALE_SERVICE))
      )
    }

    this.registerSingleton(DIContainer.INPUT_CONTROLLER, () => new InputController())

    // Game Controller
    this.registerSingleton(DIContainer.GAME_CONTROLLER, () =>
      new GameController(
        this.resolve(DIContainer.GAME_FLOW_USE_CASE),
        this.resolve(DIContainer.RESET_GAME_USE_CASE)
      )
    )
  }

  // Factory method to create a configured container
  static createDefault(gameStore?: ReturnType<typeof import('@/ui/stores/gameStore').useGameStore>): DIContainer {
    const container = new DIContainer()
    container.setupDefaultServices(gameStore)
    return container
  }
}

// Global container instance (can be used for testing or simple setups)
export const defaultContainer = new DIContainer()
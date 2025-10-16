import { LocalGameRepository } from '@/infrastructure/repositories/LocalGameRepository'
import { LocalStorageLocaleService } from '@/infrastructure/services/LocaleService'

// Game Engine BC
import { GameFlowCoordinator } from '@/game-engine/application/usecases/GameFlowCoordinator'
import { PlayCardUseCase } from '@/game-engine/application/usecases/PlayCardUseCase'
import { CalculateScoreUseCase } from '@/game-engine/application/usecases/CalculateScoreUseCase'
import { SetUpGameUseCase } from '@/game-engine/application/usecases/SetUpGameUseCase'
import { SetUpRoundUseCase } from '@/game-engine/application/usecases/SetUpRoundUseCase'
import { AbandonGameUseCase } from '@/game-engine/application/usecases/AbandonGameUseCase'
import { ResetGameUseCase } from '@/application/usecases/ResetGameUseCase'
import { GetMatchingCardsUseCase } from '@/application/usecases/GetMatchingCardsUseCase'

// Game UI BC (future use)
import { UpdateGameViewUseCase } from '@/game-ui/application/usecases/UpdateGameViewUseCase'
import { HandleUserInputUseCase } from '@/game-ui/application/usecases/HandleUserInputUseCase'

// Legacy UI (still in use for Phase 3)
import { GameController } from '@/ui/controllers/GameController'
import { VueGamePresenter } from '@/ui/presenters/VueGamePresenter'

// Shared - Event Bus
import { InMemoryEventBus } from '@/shared/events/base/EventBus'
import type { IEventBus } from '@/shared/events/ports/IEventBus'

type ServiceKey = string | symbol
type ServiceFactory<T = unknown> = () => T

export class DIContainer {
  private services = new Map<ServiceKey, ServiceFactory>()
  private singletons = new Map<ServiceKey, unknown>()

  // Service keys
  static readonly GAME_REPOSITORY = Symbol('GameRepository')
  static readonly GAME_PRESENTER = Symbol('GamePresenter')
  static readonly LOCALE_SERVICE = Symbol('LocaleService')
  static readonly EVENT_BUS = Symbol('EventBus')

  // Game Engine BC
  static readonly GAME_FLOW_COORDINATOR = Symbol('GameFlowCoordinator')
  static readonly SET_UP_GAME_USE_CASE = Symbol('SetUpGameUseCase')
  static readonly SET_UP_ROUND_USE_CASE = Symbol('SetUpRoundUseCase')
  static readonly PLAY_CARD_USE_CASE = Symbol('PlayCardUseCase')
  static readonly CALCULATE_SCORE_USE_CASE = Symbol('CalculateScoreUseCase')
  static readonly ABANDON_GAME_USE_CASE = Symbol('AbandonGameUseCase')
  static readonly RESET_GAME_USE_CASE = Symbol('ResetGameUseCase')
  static readonly GET_MATCHING_CARDS_USE_CASE = Symbol('GetMatchingCardsUseCase')

  // Game UI BC
  static readonly GAME_CONTROLLER = Symbol('GameController')
  static readonly UPDATE_GAME_VIEW_USE_CASE = Symbol('UpdateGameViewUseCase')
  static readonly HANDLE_USER_INPUT_USE_CASE = Symbol('HandleUserInputUseCase')

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
  setupDefaultServices(
    gameStore?: ReturnType<typeof import('@/ui/stores/gameStore').useGameStore>,
  ): void {
    // ====== Shared Infrastructure ======

    // Event Bus - must be initialized first
    this.registerSingleton(DIContainer.EVENT_BUS, () => {
      const eventBus = new InMemoryEventBus('hanahuda-game')
      // Start the event bus immediately
      eventBus.start()
      return eventBus
    })

    // Legacy infrastructure (to be refactored)
    this.registerSingleton(DIContainer.GAME_REPOSITORY, () => new LocalGameRepository())
    this.registerSingleton(DIContainer.LOCALE_SERVICE, () =>
      LocalStorageLocaleService.getInstance(),
    )

    // ====== Game Engine BC ======

    this.registerSingleton(
      DIContainer.CALCULATE_SCORE_USE_CASE,
      () => new CalculateScoreUseCase(
        this.resolve(DIContainer.GAME_REPOSITORY),
        this.resolve(DIContainer.EVENT_BUS),
      ),
    )

    this.registerSingleton(
      DIContainer.GET_MATCHING_CARDS_USE_CASE,
      () => new GetMatchingCardsUseCase(this.resolve(DIContainer.GAME_REPOSITORY)),
    )

    this.registerSingleton(
      DIContainer.SET_UP_GAME_USE_CASE,
      () => new SetUpGameUseCase(
        this.resolve(DIContainer.GAME_REPOSITORY),
        this.resolve(DIContainer.EVENT_BUS),
      ),
    )

    this.registerSingleton(
      DIContainer.SET_UP_ROUND_USE_CASE,
      () => new SetUpRoundUseCase(
        this.resolve(DIContainer.GAME_REPOSITORY),
        this.resolve(DIContainer.EVENT_BUS),
      ),
    )

    this.registerSingleton(
      DIContainer.ABANDON_GAME_USE_CASE,
      () => new AbandonGameUseCase(
        this.resolve(DIContainer.GAME_REPOSITORY),
        this.resolve(DIContainer.EVENT_BUS),
      ),
    )

    this.registerSingleton(
      DIContainer.RESET_GAME_USE_CASE,
      () =>
        new ResetGameUseCase(
          this.resolve(DIContainer.GAME_REPOSITORY),
          gameStore ? this.resolve(DIContainer.GAME_PRESENTER) : undefined,
        ),
    )

    this.registerSingleton(
      DIContainer.PLAY_CARD_USE_CASE,
      () =>
        new PlayCardUseCase(
          this.resolve(DIContainer.GAME_REPOSITORY),
          this.resolve(DIContainer.EVENT_BUS),
          gameStore ? this.resolve(DIContainer.GAME_PRESENTER) : undefined,
        ),
    )

    this.registerSingleton(
      DIContainer.GAME_FLOW_COORDINATOR,
      () =>
        new GameFlowCoordinator(
          this.resolve(DIContainer.GAME_REPOSITORY),
          this.resolve(DIContainer.EVENT_BUS),
          this.resolve(DIContainer.CALCULATE_SCORE_USE_CASE),
          this.resolve(DIContainer.SET_UP_GAME_USE_CASE),
          this.resolve(DIContainer.SET_UP_ROUND_USE_CASE),
          gameStore ? this.resolve(DIContainer.GAME_PRESENTER) : undefined,
          this.resolve(DIContainer.PLAY_CARD_USE_CASE),
          this.resolve(DIContainer.ABANDON_GAME_USE_CASE),
        ),
    )

    // ====== Legacy UI (for backward compatibility) ======

    // UI Presenter - only register if gameStore is provided
    if (gameStore) {
      this.registerSingleton(
        DIContainer.GAME_PRESENTER,
        () => new VueGamePresenter(gameStore, this.resolve(DIContainer.LOCALE_SERVICE)),
      )

      // Note: Game UI BC use cases (UpdateGameViewUseCase, HandleUserInputUseCase)
      // will be registered in future phases when migrating to the new game-ui BC
    }

    // Game Controller
    this.registerSingleton(
      DIContainer.GAME_CONTROLLER,
      () =>
        new GameController(
          this.resolve(DIContainer.GAME_FLOW_COORDINATOR),
          this.resolve(DIContainer.RESET_GAME_USE_CASE),
          this.resolve(DIContainer.GET_MATCHING_CARDS_USE_CASE),
        ),
    )
  }

  // Factory method to create a configured container
  static createDefault(
    gameStore?: ReturnType<typeof import('@/ui/stores/gameStore').useGameStore>,
  ): DIContainer {
    const container = new DIContainer()
    container.setupDefaultServices(gameStore)
    return container
  }

  // For accessing game-ui BC store in future phases
  static createWithNewStore(
    gameStore?: ReturnType<typeof import('@/game-ui/presentation/stores/gameStore').useGameStore>,
  ): DIContainer {
    const container = new DIContainer()
    // Future implementation for game-ui BC
    return container
  }

  // Get the EventBus instance for event subscription
  getEventBus(): IEventBus {
    return this.resolve<IEventBus>(DIContainer.EVENT_BUS)
  }
}

// Global container instance (can be used for testing or simple setups)
export const defaultContainer = new DIContainer()

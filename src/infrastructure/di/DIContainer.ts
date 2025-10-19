import { LocalGameRepository } from '@/game-engine/infrastructure/adapters/LocalGameRepository'
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

// Game UI BC
import { UpdateGameViewUseCase } from '@/game-ui/application/usecases/UpdateGameViewUseCase'
import { HandleUserInputUseCase } from '@/game-ui/application/usecases/HandleUserInputUseCase'
import { GameController as UIGameController } from '@/game-ui/presentation/controllers/GameController'
import { VueGamePresenter as UIVueGamePresenter } from '@/game-ui/presentation/presenters/VueGamePresenter'
import { EventBusAdapter as UIEventBusAdapter } from '@/game-ui/infrastructure/adapters/EventBusAdapter'

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
  static readonly UI_GAME_CONTROLLER = Symbol('UIGameController')
  static readonly UI_GAME_PRESENTER = Symbol('UIGamePresenter')
  static readonly UI_EVENT_SUBSCRIBER = Symbol('UIEventSubscriber')
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
  setupDefaultServices(): void {
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
          undefined,
        ),
    )

    this.registerSingleton(
      DIContainer.PLAY_CARD_USE_CASE,
      () =>
        new PlayCardUseCase(
          this.resolve(DIContainer.GAME_REPOSITORY),
          this.resolve(DIContainer.EVENT_BUS),
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
          this.resolve(DIContainer.PLAY_CARD_USE_CASE),
          this.resolve(DIContainer.ABANDON_GAME_USE_CASE),
        ),
    )

  }

  // Setup game-ui BC services (new architecture)
  setupGameUIServices(
    gameUIStore: ReturnType<typeof import('@/game-ui/presentation/stores/gameStore').useGameStore>,
  ): void {
    // Game UI BC infrastructure must be set up after Event Bus
    if (!this.has(DIContainer.EVENT_BUS)) {
      throw new Error('Event Bus must be initialized before setting up Game UI BC services')
    }

    // UI Presenter
    this.registerSingleton(
      DIContainer.UI_GAME_PRESENTER,
      () => new UIVueGamePresenter(gameUIStore, this.resolve(DIContainer.LOCALE_SERVICE)),
    )

    // Update Game View UseCase
    this.registerSingleton(
      DIContainer.UPDATE_GAME_VIEW_USE_CASE,
      () => new UpdateGameViewUseCase(this.resolve(DIContainer.UI_GAME_PRESENTER)),
    )

    // Handle User Input UseCase
    this.registerSingleton(
      DIContainer.HANDLE_USER_INPUT_USE_CASE,
      () => new HandleUserInputUseCase(this.resolve(DIContainer.UI_GAME_PRESENTER)),
    )

    // Event Subscriber (EventBusAdapter)
    this.registerSingleton(
      DIContainer.UI_EVENT_SUBSCRIBER,
      () => new UIEventBusAdapter(this.resolve(DIContainer.EVENT_BUS)),
    )

    // UI Game Controller
    this.registerSingleton(
      DIContainer.UI_GAME_CONTROLLER,
      () =>
        new UIGameController(
          this.resolve(DIContainer.HANDLE_USER_INPUT_USE_CASE),
          this.resolve(DIContainer.UPDATE_GAME_VIEW_USE_CASE),
          async (command: any) => {
            // Send command to game-engine BC via GameFlowCoordinator
            const coordinator = this.resolve<GameFlowCoordinator>(DIContainer.GAME_FLOW_COORDINATOR)

            switch (command.type) {
              case 'START_GAME':
                await coordinator.startNewGame({
                  player1Name: command.player1Name,
                  player2Name: command.player2Name,
                })
                break

              case 'PLAY_CARD':
                await coordinator.handlePlayCard(command.gameId, {
                  playerId: command.playerId,
                  cardId: command.cardId,
                  selectedFieldCard: command.selectedFieldCard,
                })
                break

              case 'SELECT_MATCH':
                // Match selection is handled within PlayCardUseCase
                // This command should not reach here in the current architecture
                console.warn('SELECT_MATCH command received - this should be handled by PlayCardUseCase')
                break

              case 'DECLARE_KOIKOI':
                await coordinator.handleKoikoiDecision(
                  command.gameId,
                  command.playerId,
                  command.continueGame,
                )
                break

              case 'START_NEXT_ROUND':
                await coordinator.startNextRound(command.gameId)
                break

              case 'ABANDON_GAME':
                await coordinator.handleAbandonGame(command.gameId, command.playerId)
                break

              default:
                console.error('Unknown command type:', command.type)
                throw new Error(`Unknown command type: ${command.type}`)
            }
          }
        ),
    )
  }

  // Factory method to create a configured container
  static createDefault(): DIContainer {
    const container = new DIContainer()
    container.setupDefaultServices()
    return container
  }

  // Factory method to create a container with game-ui BC services
  static createWithGameUI(
    gameUIStore: ReturnType<typeof import('@/game-ui/presentation/stores/gameStore').useGameStore>,
  ): DIContainer {
    const container = new DIContainer()
    // Setup game-engine BC and shared infrastructure first
    container.setupDefaultServices()
    // Then setup game-ui BC services
    container.setupGameUIServices(gameUIStore)
    return container
  }

  // Get the EventBus instance for event subscription
  getEventBus(): IEventBus {
    return this.resolve<IEventBus>(DIContainer.EVENT_BUS)
  }
}

// Global container instance (can be used for testing or simple setups)
export const defaultContainer = new DIContainer()

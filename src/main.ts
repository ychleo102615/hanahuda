import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { DIContainer } from '@/infrastructure/di/DIContainer'
import { useGameStore as useGameUIStore } from '@/game-ui/presentation/stores/gameStore'

import 'virtual:svg-icons-register'

// Create Vue app
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize DI Container and Event Bus after Pinia is registered
// This ensures stores are available for event subscription
app.mount('#app')

// Setup DI Container with game-ui BC services
const gameUIStore = useGameUIStore()
const container = DIContainer.createWithGameUI(gameUIStore)

// Provide DI Container to Vue app for components to use
app.provide('DIContainer', container)

// Setup event subscriptions after app is mounted
setupEventSubscriptions(container)

/**
 * Setup Event Bus subscriptions to connect game-engine BC with game-ui BC
 *
 * This function subscribes the UpdateGameViewUseCase to all integration events
 * published by the game-engine BC. The UpdateGameViewUseCase will process these
 * events and update the GameViewModel accordingly.
 */
function setupEventSubscriptions(container: DIContainer) {
  try {
    const eventBus = container.getEventBus()
    const updateGameViewUseCase = container.resolve(DIContainer.UPDATE_GAME_VIEW_USE_CASE) as any

    // Subscribe to all events using wildcard '*'
    // UpdateGameViewUseCase will filter and handle relevant events
    eventBus.subscribe('*', async (event: any) => {
      try {
        await updateGameViewUseCase.handleEvent(event)
      } catch (error) {
        console.error('Error handling event in UpdateGameViewUseCase:', error)
      }
    })

    console.log('✅ Event subscriptions configured successfully')
  } catch (error) {
    console.error('❌ Failed to setup event subscriptions:', error)
    throw error
  }
}

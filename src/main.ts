import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { DIContainer } from '@/infrastructure/di/DIContainer'

import 'virtual:svg-icons-register'

// Create Vue app
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize DI Container and Event Bus after Pinia is registered
// This ensures stores are available for event subscription
app.mount('#app')

// Setup event subscriptions after app is mounted
setupEventSubscriptions()

/**
 * Setup Event Bus subscriptions to connect game-engine BC with game-ui BC
 */
function setupEventSubscriptions() {
  // Get the global DI container instance (will be created by GameView)
  // This is a temporary solution - in the future, we should inject this properly
  console.log('✅ Event subscriptions will be configured when GameView is initialized')

  // Note: The actual event subscription happens in GameView.vue when the component
  // creates its DIContainer instance. This ensures the gameStore is available.
  // See GameView.vue for the subscription setup.
}

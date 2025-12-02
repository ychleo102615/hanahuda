import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './assets/styles/main.css'

// 註冊 SVG Icons sprite
import 'virtual:svg-icons-register'

// DI Container
import { container } from './user-interface/adapter/di/container'
import { registerDependencies } from './user-interface/adapter/di/registry'
import { TOKENS } from './user-interface/adapter/di/tokens'

const app = createApp(App)

// 初始化 Pinia (必須先於 DI Container)
app.use(createPinia())

// 初始化 DI Container (預設使用 mock 模式)
const gameMode = (sessionStorage.getItem('gameMode') as 'backend' | 'local' | 'mock') || 'mock'
registerDependencies(container, gameMode)

// 注意：不再使用 Vue provide/inject
// 組件直接使用 useDependency(token) 從 container 解析依賴

app.use(router)

app.mount('#app')

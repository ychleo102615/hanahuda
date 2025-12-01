import { createRouter, createWebHistory } from 'vue-router'
import { gamePageGuard, lobbyPageGuard } from '@/user-interface/adapter/router/guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomePage.vue'),
    },
    {
      path: '/lobby',
      name: 'lobby',
      component: () => import('@/views/GameLobby.vue'),
      beforeEnter: lobbyPageGuard,
    },
    {
      path: '/game',
      name: 'game',
      component: () => import('@/views/GamePage.vue'),
      beforeEnter: gamePageGuard,
    },
  ],
})

export default router

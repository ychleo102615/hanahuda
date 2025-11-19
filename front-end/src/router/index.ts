import { createRouter, createWebHistory } from 'vue-router'
import { gamePageGuard } from '@/user-interface/adapter/router/guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomePage.vue'),
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

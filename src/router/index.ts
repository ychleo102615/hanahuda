import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../presentation/views/HomeView.vue'
import GameView from '@/presentation/views/GameView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/game',
      name: 'game',
      component: GameView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../presentation/views/AboutView.vue'),
    },
  ],
})

export default router

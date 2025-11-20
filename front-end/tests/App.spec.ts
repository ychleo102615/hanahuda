import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '@/App.vue'

describe('App', () => {
  it('mounts and renders RouterView', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: { template: '<div>Home</div>' }
        }
      ]
    })

    const wrapper = mount(App, {
      global: {
        plugins: [router],
        stubs: {
          RouterView: true
        }
      }
    })

    // 確保組件能夠掛載
    expect(wrapper.exists()).toBe(true)
    // 確保包含 RouterView（即使是 stub）
    expect(wrapper.html()).toContain('router-view')
  })
})

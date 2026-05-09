import { defineStore } from 'pinia'

export type ToastType = 'info' | 'success' | 'error' | 'warning' | 'loading'

export interface ToastData {
  id: string
  type: ToastType
  message: string
  duration: number | null // null = persistent (won't auto-dismiss)
  dismissible: boolean
}

export const useToastStore = defineStore('toast', {
  state: () => ({
    activeToasts: [] as ToastData[],
  }),

  actions: {
    addToast(toast: Omit<ToastData, 'id'>): string {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const newToast: ToastData = { ...toast, id }
      this.activeToasts.push(newToast)

      if (toast.duration !== null) {
        setTimeout(() => {
          this.removeToast(id)
        }, toast.duration)
      }

      return id
    },

    removeToast(id: string): void {
      const index = this.activeToasts.findIndex((t) => t.id === id)
      if (index !== -1) {
        this.activeToasts.splice(index, 1)
      }
    },

    removeToastByType(type: ToastType): void {
      this.activeToasts = this.activeToasts.filter((t) => t.type !== type)
    },

    clearAllToasts(): void {
      this.activeToasts = []
    },
  },
})

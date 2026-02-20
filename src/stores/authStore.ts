import { defineStore } from 'pinia'
import { ref } from 'vue'
import { lsGet, lsSet, lsRemove } from '@/composables/useLocalStorage'

const LS_KEY = 'loopa_auth'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const user = ref<{ email: string } | null>(null)

  function login(email: string, password: string): boolean {
    if (email === 'test@test.com' && password === '1234') {
      isAuthenticated.value = true
      user.value = { email }
      lsSet(LS_KEY, { isAuthenticated: true, email })
      return true
    }
    return false
  }

  function logout(): void {
    isAuthenticated.value = false
    user.value = null
    lsRemove(LS_KEY)
  }

  function checkAuth(): void {
    const stored = lsGet<{ isAuthenticated: boolean; email: string }>(LS_KEY)
    if (stored?.isAuthenticated) {
      isAuthenticated.value = true
      user.value = { email: stored.email }
    }
  }

  return { isAuthenticated, user, login, logout, checkAuth }
})

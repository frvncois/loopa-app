import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { auth: true }
  },
  {
    path: '/project/:id',
    name: 'Project',
    component: () => import('@/views/ProjectView.vue'),
    meta: { auth: true },
    props: true
  },
  {
    // OAuth callback — Supabase redirects here after Google sign-in.
    // The auth store's onAuthStateChange listener handles the session.
    path: '/auth/callback',
    name: 'AuthCallback',
    component: () => import('@/views/AuthCallbackView.vue'),
    meta: {}
  },
  {
    path: '/auth/figma/callback',
    name: 'FigmaCallback',
    component: () => import('@/views/FigmaCallbackView.vue'),
    meta: {}
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// ── Auth guard ──
// Uses a lazy import to avoid circular dependency with the store.
// On first navigation, waits for authStore.initialize() to complete.
let authInitialized = false

router.beforeEach(async (to, _from, next) => {
  const { useAuthStore } = await import('@/stores/authStore')
  const authStore = useAuthStore()

  // Initialize auth once (restores session from Supabase localStorage)
  if (!authInitialized) {
    await authStore.initialize()
    authInitialized = true
  }

  // Wait if still loading (shouldn't happen after initialize, but safety check)
  if (authStore.loading) {
    await new Promise<void>(resolve => {
      const check = () => {
        if (!authStore.loading) resolve()
        else setTimeout(check, 50)
      }
      check()
    })
  }

  if (to.meta.auth && !authStore.isAuthenticated) return next('/login')
  if (to.meta.guest && authStore.isAuthenticated) return next('/')
  next()
})

export default router

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

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
    path: '/auth/figma/callback',
    name: 'FigmaCallback',
    component: () => import('@/views/FigmaCallbackView.vue'),
    meta: {}   // accessible regardless of auth state — no guard
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  authStore.checkAuth()

  if (to.meta.auth && !authStore.isAuthenticated) return next('/login')
  if (to.meta.guest && authStore.isAuthenticated) return next('/')
  next()
})

export default router

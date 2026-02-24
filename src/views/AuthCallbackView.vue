<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const auth = useAuthStore()

onMounted(async () => {
  // Supabase client auto-detects the tokens in the URL hash via onAuthStateChange.
  // We just need to wait for the session to be established, then redirect.
  const maxWait = 5000
  const start = Date.now()

  await new Promise<void>((resolve) => {
    const check = () => {
      if (auth.isAuthenticated || Date.now() - start > maxWait) resolve()
      else setTimeout(check, 100)
    }
    check()
  })

  router.replace('/')
})
</script>

<template>
  <div class="callback-page">
    <div class="spinner" />
    <p class="callback-text">Signing you in…</p>
  </div>
</template>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--bg-0);
}
.callback-text {
  font-size: 13px;
  color: var(--text-2);
}
.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-l);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>

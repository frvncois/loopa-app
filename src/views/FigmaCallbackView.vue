<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { exchangeCode } from '@/lib/figma/figmaAuth'

const router = useRouter()

const status = ref<'loading' | 'success' | 'error'>('loading')
const errorMessage = ref('')

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const code          = params.get('code')
  const error         = params.get('error')
  const returnedState = params.get('state')
  const savedState    = localStorage.getItem('figma_oauth_state')
  localStorage.removeItem('figma_oauth_state')

  if (error) {
    status.value = 'error'
    errorMessage.value = error === 'access_denied'
      ? 'Access was denied. Please try again.'
      : `Figma returned an error: ${error}`
    return
  }

  if (!savedState || savedState !== returnedState) {
    status.value = 'error'
    errorMessage.value = 'Invalid OAuth state — possible CSRF attack. Please try again.'
    return
  }

  if (!code) {
    status.value = 'error'
    errorMessage.value = 'No authorization code received from Figma.'
    return
  }

  try {
    await exchangeCode(code)
    status.value = 'success'
    // If this was opened as a popup, close it so the parent detects the change
    if (window.opener && !window.opener.closed) {
      window.close()
    } else {
      // Navigated directly — go home
      setTimeout(() => router.push('/'), 1200)
    }
  } catch (e) {
    status.value = 'error'
    errorMessage.value = e instanceof Error ? e.message : 'Token exchange failed.'
  }
})

function retry() {
  window.location.href = '/'
}
</script>

<template>
  <div class="callback-page">
    <div class="card">
      <!-- Loading -->
      <template v-if="status === 'loading'">
        <div class="spinner" />
        <p class="message">Connecting to Figma…</p>
      </template>

      <!-- Success -->
      <template v-else-if="status === 'success'">
        <div class="icon is-success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p class="message">Connected! Closing…</p>
      </template>

      <!-- Error -->
      <template v-else>
        <div class="icon is-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
        <p class="message">{{ errorMessage }}</p>
        <button class="retry-btn" @click="retry">Back to Loopa</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.callback-page {
  min-height: 100vh;
  background: var(--bg-0);
  display: flex;
  align-items: center;
  justify-content: center;
}
.card {
  background: var(--bg-2);
  border: 1px solid var(--border-l);
  border-radius: var(--r-lg);
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  min-width: 18rem;
  text-align: center;
}
.spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid var(--border-l);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  svg { width: 1.25rem; height: 1.25rem; }
  &.is-success { background: rgba(52, 211, 153, 0.15); color: var(--green); }
  &.is-error   { background: var(--red-s); color: var(--red); }
}
.message {
  font-size: 0.875rem;
  color: var(--text-2);
  font-weight: 500;
}
.retry-btn {
  height: 2rem;
  padding: 0 1rem;
  background: var(--bg-4);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  color: var(--text-2);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all var(--ease);
  &:hover { background: var(--bg-5); color: var(--text-1); }
}
</style>

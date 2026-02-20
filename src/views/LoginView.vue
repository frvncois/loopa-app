<script setup lang="ts">
import { ref } from 'vue'
import IconLogo from '@/components/icons/IconLogo.vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')

function submit() {
  error.value = ''
  if (!auth.login(email.value, password.value)) {
    error.value = 'Invalid email or password.'
  } else {
    router.push('/')
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <IconLogo />
        <span class="login-brand">Loopa</span>
      </div>

      <h1 class="login-title">Sign in to Loopa</h1>

      <form class="login-form" @submit.prevent="submit">
        <div class="field">
          <label class="field-label">Email</label>
          <input
            v-model="email"
            type="email"
            class="field-input"
            placeholder="test@test.com"
            autocomplete="email"
          />
        </div>
        <div class="field">
          <label class="field-label">Password</label>
          <input
            v-model="password"
            type="password"
            class="field-input"
            placeholder="••••"
            autocomplete="current-password"
          />
        </div>
        <p v-if="error" class="login-error">{{ error }}</p>
        <button type="submit" class="login-btn">Sign in</button>
      </form>

      <p class="login-hint">test@test.com / 1234</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-0);
}
.login-card {
  width: 380px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 32px;
}
.login-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}
.login-brand {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--text-1);
}
.login-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-1);
  margin-bottom: 24px;
}
.login-form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 11px; font-weight: 500; color: var(--text-3); }
.field-input {
  height: 34px;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  color: var(--text-1);
  padding: 0 10px;
  font-size: 12px;
  outline: none;
  transition: border-color var(--ease);
}
.field-input:focus { border-color: var(--accent); }
.field-input::placeholder { color: var(--text-4); }
.login-btn {
  height: 36px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--r-md);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--ease);
  margin-top: 4px;
}
.login-btn:hover { background: var(--accent-h); }
.login-error {
  font-size: 11px;
  color: var(--red);
  padding: 6px 8px;
  background: var(--red-s);
  border-radius: var(--r-sm);
}
.login-hint {
  margin-top: 20px;
  font-size: 10px;
  color: var(--text-4);
  font-family: var(--mono);
  text-align: center;
}
</style>

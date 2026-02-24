<script setup lang="ts">
import { ref } from 'vue'
import IconLogo from '@/components/icons/IconLogo.vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const auth = useAuthStore()

const mode = ref<'signin' | 'signup'>('signin')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const info = ref('')
const submitting = ref(false)

async function submit() {
  error.value = ''
  info.value = ''

  if (!email.value.trim()) { error.value = 'Email is required.'; return }
  if (!password.value) { error.value = 'Password is required.'; return }

  if (mode.value === 'signup') {
    if (password.value.length < 6) { error.value = 'Password must be at least 6 characters.'; return }
    if (password.value !== confirmPassword.value) { error.value = 'Passwords do not match.'; return }
  }

  submitting.value = true
  try {
    if (mode.value === 'signin') {
      const result = await auth.signInWithEmail(email.value.trim(), password.value)
      if (result.error) { error.value = result.error; return }
      router.push('/')
    } else {
      const result = await auth.signUpWithEmail(email.value.trim(), password.value)
      if (result.error) { error.value = result.error; return }
      info.value = 'Check your email for a confirmation link.'
    }
  } finally {
    submitting.value = false
  }
}

async function googleSignIn() {
  error.value = ''
  const result = await auth.signInWithGoogle()
  if (result.error) error.value = result.error
  // Redirect happens via OAuth — no need to push route
}

function switchMode() {
  mode.value = mode.value === 'signin' ? 'signup' : 'signin'
  error.value = ''
  info.value = ''
  confirmPassword.value = ''
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <IconLogo />
        <span class="login-brand">Loopa</span>
      </div>

      <h1 class="login-title">{{ mode === 'signin' ? 'Sign in to Loopa' : 'Create your account' }}</h1>

      <!-- Google OAuth -->
      <button class="google-btn" @click="googleSignIn">
        <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div class="divider">
        <span class="divider-text">or</span>
      </div>

      <!-- Email/Password form -->
      <form class="login-form" @submit.prevent="submit">
        <div class="field">
          <label class="field-label">Email</label>
          <input
            v-model="email"
            type="email"
            class="field-input"
            placeholder="you@example.com"
            autocomplete="email"
          />
        </div>
        <div class="field">
          <label class="field-label">Password</label>
          <input
            v-model="password"
            type="password"
            class="field-input"
            :placeholder="mode === 'signup' ? 'At least 6 characters' : '••••••••'"
            :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'"
          />
        </div>
        <div v-if="mode === 'signup'" class="field">
          <label class="field-label">Confirm password</label>
          <input
            v-model="confirmPassword"
            type="password"
            class="field-input"
            placeholder="••••••••"
            autocomplete="new-password"
          />
        </div>

        <p v-if="error" class="login-error">{{ error }}</p>
        <p v-if="info" class="login-info">{{ info }}</p>

        <button type="submit" class="login-btn" :disabled="submitting">
          {{ submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up' }}
        </button>
      </form>

      <p class="login-switch">
        {{ mode === 'signin' ? "Don't have an account?" : 'Already have an account?' }}
        <button class="link-btn" @click="switchMode">
          {{ mode === 'signin' ? 'Sign up' : 'Sign in' }}
        </button>
      </p>
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

/* ── Google button ── */
.google-btn {
  width: 100%;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  color: var(--text-1);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--ease);
}
.google-btn:hover { background: var(--bg-4); border-color: var(--border-l); }
.google-icon { flex-shrink: 0; }

/* ── Divider ── */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}
.divider-text {
  font-size: 11px;
  color: var(--text-4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Form ── */
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
.login-btn:hover:not(:disabled) { background: var(--accent-h); }
.login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.login-error {
  font-size: 11px;
  color: var(--red);
  padding: 6px 8px;
  background: var(--red-s);
  border-radius: var(--r-sm);
}
.login-info {
  font-size: 11px;
  color: var(--green);
  padding: 6px 8px;
  background: rgba(52, 211, 153, 0.1);
  border-radius: var(--r-sm);
}

/* ── Switch mode ── */
.login-switch {
  margin-top: 20px;
  font-size: 11px;
  color: var(--text-3);
  text-align: center;
}
.link-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  margin-left: 4px;
}
.link-btn:hover { text-decoration: underline; }
</style>

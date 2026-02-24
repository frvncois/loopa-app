<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useAuthStore } from '@/stores/authStore'

defineProps<{ open: boolean }>()

const auth = useAuthStore()

const displayName = ref('')
const handle = ref('')
const error = ref('')
const handleStatus = ref<'idle' | 'checking' | 'available' | 'taken'>('idle')
const saving = ref(false)

let handleTimer: ReturnType<typeof setTimeout> | null = null

// Pre-fill from profile when it loads
watch(() => auth.profile, (p) => {
  if (p) {
    displayName.value = p.display_name || ''
    handle.value = p.handle || ''
  }
}, { immediate: true })

// Debounced handle availability check
watch(handle, (val) => {
  if (handleTimer) clearTimeout(handleTimer)
  if (!val || val.length < 3) { handleStatus.value = 'idle'; return }
  handleStatus.value = 'checking'
  handleTimer = setTimeout(async () => {
    const available = await auth.isHandleAvailable(val)
    handleStatus.value = available ? 'available' : 'taken'
  }, 400)
})

async function save() {
  error.value = ''
  const h = handle.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
  const d = displayName.value.trim()

  if (!d) { error.value = 'Display name is required.'; return }
  if (h.length < 3) { error.value = 'Handle must be at least 3 characters.'; return }
  if (handleStatus.value === 'taken') { error.value = 'That handle is already taken.'; return }

  saving.value = true
  const result = await auth.updateProfile({
    display_name: d,
    handle: h,
    onboarded: true
  })
  saving.value = false

  if (result.error) {
    if (result.error.includes('duplicate') || result.error.includes('unique')) {
      error.value = 'That handle is already taken.'
      handleStatus.value = 'taken'
    } else {
      error.value = result.error
    }
  }
  // Modal hides automatically when auth.needsOnboarding becomes false
}
</script>

<template>
  <BaseModal :open="open" title="Set up your profile" width="400px" @close="() => {}">
    <div class="setup-form">
      <p class="setup-intro">Welcome to Loopa! Choose a display name and handle before you get started.</p>

      <div class="field">
        <label class="field-label">Display name</label>
        <input
          v-model="displayName"
          type="text"
          class="field-input"
          placeholder="Your Name"
          maxlength="50"
        />
      </div>

      <div class="field">
        <label class="field-label">Handle</label>
        <div class="handle-row">
          <span class="handle-at">@</span>
          <input
            v-model="handle"
            type="text"
            class="field-input handle-input"
            placeholder="yourhandle"
            maxlength="30"
            @input="handle = handle.toLowerCase().replace(/[^a-z0-9_-]/g, '')"
          />
        </div>
        <span v-if="handleStatus === 'checking'" class="handle-hint checking">Checking…</span>
        <span v-else-if="handleStatus === 'available'" class="handle-hint available">Available!</span>
        <span v-else-if="handleStatus === 'taken'" class="handle-hint taken">Already taken</span>
      </div>

      <p v-if="error" class="setup-error">{{ error }}</p>
    </div>

    <template #footer>
      <button class="save-btn" :disabled="saving || handleStatus === 'taken'" @click="save">
        {{ saving ? 'Saving…' : 'Continue' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.setup-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.setup-intro {
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.5;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.field-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-3);
}
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

.handle-row {
  display: flex;
  align-items: center;
}
.handle-at {
  height: 34px;
  display: flex;
  align-items: center;
  padding: 0 8px 0 10px;
  background: var(--bg-4);
  border: 1px solid var(--border);
  border-right: none;
  border-radius: var(--r-md) 0 0 var(--r-md);
  font-size: 12px;
  color: var(--text-3);
  font-family: var(--mono);
}
.handle-input {
  border-radius: 0 var(--r-md) var(--r-md) 0;
  flex: 1;
  font-family: var(--mono);
}

.handle-hint {
  font-size: 10px;
  font-weight: 500;
}
.handle-hint.checking { color: var(--text-3); }
.handle-hint.available { color: var(--green); }
.handle-hint.taken { color: var(--red); }

.setup-error {
  font-size: 11px;
  color: var(--red);
  padding: 6px 8px;
  background: var(--red-s);
  border-radius: var(--r-sm);
}

.save-btn {
  height: 34px;
  padding: 0 24px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--r-md);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--ease);
}
.save-btn:hover:not(:disabled) { background: var(--accent-h); }
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

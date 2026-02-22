<script setup lang="ts">
import { ref, watch, nextTick, inject } from 'vue'
import type { useAiAssistant } from '@/composables/useAiAssistant'

const ai = inject('aiAssistant') as ReturnType<typeof useAiAssistant>

const messagesRef = ref<HTMLElement | null>(null)

const suggestions = [
  'Fade in all elements one by one',
  'Slide everything in from the left',
  'Make everything bounce in from the top',
  'Pulse the first element',
]

// Auto-scroll to bottom when messages change
watch(() => ai.messages.value.length, async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
})

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    ai.send()
  }
  if (e.key === 'Escape') ai.close()
}
</script>

<template>
  <div class="ai-panel" :class="{ 'is-open': ai.isOpen.value }">
    <div class="ai-header">
      <span class="ai-title">✦ Animation Assistant</span>
      <button class="ai-close" @click="ai.close()" title="Close">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div class="ai-messages" ref="messagesRef">
      <!-- Welcome state -->
      <div v-if="ai.messages.value.length === 0" class="ai-welcome">
        <template v-if="!ai.hasApiKey.value">
          <p class="ai-welcome-text">Add <code>VITE_OPENAI_API_KEY</code> to <code>.env.local</code> to use the assistant.</p>
        </template>
        <template v-else>
          <p class="ai-welcome-text">Describe what you want to animate. Reference layer names exactly.</p>
          <div class="ai-suggestions">
            <button
              v-for="s in suggestions"
              :key="s"
              class="ai-suggestion"
              @click="ai.sendSuggestion(s)"
            >{{ s }}</button>
          </div>
        </template>
      </div>

      <!-- Messages -->
      <div
        v-for="msg in ai.messages.value"
        :key="msg.id"
        class="ai-msg"
        :class="msg.role"
      >
        <div class="ai-msg-content">{{ msg.content }}</div>
        <div v-if="msg.actions?.length" class="ai-actions">
          <span v-for="a in msg.actions" :key="a" class="ai-action">{{ a }}</span>
        </div>
      </div>

      <!-- Loading indicator -->
      <div v-if="ai.isLoading.value" class="ai-msg assistant">
        <div class="ai-typing">Thinking…</div>
      </div>
    </div>

    <div class="ai-input-row">
      <input
        v-model="ai.inputText.value"
        class="ai-input"
        placeholder="Describe the animation…"
        :disabled="ai.isLoading.value"
        @keydown="onKeyDown"
      />
      <button
        class="ai-send"
        :disabled="ai.isLoading.value || !ai.inputText.value.trim()"
        @click="ai.send()"
        title="Send"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ai-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 350px;
  background: var(--bg-2);
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 200ms var(--ease);
  z-index: 20;

  &.is-open {
    transform: translateY(0);
  }
}

.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.ai-title {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-1);
}

.ai-close {
  background: none;
  border: none;
  color: var(--text-4);
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-sm);
  transition: color var(--ease);
  &:hover { color: var(--text-1); }
}

.ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ai-welcome {
  text-align: center;
  padding: 1rem 0.5rem;
}

.ai-welcome-text {
  font-size: 0.6875rem;
  color: var(--text-3);
  line-height: 1.5;
  code {
    font-family: var(--mono);
    background: var(--bg-4);
    padding: 0.0625rem 0.25rem;
    border-radius: var(--r-sm);
    color: var(--text-2);
    font-size: 0.625rem;
  }
}

.ai-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  justify-content: center;
  margin-top: 0.75rem;
}

.ai-suggestion {
  background: var(--bg-4);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 0.25rem 0.5rem;
  font-size: 0.625rem;
  color: var(--text-2);
  cursor: pointer;
  transition: all 150ms var(--ease);
  &:hover {
    background: var(--accent-dim, color-mix(in srgb, var(--accent) 12%, transparent));
    border-color: var(--accent);
    color: var(--text-1);
  }
}

.ai-msg {
  display: flex;
  flex-direction: column;
  max-width: 85%;
  font-size: 0.6875rem;
  line-height: 1.5;

  &.user {
    align-self: flex-end;
    .ai-msg-content {
      background: var(--accent);
      color: white;
      border-radius: var(--r-md) var(--r-md) 0 var(--r-md);
      padding: 0.375rem 0.625rem;
    }
  }

  &.assistant {
    align-self: flex-start;
    .ai-msg-content {
      background: var(--bg-4);
      color: var(--text-1);
      border-radius: var(--r-md) var(--r-md) var(--r-md) 0;
      padding: 0.375rem 0.625rem;
    }
  }
}

.ai-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.ai-action {
  font-size: 0.5625rem;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  padding: 0.125rem 0.375rem;
  border-radius: var(--r-sm);
}

.ai-typing {
  color: var(--text-4);
  font-size: 0.625rem;
  font-style: italic;
  padding: 0.375rem 0.625rem;
  background: var(--bg-4);
  border-radius: var(--r-md) var(--r-md) var(--r-md) 0;
}

.ai-input-row {
  display: flex;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.ai-input {
  flex: 1;
  height: 2rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  color: var(--text-1);
  padding: 0 0.5rem;
  font-size: 0.6875rem;
  font-family: var(--font);
  outline: none;
  transition: border-color var(--ease);
  &:focus { border-color: var(--accent); }
  &::placeholder { color: var(--text-4); }
  &:disabled { opacity: 0.5; }
}

.ai-send {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  background: var(--accent);
  border: none;
  border-radius: var(--r-md);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 150ms var(--ease);
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.85; }
}
</style>

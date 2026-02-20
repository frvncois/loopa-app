<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/uiStore'
import IconLogo from '@/components/icons/IconLogo.vue'
import IconUndo from '@/components/icons/IconUndo.vue'
import IconRedo from '@/components/icons/IconRedo.vue'
import IconDownload from '@/components/icons/IconDownload.vue'

const props = defineProps<{
  projectName?: string
  artboardWidth?: number
  artboardHeight?: number
  canUndo?: boolean
  canRedo?: boolean
  saveState?: 'idle' | 'saving' | 'saved'
}>()

const emit = defineEmits<{
  undo: []
  redo: []
  'update:projectName': [name: string]
}>()

const uiStore = useUiStore()
const router = useRouter()

const editingName = ref(false)
const nameInput = ref('')

function startEditName() {
  nameInput.value = props.projectName ?? ''
  editingName.value = true
}

function finishEditName() {
  editingName.value = false
  if (nameInput.value.trim()) emit('update:projectName', nameInput.value.trim())
}
</script>

<template>
  <header class="topbar">
    <!-- Logo -->
    <div class="logo" @click="router.push('/')">
      <IconLogo />
      Loopa
    </div>

    <!-- File / Import / Export -->
    <div class="group">
      <button class="button is-ghost is-sm" @click="router.push('/')">File</button>
      <button class="button is-ghost is-sm" @click="uiStore.openModal('import')">Import</button>
      <button class="button is-ghost is-sm" @click="uiStore.openModal('export')">Export</button>
    </div>

    <div class="divider" />

    <!-- Undo / Redo -->
    <div class="group">
      <button class="button is-ghost is-icon is-sm" :disabled="!canUndo" title="Undo (⌘Z)" @click="emit('undo')">
        <IconUndo />
      </button>
      <button class="button is-ghost is-icon is-sm" :disabled="!canRedo" title="Redo (⌘⇧Z)" @click="emit('redo')">
        <IconRedo />
      </button>
    </div>

    <div class="divider" />

    <!-- Project name -->
    <input
      v-if="editingName"
      class="name-field"
      v-model="nameInput"
      @blur="finishEditName"
      @keydown.enter="finishEditName"
      @keydown.escape="editingName = false"
      autofocus
    />
    <span v-else class="project-name" @dblclick="startEditName">
      {{ projectName ?? 'Untitled' }}
    </span>

    <div class="spacer" />

    <!-- Auto-save indicator -->
    <span class="save-indicator" :class="`is-${saveState ?? 'idle'}`" aria-live="polite">
      <span v-if="saveState === 'saving'" class="save-dot is-saving" />
      <span v-else-if="saveState === 'saved'" class="save-dot is-saved" />
      <span class="save-label">
        {{ saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : '' }}
      </span>
    </span>

    <!-- Artboard dims -->
    <span v-if="artboardWidth" class="dims">{{ artboardWidth }} × {{ artboardHeight }}</span>
    <div class="divider" />

    <!-- Export accent button -->
    <button class="button is-accent is-sm" @click="uiStore.openModal('export')">
      <IconDownload />
      Export
    </button>
  </header>
</template>

<style scoped>
.topbar {
  height: var(--topbar-h);
  min-height: var(--topbar-h);
  background: var(--bg-2);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 0.625rem;
  gap: 0.25rem;
  z-index: 100;
  flex-shrink: 0;
}
.logo {
  font-weight: 700;
  font-size: 0.875rem;
  letter-spacing: -0.3px;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding-right: 0.75rem;
  margin-right: 0.375rem;
  border-right: 1px solid var(--border);
  color: var(--text-1);
  cursor: pointer;
  svg { width: 1.25rem; height: 1.25rem; }
}
.divider { width: 1px; height: 1.375rem; background: var(--border); margin: 0 0.25rem; }
.group { display: flex; align-items: center; gap: 0.125rem; }
.spacer { flex: 1; }
.dims { font-size: 0.625rem; color: var(--text-3); font-family: var(--mono); }
.save-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.625rem;
  color: var(--text-4);
  min-width: 3rem;
  justify-content: flex-end;
  transition: opacity 0.4s;
  &.is-idle { opacity: 0; }
  &.is-saving { opacity: 1; }
  &.is-saved { opacity: 1; animation: save-fade 2s forwards; }
}
@keyframes save-fade {
  0% { opacity: 1; }
  60% { opacity: 1; }
  100% { opacity: 0; }
}
.save-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  flex-shrink: 0;
  &.is-saving { background: var(--yellow); animation: pulse 0.8s ease-in-out infinite alternate; }
  &.is-saved { background: var(--green); }
}
@keyframes pulse {
  from { opacity: 0.4; }
  to { opacity: 1; }
}
.save-label { color: var(--text-3); }
.project-name {
  font-size: 0.75rem;
  color: var(--text-2);
  font-weight: 500;
  cursor: default;
  padding: 0.125rem 0.25rem;
  border-radius: var(--r-sm);
  &:hover { background: var(--bg-4); }
}
.name-field {
  font-size: 0.75rem;
  color: var(--text-1);
  font-weight: 500;
  background: var(--bg-3);
  border: 1px solid var(--accent);
  border-radius: var(--r-sm);
  padding: 0.125rem 0.375rem;
  outline: none;
  height: 1.5rem;
}

/* Local button styles (inherit token values, not BaseButton component) */
.button {
  height: 1.625rem;
  padding: 0 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--bg-3);
  color: var(--text-2);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  font-weight: 500;
  font-size: 0.6875rem;
  white-space: nowrap;
  transition: all var(--ease);
  &:hover:not(:disabled) { background: var(--bg-5); color: var(--text-1); border-color: var(--border-l); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &.is-icon { width: 1.75rem; padding: 0; }
  &.is-ghost {
    border-color: transparent;
    background: transparent;
    &:hover:not(:disabled) { background: var(--bg-4); border-color: transparent; }
  }
  &.is-accent {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
    &:hover:not(:disabled) { background: var(--accent-h); }
  }
  &.is-sm {
    height: 1.5rem;
    padding: 0 0.4375rem;
    font-size: 0.6875rem;
    &.is-icon { width: 1.625rem; }
  }
}
</style>

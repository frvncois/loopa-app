<script setup lang="ts">
import { ref } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const emit = defineEmits<{
  create: [name: string, width: number, height: number]
  close: []
}>()

defineProps<{ open: boolean }>()

const name = ref('My Animation')
const width = ref(800)
const height = ref(600)

const PRESETS = [
  { label: '800 × 600', w: 800, h: 600 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
  { label: '1280 × 720', w: 1280, h: 720 },
  { label: '400 × 400', w: 400, h: 400 },
  { label: '500 × 500', w: 500, h: 500 },
]

function applyPreset(w: number, h: number) {
  width.value = w
  height.value = h
}

function onCreate() {
  if (!name.value.trim()) return
  emit('create', name.value.trim(), width.value, height.value)
}
</script>

<template>
  <BaseModal :open="open" title="New Project" @close="emit('close')">
    <div class="form">
      <div class="field">
        <label class="label">Project name</label>
        <input v-model="name" class="input" type="text" placeholder="My Animation" />
      </div>
      <div class="field">
        <label class="label">Artboard size</label>
        <div class="size-row">
          <input v-model.number="width" class="input is-compact" type="number" min="1" max="8192" />
          <span class="times">×</span>
          <input v-model.number="height" class="input is-compact" type="number" min="1" max="8192" />
        </div>
      </div>
      <div class="presets">
        <button
          v-for="p in PRESETS"
          :key="p.label"
          class="chip"
          :class="{ 'is-active': width === p.w && height === p.h }"
          @click="applyPreset(p.w, p.h)"
        >{{ p.label }}</button>
      </div>
    </div>
    <template #footer>
      <BaseButton variant="ghost" size="sm" @click="emit('close')">Cancel</BaseButton>
      <BaseButton variant="accent" size="sm" @click="onCreate">Create</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 0.875rem; }
.field { display: flex; flex-direction: column; gap: 0.3125rem; }
.label { font-size: 0.6875rem; font-weight: 500; color: var(--text-3); }
.input {
  height: 1.875rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-1);
  padding: 0 0.5rem;
  font-size: 0.6875rem;
  outline: none;
  transition: border-color var(--ease);
  &:focus { border-color: var(--accent); }
  &.is-compact { width: 5rem; flex: none; font-family: var(--mono); }
}
.size-row { display: flex; align-items: center; gap: 0.5rem; }
.times { font-size: 0.6875rem; color: var(--text-4); }
.presets { display: flex; flex-wrap: wrap; gap: 0.25rem; }
.chip {
  height: 1.375rem;
  padding: 0 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--bg-3);
  color: var(--text-3);
  font-size: 0.625rem;
  cursor: pointer;
  transition: all var(--ease);
  font-family: var(--mono);
  &:hover, &.is-active {
    background: var(--accent-s);
    color: var(--accent);
    border-color: var(--accent);
  }
}
</style>

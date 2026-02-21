<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string | number
  type?: 'text' | 'number'
  placeholder?: string
  label?: string
  mono?: boolean
  size?: 'sm' | 'md'
  disabled?: boolean
  width?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()

const isMono = computed(() => props.mono ?? props.type === 'number')

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  emit('update:modelValue', props.type === 'number' ? (val === '' ? '' : Number(val)) : val)
}
</script>

<template>
  <span v-if="label" class="label">{{ label }}</span>
  <input
    class="field"
    :class="[size === 'sm' ? 'is-sm' : '', isMono ? 'is-mono' : '']"
    :style="width ? { width, minWidth: width, flex: 'none' } : {}"
    :type="type ?? 'text'"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="onInput"
  />
</template>

<style scoped>
.field {
  flex: 1;
  height: 1.625rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-1);
  padding: 0 0.4375rem;
  font-size: 0.75rem;
  outline: none;
  transition: border-color var(--ease);
  min-width: 0;
  &.is-mono { font-family: var(--mono); }
  &.is-sm { height: 1.375rem; }
  &:focus { border-color: var(--accent); }
  &::placeholder { color: var(--text-4); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}
.label {
  width: 4.5rem;
  min-width: 4.5rem;
  font-size: 0.75rem;
  color: var(--text-3);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

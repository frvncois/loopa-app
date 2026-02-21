<script setup lang="ts">
defineProps<{
  modelValue: boolean
  label?: string
  disabled?: boolean
}>()

defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <div
    class="toggle-row"
    :class="{ 'is-disabled': disabled }"
    @click="!disabled && $emit('update:modelValue', !modelValue)"
  >
    <span v-if="label" class="label">{{ label }}</span>
    <div class="track" :class="{ 'is-active': modelValue }">
      <div class="knob" />
    </div>
  </div>
</template>

<style scoped>
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.25rem 0;
  &.is-disabled {
    opacity: 0.4;
    pointer-events: none;
  }
}
.label {
  font-size: 0.75rem;
  color: var(--text-2);
  user-select: none;
}
.track {
  width: 1.75rem;
  height: 1rem;
  border-radius: 0.5rem;
  background: var(--bg-5);
  position: relative;
  transition: background 150ms var(--ease);
  flex-shrink: 0;
  &.is-active {
    background: var(--accent);
  }
  &.is-active .knob {
    transform: translateX(0.75rem);
  }
}
.knob {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: var(--text-1);
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  transition: transform 150ms var(--ease);
}
</style>

<script setup lang="ts">
defineProps<{
  modelValue: string
  options: { value: string; label: string }[]
  label?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <span v-if="label" class="label">{{ label }}</span>
  <select
    class="select"
    :value="modelValue"
    @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
  </select>
</template>

<style scoped>
.select {
  flex: 1;
  height: 1.625rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-1);
  padding: 0 1.25rem 0 0.375rem;
  font-size: 0.75rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236a6a7e' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.375rem center;
  min-width: 0;
  &:focus { border-color: var(--accent); }
}
.label {
  width: 4.5rem;
  min-width: 4.5rem;
  font-size: 0.75rem;
  color: var(--text-3);
  font-weight: 500;
  white-space: nowrap;
}
</style>

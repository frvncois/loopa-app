<script setup lang="ts">
defineProps<{
  modelValue: number
  min?: number
  max?: number
  step?: number
}>()

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
</script>

<template>
  <input
    class="slider"
    type="range"
    :min="min ?? 0"
    :max="max ?? 100"
    :step="step ?? 1"
    :value="modelValue"
    @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
  />
</template>

<style scoped>
.slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 0.1875rem;
  background: var(--bg-5);
  border-radius: 0.125rem;
  outline: none;
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 0.75rem;
    height: 0.75rem;
    background: var(--accent);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
}
</style>

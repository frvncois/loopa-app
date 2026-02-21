<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: string  // hex without #
  label?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const swatchRef = ref<HTMLInputElement>()

const cssColor = computed(() => `#${props.modelValue}`)

function onSwatchClick() {
  swatchRef.value?.click()
}

function onColorPick(e: Event) {
  const hex = (e.target as HTMLInputElement).value.replace('#', '').toUpperCase()
  emit('update:modelValue', hex)
}

function onHexInput(e: Event) {
  const val = (e.target as HTMLInputElement).value.replace('#', '').toUpperCase()
  if (/^[0-9A-F]{6}$/i.test(val)) {
    emit('update:modelValue', val)
  }
}
</script>

<template>
  <span v-if="label" class="label">{{ label }}</span>
  <div class="field">
    <button class="swatch" type="button" @click="onSwatchClick">
      <div class="swatch-inner" :style="{ background: cssColor }" />
    </button>
    <input
      ref="swatchRef"
      type="color"
      :value="cssColor"
      class="picker"
      @input="onColorPick"
    />
    <input
      class="hex"
      type="text"
      :value="modelValue"
      maxlength="6"
      placeholder="HEX"
      @change="onHexInput"
    />
  </div>
</template>

<style scoped>
.label {
  width: 4.5rem;
  min-width: 4.5rem;
  font-size: 0.75rem;
  color: var(--text-3);
  font-weight: 500;
  white-space: nowrap;
}
.field {
  display: flex;
  align-items: center;
  flex: 1;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  height: 1.625rem;
  overflow: hidden;
  transition: border-color var(--ease);
  &:focus-within { border-color: var(--accent); }
}
.swatch {
  width: 1.625rem;
  height: 1.625rem;
  min-width: 1.625rem;
  border: none;
  cursor: pointer;
  border-right: 1px solid var(--border);
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}
.swatch-inner {
  width: 1rem;
  height: 1rem;
  border-radius: 0.1875rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.picker {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}
.hex {
  flex: 1;
  height: 100%;
  background: none;
  border: none;
  color: var(--text-1);
  padding: 0 0.4375rem;
  font-family: var(--mono);
  font-size: 0.75rem;
  outline: none;
  min-width: 0;
  &::placeholder { color: var(--text-4); }
}
</style>

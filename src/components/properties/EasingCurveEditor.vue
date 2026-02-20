<script setup lang="ts">
import { computed } from 'vue'
import type { EasingType } from '@/types/animation'
import { sampleEasing } from '@/lib/engine/Easing'

const props = defineProps<{ easing: EasingType }>()

const pathD = computed(() => {
  const pts = sampleEasing(props.easing, 32)
  if (pts.length === 0) return ''
  return 'M ' + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')
})
</script>

<template>
  <div class="preview">
    <svg viewBox="0 0 100 60" fill="none" preserveAspectRatio="none">
      <!-- grid -->
      <line x1="0" y1="60" x2="100" y2="60" stroke="var(--border)" stroke-width="0.5"/>
      <line x1="0" y1="0" x2="100" y2="0" stroke="var(--border)" stroke-width="0.5"/>
      <!-- curve -->
      <path :d="pathD" stroke="var(--accent)" stroke-width="2" fill="none"/>
      <!-- endpoints -->
      <circle cx="0" cy="60" r="3" fill="var(--accent)"/>
      <circle cx="100" cy="0" r="3" fill="var(--accent)"/>
    </svg>
  </div>
</template>

<style scoped>
.preview {
  width: 100%;
  height: 5rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  overflow: hidden;
  svg { width: 90%; height: 70%; }
}
</style>

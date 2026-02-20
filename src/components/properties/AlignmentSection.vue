<script setup lang="ts">
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { getMultiBounds } from '@/lib/elements/ElementBounds'
import { computed } from 'vue'
import IconAlignLeft from '@/components/icons/IconAlignLeft.vue'
import IconAlignCenterH from '@/components/icons/IconAlignCenterH.vue'
import IconAlignRight from '@/components/icons/IconAlignRight.vue'
import IconAlignTop from '@/components/icons/IconAlignTop.vue'
import IconAlignCenterV from '@/components/icons/IconAlignCenterV.vue'
import IconAlignBottom from '@/components/icons/IconAlignBottom.vue'

const editor = useEditorStore()
const ui = useUiStore()

const selected = computed(() => editor.elements.filter(e => ui.selectedIds.has(e.id)))

function align(type: string) {
  const els = selected.value
  if (!els.length) return
  const bounds = getMultiBounds(els)

  for (const el of els) {
    if (type === 'left') editor.updateElement(el.id, { x: bounds.x })
    else if (type === 'center-h') editor.updateElement(el.id, { x: bounds.x + (bounds.width - el.width) / 2 })
    else if (type === 'right') editor.updateElement(el.id, { x: bounds.x + bounds.width - el.width })
    else if (type === 'top') editor.updateElement(el.id, { y: bounds.y })
    else if (type === 'center-v') editor.updateElement(el.id, { y: bounds.y + (bounds.height - el.height) / 2 })
    else if (type === 'bottom') editor.updateElement(el.id, { y: bounds.y + bounds.height - el.height })
  }
}
</script>

<template>
  <div class="section">
    <div class="align-row">
      <button class="align-btn" title="Align left" @click="align('left')">
        <IconAlignLeft />
      </button>
      <button class="align-btn" title="Align center (horizontal)" @click="align('center-h')">
        <IconAlignCenterH />
      </button>
      <button class="align-btn" title="Align right" @click="align('right')">
        <IconAlignRight />
      </button>
      <button class="align-btn" title="Align top" @click="align('top')">
        <IconAlignTop />
      </button>
      <button class="align-btn" title="Align center (vertical)" @click="align('center-v')">
        <IconAlignCenterV />
      </button>
      <button class="align-btn" title="Align bottom" @click="align('bottom')">
        <IconAlignBottom />
      </button>
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.375rem 0.75rem; border-bottom: 1px solid var(--border); }
.align-row { display: flex; gap: 0.125rem; padding: 0.125rem 0; }
.align-btn {
  flex: 1;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: var(--bg-3);
  color: var(--text-3);
  cursor: pointer;
  transition: all var(--ease);
  &:hover { color: var(--text-1); background: var(--bg-5); border-color: var(--border); }
  svg { width: 1rem; height: 1rem; }
}
</style>

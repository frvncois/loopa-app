import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ClipboardData } from '@/types/clipboard'
import type { Element } from '@/types/elements'
import type { Keyframe } from '@/types/animation'
import { generateId } from '@/lib/utils/id'
import { lsGet, lsSet } from '@/composables/useLocalStorage'

const LS_KEY = 'loopa_clipboard'

export const useClipboardStore = defineStore('clipboard', () => {
  const data = ref<ClipboardData | null>(lsGet<ClipboardData>(LS_KEY))

  const hasPasteData = computed(() => data.value !== null)

  function copy(elements: Element[], keyframes: Keyframe[], projectId: string): void {
    data.value = {
      elements: JSON.parse(JSON.stringify(elements)),
      keyframes: JSON.parse(JSON.stringify(keyframes)),
      sourceProjectId: projectId,
      timestamp: Date.now()
    }
    lsSet(LS_KEY, data.value)
  }

  function paste(currentProjectId: string): { elements: Element[]; keyframes: Keyframe[] } {
    if (!data.value) return { elements: [], keyframes: [] }

    const isSameProject = data.value.sourceProjectId === currentProjectId
    const idMap = new Map<string, string>()

    const newElements: Element[] = data.value.elements.map(el => {
      const newId = generateId('el')
      idMap.set(el.id, newId)
      return {
        ...JSON.parse(JSON.stringify(el)),
        id: newId,
        x: el.x + (isSameProject ? 20 : 0),
        y: el.y + (isSameProject ? 20 : 0)
      }
    })

    const newKeyframes: Keyframe[] = data.value.keyframes
      .filter(kf => idMap.has(kf.elementId))
      .map(kf => ({
        ...JSON.parse(JSON.stringify(kf)),
        id: generateId('kf'),
        elementId: idMap.get(kf.elementId)!
      }))

    return { elements: newElements, keyframes: newKeyframes }
  }

  function clear(): void {
    data.value = null
    localStorage.removeItem(LS_KEY)
  }

  return { data, hasPasteData, copy, paste, clear }
})

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Element } from '@/types/elements'
import type { Keyframe } from '@/types/animation'
import type { ProjectData } from '@/types/project'
import { generateId } from '@/lib/utils/id'

export const useEditorStore = defineStore('editor', () => {
  const projectId = ref<string | null>(null)
  const elements = ref<Element[]>([])
  const keyframes = ref<Keyframe[]>([])

  // ── Getters ──
  const getElementById = computed(() => (id: string) =>
    elements.value.find(el => el.id === id)
  )

  const getElementsByIds = computed(() => (ids: string[]) =>
    elements.value.filter(el => ids.includes(el.id))
  )

  const getKeyframesForElement = computed(() => (elementId: string) =>
    keyframes.value.filter(kf => kf.elementId === elementId)
  )

  // ── Actions ──
  function loadProject(data: ProjectData): void {
    projectId.value = data.meta.id
    elements.value = data.elements
    keyframes.value = data.keyframes
  }

  function clearProject(): void {
    projectId.value = null
    elements.value = []
    keyframes.value = []
  }

  function addElement(element: Element): void {
    elements.value.push(element)
  }

  function updateElement(id: string, updates: Partial<Element>): void {
    const idx = elements.value.findIndex(el => el.id === id)
    if (idx !== -1) {
      elements.value[idx] = { ...elements.value[idx], ...updates } as Element
    }
  }

  function deleteElements(ids: string[]): void {
    elements.value = elements.value.filter(el => !ids.includes(el.id))
    keyframes.value = keyframes.value.filter(kf => !ids.includes(kf.elementId))
  }

  function reorderElement(id: string, newIndex: number): void {
    const idx = elements.value.findIndex(el => el.id === id)
    if (idx === -1) return
    const [el] = elements.value.splice(idx, 1)
    elements.value.splice(newIndex, 0, el)
  }

  function duplicateElements(ids: string[]): string[] {
    const newIds: string[] = []
    for (const id of ids) {
      const el = elements.value.find(e => e.id === id)
      if (!el) continue
      const newId = generateId('el')
      const clone = { ...el, id: newId, name: `${el.name} copy`, x: el.x + 20, y: el.y + 20 }
      elements.value.push(clone as Element)
      newIds.push(newId)

      // Duplicate keyframes for this element
      const elKfs = keyframes.value.filter(kf => kf.elementId === id)
      for (const kf of elKfs) {
        keyframes.value.push({ ...kf, id: generateId('kf'), elementId: newId })
      }
    }
    return newIds
  }

  function addKeyframe(keyframe: Keyframe): void {
    // Replace existing keyframe at same frame for same element
    const idx = keyframes.value.findIndex(
      kf => kf.elementId === keyframe.elementId && kf.frame === keyframe.frame
    )
    if (idx !== -1) {
      keyframes.value[idx] = keyframe
    } else {
      keyframes.value.push(keyframe)
    }
  }

  function updateKeyframe(id: string, updates: Partial<Keyframe>): void {
    const idx = keyframes.value.findIndex(kf => kf.id === id)
    if (idx !== -1) {
      keyframes.value[idx] = { ...keyframes.value[idx], ...updates }
    }
  }

  function deleteKeyframe(id: string): void {
    keyframes.value = keyframes.value.filter(kf => kf.id !== id)
  }

  function deleteKeyframesForElement(elementId: string): void {
    keyframes.value = keyframes.value.filter(kf => kf.elementId !== elementId)
  }

  return {
    projectId, elements, keyframes,
    getElementById, getElementsByIds, getKeyframesForElement,
    loadProject, clearProject, addElement, updateElement, deleteElements,
    reorderElement, duplicateElements,
    addKeyframe, updateKeyframe, deleteKeyframe, deleteKeyframesForElement
  }
})

import { ref, computed } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { Element } from '@/types/elements'
import type { Keyframe } from '@/types/animation'
import type { Frame } from '@/types/frame'

interface Snapshot {
  frames: Frame[]
  elements: Element[]
  keyframes: Keyframe[]
}

const MAX_SNAPSHOTS = 100

export function useHistory(editor: ReturnType<typeof useEditorStore>) {
  const stack = ref<Snapshot[]>([])
  const cursor = ref(-1)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function snapshot(): Snapshot {
    return {
      frames: JSON.parse(JSON.stringify(editor.frames)),
      elements: JSON.parse(JSON.stringify(editor.elements)),
      keyframes: JSON.parse(JSON.stringify(editor.keyframes)),
    }
  }

  function restore(snap: Snapshot) {
    editor.frames.splice(0, editor.frames.length, ...snap.frames)
    editor.elements.splice(0, editor.elements.length, ...snap.elements)
    editor.keyframes.splice(0, editor.keyframes.length, ...snap.keyframes)
  }

  /** Push an immediate snapshot (for discrete actions like addElement). */
  function save() {
    // Drop any redo history
    stack.value.splice(cursor.value + 1)

    stack.value.push(snapshot())

    if (stack.value.length > MAX_SNAPSHOTS) {
      stack.value.shift()
    } else {
      cursor.value++
    }
  }

  /** Debounced save for continuous actions (drag, slider). 300ms delay. */
  function saveDebounced() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      save()
      debounceTimer = null
    }, 300)
  }

  function undo() {
    if (cursor.value <= 0) return
    // If at the tip and no initial snapshot yet, push current state first
    cursor.value--
    restore(stack.value[cursor.value])
  }

  function redo() {
    if (cursor.value >= stack.value.length - 1) return
    cursor.value++
    restore(stack.value[cursor.value])
  }

  function clear() {
    stack.value = []
    cursor.value = -1
  }

  /** Call this once after project loads to seed the initial snapshot. */
  function seed() {
    stack.value = [snapshot()]
    cursor.value = 0
  }

  const canUndo = computed(() => cursor.value > 0)
  const canRedo = computed(() => cursor.value < stack.value.length - 1)

  return { save, saveDebounced, undo, redo, clear, seed, canUndo, canRedo }
}

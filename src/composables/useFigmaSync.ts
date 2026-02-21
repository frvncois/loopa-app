import { ref } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { syncFigmaFrame } from '@/lib/figma/FigmaSync'
import type { SyncResult } from '@/lib/figma/FigmaSync'

export function useFigmaSync() {
  const editor = useEditorStore()
  const ui = useUiStore()

  const isSyncing   = ref(false)
  const syncResult  = ref<SyncResult | null>(null)
  const syncError   = ref<string | null>(null)

  // Per-removed-element keep (true) / delete (false) decision; default: keep
  const keepDecisions = ref<Map<string, boolean>>(new Map())

  async function syncActiveFrame(): Promise<void> {
    const frameId = ui.activeFrameId
    if (!frameId) return

    const frame = editor.frames.find(f => f.id === frameId)
    if (!frame?.figmaFileKey) return

    isSyncing.value = true
    syncError.value = null
    syncResult.value = null

    try {
      const elements = editor.getElementsForFrame(frameId)
      const result = await syncFigmaFrame(frame, elements)

      // Apply updates immediately — keyframes are preserved because Loopa IDs stay the same
      for (const update of result.updated) {
        editor.updateElement(update.loopaId, update.patch)
      }

      // Add new elements to the active frame
      for (const el of result.added) {
        editor.addElement(el, frameId)
      }

      // Apply frame-level changes + stamp sync time
      editor.updateFrame(frameId, {
        ...result.frameUpdates,
        figmaLastSynced: Date.now(),
      })

      // Initialise keep/delete decisions (all "keep" by default)
      const decisions = new Map<string, boolean>()
      for (const r of result.removed) {
        decisions.set(r.id, true)
      }
      keepDecisions.value = decisions

      syncResult.value = result
    } catch (e) {
      syncError.value = e instanceof Error ? e.message : 'Sync failed'
    } finally {
      isSyncing.value = false
    }
  }

  /** Called by the result modal's Done button. Deletes elements the user marked for deletion. */
  function applyRemovedDecisions(): void {
    const toDelete: string[] = []
    for (const [id, keep] of keepDecisions.value) {
      if (!keep) toDelete.push(id)
    }
    if (toDelete.length > 0) editor.deleteElements(toDelete)

    syncResult.value = null
    keepDecisions.value = new Map()
  }

  function dismissSync(): void {
    syncResult.value = null
    syncError.value = null
    keepDecisions.value = new Map()
  }

  return {
    isSyncing,
    syncResult,
    syncError,
    keepDecisions,
    syncActiveFrame,
    applyRemovedDecisions,
    dismissSync,
  }
}

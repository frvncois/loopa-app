import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import type { useTimelineStore } from '@/stores/timelineStore'
import type { useHistory } from '@/composables/useHistory'
import type { useClipboard } from '@/composables/useClipboard'
import type { useSelection } from '@/composables/useSelection'
import type { useCanvas } from '@/composables/useCanvas'

export function useShortcuts(
  editor: ReturnType<typeof useEditorStore>,
  ui: ReturnType<typeof useUiStore>,
  timeline: ReturnType<typeof useTimelineStore>,
  history: ReturnType<typeof useHistory>,
  clipboard: ReturnType<typeof useClipboard>,
  selection: ReturnType<typeof useSelection>,
  canvas: ReturnType<typeof useCanvas>
) {
  function isTyping(e: KeyboardEvent): boolean {
    const tag = (e.target as HTMLElement).tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isTyping(e)) return

    const cmd = e.metaKey || e.ctrlKey

    // ── Cmd shortcuts ────────────────────────────────────────────
    if (cmd) {
      switch (e.key) {
        case 'z':
          e.preventDefault()
          if (e.shiftKey) history.redo()
          else history.undo()
          return
        case 'Z':
          e.preventDefault()
          history.redo()
          return
        case 'd':
          e.preventDefault()
          if (ui.selectedIds.size > 0) {
            const newIds = editor.duplicateElements([...ui.selectedIds])
            ui.selectAll(newIds)
            history.save()
          }
          return
        case 'c':
          clipboard.copy()
          return
        case 'v':
          e.preventDefault()
          clipboard.paste()
          history.save()
          return
        case 'x':
          clipboard.cut()
          history.save()
          return
        case 'a':
          e.preventDefault()
          selection.selectAll()
          return
        case 's':
          e.preventDefault()
          // Auto-save is already debounced via watcher; prevent browser save dialog
          return
      }
      return
    }

    // ── Single-key shortcuts ──────────────────────────────────────
    switch (e.key) {
      // Tools
      case 'v': case 'V': ui.setTool('select'); return
      case 'r': case 'R': ui.setTool('rect'); return
      case 'c': case 'C': ui.setTool('circle'); return
      case 'e': case 'E': ui.setTool('ellipse'); return
      case 'l': case 'L': ui.setTool('line'); return
      case 'p': case 'P': ui.setTool('pen'); return
      case 't': case 'T': ui.setTool('text'); return
      case 'h': case 'H': ui.setTool('hand'); return

      // Playback
      case ' ':
        e.preventDefault()
        timeline.togglePlay()
        return

      // Add keyframe
      case 'k': case 'K':
        // Handled externally via keyframeOps — emit an event-like signal
        // by toggling a UI flag. Simplest: dispatch a custom event.
        window.dispatchEvent(new CustomEvent('loopa:addKeyframe'))
        return

      // Delete
      case 'Delete':
      case 'Backspace':
        if (ui.pathEditMode) {
          // Delete selected point in path editor
          window.dispatchEvent(new CustomEvent('loopa:deletePathPoint'))
        } else if (ui.selectedIds.size > 0) {
          editor.deleteElements([...ui.selectedIds])
          ui.clearSelection()
          history.save()
        }
        return

      // Path edit mode
      case 'Enter':
        if (ui.pathEditMode) ui.exitPathEditMode()
        else if (ui.selectedIds.size === 1) {
          const el = editor.elements.find(el => el.id === [...ui.selectedIds][0])
          if (el?.type === 'path') ui.enterPathEditMode(el.id)
        }
        return

      // Escape
      case 'Escape':
        if (ui.activeModal) { ui.closeModal(); return }
        if (ui.pathEditMode) { ui.exitPathEditMode(); return }
        ui.clearSelection()
        ui.setTool('select')
        return

      // Panel toggle
      case 'm': case 'M':
        ui.setActivePanel(ui.activePanel === 'design' ? 'animate' : 'design')
        return

      // Zoom
      case '[':
        canvas.zoomOut()
        return
      case ']':
        canvas.zoomIn()
        return
      case '0':
        canvas.resetZoom()
        return

      // Shortcuts modal
      case '?':
        ui.openModal('shortcuts')
        return

      // Arrow nudge
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown': {
        if (ui.selectedIds.size === 0) return
        e.preventDefault()
        const dist = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -dist : e.key === 'ArrowRight' ? dist : 0
        const dy = e.key === 'ArrowUp' ? -dist : e.key === 'ArrowDown' ? dist : 0
        for (const id of ui.selectedIds) {
          const el = editor.elements.find(el => el.id === id)
          if (!el) continue
          editor.updateElement(id, { x: el.x + dx, y: el.y + dy })
        }
        history.saveDebounced()
        return
      }
    }
  }

  function register() {
    window.addEventListener('keydown', onKeyDown)
  }

  function unregister() {
    window.removeEventListener('keydown', onKeyDown)
  }

  return { register, unregister }
}

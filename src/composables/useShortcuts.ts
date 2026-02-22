import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import type { useTimelineStore } from '@/stores/timelineStore'
import type { useHistory } from '@/composables/useHistory'
import type { useClipboard } from '@/composables/useClipboard'
import type { useSelection } from '@/composables/useSelection'
import type { useCanvas } from '@/composables/useCanvas'
import type { useCropTool } from '@/composables/useCropTool'
import type { useMasking } from '@/composables/useMasking'
import type { GroupElement } from '@/types/elements'

export function useShortcuts(
  editor: ReturnType<typeof useEditorStore>,
  ui: ReturnType<typeof useUiStore>,
  timeline: ReturnType<typeof useTimelineStore>,
  history: ReturnType<typeof useHistory>,
  clipboard: ReturnType<typeof useClipboard>,
  selection: ReturnType<typeof useSelection>,
  canvas: ReturnType<typeof useCanvas>,
  cropTool?: ReturnType<typeof useCropTool>,
  masking?: ReturnType<typeof useMasking>
) {
  function isTyping(): boolean {
    const el = document.activeElement
    if (!el) return false
    const tag = el.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    return (el as HTMLElement).isContentEditable === true
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isTyping()) return

    const cmd = e.metaKey || e.ctrlKey

    // ── Cmd shortcuts ────────────────────────────────────────────
    if (cmd) {
      // Cmd+Alt+M — Use as Mask (2+ selected) or Release Mask (single mask group)
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault()
        const frameId = ui.activeFrameId
        if (!frameId) return
        if (ui.selectedIds.size >= 2) {
          masking?.createMask([...ui.selectedIds], frameId)
          history.save()
        } else if (ui.selectedIds.size === 1) {
          const selEl = editor.getElementById([...ui.selectedIds][0])
          if (selEl?.type === 'group' && (selEl as GroupElement).hasMask) {
            masking?.releaseMask(selEl.id)
            history.save()
          }
        }
        return
      }

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
          e.preventDefault()
          clipboard.copy()
          return
        case 'x':
          e.preventDefault()
          clipboard.cut()
          history.save()
          return
        case 'v':
          e.preventDefault()
          if (clipboard.canPaste.value) {
            clipboard.paste()
            history.save()
          }
          return
        case 'a':
          e.preventDefault()
          selection.selectAll()
          return
        case 's':
          e.preventDefault()
          // Auto-save is already debounced via watcher; prevent browser save dialog
          return
        case '=':
        case '+':
          e.preventDefault()
          canvas.zoomIn()
          return
        case '-':
          e.preventDefault()
          canvas.zoomOut()
          return
        case '0':
          e.preventDefault()
          canvas.resetZoom()
          return
        case 'g':
          e.preventDefault()
          if (e.shiftKey) {
            // Cmd+Shift+G — ungroup
            const ids = [...ui.selectedIds]
            if (ids.length === 1) {
              const el = editor.elements.find(el => el.id === ids[0])
              if (el?.type === 'group') {
                const childIds = editor.ungroupElements(ids[0])
                ui.selectAll(childIds)
                history.save()
              }
            }
          } else {
            // Cmd+G — group
            if (ui.selectedIds.size >= 2) {
              const groupId = editor.groupElements([...ui.selectedIds])
              if (groupId) {
                ui.select(groupId)
                history.save()
              }
            }
          }
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

      // Playback
      case ' ':
        e.preventDefault()
        timeline.togglePlay()
        return

      // Add keyframe
      case 'k': case 'K':
        window.dispatchEvent(new CustomEvent('loopa:addKeyframe'))
        return

      // Delete
      case 'Delete':
      case 'Backspace':
        if (ui.pathEditMode) {
          window.dispatchEvent(new CustomEvent('loopa:deletePathPoint'))
        } else if (ui.selectedKeyframeIds.size > 0) {
          for (const id of ui.selectedKeyframeIds) editor.deleteKeyframe(id)
          ui.clearKeyframeSelection()
        } else if (ui.selectedIds.size > 0) {
          editor.deleteElements([...ui.selectedIds])
          ui.clearSelection()
          history.save()
        }
        return

      // Path edit mode / group enter
      case 'Enter':
        if (cropTool?.isCropMode.value) { cropTool.exitCropMode(true); return }
        if (ui.pathEditMode) ui.exitPathEditMode()
        else if (ui.selectedIds.size === 1) {
          const el = editor.elements.find(el => el.id === [...ui.selectedIds][0])
          if (el?.type === 'path') ui.enterPathEditMode(el.id)
          else if (el?.type === 'group') ui.enterGroup(el.id)
        }
        return

      // Escape
      case 'Escape':
        if (ui.activeModal) { ui.closeModal(); return }
        if (cropTool?.isCropMode.value) { cropTool.exitCropMode(false); return }
        if (ui.pathEditMode) { ui.exitPathEditMode(); return }
        if (ui.activeGroupId) { ui.exitGroup(); return }
        if (ui.currentTool !== 'select' && ui.currentTool !== 'hand' && ui.currentTool !== 'pen') {
          ui.setTool('select')
          return
        }
        ui.clearSelection()
        ui.setTool('select')
        return

      // Panel toggle
      case 'm': case 'M':
        ui.setActivePanel(ui.activePanel === 'design' ? 'animate' : 'design')
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
        // Nudge selected keyframes on the timeline
        if (ui.selectedKeyframeIds.size > 0 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault()
          const delta = (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 5 : 1)
          for (const id of ui.selectedKeyframeIds) {
            const kf = editor.keyframes.find(k => k.id === id)
            if (!kf) continue
            const newFrame = Math.max(0, Math.min(kf.frame + delta, timeline.totalFrames))
            editor.updateKeyframe(id, { frame: newFrame })
          }
          return
        }
        // Nudge selected elements on the canvas
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

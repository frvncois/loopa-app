import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import type { useTimelineStore } from '@/stores/timelineStore'
import type { useHistory } from '@/composables/useHistory'
import type { useClipboard } from '@/composables/useClipboard'
import type { useSelection } from '@/composables/useSelection'
import type { useCanvas } from '@/composables/useCanvas'
import type { useCropTool } from '@/composables/useCropTool'
import type { ImageElement } from '@/types/elements'
import { storeImage } from '@/lib/utils/videoStorage'
import { generateId } from '@/lib/utils/id'
import { importSvg } from '@/lib/import/SvgImporter'

export function useShortcuts(
  editor: ReturnType<typeof useEditorStore>,
  ui: ReturnType<typeof useUiStore>,
  timeline: ReturnType<typeof useTimelineStore>,
  history: ReturnType<typeof useHistory>,
  clipboard: ReturnType<typeof useClipboard>,
  selection: ReturnType<typeof useSelection>,
  canvas: ReturnType<typeof useCanvas>,
  cropTool?: ReturnType<typeof useCropTool>
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

  // ── OS clipboard paste (images + SVG text) ───────────────────────────────

  async function onPaste(e: ClipboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    const items = Array.from(e.clipboardData?.items ?? [])

    // Image file pasted from OS clipboard
    const imageItem = items.find(it => it.type.startsWith('image/'))
    if (imageItem) {
      e.preventDefault()
      const blob = imageItem.getAsFile()
      if (!blob) return
      const frameId = ui.activeFrameId
      if (!frameId) return
      try {
        const tempUrl = URL.createObjectURL(blob)
        const img = new Image()
        await new Promise<void>(resolve => { img.onload = img.onerror = () => resolve(); img.src = tempUrl })
        URL.revokeObjectURL(tempUrl)
        const iw = img.naturalWidth || 200
        const ih = img.naturalHeight || 200
        const frame = editor.frames.find(f => f.id === frameId)
        const fw = frame?.width ?? 800
        const fh = frame?.height ?? 600
        const scale = Math.min((fw * 0.8) / iw, (fh * 0.8) / ih, 1)
        const w = Math.round(iw * scale)
        const h = Math.round(ih * scale)
        const storageId = generateId('img')
        await storeImage(storageId, blob)
        const el: ImageElement = {
          id: generateId('el'),
          type: 'image',
          name: 'Pasted Image',
          x: Math.round((fw - w) / 2),
          y: Math.round((fh - h) / 2),
          width: w, height: h,
          rotation: 0, scaleX: 1, scaleY: 1,
          opacity: 1, blendMode: 'normal',
          fills: [], strokes: [], shadows: [], blur: 0,
          visible: true, locked: false, flipX: false, flipY: false,
          imageStorageId: storageId,
          imageFileName: 'pasted.png',
          imageFileSize: blob.size,
          imageWidth: iw, imageHeight: ih,
          objectFit: 'contain',
        }
        editor.addElement(el, frameId)
        ui.select(el.id)
        history.save()
      } catch { /* ignore */ }
      return
    }

    // SVG text pasted (e.g., exported from Figma / Illustrator)
    const textItem = items.find(it => it.type === 'text/plain')
    if (textItem) {
      textItem.getAsString(async (text) => {
        const trimmed = text.trim()
        if (!trimmed.startsWith('<svg')) return
        e.preventDefault()
        const frameId = ui.activeFrameId
        if (!frameId) return
        const result = importSvg(trimmed)
        if (result.elements.length === 0) return
        for (const el of result.elements) editor.addElement(el, frameId)
        const frame = editor.frames.find(f => f.id === frameId)
        const fw = frame?.width ?? 800, fh = frame?.height ?? 600
        const meta = result.metadata
        if (meta) {
          const scaleX = fw / (meta.sourceWidth || fw)
          const scaleY = fh / (meta.sourceHeight || fh)
          const sc = Math.min(scaleX, scaleY, 1)
          if (sc !== 1) {
            for (const el of result.elements) {
              editor.updateElement(el.id, { x: Math.round(el.x * sc), y: Math.round(el.y * sc), width: Math.round(el.width * sc), height: Math.round(el.height * sc) })
            }
          }
        }
        ui.selectAll(result.elements.map(el => el.id))
        history.save()
      })
      return
    }

    // Fall through: internal clipboard paste
    clipboard.paste()
    history.save()
  }

  function register() {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('paste', onPaste as EventListener)
  }

  function unregister() {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('paste', onPaste as EventListener)
  }

  return { register, unregister }
}

/**
 * useFigmaImport — Composable for Figma OAuth connection and frame-browser import.
 *
 * Step flow: 'link' → 'browse' → 'importing'
 *   link:      user pastes a Figma URL, clicks Load
 *   browse:    page/frame tree is shown, user selects frames
 *   importing: frames are fetched and added to canvas, one at a time
 */

import { ref } from 'vue'
import * as figmaAuth from '@/lib/figma/figmaAuth'
import {
  parseFigmaUrl,
  getFileNodes,
  getFileImages,
  getFileStructure,
} from '@/lib/figma/figmaApi'
import type { FigmaPage, FigmaFileData } from '@/lib/figma/figmaApi'
import { convertFigmaNodes } from '@/lib/figma/FigmaNodeConverter'
import { importSvg } from '@/lib/import/SvgImporter'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { useTimelineStore } from '@/stores/timelineStore'
import type { ImportResult } from '@/types/export'
import type { Frame } from '@/types/frame'
import type { Element } from '@/types/elements'

export function useFigmaImport() {
  const editor   = useEditorStore()
  const ui       = useUiStore()
  const timeline = useTimelineStore()

  const isConnected    = ref(figmaAuth.isConnected())
  const isLoading      = ref(false)
  const error          = ref<string | null>(null)

  const step           = ref<'link' | 'browse' | 'importing'>('link')
  const fileStructure  = ref<FigmaFileData | null>(null)
  const fileKey        = ref('')
  const selectedNodeIds = ref<Set<string>>(new Set())
  const importProgress  = ref<{ done: number; total: number } | null>(null)

  // ── Connect via popup ─────────────────────────────────────────

  function connect(): void {
    const authUrl = figmaAuth.getAuthUrl()
    const popup = window.open(
      authUrl,
      'figma-auth',
      'width=600,height=700,left=200,top=100'
    )
    if (!popup) {
      error.value = 'Popup was blocked. Please allow popups for this site.'
      return
    }

    const poll = setInterval(() => {
      if (popup.closed) {
        clearInterval(poll)
        // Re-read tokens fresh from localStorage — the popup just saved new tokens there
        // before closing. Do NOT use isConnected() because it accepts expired tokens that
        // still have a refresh_token; we want to verify the new token was actually saved.
        const freshTokens = figmaAuth.getFigmaTokens()
        isConnected.value = !!(
          freshTokens?.access_token &&
          (freshTokens.expires_at > Date.now() || freshTokens.refresh_token)
        )
        if (!isConnected.value) {
          error.value = 'Connection cancelled or failed — please try again.'
        } else {
          error.value = null
        }
      }
    }, 500)
  }

  function disconnect(): void {
    figmaAuth.clearFigmaTokens()
    isConnected.value = false
    resetToLink()
  }

  // ── Step navigation ───────────────────────────────────────────

  function resetToLink(): void {
    step.value = 'link'
    fileStructure.value = null
    fileKey.value = ''
    selectedNodeIds.value = new Set()
    importProgress.value = null
    error.value = null
  }

  // ── Load file structure (link → browse) ──────────────────────

  async function loadFileStructure(figmaUrl: string): Promise<void> {
    error.value = null
    const parsed = parseFigmaUrl(figmaUrl)
    if (!parsed) {
      error.value = 'Invalid Figma link. Paste a URL from figma.com.'
      return
    }

    isLoading.value = true
    try {
      const data = await getFileStructure(parsed.fileKey)
      fileKey.value = parsed.fileKey
      fileStructure.value = data

      // Pre-select the node from the URL if present
      selectedNodeIds.value = new Set()
      if (parsed.nodeId) {
        selectedNodeIds.value.add(parsed.nodeId)
      }

      step.value = 'browse'
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch file structure.'
    } finally {
      isLoading.value = false
    }
  }

  // ── Frame selection ───────────────────────────────────────────

  function toggleNode(id: string): void {
    const next = new Set(selectedNodeIds.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    selectedNodeIds.value = next
  }

  function allSelectedInPage(page: FigmaPage): boolean {
    const frames = page.children.filter(
      c => c.type === 'FRAME' || c.type === 'COMPONENT' || c.type === 'GROUP'
    )
    return frames.length > 0 && frames.every(f => selectedNodeIds.value.has(f.id))
  }

  function selectAllInPage(page: FigmaPage): void {
    const next = new Set(selectedNodeIds.value)
    const frames = page.children.filter(
      c => c.type === 'FRAME' || c.type === 'COMPONENT' || c.type === 'GROUP'
    )
    if (allSelectedInPage(page)) {
      frames.forEach(f => next.delete(f.id))
    } else {
      frames.forEach(f => next.add(f.id))
    }
    selectedNodeIds.value = next
  }

  function selectNone(): void {
    selectedNodeIds.value = new Set()
  }

  // ── Import selected frames ────────────────────────────────────

  async function importSelected(): Promise<void> {
    const ids = Array.from(selectedNodeIds.value)
    if (!ids.length || !fileKey.value) return

    step.value = 'importing'
    importProgress.value = { done: 0, total: ids.length }
    error.value = null

    const newElementIds: string[] = []
    let firstImportedFrameId: string | null = null

    for (const nodeId of ids) {
      let result: ImportResult

      try {
        const data = await getFileNodes(fileKey.value, [nodeId])
        if (data.err) throw new Error(data.err)

        result = convertFigmaNodes(data.nodes, { width: 800, height: 600 }, fileKey.value)

        if (result.elements.length === 0) {
          result = await fallbackToSvgImport(fileKey.value, nodeId)
        }
      } catch {
        importProgress.value = { done: importProgress.value!.done + 1, total: ids.length }
        continue
      }

      if (result.frames && result.frames.length > 0) {
        // Each Figma frame → create a new Loopa Frame, add its elements to it
        for (const importedFrame of result.frames) {
          // Add a blank frame with the right dimensions
          const loopFrameId = editor.addFrame(importedFrame.name, importedFrame.width, importedFrame.height)
          // Set background color + Figma source metadata for future sync
          editor.updateFrame(loopFrameId, {
            backgroundColor: importedFrame.backgroundColor,
            figmaFileKey: importedFrame.figmaFileKey,
            figmaFrameNodeId: importedFrame.figmaFrameNodeId,
          })

          // Add elements that belong to this frame
          for (const elId of importedFrame.elements) {
            const el = result.elements.find(e => e.id === elId)
            if (el) {
              editor.addElement(el, loopFrameId)
              newElementIds.push(el.id)
            }
          }

          if (!firstImportedFrameId) {
            firstImportedFrameId = loopFrameId
          }
        }
      } else {
        // Fallback (SVG import or non-frame node): add to active frame
        const frameId = ui.activeFrameId ?? ''
        for (const el of result.elements) {
          editor.addElement(el, frameId)
          newElementIds.push(el.id)
        }
      }

      importProgress.value = { done: importProgress.value!.done + 1, total: ids.length }
    }

    // Switch to the first newly imported frame
    if (firstImportedFrameId) {
      const frame = editor.frames.find(f => f.id === firstImportedFrameId)
      if (frame) {
        ui.setActiveFrame(firstImportedFrameId)
        timeline.syncFromFrame(frame)
      }
    }

    if (newElementIds.length > 0) ui.selectAll(newElementIds)
    // step stays 'importing' — the caller (modal) closes on completion
  }

  // ── Collect converted frames+elements without side-effects ──
  //
  // Used by NewProjectModal to collect converted frames before the
  // editor store is initialised for the new project.

  async function collectFrames(): Promise<{ frames: Frame[]; elements: Element[] }> {
    const ids = Array.from(selectedNodeIds.value)
    if (!ids.length || !fileKey.value) return { frames: [], elements: [] }

    step.value = 'importing'
    importProgress.value = { done: 0, total: ids.length }
    error.value = null

    const allFrames: Frame[] = []
    const allElements: Element[] = []
    let frameOrder = 0

    for (const nodeId of ids) {
      let result: ImportResult
      try {
        const data = await getFileNodes(fileKey.value, [nodeId])
        if (data.err) throw new Error(data.err)
        result = convertFigmaNodes(data.nodes, { width: 800, height: 600 }, fileKey.value)
        if (result.elements.length === 0) {
          result = await fallbackToSvgImport(fileKey.value, nodeId)
        }
      } catch {
        importProgress.value = { done: importProgress.value!.done + 1, total: ids.length }
        continue
      }

      if (result.frames && result.frames.length > 0) {
        // Re-number frame orders to be sequential across all selected nodes
        for (const frame of result.frames) {
          allFrames.push({ ...frame, order: frameOrder++ })
        }
        allElements.push(...result.elements)
      } else {
        // Fallback (non-frame node or SVG): wrap in a synthetic frame
        if (result.elements.length > 0) {
          const { generateId } = await import('@/lib/utils/id')
          const syntheticFrame: Frame = {
            id: generateId('frame'),
            name: `Frame ${frameOrder + 1}`,
            width:  result.metadata.sourceWidth  || 800,
            height: result.metadata.sourceHeight || 600,
            backgroundColor: 'ffffff',
            elements: result.elements.map(e => e.id),
            order: frameOrder++,
            fps: 24,
            totalFrames: 60,
            loop: false,
            direction: 'normal',
          }
          allFrames.push(syntheticFrame)
          allElements.push(...result.elements)
        }
      }

      importProgress.value = { done: importProgress.value!.done + 1, total: ids.length }
    }

    return { frames: allFrames, elements: allElements }
  }

  // ── SVG fallback for complex nodes ────────────────────────────

  async function fallbackToSvgImport(fKey: string, nodeId: string): Promise<ImportResult> {
    const images = await getFileImages(fKey, [nodeId], 'svg')
    const svgUrl = images.images[nodeId]
    if (!svgUrl) {
      return {
        elements: [],
        warnings: [{ type: 'fallback', message: 'Could not export node as SVG' }],
        metadata: { sourceWidth: 0, sourceHeight: 0, layerCount: 0, isFigmaExport: true },
      }
    }

    const svgResponse = await fetch(svgUrl)
    const svgString   = await svgResponse.text()
    const result      = importSvg(svgString)
    result.warnings.unshift({ type: 'fallback', message: 'Complex node imported as flattened SVG paths' })
    return result
  }

  return {
    isConnected,
    isLoading,
    error,
    step,
    fileStructure,
    selectedNodeIds,
    importProgress,
    connect,
    disconnect,
    resetToLink,
    loadFileStructure,
    toggleNode,
    allSelectedInPage,
    selectAllInPage,
    selectNone,
    importSelected,
    collectFrames,
  }
}

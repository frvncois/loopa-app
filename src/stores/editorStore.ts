import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Element, GroupElement } from '@/types/elements'
import type { Frame } from '@/types/frame'
import type { Keyframe } from '@/types/animation'
import type { ProjectData } from '@/types/project'
import { generateId } from '@/lib/utils/id'
import { createGroup } from '@/lib/elements/ElementFactory'

export const useEditorStore = defineStore('editor', () => {
  const projectId = ref<string | null>(null)
  const frames    = ref<Frame[]>([])
  const elements  = ref<Element[]>([])
  const keyframes = ref<Keyframe[]>([])

  // ── Element getters ──────────────────────────────────────────

  const getElementById = computed(() => (id: string) =>
    elements.value.find(el => el.id === id)
  )

  const getElementsByIds = computed(() => (ids: string[]) =>
    elements.value.filter(el => ids.includes(el.id))
  )

  const getKeyframesForElement = computed(() => (elementId: string) =>
    keyframes.value.filter(kf => kf.elementId === elementId)
  )

  // Map from childId → parent groupId
  const childToGroupMap = computed(() => {
    const map = new Map<string, string>()
    for (const el of elements.value) {
      if (el.type === 'group') {
        for (const id of (el as GroupElement).childIds) {
          map.set(id, el.id)
        }
      }
    }
    return map
  })

  // Only elements not owned by any group (across all frames)
  const topLevelElements = computed(() =>
    elements.value.filter(el => !childToGroupMap.value.has(el.id))
  )

  // ── Frame getters ─────────────────────────────────────────────

  function getElementsForFrame(frameId: string): Element[] {
    const frame = frames.value.find(f => f.id === frameId)
    if (!frame) return []
    const ids = new Set(frame.elements)
    return elements.value.filter(el => ids.has(el.id))
  }

  function getKeyframesForFrame(frameId: string): Keyframe[] {
    const frame = frames.value.find(f => f.id === frameId)
    if (!frame) return []
    const ids = new Set(frame.elements)
    return keyframes.value.filter(kf => ids.has(kf.elementId))
  }

  function getTopLevelElementsForFrame(frameId: string): Element[] {
    return getElementsForFrame(frameId).filter(el => !childToGroupMap.value.has(el.id))
  }

  // ── Project load/clear ────────────────────────────────────────

  function loadProject(data: ProjectData): void {
    projectId.value = data.meta.id

    // Migration: old format has no frames field
    const legacy = data as any
    if (!data.frames || data.frames.length === 0) {
      const frameId = generateId('frame')
      frames.value = [{
        id: frameId,
        name: 'Frame 1',
        width:  legacy.meta.artboardWidth  ?? 800,
        height: legacy.meta.artboardHeight ?? 600,
        backgroundColor: 'ffffff',
        elements: data.elements.map(e => e.id),
        order: 0,
        fps:         legacy.fps         ?? 24,
        totalFrames: legacy.totalFrames ?? 60,
        loop: true,
        direction: 'normal',
      }]
    } else {
      frames.value = data.frames
    }

    elements.value  = data.elements
    keyframes.value = data.keyframes
  }

  function clearProject(): void {
    projectId.value = null
    frames.value    = []
    elements.value  = []
    keyframes.value = []
  }

  // ── Frame CRUD ────────────────────────────────────────────────

  function addFrame(name?: string, width?: number, height?: number): string {
    const id = generateId('frame')
    const frame: Frame = {
      id,
      name: name ?? `Frame ${frames.value.length + 1}`,
      width:  width  ?? 1920,
      height: height ?? 1080,
      backgroundColor: 'ffffff',
      elements: [],
      order: frames.value.length,
      fps: 24,
      totalFrames: 60,
      loop: true,
      direction: 'normal',
    }
    frames.value.push(frame)
    return id
  }

  function deleteFrame(frameId: string): void {
    if (frames.value.length <= 1) return
    const frame = frames.value.find(f => f.id === frameId)
    if (!frame) return
    const ids = new Set(frame.elements)
    // Cleanup video + image blobs for elements in this frame
    const videoStorageIds = elements.value
      .filter(el => ids.has(el.id) && el.type === 'video')
      .map(el => (el as any).videoStorageId as string)
      .filter(Boolean)
    if (videoStorageIds.length > 0) {
      import('@/lib/utils/videoStorage').then(m => m.deleteVideos(videoStorageIds)).catch(() => {})
    }
    const imageStorageIds = elements.value
      .filter(el => ids.has(el.id) && el.type === 'image')
      .map(el => (el as any).imageStorageId as string)
      .filter(Boolean)
    if (imageStorageIds.length > 0) {
      import('@/lib/utils/videoStorage').then(m => m.deleteMediaBulk(imageStorageIds)).catch(() => {})
    }
    elements.value  = elements.value.filter(el => !ids.has(el.id))
    keyframes.value = keyframes.value.filter(kf => !ids.has(kf.elementId))
    frames.value    = frames.value.filter(f => f.id !== frameId)
    frames.value.forEach((f, i) => { f.order = i })
  }

  function updateFrame(frameId: string, updates: Partial<Frame>): void {
    const idx = frames.value.findIndex(f => f.id === frameId)
    if (idx !== -1) {
      frames.value[idx] = { ...frames.value[idx], ...updates }
    }
  }

  function duplicateFrame(frameId: string): string {
    const frame = frames.value.find(f => f.id === frameId)
    if (!frame) return ''
    const newFrameId = generateId('frame')
    const idMap = new Map<string, string>()

    // Clone elements
    const newElementIds: string[] = []
    for (const elId of frame.elements) {
      const el = elements.value.find(e => e.id === elId)
      if (!el) continue
      const newId = generateId('el')
      idMap.set(elId, newId)
      newElementIds.push(newId)
      const cloned = JSON.parse(JSON.stringify(el)) as Element
      cloned.id = newId
      if (cloned.type === 'group') {
        (cloned as GroupElement).childIds = (cloned as GroupElement).childIds
          .map(cid => idMap.get(cid) ?? cid)
      }
      elements.value.push(cloned)
    }

    // Clone keyframes
    for (const kf of [...keyframes.value]) {
      if (!idMap.has(kf.elementId)) continue
      keyframes.value.push({
        ...JSON.parse(JSON.stringify(kf)),
        id: generateId('kf'),
        elementId: idMap.get(kf.elementId)!,
      })
    }

    const newFrame: Frame = {
      ...JSON.parse(JSON.stringify(frame)),
      id:       newFrameId,
      name:     `${frame.name} copy`,
      elements: newElementIds,
      order:    frames.value.length,
    }
    frames.value.push(newFrame)
    return newFrameId
  }

  function reorderFrame(frameId: string, newIndex: number): void {
    const idx = frames.value.findIndex(f => f.id === frameId)
    if (idx === -1) return
    const [frame] = frames.value.splice(idx, 1)
    frames.value.splice(Math.max(0, Math.min(newIndex, frames.value.length)), 0, frame)
    frames.value.forEach((f, i) => { f.order = i })
  }

  function moveElementsToFrame(elementIds: string[], targetFrameId: string): void {
    const targetFrame = frames.value.find(f => f.id === targetFrameId)
    if (!targetFrame) return
    for (const frame of frames.value) {
      frame.elements = frame.elements.filter(id => !elementIds.includes(id))
    }
    for (const id of elementIds) {
      if (!targetFrame.elements.includes(id)) targetFrame.elements.push(id)
    }
  }

  // ── Element actions ───────────────────────────────────────────

  function addElement(element: Element, frameId: string): void {
    elements.value.push(element)
    const frame = frames.value.find(f => f.id === frameId)
    if (frame && !frame.elements.includes(element.id)) {
      frame.elements.push(element.id)
    }
  }

  function updateElement(id: string, updates: Partial<Element>): void {
    const idx = elements.value.findIndex(el => el.id === id)
    if (idx !== -1) {
      const existing = elements.value[idx]
      // Propagate translation delta to group children
      if (existing.type === 'group' && ('x' in updates || 'y' in updates)) {
        const group = existing as GroupElement
        const dx = ('x' in updates ? (updates as any).x : existing.x) - existing.x
        const dy = ('y' in updates ? (updates as any).y : existing.y) - existing.y
        if (dx !== 0 || dy !== 0) {
          for (const childId of group.childIds) {
            const ci = elements.value.findIndex(e => e.id === childId)
            if (ci !== -1) {
              elements.value[ci] = {
                ...elements.value[ci],
                x: elements.value[ci].x + dx,
                y: elements.value[ci].y + dy,
              } as Element
            }
          }
        }
      }
      elements.value[idx] = { ...elements.value[idx], ...updates } as Element
    }
  }

  function deleteElements(ids: string[]): void {
    const allIds = new Set(ids)
    // Cascade: collect group children
    for (const id of ids) {
      const el = elements.value.find(e => e.id === id)
      if (el?.type === 'group') {
        for (const childId of (el as GroupElement).childIds) allIds.add(childId)
      }
    }
    // Cleanup video + image blobs from IndexedDB
    const videoStorageIds = elements.value
      .filter(el => allIds.has(el.id) && el.type === 'video')
      .map(el => (el as any).videoStorageId as string)
      .filter(Boolean)
    if (videoStorageIds.length > 0) {
      import('@/lib/utils/videoStorage').then(m => m.deleteVideos(videoStorageIds)).catch(() => {})
    }
    const imageStorageIds = elements.value
      .filter(el => allIds.has(el.id) && el.type === 'image')
      .map(el => (el as any).imageStorageId as string)
      .filter(Boolean)
    if (imageStorageIds.length > 0) {
      import('@/lib/utils/videoStorage').then(m => m.deleteMediaBulk(imageStorageIds)).catch(() => {})
    }
    // Mask cleanup: release masked elements / remove from mask lists
    for (const id of allIds) {
      const el = elements.value.find(e => e.id === id)
      if (!el) continue
      if (el.isMask && el.maskedElementIds) {
        for (const maskedId of el.maskedElementIds) {
          if (!allIds.has(maskedId)) {
            const mi = elements.value.findIndex(e => e.id === maskedId)
            if (mi !== -1) elements.value[mi] = { ...elements.value[mi], maskedById: null } as Element
          }
        }
      }
      if (el.maskedById && !allIds.has(el.maskedById)) {
        const maskIdx = elements.value.findIndex(e => e.id === el.maskedById)
        if (maskIdx !== -1) {
          const newMasked = (elements.value[maskIdx].maskedElementIds ?? []).filter(mid => mid !== id)
          elements.value[maskIdx] = { ...elements.value[maskIdx], maskedElementIds: newMasked } as Element
        }
      }
    }
    // Remove from all frame.elements arrays
    for (const frame of frames.value) {
      frame.elements = frame.elements.filter(id => !allIds.has(id))
    }
    // Remove deleted childIds from surviving groups
    elements.value = elements.value
      .map(el => {
        if (el.type === 'group') {
          const group = el as GroupElement
          const newChildIds = group.childIds.filter(id => !allIds.has(id))
          if (newChildIds.length !== group.childIds.length) {
            return { ...group, childIds: newChildIds } as Element
          }
        }
        return el
      })
      .filter(el => !allIds.has(el.id))
    keyframes.value = keyframes.value.filter(kf => !allIds.has(kf.elementId))
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
      newIds.push(newId)

      // Find which frame this element belongs to
      const frame = frames.value.find(f => f.elements.includes(id))

      if (el.type === 'group') {
        const group = el as GroupElement
        const newChildIds: string[] = []
        for (const childId of group.childIds) {
          const child = elements.value.find(e => e.id === childId)
          if (!child) continue
          const newChildId = generateId('el')
          const childClone = { ...child, id: newChildId, name: `${child.name} copy`, x: child.x + 20, y: child.y + 20 }
          elements.value.push(childClone as Element)
          newChildIds.push(newChildId)
          if (frame) frame.elements.push(newChildId)
          for (const kf of keyframes.value.filter(k => k.elementId === childId)) {
            keyframes.value.push({ ...kf, id: generateId('kf'), elementId: newChildId })
          }
        }
        const groupClone: Element = {
          ...group, id: newId, name: `${group.name} copy`,
          x: group.x + 20, y: group.y + 20, childIds: newChildIds,
        } as Element
        elements.value.push(groupClone)
        if (frame) frame.elements.push(newId)
      } else {
        // Mask: clear mask state on copies (new mask starts with no masked elements;
        // duplicated masked elements stay masked by the same mask)
        const extraMaskProps: Partial<Element> = {}
        if (el.isMask) {
          extraMaskProps.isMask = false
          extraMaskProps.maskedElementIds = []
        } else if (el.maskedById) {
          // Register the copy as also masked by the same mask
          extraMaskProps.maskedById = el.maskedById
          const maskIdx = elements.value.findIndex(e => e.id === el.maskedById)
          if (maskIdx !== -1) {
            const newMasked = [...(elements.value[maskIdx].maskedElementIds ?? []), newId]
            elements.value[maskIdx] = { ...elements.value[maskIdx], maskedElementIds: newMasked } as Element
          }
        }
        const clone = { ...el, ...extraMaskProps, id: newId, name: `${el.name} copy`, x: el.x + 20, y: el.y + 20 }
        elements.value.push(clone as Element)
        if (frame) frame.elements.push(newId)
      }

      for (const kf of keyframes.value.filter(k => k.elementId === id)) {
        keyframes.value.push({ ...kf, id: generateId('kf'), elementId: newId })
      }
    }
    return newIds
  }

  function groupElements(ids: string[]): string | null {
    if (ids.length < 2) return null
    const selectedEls = elements.value.filter(e => ids.includes(e.id))
    if (selectedEls.length < 2) return null

    const frame = frames.value.find(f => f.elements.some(id => ids.includes(id)))

    const group = createGroup(ids, elements.value)
    const minIdx = Math.min(...ids.map(id => elements.value.findIndex(e => e.id === id)))
    elements.value.splice(minIdx, 0, group)

    if (frame && !frame.elements.includes(group.id)) {
      frame.elements.push(group.id)
    }
    return group.id
  }

  function ungroupElements(groupId: string): string[] {
    const group = elements.value.find(e => e.id === groupId)
    if (!group || group.type !== 'group') return []
    const childIds = (group as GroupElement).childIds
    for (const frame of frames.value) {
      frame.elements = frame.elements.filter(id => id !== groupId)
    }
    elements.value  = elements.value.filter(e => e.id !== groupId)
    keyframes.value = keyframes.value.filter(kf => kf.elementId !== groupId)
    return childIds
  }

  // ── Keyframe actions ──────────────────────────────────────────

  function addKeyframe(keyframe: Keyframe): void {
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
    projectId, frames, elements, keyframes,
    getElementById, getElementsByIds, getKeyframesForElement,
    childToGroupMap, topLevelElements,
    getElementsForFrame, getKeyframesForFrame, getTopLevelElementsForFrame,
    loadProject, clearProject,
    addFrame, deleteFrame, updateFrame, duplicateFrame, reorderFrame, moveElementsToFrame,
    addElement, updateElement, deleteElements, reorderElement,
    duplicateElements, groupElements, ungroupElements,
    addKeyframe, updateKeyframe, deleteKeyframe, deleteKeyframesForElement,
  }
})

/**
 * FigmaSync.ts — Compares a Figma frame's current state against existing Loopa
 * elements and produces a structured diff (updated / added / removed).
 *
 * Only elements that carry a figmaNodeId are considered for sync matching.
 * Elements added manually in Loopa (no figmaNodeId) are left untouched.
 */

import { getFileNodes } from './figmaApi'
import { convertFigmaNodes } from './FigmaNodeConverter'
import type { Element, TextElement, RectElement, PathElement } from '@/types/elements'
import type { Frame } from '@/types/frame'

// ── Result types ──────────────────────────────────────────────

export interface SyncUpdate {
  loopaId: string       // Loopa element ID to patch (preserves keyframe links)
  figmaNodeId: string   // Figma node ID that was matched
  changes: string[]     // human-readable list of changed properties
  patch: Partial<Element>
}

export interface SyncRemovedItem {
  id: string
  name: string
}

export interface SyncResult {
  updated: SyncUpdate[]
  added: Element[]
  removed: SyncRemovedItem[]
  frameUpdates: Partial<Frame>   // e.g. changed width / height / backgroundColor
}

// ── Change detection ──────────────────────────────────────────

function approxEq(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.5
}

function describeChanges(existing: Element, fresh: Element): string[] {
  const changes: string[] = []

  if (!approxEq(existing.x, fresh.x) || !approxEq(existing.y, fresh.y)) {
    changes.push('position')
  }
  if (!approxEq(existing.width, fresh.width) || !approxEq(existing.height, fresh.height)) {
    changes.push('size')
  }
  if (!approxEq(existing.rotation, fresh.rotation)) {
    changes.push('rotation')
  }
  if (!approxEq(existing.opacity, fresh.opacity)) {
    changes.push('opacity')
  }
  if (JSON.stringify(existing.fills) !== JSON.stringify(fresh.fills)) {
    changes.push('fill')
  }
  if (JSON.stringify(existing.strokes) !== JSON.stringify(fresh.strokes)) {
    changes.push('stroke')
  }
  if (JSON.stringify(existing.shadows) !== JSON.stringify(fresh.shadows)) {
    changes.push('shadow')
  }
  if (!approxEq(existing.blur, fresh.blur)) {
    changes.push('blur')
  }

  if (existing.type === 'text' && fresh.type === 'text') {
    const et = existing as TextElement
    const ft = fresh as TextElement
    if (et.text !== ft.text) changes.push('text content')
    if (!approxEq(et.fontSize, ft.fontSize)) changes.push('font size')
    if (et.fontFamily !== ft.fontFamily || et.fontWeight !== ft.fontWeight) changes.push('font')
  }

  return changes
}

function buildPatch(existing: Element, fresh: Element): Partial<Element> {
  // Patch only visual/layout properties; preserve Loopa id (keyframes stay linked)
  const patch: Partial<Element> = {
    x: fresh.x,
    y: fresh.y,
    width: fresh.width,
    height: fresh.height,
    rotation: fresh.rotation,
    opacity: fresh.opacity,
    fills: fresh.fills,
    strokes: fresh.strokes,
    shadows: fresh.shadows,
    blur: fresh.blur,
    visible: fresh.visible,
  }

  if (existing.type === 'text' && fresh.type === 'text') {
    const ft = fresh as TextElement
    Object.assign(patch, {
      text: ft.text,
      fontSize: ft.fontSize,
      fontFamily: ft.fontFamily,
      fontWeight: ft.fontWeight,
      textAlign: ft.textAlign,
      lineHeight: ft.lineHeight,
      letterSpacing: ft.letterSpacing,
    })
  }

  if (existing.type === 'rect' && fresh.type === 'rect') {
    const fr = fresh as RectElement
    Object.assign(patch, {
      rx: fr.rx, ry: fr.ry,
      radiusTopLeft: fr.radiusTopLeft,
      radiusTopRight: fr.radiusTopRight,
      radiusBottomRight: fr.radiusBottomRight,
      radiusBottomLeft: fr.radiusBottomLeft,
    })
  }

  if (existing.type === 'path' && fresh.type === 'path') {
    const fp = fresh as PathElement
    Object.assign(patch, { d: fp.d, closed: fp.closed, fillRule: fp.fillRule })
  }

  return patch
}

// ── Public API ────────────────────────────────────────────────

export async function syncFigmaFrame(
  frame: Frame,
  existingElements: Element[],
): Promise<SyncResult> {
  if (!frame.figmaFileKey || !frame.figmaFrameNodeId) {
    throw new Error('Frame has no Figma source information')
  }

  const data = await getFileNodes(frame.figmaFileKey, [frame.figmaFrameNodeId])
  if (data.err) throw new Error(data.err)

  const importResult = convertFigmaNodes(
    data.nodes,
    { width: frame.width, height: frame.height },
    frame.figmaFileKey,
  )

  // Index fresh elements by figmaNodeId
  const freshByFigmaId = new Map<string, Element>()
  for (const el of importResult.elements) {
    if (el.figmaNodeId) freshByFigmaId.set(el.figmaNodeId, el)
  }

  // Index existing elements (for this frame) by figmaNodeId
  const existingByFigmaId = new Map<string, Element>()
  for (const el of existingElements) {
    if (el.figmaNodeId) existingByFigmaId.set(el.figmaNodeId, el)
  }

  // Compute updated and removed
  const updated: SyncUpdate[] = []
  const removed: SyncRemovedItem[] = []

  for (const [figmaNodeId, existing] of existingByFigmaId) {
    const fresh = freshByFigmaId.get(figmaNodeId)
    if (!fresh) {
      removed.push({ id: existing.id, name: existing.name })
    } else {
      const changes = describeChanges(existing, fresh)
      if (changes.length > 0) {
        updated.push({
          loopaId: existing.id,
          figmaNodeId,
          changes,
          patch: buildPatch(existing, fresh),
        })
      }
    }
  }

  // Compute added (fresh nodes not in existing)
  const added: Element[] = []
  for (const [figmaNodeId, fresh] of freshByFigmaId) {
    if (!existingByFigmaId.has(figmaNodeId)) {
      added.push(fresh)
    }
  }

  // Frame-level changes (dimensions, background)
  const frameUpdates: Partial<Frame> = {}
  const freshFrame = importResult.frames?.[0]
  if (freshFrame) {
    if (Math.round(freshFrame.width) !== frame.width) frameUpdates.width = Math.round(freshFrame.width)
    if (Math.round(freshFrame.height) !== frame.height) frameUpdates.height = Math.round(freshFrame.height)
    if (freshFrame.backgroundColor !== frame.backgroundColor) {
      frameUpdates.backgroundColor = freshFrame.backgroundColor
    }
  }

  return { updated, added, removed, frameUpdates }
}

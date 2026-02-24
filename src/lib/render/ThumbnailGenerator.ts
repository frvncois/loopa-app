/**
 * Generate a lightweight SVG thumbnail of the first frame.
 * Wraps SvgSerializer.serializeFrame() with element limits and no animation state.
 * Pure TypeScript — no Vue, no DOM.
 */
import type { Element } from '@/types/elements'
import { serializeFrame } from './SvgSerializer'

const MAX_ELEMENTS = 50

export function generateThumbnail(
  elements: Element[],
  artboardWidth: number,
  artboardHeight: number,
  backgroundColor?: string
): string {
  // Keep at most MAX_ELEMENTS visible elements to cap output size
  const visible = elements.filter(e => e.visible).slice(0, MAX_ELEMENTS)
  const emptyState = new Map<string, never>()
  return serializeFrame(
    visible,
    emptyState,
    { width: artboardWidth, height: artboardHeight },
    backgroundColor
  )
}

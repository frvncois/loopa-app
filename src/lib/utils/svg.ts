import type { Element } from '@/types/elements'

/**
 * Build an SVG transform attribute string from element properties.
 */
export function buildTransform(el: Element): string {
  const parts: string[] = []
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2

  if (el.rotation !== 0) {
    parts.push(`rotate(${el.rotation} ${cx} ${cy})`)
  }
  if (el.scaleX !== 1 || el.scaleY !== 1 || el.flipX || el.flipY) {
    const sx = el.scaleX * (el.flipX ? -1 : 1)
    const sy = el.scaleY * (el.flipY ? -1 : 1)
    parts.push(`translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`)
  }
  return parts.join(' ')
}

/**
 * Escape text for safe SVG text content.
 */
export function escapeSvgText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

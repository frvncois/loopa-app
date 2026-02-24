import type { TextElement, PathElement } from '@/types/elements'
import { generateId } from '@/lib/utils/id'

/** Shift all absolute coordinates in an opentype.js Path by (dx, dy). */
function shiftPath(path: any, dx: number, dy: number): void {
  for (const cmd of path.commands as any[]) {
    switch (cmd.type) {
      case 'M':
      case 'L':
        cmd.x += dx
        cmd.y += dy
        break
      case 'C':
        cmd.x1 += dx; cmd.y1 += dy
        cmd.x2 += dx; cmd.y2 += dy
        cmd.x  += dx; cmd.y  += dy
        break
      case 'Q':
        cmd.x1 += dx; cmd.y1 += dy
        cmd.x  += dx; cmd.y  += dy
        break
      // Z has no coordinates
    }
  }
}

/**
 * Convert a TextElement into an array of PathElements (one per visible glyph).
 * @param textEl  The source text element.
 * @param font    An opentype.js Font object (from `opentype.parse(buffer)`).
 */
export function convertTextToPaths(textEl: TextElement, font: any): PathElement[] {
  const fontSize   = textEl.fontSize  ?? 24
  const lineHeight = fontSize * 1.25                              // matches SVG tspan dy
  const ascenderPx = (font.ascender / font.unitsPerEm) * fontSize // hanging baseline offset

  const lines  = (textEl.text ?? '').split('\n')
  const result: PathElement[] = []

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]
    if (!line.trim()) continue

    // SVG baseline for this line (dominant-baseline="hanging" → top at el.y)
    const baseline = textEl.y + ascenderPx + li * lineHeight
    const glyphPaths: any[] = font.getPaths(line, textEl.x, baseline, fontSize)

    for (let gi = 0; gi < glyphPaths.length; gi++) {
      const glyph = glyphPaths[gi]
      if (!glyph.commands?.length) continue

      const bb = glyph.getBoundingBox()
      const w = bb.x2 - bb.x1
      const h = bb.y2 - bb.y1
      if (w < 0.5 || h < 0.5) continue  // skip invisible glyphs (spaces, etc.)

      // Translate glyph path so (0,0) is its own top-left — relativePoints mode
      shiftPath(glyph, -bb.x1, -bb.y1)
      const d = glyph.toPathData(2)

      const pathEl: PathElement = {
        id:            generateId('el'),
        type:          'path',
        name:          line[gi] ?? 'Path',
        x:             Math.round(bb.x1 * 100) / 100,
        y:             Math.round(bb.y1 * 100) / 100,
        width:         Math.round(w  * 100) / 100,
        height:        Math.round(h  * 100) / 100,
        rotation:      0,
        rotateX:       0,
        rotateY:       0,
        perspective:   800,
        scaleX:        1,
        scaleY:        1,
        opacity:       textEl.opacity,
        blendMode:     textEl.blendMode,
        fills:         textEl.fills.map(f => ({ ...f, id: generateId('fill') })),
        strokes:       textEl.strokes.map(s => ({ ...s, id: generateId('stroke') })),
        shadows:       textEl.shadows.map(s => ({ ...s, id: generateId('shadow') })),
        blur:          textEl.blur,
        visible:       textEl.visible,
        locked:        false,
        flipX:         false,
        flipY:         false,
        points:        [],
        closed:        true,
        d,
        fillRule:      'nonzero',
        relativePoints: true,
      }
      result.push(pathEl)
    }
  }
  return result
}

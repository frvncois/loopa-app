/**
 * Decompose an SVG / CSS matrix(a,b,c,d,e,f) into individual transforms.
 *
 * The SVG matrix notation maps to:
 *   | a  c  e |
 *   | b  d  f |
 *   | 0  0  1 |
 *
 * Where the columns represent the X-axis, Y-axis, and translation.
 */
export interface DecomposedTransform {
  translateX: number
  translateY: number
  rotation: number    // degrees
  scaleX: number
  scaleY: number
  skewX: number       // degrees (usually ignored in Loopa)
}

export function decomposeMatrix(
  a: number, b: number,
  c: number, d: number,
  e: number, f: number
): DecomposedTransform {
  // Translation is always the e, f components
  const translateX = e
  const translateY = f

  // Scale factors from the first two columns
  const scaleX = Math.sqrt(a * a + b * b)
  const scaleY = Math.sqrt(c * c + d * d)

  // Determine sign of scales (handle reflections)
  const det = a * d - b * c
  const signScaleY = det < 0 ? -1 : 1

  // Rotation from the first column vector
  const rotation = Math.atan2(b, a) * (180 / Math.PI)

  // Skew (angle between the two column vectors after removing scale)
  const ax = a / scaleX, bx = b / scaleX
  const cy2 = c / (scaleY * signScaleY), dy2 = d / (scaleY * signScaleY)
  const skewX = Math.atan2(ax * cy2 + bx * dy2, ax * (-bx) + bx * ax) * (180 / Math.PI)

  return {
    translateX,
    translateY,
    rotation,
    scaleX,
    scaleY: scaleY * signScaleY,
    skewX
  }
}

/**
 * Parse a single transform string token and return a DecomposedTransform.
 * Handles: matrix(), translate(), scale(), rotate().
 */
export function parseTransformToken(token: string): DecomposedTransform | null {
  const identity: DecomposedTransform = { translateX: 0, translateY: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0 }

  const matrix = token.match(/^matrix\(\s*([-\d.e]+)[,\s]+([-\d.e]+)[,\s]+([-\d.e]+)[,\s]+([-\d.e]+)[,\s]+([-\d.e]+)[,\s]+([-\d.e]+)\s*\)/)
  if (matrix) {
    return decomposeMatrix(
      +matrix[1], +matrix[2], +matrix[3], +matrix[4], +matrix[5], +matrix[6]
    )
  }

  const translate = token.match(/^translate\(\s*([-\d.e]+)(?:[,\s]+([-\d.e]+))?\s*\)/)
  if (translate) {
    return { ...identity, translateX: +translate[1], translateY: +(translate[2] ?? 0) }
  }

  const scale = token.match(/^scale\(\s*([-\d.e]+)(?:[,\s]+([-\d.e]+))?\s*\)/)
  if (scale) {
    const sx = +scale[1]
    return { ...identity, scaleX: sx, scaleY: +(scale[2] ?? sx) }
  }

  const rotate = token.match(/^rotate\(\s*([-\d.e]+)(?:[,\s]+([-\d.e]+)[,\s]+([-\d.e]+))?\s*\)/)
  if (rotate) {
    return { ...identity, rotation: +rotate[1] }
  }

  return null
}

/**
 * Parse a full SVG transform attribute string (may contain multiple transforms)
 * and return accumulated decomposed values.
 */
export function parseTransformString(transform: string): DecomposedTransform {
  const result: DecomposedTransform = { translateX: 0, translateY: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0 }
  if (!transform) return result

  // Split on transform function boundaries
  const tokens = transform.trim().match(/\w+\([^)]*\)/g) ?? []

  for (const token of tokens) {
    const t = parseTransformToken(token.trim())
    if (!t) continue
    result.translateX += t.translateX
    result.translateY += t.translateY
    result.rotation   += t.rotation
    result.scaleX     *= t.scaleX
    result.scaleY     *= t.scaleY
  }

  return result
}

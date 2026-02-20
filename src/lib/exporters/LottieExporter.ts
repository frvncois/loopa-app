/**
 * Lottie Exporter — bodymovin v5.x JSON.
 *
 * Generates a valid Lottie animation from Loopa elements + keyframes.
 * Handles rect, circle, ellipse, polygon, star, path. Text layers are skipped.
 */
import type {
  Element, RectElement, EllipseElement, PolygonElement,
  StarElement, PathElement
} from '@/types/elements'
import type { Keyframe, AnimatableProps, EasingType } from '@/types/animation'
import type { ExportPayload, LottieExportOptions } from '@/types/export'
import type { BaseExporter } from './BaseExporter'
import { computeElementAtFrame } from '@/lib/engine/AnimationEngine'
import { hexToRgb } from '@/lib/utils/color'

// ── Easing → Lottie cubic bezier handles ─────────────────────────────────────
// CSS cubic-bezier(x1, y1, x2, y2) → Lottie o: {x:[x1],y:[y1]}, i: {x:[x2],y:[y2]}

const EASING_CB: Record<string, [number, number, number, number]> = {
  'linear':            [0, 0, 1, 1],
  'ease-in':           [0.42, 0, 1, 0.58],
  'ease-out':          [0, 0.42, 0.58, 1],
  'ease-in-out':       [0.42, 0, 0.58, 1],
  'ease-in-cubic':     [0.55, 0, 1, 0.45],
  'ease-out-cubic':    [0, 0.55, 0.45, 1],
  'ease-in-out-cubic': [0.65, 0, 0.35, 1],
  'ease-in-back':      [0.36, 0, 0.66, -0.56],
  'ease-out-back':     [0.34, 1.56, 0.64, 1],
  'ease-out-bounce':   [0.42, 0, 0.58, 1],
  'ease-out-elastic':  [0.42, 0, 0.58, 1],
  'spring':            [0.42, 0, 0.58, 1],
}

function easingHandles(easing: EasingType): [number, number, number, number] {
  if (easing in EASING_CB) return EASING_CB[easing]
  const m = easing.match(/^cubic-bezier\(([\d.]+),([\d.]+),([\d.]+),([\d.]+)\)$/)
  if (m) return [+m[1], +m[2], +m[3], +m[4]]
  return [0, 0, 1, 1]
}

// ── Lottie value builders ────────────────────────────────────────────────────

type LottieValue = { a: 0; k: number | number[] } | { a: 1; k: object[] }

function staticVal(k: number | number[]): LottieValue {
  return { a: 0, k }
}

function animatedVal(
  kfs: Keyframe[],
  totalFrames: number,
  getter: (props: AnimatableProps, base: Element) => number | number[],
  el: Element
): LottieValue {
  const sorted = [...kfs].sort((a, b) => a.frame - b.frame)
  if (sorted.length === 0) return staticVal(getter({}, el))

  // Build Lottie keyframe array
  const result: object[] = []

  for (let i = 0; i < sorted.length; i++) {
    const kf = sorted[i]
    const props = computeElementAtFrame(kfs, kf.frame)
    const sv = getter(props, el)
    const [x1, y1, x2, y2] = easingHandles(kf.easing)

    const entry: Record<string, unknown> = {
      t: kf.frame,
      s: Array.isArray(sv) ? sv : [sv],
    }

    if (i < sorted.length - 1) {
      const nextProps = computeElementAtFrame(kfs, sorted[i + 1].frame)
      const ev = getter(nextProps, el)
      entry['e'] = Array.isArray(ev) ? ev : [ev]
      entry['o'] = { x: [x1], y: [y1] }
      entry['i'] = { x: [x2], y: [y2] }
    }

    result.push(entry)
  }

  // Lottie needs a trailing keyframe with just t
  const last = sorted[sorted.length - 1]
  if (last.frame < totalFrames) {
    const endProps = computeElementAtFrame(kfs, totalFrames)
    const ev = getter(endProps, el)
    result.push({ t: totalFrames, s: Array.isArray(ev) ? ev : [ev] })
  }

  return { a: 1, k: result }
}

function hexToLottieColor(hex: string): [number, number, number, number] {
  const { r, g, b } = hexToRgb(hex)
  return [r / 255, g / 255, b / 255, 1]
}

// ── Shape builders ───────────────────────────────────────────────────────────

function makeFill(el: Element, kfs: Keyframe[], totalFrames: number): object | null {
  const fill = el.fills.find(f => f.visible && f.type !== 'none')
  if (!fill) return null

  const hasFillAnim = kfs.some(k => k.props.fillColor !== undefined)
  const c = hasFillAnim
    ? animatedVal(kfs, totalFrames,
        (p) => {
          const fc = p.fillColor ?? fill.color
          return hexToLottieColor(fc)
        }, el)
    : staticVal(hexToLottieColor(fill.color))

  return {
    ty: 'fl',
    nm: 'Fill',
    o: staticVal(fill.opacity * 100),
    c,
    r: 1  // fill rule: 1=nonzero, 2=evenodd
  }
}

function makeStroke(el: Element, kfs: Keyframe[], totalFrames: number): object | null {
  const stroke = el.strokes.find(s => s.visible)
  if (!stroke) return null

  const hasColorAnim = kfs.some(k => k.props.strokeColor !== undefined)
  const hasWidthAnim = kfs.some(k => k.props.strokeWidth !== undefined)

  const c = hasColorAnim
    ? animatedVal(kfs, totalFrames, (p) => hexToLottieColor(p.strokeColor ?? stroke.color), el)
    : staticVal(hexToLottieColor(stroke.color))

  const w = hasWidthAnim
    ? animatedVal(kfs, totalFrames, (p) => p.strokeWidth ?? stroke.width, el)
    : staticVal(stroke.width)

  const lineCapMap: Record<string, number> = { butt: 1, round: 2, square: 3 }
  const lineJoinMap: Record<string, number> = { miter: 1, round: 2, bevel: 3 }

  return {
    ty: 'st',
    nm: 'Stroke',
    o: staticVal(100),
    c,
    w,
    lc: lineCapMap[stroke.cap] ?? 2,
    lj: lineJoinMap[stroke.join] ?? 2,
  }
}

function buildKs(el: Element, kfs: Keyframe[], totalFrames: number): object {
  const hasPosAnim = kfs.some(k => k.props.x !== undefined || k.props.y !== undefined)
  const hasRotAnim = kfs.some(k => k.props.rotation !== undefined)
  const hasScaleAnim = kfs.some(k => k.props.scaleX !== undefined || k.props.scaleY !== undefined)
  const hasOpacityAnim = kfs.some(k => k.props.opacity !== undefined)

  const pos = hasPosAnim
    ? animatedVal(kfs, totalFrames,
        (p, e) => {
          const x = p.x ?? e.x
          const y = p.y ?? e.y
          return [x, y, 0]
        }, el)
    : staticVal([el.x, el.y, 0])

  const rotation = hasRotAnim
    ? animatedVal(kfs, totalFrames, (p, e) => p.rotation ?? e.rotation, el)
    : staticVal(el.rotation)

  const scale = hasScaleAnim
    ? animatedVal(kfs, totalFrames,
        (p, e) => {
          const sx = (p.scaleX ?? e.scaleX) * 100
          const sy = (p.scaleY ?? e.scaleY) * 100
          return [sx, sy, 100]
        }, el)
    : staticVal([el.scaleX * 100, el.scaleY * 100, 100])

  const opacity = hasOpacityAnim
    ? animatedVal(kfs, totalFrames, (p, e) => (p.opacity ?? e.opacity) * 100, el)
    : staticVal(el.opacity * 100)

  return {
    o: opacity,
    r: rotation,
    p: pos,
    a: staticVal([0, 0, 0]),
    s: scale,
  }
}

// ── Per-type shape generators ─────────────────────────────────────────────────

function makeRect(el: Element, kfs: Keyframe[], totalFrames: number): object[] {
  const e = el as RectElement
  const hasSize = kfs.some(k => k.props.width !== undefined || k.props.height !== undefined)
  const hasRx   = kfs.some(k => k.props.rx !== undefined)

  const s = hasSize
    ? animatedVal(kfs, totalFrames, (p, el) => [p.width ?? el.width, p.height ?? el.height], el)
    : staticVal([e.width, e.height])

  const p = staticVal([e.width / 2, e.height / 2])

  const rx = hasRx
    ? animatedVal(kfs, totalFrames, (pr) => pr.rx ?? e.rx, el)
    : staticVal(e.rx)

  const shapes: object[] = [{ ty: 'rc', nm: 'Rectangle', d: 1, p, s, r: rx }]
  const fill   = makeFill(el, kfs, totalFrames)
  const stroke = makeStroke(el, kfs, totalFrames)
  if (stroke) shapes.push(stroke)
  if (fill)   shapes.push(fill)
  return shapes
}

function makeEllipse(el: Element, kfs: Keyframe[], totalFrames: number): object[] {
  const e = el as EllipseElement
  const hasSize = kfs.some(k => k.props.width !== undefined || k.props.height !== undefined)

  const s = hasSize
    ? animatedVal(kfs, totalFrames, (p, el) => [p.width ?? el.width, p.height ?? el.height], el)
    : staticVal([e.width, e.height])

  const p = staticVal([e.width / 2, e.height / 2])

  const shapes: object[] = [{ ty: 'el', nm: 'Ellipse', d: 1, p, s }]
  const fill   = makeFill(el, kfs, totalFrames)
  const stroke = makeStroke(el, kfs, totalFrames)
  if (stroke) shapes.push(stroke)
  if (fill)   shapes.push(fill)
  return shapes
}

function makePolygon(el: Element, kfs: Keyframe[], totalFrames: number): object[] {
  const e = el as PolygonElement
  const r = Math.min(e.width, e.height) / 2
  const cx = e.width / 2
  const cy = e.height / 2

  // Build path vertices for polygon
  const verts: number[][] = []
  for (let i = 0; i < (e.sides ?? 6); i++) {
    const a = (i * 2 * Math.PI) / (e.sides ?? 6) - Math.PI / 2
    verts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }

  const ks = {
    a: 0,
    k: {
      v: verts,
      i: verts.map(() => [0, 0]),
      o: verts.map(() => [0, 0]),
      c: true
    }
  }

  const shapes: object[] = [{ ty: 'sh', nm: 'Polygon', ks }]
  const fill   = makeFill(el, kfs, totalFrames)
  const stroke = makeStroke(el, kfs, totalFrames)
  if (stroke) shapes.push(stroke)
  if (fill)   shapes.push(fill)
  return shapes
}

function makeStar(el: Element, kfs: Keyframe[], totalFrames: number): object[] {
  const e = el as StarElement
  const n = e.starPoints ?? 5
  const outerR = Math.min(e.width, e.height) / 2
  const innerR = outerR * (e.innerRadius ?? 0.4)
  const cx = e.width / 2
  const cy = e.height / 2

  const verts: number[][] = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const a = (i * Math.PI) / n - Math.PI / 2
    verts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }

  const ks = {
    a: 0,
    k: { v: verts, i: verts.map(() => [0, 0]), o: verts.map(() => [0, 0]), c: true }
  }

  const shapes: object[] = [{ ty: 'sh', nm: 'Star', ks }]
  const fill   = makeFill(el, kfs, totalFrames)
  const stroke = makeStroke(el, kfs, totalFrames)
  if (stroke) shapes.push(stroke)
  if (fill)   shapes.push(fill)
  return shapes
}

function parseSvgPathToLottie(d: string, closed: boolean): object {
  // Simplified parser: extract M, L, C commands → Lottie vertices
  const verts: number[][] = []
  const ins: number[][] = []
  const outs: number[][] = []

  const tokens = d.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) ?? []
  let cx = 0, cy = 0

  for (const token of tokens) {
    const cmd = token[0].toUpperCase()
    const args = token.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n))

    if (cmd === 'M') {
      cx = args[0]; cy = args[1]
      verts.push([cx, cy])
      ins.push([0, 0])
      outs.push([0, 0])
    } else if (cmd === 'L') {
      cx = args[0]; cy = args[1]
      verts.push([cx, cy])
      ins.push([0, 0])
      outs.push([0, 0])
    } else if (cmd === 'C') {
      // Cubic bezier: cp1x, cp1y, cp2x, cp2y, ex, ey
      const [cp1x, cp1y, cp2x, cp2y, ex, ey] = args
      // Previous point's out-tangent
      if (outs.length > 0) outs[outs.length - 1] = [cp1x - cx, cp1y - cy]
      cx = ex; cy = ey
      verts.push([cx, cy])
      ins.push([cp2x - cx, cp2y - cy])
      outs.push([0, 0])
    }
    // Z handled by 'closed' flag
  }

  return {
    a: 0,
    k: { v: verts, i: ins, o: outs, c: closed }
  }
}

function makePath(el: Element, kfs: Keyframe[], totalFrames: number): object[] {
  const e = el as PathElement
  const hasPathAnim = kfs.some(k => k.props.d !== undefined)

  const ks = hasPathAnim
    ? animatedVal(kfs, totalFrames,
        (p, el) => {
          const pd = el as PathElement
          const d = p.d ?? pd.d
          const lottieKs = parseSvgPathToLottie(d, pd.closed)
          return (lottieKs as { a: number; k: object }).k as unknown as number
        }, el)
    : { a: 0, k: parseSvgPathToLottie(e.d, e.closed) }

  const shapes: object[] = [{ ty: 'sh', nm: 'Path', ks }]
  const fill   = makeFill(el, kfs, totalFrames)
  const stroke = makeStroke(el, kfs, totalFrames)
  if (stroke) shapes.push(stroke)
  if (fill)   shapes.push(fill)
  return shapes
}

// ── Layer builder ─────────────────────────────────────────────────────────────

function buildLayer(
  el: Element,
  index: number,
  keyframes: Keyframe[],
  totalFrames: number
): object | null {
  if (!el.visible) return null
  if (el.type === 'text') return null  // Text not supported in V1

  const kfs = keyframes.filter(kf => kf.elementId === el.id)
  let shapes: object[] = []

  if (el.type === 'rect')    shapes = makeRect(el, kfs, totalFrames)
  else if (el.type === 'circle' || el.type === 'ellipse') shapes = makeEllipse(el, kfs, totalFrames)
  else if (el.type === 'polygon') shapes = makePolygon(el, kfs, totalFrames)
  else if (el.type === 'star')    shapes = makeStar(el, kfs, totalFrames)
  else if (el.type === 'path')    shapes = makePath(el, kfs, totalFrames)
  else if (el.type === 'line') {
    // Treat line as a degenerate rect shape
    shapes = makeRect(el, kfs, totalFrames)
  }

  return {
    ddd: 0,
    ind: index,
    ty: 4,
    nm: el.name,
    sr: 1,
    ks: buildKs(el, kfs, totalFrames),
    ao: 0,
    shapes: [{ ty: 'gr', nm: 'Shape Group', it: shapes }],
    ip: 0,
    op: totalFrames,
    st: 0,
    bm: 0,
  }
}

// ── Exporter ──────────────────────────────────────────────────────────────────

export const LottieExporter: BaseExporter = {
  async export(payload: ExportPayload): Promise<string> {
    const { elements, keyframes, artboard, fps, totalFrames, options } = payload
    const opts = options as LottieExportOptions

    const layers: object[] = []
    const warnings: string[] = []

    elements.forEach((el, i) => {
      if (el.type === 'text') {
        warnings.push(`Text element "${el.name}" was skipped (not supported in Lottie V1 export).`)
        return
      }
      const layer = buildLayer(el, i + 1, keyframes, totalFrames)
      if (layer) layers.push(layer)
    })

    const lottie = {
      v: '5.7.0',
      fr: fps,
      ip: 0,
      op: totalFrames,
      w: artboard.width,
      h: artboard.height,
      nm: 'Loopa Export',
      ddd: 0,
      assets: [],
      layers: layers.reverse(), // Lottie renders top layer first = highest z-index
      markers: [],
      ...(opts.loop ? {} : {}),
    }

    return opts.prettyPrint
      ? JSON.stringify(lottie, null, 2)
      : JSON.stringify(lottie)
  }
}

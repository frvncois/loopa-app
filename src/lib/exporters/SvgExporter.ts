/**
 * SVG Exporter — static (single-frame) and animated (SMIL) modes.
 */
import type { Element, RectElement, PathElement, GroupElement, ImageElement } from '@/types/elements'
import type { Keyframe, AnimatableProps, EasingType } from '@/types/animation'
import type { ExportPayload, SvgExportOptions } from '@/types/export'
import type { BaseExporter } from './BaseExporter'
import { serializeElement, serializeFrame } from '@/lib/render/SvgSerializer'
import { computeFrame } from '@/lib/engine/AnimationEngine'

// ── Easing → SMIL keySpline ───────────────────────────────────────────────────

const EASING_SPLINES: Record<string, string> = {
  'linear':            '0 0 1 1',
  'ease-in':           '0.42 0 1 0.58',
  'ease-out':          '0 0.42 0.58 1',
  'ease-in-out':       '0.42 0 0.58 1',
  'ease-in-cubic':     '0.55 0 1 0.45',
  'ease-out-cubic':    '0 0.55 0.45 1',
  'ease-in-out-cubic': '0.65 0 0.35 1',
  'ease-in-back':      '0.36 0 0.66 -0.56',
  'ease-out-back':     '0.34 1.56 0.64 1',
  'ease-out-bounce':   '0.42 0 0.58 1',   // approximation
  'ease-out-elastic':  '0.42 0 0.58 1',
  'spring':            '0.42 0 0.58 1',
}

function toSpline(easing: EasingType): string {
  if (easing in EASING_SPLINES) return EASING_SPLINES[easing]
  const m = easing.match(/^cubic-bezier\(([\d.]+),([\d.]+),([\d.]+),([\d.]+)\)$/)
  if (m) return `${m[1]} ${m[2]} ${m[3]} ${m[4]}`
  return '0 0 1 1'
}

// ── SMIL animation builders ───────────────────────────────────────────────────

interface AnimParam {
  attr: string         // SVG attribute name
  values: string[]     // value at each keyframe
  keyTimes: string[]   // normalized time 0-1
  splines: string[]    // one per interval (values.length - 1)
  dur: number          // seconds
  loop: boolean
}

function makeAnimate(p: AnimParam): string {
  const repeatCount = p.loop ? 'indefinite' : '1'
  const fill = p.loop ? '' : ' fill="freeze"'
  return (
    `<animate attributeName="${p.attr}"` +
    ` values="${p.values.join(';')}"` +
    ` keyTimes="${p.keyTimes.join(';')}"` +
    ` dur="${p.dur}s"` +
    ` calcMode="spline"` +
    ` keySplines="${p.splines.join(';')}"` +
    ` repeatCount="${repeatCount}"${fill}/>`
  )
}

function makeAnimateTransform(p: AnimParam, type: string): string {
  const repeatCount = p.loop ? 'indefinite' : '1'
  const fill = p.loop ? '' : ' fill="freeze"'
  return (
    `<animateTransform attributeName="transform" type="${type}"` +
    ` values="${p.values.join(';')}"` +
    ` keyTimes="${p.keyTimes.join(';')}"` +
    ` dur="${p.dur}s"` +
    ` calcMode="spline"` +
    ` keySplines="${p.splines.join(';')}"` +
    ` additive="sum"` +
    ` repeatCount="${repeatCount}"${fill}/>`
  )
}

// ── Per-prop animation generation ────────────────────────────────────────────

type PropGetter = (el: Element, anim: AnimatableProps) => string | null

function buildAnim(
  el: Element,
  kfs: Keyframe[],
  totalFrames: number,
  fps: number,
  loop: boolean,
  attr: string,
  getter: PropGetter
): string {
  if (kfs.length < 1) return ''

  const sorted = [...kfs].sort((a, b) => a.frame - b.frame)
  const dur = totalFrames / fps

  // Gather all unique time points, include start (0) and end (totalFrames)
  const allFrames = [...new Set([0, ...sorted.map(k => k.frame), totalFrames])].sort((a, b) => a - b)

  const values: string[] = []
  const keyTimes: string[] = []

  for (const frame of allFrames) {
    const states = computeFrame([el], kfs, frame)
    const anim = states.get(el.id) ?? {}
    const v = getter(el, anim)
    if (v === null) return ''  // prop not available for this element type
    values.push(v)
    keyTimes.push(String(Math.round((frame / totalFrames) * 1e6) / 1e6))
  }

  // One spline per interval
  const splines: string[] = []
  for (let i = 0; i < allFrames.length - 1; i++) {
    // Find the keyframe that starts this interval (or nearest before)
    const frame = allFrames[i]
    const kf = [...sorted].reverse().find(k => k.frame <= frame) ?? sorted[0]
    splines.push(toSpline(kf.easing))
  }

  const p: AnimParam = { attr, values, keyTimes, splines, dur, loop }
  return makeAnimate(p)
}

function buildRotationAnim(
  el: Element,
  kfs: Keyframe[],
  totalFrames: number,
  fps: number,
  loop: boolean
): string {
  if (!kfs.some(k => k.props.rotation !== undefined)) return ''
  const sorted = [...kfs].sort((a, b) => a.frame - b.frame)
  const dur = totalFrames / fps
  const allFrames = [...new Set([0, ...sorted.map(k => k.frame), totalFrames])].sort((a, b) => a - b)

  const oxN = (el as any).transformOrigin?.x ?? 0.5
  const oyN = (el as any).transformOrigin?.y ?? 0.5
  const cx = el.x + oxN * el.width
  const cy = el.y + oyN * el.height

  const values: string[] = []
  const keyTimes: string[] = []

  for (const frame of allFrames) {
    const states = computeFrame([el], kfs, frame)
    const anim = states.get(el.id) ?? {}
    const rot = anim.rotation ?? el.rotation
    values.push(`${rot} ${cx} ${cy}`)
    keyTimes.push(String(Math.round((frame / totalFrames) * 1e6) / 1e6))
  }

  const splines: string[] = []
  for (let i = 0; i < allFrames.length - 1; i++) {
    const frame = allFrames[i]
    const kf = [...sorted].reverse().find(k => k.frame <= frame) ?? sorted[0]
    splines.push(toSpline(kf.easing))
  }

  return makeAnimateTransform({ attr: 'transform', values, keyTimes, splines, dur, loop }, 'rotate')
}

// ── Animated SVG builder ──────────────────────────────────────────────────────

function buildAnimatedElement(
  el: Element,
  keyframes: Keyframe[],
  totalFrames: number,
  fps: number,
  loop: boolean
): string {
  if (!el.visible) return ''
  if (el.type === 'video') return `<!-- video layer "${el.name}" exported as static placeholder --><rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="#111"/>`
  if (el.type === 'image') return serializeElement(el, {})  // image data URLs not available in animated path; renders placeholder

  const kfs = keyframes.filter(kf => kf.elementId === el.id)

  // Static element — serialize at frame 0
  if (kfs.length === 0) {
    return serializeElement(el, {})
  }

  // Render the base shape (at frame 0 state)
  const baseStates = computeFrame([el], kfs, 0)
  const base0 = baseStates.get(el.id) ?? {}
  const baseEl: Element = { ...el, ...base0 } as Element

  // Build the static SVG representation
  const baseShape = serializeElement(baseEl, {})

  // Strip closing </g> to inject SMIL animations
  if (!baseShape.endsWith('</g>')) return baseShape

  const hasAnim = (prop: keyof typeof kfs[0]['props']) =>
    kfs.some(k => k.props[prop] !== undefined)

  const anims: string[] = []

  // x / y position
  if (hasAnim('x')) {
    anims.push(buildAnim(el, kfs, totalFrames, fps, loop, 'x',
      (e, a) => {
        if (e.type === 'circle' || e.type === 'ellipse') return null // uses cx/cy
        return String(Math.round(((a.x ?? e.x) * 1000)) / 1000)
      }))
  }
  if (hasAnim('y')) {
    anims.push(buildAnim(el, kfs, totalFrames, fps, loop, 'y',
      (e, a) => {
        if (e.type === 'circle' || e.type === 'ellipse') return null
        return String(Math.round(((a.y ?? e.y) * 1000)) / 1000)
      }))
    // For circle/ellipse, animate cy
    if (el.type === 'circle' || el.type === 'ellipse') {
      anims.push(buildAnim(el, kfs, totalFrames, fps, loop, 'cy',
        (e, a) => String(Math.round(((a.y ?? e.y) + (a.height ?? e.height) / 2) * 1000) / 1000)))
    }
  }
  if (hasAnim('x') && (el.type === 'circle' || el.type === 'ellipse')) {
    anims.push(buildAnim(el, kfs, totalFrames, fps, loop, 'cx',
      (e, a) => String(Math.round(((a.x ?? e.x) + (a.width ?? e.width) / 2) * 1000) / 1000)))
  }

  // width / height
  if (hasAnim('width')) {
    if (el.type === 'rect') {
      anims.push(buildAnim(el, kfs, totalFrames, fps, loop, 'width',
        (e, a) => String(Math.round((a.width ?? e.width) * 1000) / 1000)))
    } else if (el.type === 'circle' || el.type === 'ellipse') {
      anims.push(buildAnim(el, kfs, totalFrames, fps, loop, 'rx',
        (e, a) => String(Math.round((a.width ?? e.width) / 2 * 1000) / 1000)))
    }
  }
  if (hasAnim('height')) {
    if (el.type === 'rect') {
      anims.push(buildAnim(el, kfs, totalFrames, fps, loop, 'height',
        (e, a) => String(Math.round((a.height ?? e.height) * 1000) / 1000)))
    } else if (el.type === 'circle' || el.type === 'ellipse') {
      anims.push(buildAnim(el, kfs, totalFrames, fps, loop, 'ry',
        (e, a) => String(Math.round((a.height ?? e.height) / 2 * 1000) / 1000)))
    }
  }

  // opacity
  if (hasAnim('opacity')) {
    anims.push(buildAnim(el, kfs, totalFrames, fps, loop, 'opacity',
      (e, a) => String(a.opacity ?? e.opacity)))
  }

  // fill color
  if (hasAnim('fillColor')) {
    anims.push(buildAnim(el, kfs, totalFrames, fps, loop, 'fill',
      (e, a) => {
        const fc = a.fillColor ?? (e.fills[0]?.visible ? e.fills[0].color : null)
        return fc ? `#${fc}` : 'none'
      }))
  }

  // stroke color
  if (hasAnim('strokeColor')) {
    anims.push(buildAnim(el, kfs, totalFrames, fps, loop, 'stroke',
      (e, a) => {
        const sc = a.strokeColor ?? (e.strokes[0]?.visible ? e.strokes[0].color : null)
        return sc ? `#${sc}` : 'none'
      }))
  }

  // corner radius (rect only)
  if (hasAnim('rx') && el.type === 'rect') {
    anims.push(buildAnim(el, kfs, totalFrames, fps, loop, 'rx',
      (e, a) => String(a.rx ?? (e as RectElement).rx)))
  }

  // path d
  if (hasAnim('d') && el.type === 'path') {
    anims.push(buildAnim(el, kfs, totalFrames, fps, loop, 'd',
      (e, a) => a.d ?? (e as PathElement).d ?? null))
  }

  // rotation (using animateTransform)
  if (hasAnim('rotation')) {
    anims.push(buildRotationAnim(el, kfs, totalFrames, fps, loop))
  }

  const filteredAnims = anims.filter(Boolean)
  if (filteredAnims.length === 0) return baseShape

  // Inject SMIL animations inside the outermost <g> wrapper
  // The baseShape ends with inner element + </g>
  const injectionPoint = baseShape.lastIndexOf('</g>')
  return (
    baseShape.slice(0, injectionPoint) +
    filteredAnims.join('') +
    '</g>'
  )
}

// ── Exporter ──────────────────────────────────────────────────────────────────

async function loadImageDataUrls(elements: Element[]): Promise<Map<string, string>> {
  const { getImageBlob, blobToDataUrl } = await import('@/lib/utils/videoStorage')
  const map = new Map<string, string>()
  const imageEls = elements.filter(el => el.type === 'image') as ImageElement[]
  await Promise.all(imageEls.map(async el => {
    try {
      const blob = await getImageBlob(el.imageStorageId)
      if (blob) map.set(el.imageStorageId, await blobToDataUrl(blob))
    } catch { /* skip */ }
  }))
  return map
}

export const SvgExporter: BaseExporter = {
  async export(payload: ExportPayload): Promise<string> {
    const { elements, keyframes, artboard, fps, totalFrames, options } = payload
    const opts = options as SvgExportOptions

    if (!opts.animated) {
      // Static: serialize at current frame (frame 0 for export)
      const states = computeFrame(elements, keyframes, 0)
      const imageDataUrls = await loadImageDataUrls(elements)
      return serializeFrame(elements, states, artboard, undefined, imageDataUrls)
    }

    // Animated SVG with SMIL
    const dur = totalFrames / fps
    const loop = opts.loop

    // Only animate top-level elements; group children are rendered by their group
    const childIds = new Set(
      elements.flatMap(el => el.type === 'group' ? (el as GroupElement).childIds : [])
    )
    const animatedElements = elements
      .filter(el => !childIds.has(el.id))
      .map(el => buildAnimatedElement(el, keyframes, totalFrames, fps, loop))
      .join('\n')

    const style = loop
      ? ''
      : `<style>svg { animation-fill-mode: forwards; }</style>`

    return (
      `<svg xmlns="http://www.w3.org/2000/svg" ` +
      `width="${artboard.width}" height="${artboard.height}" ` +
      `viewBox="0 0 ${artboard.width} ${artboard.height}" ` +
      `data-duration="${dur}s">\n` +
      `${style}\n` +
      `${animatedElements}\n` +
      `</svg>`
    )
  }
}

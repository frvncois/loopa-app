import type { EasingType } from '@/types/animation'

export type EasingFn = (t: number) => number

const c1 = 1.70158
const c3 = c1 + 1

export const Easing: Record<string, EasingFn> = {
  linear: (t) => t,

  'ease-in': (t) => t * t * t,
  'ease-out': (t) => 1 - Math.pow(1 - t, 3),
  'ease-in-out': (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

  'ease-in-cubic': (t) => t * t * t,
  'ease-out-cubic': (t) => 1 - Math.pow(1 - t, 3),
  'ease-in-out-cubic': (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

  'ease-in-back': (t) => c3 * t * t * t - c1 * t * t,
  'ease-out-back': (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
  'ease-in-out-back': (t) => {
    const c2 = c1 * 1.525
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (2 * t - 2) + c2) + 2) / 2
  },

  'ease-out-bounce': (t) => {
    const n1 = 7.5625, d1 = 2.75
    if (t < 1 / d1) return n1 * t * t
    if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75 }
    if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375 }
    t -= 2.625 / d1; return n1 * t * t + 0.984375
  },

  'ease-out-elastic': (t) => {
    if (t === 0 || t === 1) return t
    const c4 = (2 * Math.PI) / 3
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },

  spring: (t) => {
    return 1 - Math.exp(-8 * t) * Math.cos(2 * Math.PI * t * 0.5)
  },
}

function parseCubicBezier(s: string): EasingFn | null {
  const m = s.match(/^cubic-bezier\(([\d.]+),([\d.]+),([\d.]+),([\d.]+)\)$/)
  if (!m) return null
  return makeCubicBezier(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4]))
}

function parseSteps(s: string): EasingFn | null {
  const m = s.match(/^steps\((\d+)\)$/)
  if (!m) return null
  const n = parseInt(m[1])
  return (t) => Math.min(1, Math.floor(t * n) / n)
}

function makeCubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by

  function sampleX(t: number) { return ((ax * t + bx) * t + cx) * t }
  function sampleY(t: number) { return ((ay * t + by) * t + cy) * t }
  function slopeX(t: number) { return (3 * ax * t + 2 * bx) * t + cx }

  function getTFromX(x: number): number {
    let t = x
    for (let i = 0; i < 8; i++) {
      const sl = slopeX(t)
      if (Math.abs(sl) < 1e-6) break
      t -= (sampleX(t) - x) / sl
    }
    return t
  }

  return (t: number) => {
    if (t === 0 || t === 1) return t
    return sampleY(getTFromX(t))
  }
}

export function getEasingFn(easing: EasingType): EasingFn {
  if (easing in Easing) return Easing[easing]
  const bezier = parseCubicBezier(easing)
  if (bezier) return bezier
  const steps = parseSteps(easing)
  if (steps) return steps
  return Easing.linear
}

/** Sample N+1 points of an easing function for SVG visualization */
export function sampleEasing(easing: EasingType, steps = 24): Array<{ x: number; y: number }> {
  const fn = getEasingFn(easing)
  const pts: Array<{ x: number; y: number }> = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push({ x: t * 100, y: (1 - fn(t)) * 60 })
  }
  return pts
}

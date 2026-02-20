import type { Keyframe, AnimatableProps } from '@/types/animation'
import type { Element } from '@/types/elements'
import { getEasingFn } from './Easing'
import { interpolateNumber, interpolateColor } from './Interpolator'

const COLOR_PROPS = new Set<keyof AnimatableProps>(['fillColor', 'strokeColor'])

function interpolateProp(
  key: keyof AnimatableProps,
  a: AnimatableProps[typeof key],
  b: AnimatableProps[typeof key],
  t: number
): AnimatableProps[typeof key] {
  if (a === undefined) return b
  if (b === undefined) return a
  if (typeof a === 'number' && typeof b === 'number') {
    return interpolateNumber(a, b, t) as AnimatableProps[typeof key]
  }
  if (typeof a === 'string' && typeof b === 'string' && COLOR_PROPS.has(key)) {
    return interpolateColor(a, b, t) as AnimatableProps[typeof key]
  }
  // Non-interpolatable: snap at t >= 1
  return t < 1 ? a : b
}

/**
 * Compute the animated props for a single element at a given frame.
 * Pure function — no side effects.
 */
export function computeElementAtFrame(
  keyframes: Keyframe[],
  frame: number
): AnimatableProps {
  if (keyframes.length === 0) return {}

  const sorted = [...keyframes].sort((a, b) => a.frame - b.frame)

  if (frame <= sorted[0].frame) return { ...sorted[0].props }
  if (frame >= sorted[sorted.length - 1].frame) return { ...sorted[sorted.length - 1].props }

  // Find surrounding keyframes
  let prev = sorted[0]
  let next = sorted[1]
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].frame <= frame && sorted[i + 1].frame >= frame) {
      prev = sorted[i]
      next = sorted[i + 1]
      break
    }
  }

  const len = next.frame - prev.frame
  if (len === 0) return { ...prev.props }

  const rawT = (frame - prev.frame) / len
  const t = getEasingFn(prev.easing)(rawT)

  const result: AnimatableProps = {}
  const allKeys = new Set([
    ...Object.keys(prev.props),
    ...Object.keys(next.props),
  ]) as Set<keyof AnimatableProps>

  for (const key of allKeys) {
    const interpolated = interpolateProp(key, prev.props[key], next.props[key], t)
    if (interpolated !== undefined) {
      (result as Record<string, unknown>)[key] = interpolated
    }
  }

  return result
}

/**
 * Compute animated props for every element in a scene.
 * Returns a Map of elementId → AnimatableProps.
 */
export function computeFrame(
  elements: Element[],
  keyframes: Keyframe[],
  frame: number
): Map<string, AnimatableProps> {
  const result = new Map<string, AnimatableProps>()
  for (const el of elements) {
    const elKfs = keyframes.filter(kf => kf.elementId === el.id)
    if (elKfs.length > 0) {
      result.set(el.id, computeElementAtFrame(elKfs, frame))
    }
  }
  return result
}

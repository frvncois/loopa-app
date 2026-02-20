import { interpolateColor } from '@/lib/utils/color'

export function interpolateNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export { interpolateColor }

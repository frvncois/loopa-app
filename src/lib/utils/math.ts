export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function snapToGrid(val: number, gridSize: number): number {
  return Math.round(val / gridSize) * gridSize
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

export function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

export function radiansToDegrees(rad: number): number {
  return (rad * 180) / Math.PI
}

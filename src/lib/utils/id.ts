export function generateId(prefix = 'el'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 10)}`
}

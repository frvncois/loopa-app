export function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`[Loopa] localStorage write failed for key "${key}":`, e)
  }
}

export function lsRemove(key: string): void {
  localStorage.removeItem(key)
}

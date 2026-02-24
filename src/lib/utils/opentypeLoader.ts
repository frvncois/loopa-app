let _promise: Promise<any> | null = null

export function loadOpentype(): Promise<any> {
  if (_promise) return _promise
  _promise = new Promise<any>((resolve, reject) => {
    if ((window as any).opentype) {
      resolve((window as any).opentype)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js'
    script.onload = () => resolve((window as any).opentype)
    script.onerror = () => {
      _promise = null
      reject(new Error('Failed to load opentype.js'))
    }
    document.head.appendChild(script)
  })
  return _promise
}

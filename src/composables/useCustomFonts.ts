import { ref } from 'vue'
import { generateId } from '@/lib/utils/id'
import {
  loadFontMeta,
  saveFontMeta,
  storeFontBlob,
  getFontBlob,
  deleteFontBlobs,
  type FontMeta,
} from '@/lib/utils/fontStorage'
import { loadOpentype } from '@/lib/utils/opentypeLoader'

export type { FontMeta }

export const BUILTIN_FONTS: readonly string[] = [
  'DM Sans', 'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
  'Poppins', 'Raleway', 'Nunito', 'Source Sans 3', 'Ubuntu',
  'Playfair Display', 'Merriweather', 'Lora', 'EB Garamond',
  'JetBrains Mono', 'Fira Code', 'Space Mono',
]

// Module-level caches — shared across instances
const _loadedGoogle = new Set<string>()
const _buffers = new Map<string, ArrayBuffer>() // fontMeta.id → buffer

export function useCustomFonts() {
  const customFonts = ref<FontMeta[]>(loadFontMeta())

  async function loadAll(): Promise<void> {
    for (const meta of customFonts.value) {
      await _registerCustomFont(meta)
    }
  }

  async function _registerCustomFont(meta: FontMeta): Promise<void> {
    const blob = await getFontBlob(meta.id)
    if (!blob) return
    const buffer = await blob.arrayBuffer()
    _buffers.set(meta.id, buffer)
    const dataUrl = await _blobToDataUrl(blob)
    try {
      const face = new FontFace(meta.family, `url(${dataUrl})`, {
        weight: String(meta.weight),
        style: meta.style,
      })
      await face.load()
      document.fonts.add(face)
    } catch {
      // Silently ignore — font may already be registered
    }
  }

  async function addFont(file: File): Promise<FontMeta | null> {
    try {
      const opentype = await loadOpentype()
      const buffer = await file.arrayBuffer()
      const font = opentype.parse(buffer)
      const family =
        font.names.preferredFamily?.en ??
        font.names.fontFamily?.en ??
        file.name.replace(/\.[^.]+$/, '')
      const subfam = (
        font.names.preferredSubfamily?.en ??
        font.names.fontSubfamily?.en ??
        ''
      ).toLowerCase()
      let weight = 400
      if (subfam.includes('extralight') || subfam.includes('extra light')) weight = 200
      else if (subfam.includes('extrabold') || subfam.includes('extra bold')) weight = 800
      else if (subfam.includes('semibold') || subfam.includes('semi bold')) weight = 600
      else if (subfam.includes('black') || subfam.includes('heavy')) weight = 900
      else if (subfam.includes('bold')) weight = 700
      else if (subfam.includes('medium')) weight = 500
      else if (subfam.includes('light')) weight = 300
      else if (subfam.includes('thin')) weight = 100
      const style: 'normal' | 'italic' = subfam.includes('italic') ? 'italic' : 'normal'

      const id = generateId('font')
      const blob = new Blob([buffer], { type: 'font/opentype' })
      await storeFontBlob(id, blob)
      const meta: FontMeta = { id, family, weight, style, fileName: file.name }
      customFonts.value.push(meta)
      _buffers.set(id, buffer)
      saveFontMeta(customFonts.value)

      const dataUrl = await _blobToDataUrl(blob)
      const face = new FontFace(family, `url(${dataUrl})`, {
        weight: String(weight),
        style,
      })
      await face.load()
      document.fonts.add(face)
      return meta
    } catch (err) {
      console.error('Failed to load font:', err)
      return null
    }
  }

  async function removeFont(id: string): Promise<void> {
    customFonts.value = customFonts.value.filter(f => f.id !== id)
    _buffers.delete(id)
    saveFontMeta(customFonts.value)
    await deleteFontBlobs([id])
  }

  async function loadGoogleFont(family: string): Promise<void> {
    if (_loadedGoogle.has(family)) return
    _loadedGoogle.add(family)
    const slug = encodeURIComponent(family).replace(/%20/g, '+')
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${slug}:wght@300;400;500;600;700&display=swap`
    document.head.appendChild(link)
  }

  async function getFontBuffer(family: string, weight = 400): Promise<ArrayBuffer | null> {
    // Exact weight match first, then closest weight
    const byFamily = customFonts.value.filter(
      f => f.family.toLowerCase() === family.toLowerCase()
    )
    const exact = byFamily.find(f => f.weight === weight)
    const meta = exact ?? byFamily.sort((a, b) => Math.abs(a.weight - weight) - Math.abs(b.weight - weight))[0]
    if (!meta) return null
    if (_buffers.has(meta.id)) return _buffers.get(meta.id)!
    const blob = await getFontBlob(meta.id)
    if (!blob) return null
    const buf = await blob.arrayBuffer()
    _buffers.set(meta.id, buf)
    return buf
  }

  return {
    customFonts,
    loadAll,
    addFont,
    removeFont,
    loadGoogleFont,
    getFontBuffer,
    BUILTIN_FONTS,
  }
}

function _blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

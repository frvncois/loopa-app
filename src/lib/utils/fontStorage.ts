import { storeImage, getImageBlob, deleteMediaBulk } from './videoStorage'

export interface FontMeta {
  id: string
  family: string
  weight: number
  style: 'normal' | 'italic'
  fileName: string
}

const FONT_META_KEY = 'loopa_fonts'

export function loadFontMeta(): FontMeta[] {
  try {
    return JSON.parse(localStorage.getItem(FONT_META_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveFontMeta(fonts: FontMeta[]): void {
  localStorage.setItem(FONT_META_KEY, JSON.stringify(fonts))
}

export async function storeFontBlob(id: string, blob: Blob): Promise<void> {
  return storeImage(`font_${id}`, blob)
}

export async function getFontBlob(id: string): Promise<Blob | null> {
  return getImageBlob(`font_${id}`)
}

export async function deleteFontBlobs(ids: string[]): Promise<void> {
  return deleteMediaBulk(ids.map(id => `font_${id}`))
}

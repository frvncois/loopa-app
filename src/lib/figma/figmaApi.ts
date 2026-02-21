/**
 * figmaApi.ts — Figma REST API calls routed through the Cloudflare Worker proxy.
 * The proxy forwards requests to api.figma.com, injecting client credentials.
 */

import { ensureValidToken, refreshToken } from './figmaAuth'

const PROXY_URL = import.meta.env.VITE_FIGMA_PROXY_URL as string

// ── Types returned by the Figma API ───────────────────────────

export interface FigmaFill {
  type:     'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE' | string
  visible?: boolean
  opacity?: number
  color?:   { r: number; g: number; b: number; a: number }
}

export interface FigmaStroke {
  type:     string
  visible?: boolean
  color?:   { r: number; g: number; b: number; a: number }
}

export interface FigmaEffect {
  type:     'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR' | string
  visible:  boolean
  radius:   number
  spread?:  number
  offset?:  { x: number; y: number }
  color?:   { r: number; g: number; b: number; a: number }
}

export interface FigmaTextStyle {
  fontFamily:          string
  fontSize:            number
  fontWeight:          number
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'
  lineHeightPx:        number
  letterSpacing:       number
}

export interface FigmaPathData {
  path:      string
  windingRule: string
}

export interface FigmaNode {
  id:                   string
  name:                 string
  type:                 string
  absoluteBoundingBox:  { x: number; y: number; width: number; height: number } | null
  absoluteRenderBounds: { x: number; y: number; width: number; height: number } | null
  fills:                FigmaFill[]
  strokes:              FigmaStroke[]
  strokeWeight?:        number
  opacity?:             number
  rotation?:            number
  cornerRadius?:        number
  rectangleCornerRadii?: [number, number, number, number]
  characters?:          string
  style?:               FigmaTextStyle
  fillGeometry?:        FigmaPathData[]
  strokeGeometry?:      FigmaPathData[]
  children?:            FigmaNode[]
  effects?:             FigmaEffect[]
  blendMode?:           string
  clipsContent?:        boolean
  isMask?:              boolean
  visible?:             boolean
}

export interface FigmaFileResponse {
  nodes: Record<string, { document: FigmaNode }>
  err?:  string
}

export interface FigmaImageResponse {
  images: Record<string, string | null>
  err?:   string
}

export interface FigmaFrameInfo {
  id:                  string
  name:                string
  type:                string
  absoluteBoundingBox: { x: number; y: number; width: number; height: number } | null
}

export interface FigmaPage {
  id:       string
  name:     string
  type:     string
  children: FigmaFrameInfo[]
}

export interface FigmaFileData {
  name:     string
  document: { children: FigmaPage[] }
}

// ── Core fetch helper ──────────────────────────────────────────

export async function figmaFetch(path: string): Promise<unknown> {
  // Always call ensureValidToken() per request — it reads fresh from
  // localStorage every time so it picks up tokens saved by the OAuth popup.
  let token = await ensureValidToken()

  async function attempt(accessToken: string): Promise<Response> {
    return fetch(`${PROXY_URL}/api/${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }

  let res = await attempt(token)

  if (res.status === 401) {
    // Try refreshing once
    try {
      const refreshed = await refreshToken()
      token = refreshed.access_token
      res = await attempt(token)
    } catch {
      throw new Error('Figma session expired — please reconnect')
    }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    throw new Error(`Figma API error ${res.status}: ${body}`)
  }

  return res.json()
}

// ── Specific API calls ─────────────────────────────────────────

export async function getFileNodes(fileKey: string, nodeIds: string[]): Promise<FigmaFileResponse> {
  const ids = encodeURIComponent(nodeIds.join(','))
  return figmaFetch(`files/${fileKey}/nodes?ids=${ids}`) as Promise<FigmaFileResponse>
}

export async function getFileMeta(fileKey: string): Promise<{ name: string; lastModified: string }> {
  const data = await figmaFetch(`files/${fileKey}?depth=1`) as { name: string; lastModified: string }
  return data
}

export async function getFileImages(
  fileKey: string,
  nodeIds: string[],
  format: 'svg' | 'png' | 'jpg' = 'svg'
): Promise<FigmaImageResponse> {
  const ids = encodeURIComponent(nodeIds.join(','))
  return figmaFetch(`images/${fileKey}?ids=${ids}&format=${format}`) as Promise<FigmaImageResponse>
}

export async function getFileStructure(fileKey: string): Promise<FigmaFileData> {
  return figmaFetch(`files/${fileKey}?depth=2`) as Promise<FigmaFileData>
}

// ── URL parsing ────────────────────────────────────────────────

export function parseFigmaUrl(url: string): { fileKey: string; nodeId: string | null } | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('figma.com')) return null

    // Match /design/FILEKEY/... or /file/FILEKEY/...
    const match = u.pathname.match(/\/(?:design|file)\/([A-Za-z0-9_-]+)/)
    if (!match) return null

    const fileKey = match[1]
    const rawNodeId = u.searchParams.get('node-id')
    // Figma URL uses "21-2" format; API wants "21:2"
    const nodeId = rawNodeId ? rawNodeId.replace(/-/g, ':') : null

    return { fileKey, nodeId }
  } catch {
    return null
  }
}

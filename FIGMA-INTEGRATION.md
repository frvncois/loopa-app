# Figma Integration — Claude Code Instructions

Read MASTER.md for project context. This adds Figma OAuth + link-based import.

## Architecture

```
User clicks "Connect with Figma"
  → Popup opens: https://www.figma.com/oauth?client_id=XXX&redirect_uri=XXX&scope=files:read
  → User approves
  → Figma redirects to /auth/figma/callback?code=ABC123
  → Frontend sends code to Cloudflare Worker
  → Worker exchanges code → access_token (using client_secret)
  → Frontend stores access_token in localStorage
  → Done. User is connected.

User pastes Figma link
  → Frontend parses file key + node IDs from URL
  → Calls Worker proxy: GET /api/files/{key}/nodes?ids={nodeIds}
  → Worker forwards to Figma API with user's access_token
  → Frontend receives Figma node tree
  → FigmaNodeConverter maps nodes → Loopa elements
  → Elements added to canvas
```

## Environment Config

Add to your .env.local (gitignored):
```
VITE_FIGMA_CLIENT_ID=your-client-id-here
VITE_FIGMA_PROXY_URL=https://loopa-figma-proxy.your-subdomain.workers.dev
```

For local dev, proxy URL can be http://localhost:8787 (wrangler dev).

## Implementation — Build in this order:

### 1. src/lib/figma/figmaAuth.ts

```ts
const FIGMA_AUTH_URL = 'https://www.figma.com/oauth'
const PROXY_URL = import.meta.env.VITE_FIGMA_PROXY_URL
const CLIENT_ID = import.meta.env.VITE_FIGMA_CLIENT_ID
const REDIRECT_URI = `${window.location.origin}/auth/figma/callback`
const STORAGE_KEY = 'loopa_figma_token'

interface FigmaTokens {
  access_token: string
  refresh_token: string
  expires_at: number  // timestamp
  user_id: string
}

export function getFigmaTokens(): FigmaTokens | null
// Read from localStorage. Check if expired.

export function saveFigmaTokens(tokens: FigmaTokens): void
// Write to localStorage

export function clearFigmaTokens(): void

export function isConnected(): boolean
// Returns true if tokens exist and access_token not expired

export function getAuthUrl(state?: string): string
// Returns: https://www.figma.com/oauth?client_id=XXX&redirect_uri=XXX&scope=files:read&state=XXX&response_type=code

export async function exchangeCode(code: string): Promise<FigmaTokens>
// POST to PROXY_URL/auth/token with { code, redirect_uri }
// Save tokens with expires_at = Date.now() + expires_in * 1000

export async function refreshToken(): Promise<FigmaTokens>
// POST to PROXY_URL/auth/refresh with { refresh_token }
// Called automatically when access_token is expired but refresh_token exists

export async function ensureValidToken(): Promise<string>
// If token valid → return access_token
// If expired but refresh_token exists → refresh → return new access_token
// If no tokens → throw Error('Not connected')
```

### 2. src/lib/figma/figmaApi.ts

```ts
const PROXY_URL = import.meta.env.VITE_FIGMA_PROXY_URL

export async function figmaFetch(path: string): Promise<any>
// Calls ensureValidToken() to get access_token
// GET PROXY_URL/api/{path} with Authorization: Bearer {access_token}
// If 401 response → try refresh → retry once
// If still 401 → throw, UI shows "Reconnect with Figma"

export async function getFileNodes(fileKey: string, nodeIds: string[]): Promise<FigmaFileResponse>
// figmaFetch(`files/${fileKey}/nodes?ids=${nodeIds.join(',')}`)

export async function getFileImages(fileKey: string, nodeIds: string[], format = 'svg'): Promise<FigmaImageResponse>
// figmaFetch(`images/${fileKey}?ids=${nodeIds.join(',')}&format=${format}`)
// Fallback strategy: if node conversion is too complex, we can export nodes as SVG
// and run them through our existing SvgImporter

export function parseFigmaUrl(url: string): { fileKey: string; nodeId: string | null } | null
// Parse these URL patterns:
//   https://www.figma.com/design/FILEKEY/Title?node-id=21-2&...
//   https://www.figma.com/file/FILEKEY/Title?node-id=21-2&...
//   https://www.figma.com/design/FILEKEY/Title?node-id=21-2&m=dev&...
// Extract fileKey from path segment, nodeId from ?node-id= param
// node-id format: "21-2" → API wants "21:2" (replace - with :)
// Return null if URL doesn't match Figma pattern
```

### 3. src/lib/figma/FigmaNodeConverter.ts

This maps Figma's node tree to Loopa elements. Figma nodes have this structure:

```ts
interface FigmaNode {
  id: string
  name: string
  type: 'FRAME' | 'RECTANGLE' | 'ELLIPSE' | 'LINE' | 'TEXT' | 'VECTOR' | 'GROUP' | 'BOOLEAN_OPERATION' | 'COMPONENT' | 'INSTANCE' | ...
  absoluteBoundingBox: { x: number; y: number; width: number; height: number }
  absoluteRenderBounds: { x: number; y: number; width: number; height: number } | null
  fills: FigmaFill[]
  strokes: FigmaStroke[]
  strokeWeight: number
  opacity: number
  rotation: number  // in degrees
  cornerRadius?: number
  rectangleCornerRadii?: [number, number, number, number]
  characters?: string  // text content
  style?: FigmaTextStyle
  fillGeometry?: FigmaPathData[]  // vector paths
  strokeGeometry?: FigmaPathData[]
  children?: FigmaNode[]
  effects: FigmaEffect[]
  blendMode: string
  clipsContent: boolean
}

interface FigmaFill {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE'
  visible: boolean
  opacity: number
  color?: { r: number; g: number; b: number; a: number }  // 0-1 range
}

interface FigmaEffect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR'
  visible: boolean
  radius: number
  offset?: { x: number; y: number }
  color?: { r: number; g: number; b: number; a: number }
}
```

Implement:

```ts
export function convertFigmaNodes(
  nodes: Record<string, { document: FigmaNode }>,
  targetArtboard: { width: number; height: number }
): ImportResult

// For each node in the tree:
//   RECTANGLE → RectElement
//     Map absoluteBoundingBox → x, y, width, height
//     Map fills[0] (if SOLID) → fills[0].color (convert 0-1 RGB to hex)
//     Map strokes + strokeWeight
//     Map cornerRadius or rectangleCornerRadii
//     Map effects → shadows (DROP_SHADOW) and blur (LAYER_BLUR)
//     Map opacity, rotation, blendMode
//
//   ELLIPSE → CircleElement or EllipseElement
//     Circle if width === height, else ellipse
//
//   TEXT → TextElement
//     Map characters → text
//     Map style.fontFamily, style.fontSize, style.fontWeight
//     Map style.textAlignHorizontal → textAlign
//     Map style.lineHeightPx → lineHeight ratio
//     Map style.letterSpacing → letterSpacing
//
//   VECTOR / BOOLEAN_OPERATION → PathElement
//     Use fillGeometry[0].path → parse as SVG d string
//     Run through existing PathParser to get PathPoint[]
//
//   FRAME / GROUP → Recurse into children, flatten (don't create group elements)
//     Offset children positions relative to parent's absoluteBoundingBox
//
//   COMPONENT / INSTANCE → Treat same as FRAME (flatten)
//
// Center all elements relative to targetArtboard
// Collect warnings for: gradients (simplified to first color), images (dropped), masks (dropped)
```

### 4. src/views/FigmaCallbackView.vue

```
Minimal view — user never really "sees" this. Mounted when Figma redirects to /auth/figma/callback?code=XXX

On mount:
  1. Parse code from URL query params
  2. Call figmaAuth.exchangeCode(code)
  3. On success: window.close() if opened as popup, or router.push('/') if navigated directly
  4. On error: show error message with "Try again" button

This is just a landing page for the OAuth redirect.
```

### 5. Update src/router/index.ts

Add route:
```ts
{
  path: '/auth/figma/callback',
  name: 'FigmaCallback',
  component: () => import('@/views/FigmaCallbackView.vue'),
  meta: { guest: false, auth: false }  // accessible regardless of auth state
}
```

### 6. src/composables/useFigmaImport.ts

```ts
export function useFigmaImport() {
  const isConnected = ref(figmaAuth.isConnected())
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const preview = ref<{ nodeCount: number; nodeName: string; thumbnail: string | null } | null>(null)

  function connect(): void
  // Opens Figma OAuth in a popup window (600x700)
  // const popup = window.open(figmaAuth.getAuthUrl(), 'figma-auth', 'width=600,height=700')
  // Poll popup.closed every 500ms
  // When popup closes, check if tokens now exist → update isConnected

  function disconnect(): void
  // Clear tokens, update isConnected

  async function importFromLink(figmaUrl: string): Promise<ImportResult>
  // 1. parseFigmaUrl(figmaUrl) → { fileKey, nodeId }
  // 2. If no nodeId, fetch file root and let user pick a frame (or just import the first page)
  // 3. getFileNodes(fileKey, [nodeId]) → Figma node tree
  // 4. convertFigmaNodes(nodes, artboard) → ImportResult
  // 5. Add elements to editorStore, select them, save history
  // 6. Return result with warnings

  async function previewLink(figmaUrl: string): Promise<void>
  // Quick check: parse URL, fetch node metadata (name, child count)
  // Optionally fetch thumbnail via getFileImages
  // Set preview ref for UI display

  return { isConnected, isLoading, error, preview, connect, disconnect, importFromLink, previewLink }
}
```

### 7. Update components/modals/ImportModal.vue — Figma Tab

Replace the "Coming Soon" stub in the Figma tab with:

```
TWO STATES:

State A — Not connected:
  Icon: Figma logo
  Text: "Connect your Figma account to import layers directly from any Figma file"
  Button: "Connect with Figma" (accent style, Figma logo icon)
  Subtext: "We only request read access to your files" in text-4

State B — Connected:
  Header: "Connected to Figma" with green dot + "Disconnect" ghost button
  
  Input field: "Paste a Figma link..." (full width)
    On paste/enter → call previewLink()
  
  Preview area (shown after link parsed):
    Frame name from Figma
    "N layers found"
    Thumbnail image if available
    Warning list (same pattern as SVG import)
  
  Footer: Cancel / "Import N layers" accent button

  Loading state: spinner + "Fetching from Figma..." during API call
  Error state: red banner with message + "Try again" link
```

### 8. Fallback Strategy — SVG Image Export

Some Figma nodes are complex (boolean operations, masks, nested components with overrides). For these, instead of failing, use the images endpoint:

```ts
// In FigmaNodeConverter, when a node is too complex:
async function fallbackToSvgExport(fileKey: string, nodeId: string): Promise<Element[]> {
  const images = await getFileImages(fileKey, [nodeId], 'svg')
  const svgUrl = images.images[nodeId]
  if (!svgUrl) return []
  const svgResponse = await fetch(svgUrl)
  const svgString = await svgResponse.text()
  return SvgImporter.importSvg(svgString).elements
}
```

This means even complex Figma designs import correctly — they just lose editability on the complex parts (imported as flattened paths instead of structured shapes).

### 9. Update CLAUDE.md

Add to project conventions:
- Figma integration uses OAuth with a Cloudflare Worker proxy at VITE_FIGMA_PROXY_URL
- Figma tokens stored in localStorage under loopa_figma_token
- All Figma API calls go through the proxy, never direct
- FigmaNodeConverter is the primary import path; SvgImporter is the fallback for complex nodes

## Test Plan

1. Click "Connect with Figma" → Figma OAuth popup opens
2. Approve access → popup closes, tab shows "Connected"
3. Copy a Figma frame link → paste in the input
4. Preview shows frame name and layer count
5. Click Import → elements appear on canvas with correct positions, fills, strokes
6. Refresh page → still connected (tokens persisted)
7. Test with a complex Figma file (auto-layout, components, boolean ops) → verify fallback works
8. Disconnect → tokens cleared, tab returns to "Connect" state
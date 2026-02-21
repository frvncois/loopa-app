export type ElementType = 'rect' | 'circle' | 'ellipse' | 'line' | 'polygon' | 'star' | 'text' | 'path' | 'group' | 'video' | 'image'

export interface FillEntry {
  id: string
  visible: boolean
  type: 'solid' | 'linear' | 'radial' | 'none'
  color: string          // hex
  opacity: number        // 0-1
}

export interface StrokeEntry {
  id: string
  visible: boolean
  color: string
  width: number
  position: 'center' | 'inside' | 'outside'
  cap: 'butt' | 'round' | 'square'
  join: 'miter' | 'round' | 'bevel'
  dashArray: number[]
  dashOffset: number
}

export interface ShadowEntry {
  id: string
  visible: boolean
  color: string
  opacity: number
  x: number
  y: number
  blur: number
  spread: number
}

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'

export interface BaseElement {
  id: string
  type: ElementType
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scaleX: number
  scaleY: number
  opacity: number
  blendMode: BlendMode
  fills: FillEntry[]
  strokes: StrokeEntry[]
  shadows: ShadowEntry[]
  blur: number
  visible: boolean
  locked: boolean
  flipX: boolean
  flipY: boolean
  figmaNodeId?: string   // set when element was imported from Figma; used for sync
  // Mask feature: one element clips others
  isMask?: boolean
  maskedElementIds?: string[]
  maskedById?: string | null
  // Crop feature: per-element rectangular self-crop
  cropRect?: { x: number; y: number; width: number; height: number } | null
  // Transform origin (normalized 0-1, default center { x: 0.5, y: 0.5 })
  transformOrigin?: { x: number; y: number }
}

export interface RectElement extends BaseElement {
  type: 'rect'
  rx: number
  ry: number
  radiusTopLeft: number
  radiusTopRight: number
  radiusBottomRight: number
  radiusBottomLeft: number
  radiusLinked: boolean
}

export interface CircleElement extends BaseElement {
  type: 'circle'
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse'
}

export interface LineElement extends BaseElement {
  type: 'line'
}

export interface PolygonElement extends BaseElement {
  type: 'polygon'
  sides: number
}

export interface StarElement extends BaseElement {
  type: 'star'
  starPoints: number
  innerRadius: number
}

export interface TextElement extends BaseElement {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
  fontWeight: number
  textAlign: 'left' | 'center' | 'right' | 'justify'
  verticalAlign: 'top' | 'middle' | 'bottom'
  lineHeight: number
  letterSpacing: number
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  textDecoration: 'none' | 'underline' | 'line-through'
}

export interface PathPoint {
  id: string
  x: number
  y: number
  handleIn: { x: number; y: number } | null
  handleOut: { x: number; y: number } | null
  type: 'corner' | 'smooth' | 'symmetric'
}

export interface PathElement extends BaseElement {
  type: 'path'
  points: PathPoint[]
  closed: boolean
  d: string
  fillRule: 'nonzero' | 'evenodd'
}

export interface GroupElement extends BaseElement {
  type: 'group'
  childIds: string[]
}

export interface VideoElement extends BaseElement {
  type: 'video'
  videoStorageId: string  // IndexedDB key
  fileName: string
  fileSize: number        // bytes
  duration: number        // seconds
  naturalWidth: number
  naturalHeight: number
  trimStart: number       // seconds
  trimEnd: number         // seconds
  fit: 'cover' | 'contain' | 'fill'
  playbackRate: number    // 0.25–4
}

export interface ImageFilters {
  brightness: number   // 0–200, default 100
  contrast: number     // 0–200, default 100
  saturation: number   // 0–200, default 100
  hue: number          // -180 to 180, default 0
  grayscale: number    // 0–100, default 0
}

export interface ImageElement extends BaseElement {
  type: 'image'
  imageStorageId: string
  imageFileName: string
  imageFileSize: number
  imageWidth: number
  imageHeight: number
  objectFit: 'contain' | 'cover' | 'fill'
  imageFilters?: ImageFilters
}

export type Element =
  | RectElement | CircleElement | EllipseElement | LineElement
  | PolygonElement | StarElement | TextElement | PathElement
  | GroupElement | VideoElement | ImageElement

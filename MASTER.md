# LOOPA — SVG Animator: Master Build Document

> **This file is the single source of truth for building Loopa.**
> Read this ENTIRE document before writing any code.
> Follow the build phases IN ORDER. Do not skip ahead.
> Match the visual design EXACTLY as specified in the design tokens and component descriptions.

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Design Tokens & Visual Language](#3-design-tokens--visual-language)
4. [Type Definitions](#4-type-definitions)
5. [Project Structure](#5-project-structure)
6. [Store Contracts](#6-store-contracts)
7. [Composable Contracts](#7-composable-contracts)
8. [Component Specifications](#8-component-specifications)
9. [Lib Modules](#9-lib-modules)
10. [Views](#10-views)
11. [Routing & Auth](#11-routing--auth)
12. [Keyboard Shortcuts](#12-keyboard-shortcuts)
13. [Build Phases](#13-build-phases)

---

## 1. PROJECT OVERVIEW

**Loopa** is a browser-based keyframe animation tool for SVG/motion graphics. It has a Webflow-inspired dark UI with a Design/Animate panel paradigm. Local-first, no backend, uses localStorage for persistence.

### Core Features
- Three views: Login, Dashboard (project CRUD), Project Editor
- Canvas with pan/zoom, grid, snap-to-grid
- Create shapes: rect, circle, ellipse, line, polygon, star, text, path (pen tool)
- Multi-select (Shift+click, marquee)
- Keyframe-based animation with timeline
- Design panel: Layout, Fill, Stroke, Shadow, Blur, Opacity (Webflow-style inspector)
- Animate panel: Playback settings, quick presets, easing curve editor, keyframe list
- Onion skinning
- Undo/redo (snapshot-based)
- Copy/paste across projects
- Import SVG (with Figma export support)
- Export: Lottie JSON, Video (MP4), WebM, SVG+CSS
- Resizable panels
- Pen tool with bezier path editing

### Auth
Hardcoded credentials: `test@test.com` / `1234`. Stored in localStorage as a boolean flag.

---

## 2. TECH STACK & DEPENDENCIES

### package.json

```json
{
  "name": "loopa",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4",
    "vue-router": "^4.3",
    "pinia": "^2.2"
  },
  "devDependencies": {
    "typescript": "~5.4",
    "vite": "^5.4",
    "@vitejs/plugin-vue": "^5.0",
    "vue-tsc": "^2.0"
  }
}
```

**NO other dependencies.** No Tailwind, no component libraries, no icon libraries. Everything is hand-built with scoped CSS and inline SVG icons. `lottie-web` will be dynamically imported only in the export preview — do NOT add it to package.json.

### vite.config.ts

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
```

### tsconfig.app.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "env.d.ts"]
}
```

---

## 3. DESIGN TOKENS & VISUAL LANGUAGE

This is the EXACT visual language. Every component must use these tokens. Do NOT deviate.

### Font Imports (in typography.css)

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

### variables.css

```css
:root {
  /* ── Surfaces ── */
  --bg-0: #0c0c0f;
  --bg-1: #111114;
  --bg-2: #17171b;
  --bg-3: #1c1c22;
  --bg-4: #222229;
  --bg-5: #2a2a33;
  --bg-6: #33333e;

  /* ── Borders ── */
  --border: #252530;
  --border-l: #2e2e3a;
  --border-focus: #4353ff;

  /* ── Text ── */
  --text-1: #ededf0;
  --text-2: #a0a0ae;
  --text-3: #6a6a7e;
  --text-4: #4a4a5c;

  /* ── Accent ── */
  --accent: #4353ff;
  --accent-h: #5c6aff;
  --accent-s: rgba(67, 83, 255, 0.10);
  --accent-g: rgba(67, 83, 255, 0.22);

  /* ── Semantic ── */
  --green: #34d399;
  --yellow: #fbbf24;
  --red: #f87171;
  --red-s: rgba(248, 113, 113, 0.12);

  /* ── Typography ── */
  --font: 'DM Sans', system-ui, sans-serif;
  --mono: 'JetBrains Mono', monospace;

  /* ── Transitions ── */
  --ease: 140ms cubic-bezier(0.4, 0, 0.2, 1);

  /* ── Radii ── */
  --r-sm: 0.25rem;
  --r-md: 0.375rem;
  --r-lg: 0.625rem;

  /* ── Layout ── */
  --topbar-h: 2.75rem;
  --toolbar-h: 2.375rem;
  --panel-l-default: 14.5rem;
  --panel-l-min: 11.25rem;
  --panel-l-max: 21.25rem;
  --panel-r-default: 16rem;
  --panel-r-min: 13.75rem;
  --panel-r-max: 23.75rem;
  --timeline-default: 11.25rem;
  --timeline-min: 7.5rem;
  --timeline-max: 23.75rem;
}
```

### reset.css

```css
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; overflow: hidden; }
body {
  font-family: var(--font);
  background: var(--bg-0);
  color: var(--text-1);
  font-size: 12px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}
input, select, button, textarea { font-family: inherit; font-size: inherit; }
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-l); border-radius: 3px; }
```

### Key Visual Rules

1. **Font sizes**: Labels = 11px. Inputs = 11px mono. Section titles = 11px semibold. Panel headers = 10px uppercase 600 weight with 0.6px letter-spacing.
2. **Input height**: 26px for inspector inputs. 22px for timeline/compact inputs.
3. **Section padding**: 10px top/bottom, 12px left/right. Separated by 1px `var(--border)` bottom border.
4. **Button height**: 26px default, 24px small, 20px xs.
5. **Color inputs**: Swatch (26x26) + hex text input in a combined field with shared border.
6. **Inspector labels**: 72px fixed width, left-aligned, `var(--text-3)`.
7. **Checkbox title rows**: Section headers like Fill, Stroke, Shadow use a checkbox + label as the title. When unchecked, section content is hidden and the label is `var(--text-3)`.
8. **No emojis, no rounded pill shapes, no gradients on buttons.** Clean, flat, Webflow-like.

---

## 4. TYPE DEFINITIONS

### src/types/elements.ts

```ts
export type ElementType = 'rect' | 'circle' | 'ellipse' | 'line' | 'polygon' | 'star' | 'text' | 'path'

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
  clipContent: boolean
  flipX: boolean
  flipY: boolean
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

export type Element =
  | RectElement | CircleElement | EllipseElement | LineElement
  | PolygonElement | StarElement | TextElement | PathElement
```

### src/types/animation.ts

```ts
import type { PathPoint } from './elements'

export type EasingPreset =
  | 'linear'
  | 'ease-in' | 'ease-out' | 'ease-in-out'
  | 'ease-in-cubic' | 'ease-out-cubic' | 'ease-in-out-cubic'
  | 'ease-in-back' | 'ease-out-back' | 'ease-in-out-back'
  | 'ease-out-bounce' | 'ease-out-elastic'
  | 'spring'

export type EasingType = EasingPreset | `steps(${number})` | `cubic-bezier(${number},${number},${number},${number})`

export interface AnimatableProps {
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  scaleX?: number
  scaleY?: number
  opacity?: number
  rx?: number
  fillColor?: string
  strokeColor?: string
  strokeWidth?: number
  fontSize?: number
  d?: string
  points?: PathPoint[]
}

export interface Keyframe {
  id: string
  elementId: string
  frame: number
  props: AnimatableProps
  easing: EasingType
  easingCurve?: { x1: number; y1: number; x2: number; y2: number }
}

export interface ComputedElementState {
  elementId: string
  props: Required<AnimatableProps>
}

export type PlaybackDirection = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'

export interface OnionSkinSettings {
  enabled: boolean
  framesBefore: number
  framesAfter: number
  opacityBefore: number
  opacityAfter: number
  colorBefore: string
  colorAfter: string
  interval: number
  scope: 'selected' | 'all'
}

export interface AnimationPreset {
  id: string
  name: string
  icon: string
  category: 'entrance' | 'exit' | 'emphasis' | 'motion'
  generate: (elementId: string, startFrame: number, durationFrames: number, easing: EasingType) => Keyframe[]
}
```

### src/types/project.ts

```ts
import type { Element } from './elements'
import type { Keyframe } from './animation'

export interface ProjectMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  thumbnail: string | null
  artboardWidth: number
  artboardHeight: number
}

export interface ProjectData {
  meta: ProjectMeta
  elements: Element[]
  keyframes: Keyframe[]
  fps: number
  totalFrames: number
}
```

### src/types/tools.ts

```ts
export type ToolType = 'select' | 'rect' | 'circle' | 'ellipse' | 'line' | 'polygon' | 'star' | 'text' | 'pen' | 'hand'

export interface ToolDefinition {
  id: ToolType
  label: string
  shortcut: string
  iconName: string
}
```

### src/types/clipboard.ts

```ts
import type { Element } from './elements'
import type { Keyframe } from './animation'

export interface ClipboardData {
  elements: Element[]
  keyframes: Keyframe[]
  sourceProjectId: string
  timestamp: number
}
```

### src/types/export.ts

```ts
export type ExportFormat = 'lottie' | 'mp4' | 'webm' | 'svg'

export interface LottieExportOptions {
  format: 'lottie'
  loop: boolean
  prettyPrint: boolean
}

export interface VideoExportOptions {
  format: 'mp4' | 'webm'
  resolution: '1x' | '2x'
  quality: number
  transparentBackground: boolean
  videoBitrate: number
  loop: boolean
}

export interface SvgExportOptions {
  format: 'svg'
  animated: boolean
  loop: boolean
}

export type ExportOptions = LottieExportOptions | VideoExportOptions | SvgExportOptions

export interface ExportProgress {
  phase: 'preparing' | 'rendering' | 'encoding' | 'complete' | 'error'
  currentFrame: number
  totalFrames: number
  percent: number
  error?: string
}

export interface ImportResult {
  elements: any[]
  warnings: ImportWarning[]
  metadata: { sourceWidth: number; sourceHeight: number; layerCount: number; isFigmaExport: boolean }
}

export interface ImportWarning {
  type: string
  message: string
}
```

---

## 5. PROJECT STRUCTURE

```
src/
├── main.ts
├── App.vue
│
├── assets/styles/
│   ├── variables.css
│   ├── reset.css
│   ├── global.css
│   └── typography.css
│
├── types/
│   ├── elements.ts
│   ├── animation.ts
│   ├── project.ts
│   ├── tools.ts
│   ├── clipboard.ts
│   └── export.ts
│
├── router/
│   └── index.ts
│
├── stores/
│   ├── authStore.ts
│   ├── projectsStore.ts
│   ├── editorStore.ts
│   ├── uiStore.ts
│   ├── timelineStore.ts
│   └── clipboardStore.ts
│
├── lib/
│   ├── engine/
│   │   ├── AnimationEngine.ts
│   │   ├── Interpolator.ts
│   │   └── Easing.ts
│   ├── render/
│   │   ├── RenderEngine.ts
│   │   ├── SvgSerializer.ts
│   │   └── CanvasDrawers.ts
│   ├── exporters/
│   │   ├── BaseExporter.ts
│   │   ├── SvgExporter.ts
│   │   ├── LottieExporter.ts
│   │   ├── VideoExporter.ts
│   │   └── WebmExporter.ts
│   ├── import/
│   │   ├── SvgImporter.ts
│   │   ├── SvgParser.ts
│   │   └── TransformDecomposer.ts
│   ├── path/
│   │   ├── PathParser.ts
│   │   ├── PathBuilder.ts
│   │   ├── PathInterpolator.ts
│   │   └── PathHitTest.ts
│   ├── animation/
│   │   └── presets.ts
│   ├── elements/
│   │   ├── ElementFactory.ts
│   │   └── ElementBounds.ts
│   └── utils/
│       ├── math.ts
│       ├── color.ts
│       ├── svg.ts
│       └── id.ts
│
├── composables/
│   ├── useCanvas.ts
│   ├── useAnimation.ts
│   ├── useKeyframes.ts
│   ├── useHistory.ts
│   ├── useSelection.ts
│   ├── useDrag.ts
│   ├── useElementDrag.ts
│   ├── useElementResize.ts
│   ├── useDrawTool.ts
│   ├── usePenTool.ts
│   ├── usePathEditor.ts
│   ├── useOnionSkin.ts
│   ├── useClipboard.ts
│   ├── useShortcuts.ts
│   ├── useExport.ts
│   ├── useImport.ts
│   ├── useLocalStorage.ts
│   └── useResizablePanel.ts
│
├── components/
│   ├── ui/
│   │   ├── BaseButton.vue
│   │   ├── BaseInput.vue
│   │   ├── BaseSelect.vue
│   │   ├── BaseSlider.vue
│   │   ├── BaseCheckbox.vue
│   │   ├── BaseModal.vue
│   │   ├── BaseTooltip.vue
│   │   ├── BaseProgress.vue
│   │   ├── ColorInput.vue
│   │   ├── ToggleGroup.vue
│   │   ├── IconButton.vue
│   │   ├── ContextMenu.vue
│   │   ├── EmptyState.vue
│   │   ├── Divider.vue
│   │   └── ConfirmDialog.vue
│   │
│   ├── icons/
│   │   └── [all SVG icon components + index.ts barrel]
│   │
│   ├── layout/
│   │   ├── AppTopbar.vue
│   │   ├── ResizablePanel.vue
│   │   └── PanelHeader.vue
│   │
│   ├── canvas/
│   │   ├── CanvasViewport.vue
│   │   ├── CanvasToolbar.vue
│   │   ├── CanvasGrid.vue
│   │   ├── CanvasArtboard.vue
│   │   ├── CanvasInfo.vue
│   │   ├── CanvasZoom.vue
│   │   ├── ElementRenderer.vue
│   │   ├── SelectionOverlay.vue
│   │   ├── MarqueeSelect.vue
│   │   ├── DrawPreview.vue
│   │   ├── OnionSkinLayer.vue
│   │   ├── PenToolOverlay.vue
│   │   └── PathPointHandle.vue
│   │
│   ├── layers/
│   │   ├── LayerPanel.vue
│   │   ├── LayerItem.vue
│   │   └── LayerDragHandle.vue
│   │
│   ├── properties/
│   │   ├── PropertiesPanel.vue        ← has Design/Animate tabs
│   │   ├── AlignmentSection.vue
│   │   ├── LayoutSection.vue
│   │   ├── FillSection.vue
│   │   ├── StrokeSection.vue
│   │   ├── ShadowSection.vue
│   │   ├── BlurSection.vue
│   │   ├── OpacitySection.vue
│   │   ├── ClipContentSection.vue
│   │   ├── TextSection.vue
│   │   ├── PathSection.vue
│   │   ├── CornerRadiusSection.vue
│   │   ├── ArtboardSection.vue
│   │   ├── GridSnapSection.vue
│   │   ├── MultiSelectInfo.vue
│   │   ├── PlaybackSection.vue
│   │   ├── AnimateStatusSection.vue
│   │   ├── QuickAnimateSection.vue
│   │   ├── KeyframeDetailSection.vue
│   │   ├── EasingCurveEditor.vue
│   │   ├── KeyframeListSection.vue
│   │   ├── StaggerSection.vue
│   │   ├── OnionSkinSection.vue
│   │   └── ElementTimingSection.vue
│   │
│   ├── timeline/
│   │   ├── TimelinePanel.vue
│   │   ├── TimelineControls.vue
│   │   ├── TimelineRuler.vue
│   │   ├── TimelineTrackList.vue
│   │   ├── TimelineTrack.vue
│   │   ├── TimelineKeyframe.vue
│   │   └── TimelinePlayhead.vue
│   │
│   └── modals/
│       ├── ExportModal.vue
│       ├── NewProjectModal.vue
│       ├── ImportModal.vue
│       ├── ProjectSettingsModal.vue
│       └── ShortcutsModal.vue
│
└── views/
    ├── LoginView.vue
    ├── DashboardView.vue
    └── ProjectView.vue
```

---

## 6. STORE CONTRACTS

### authStore.ts

```ts
// State
interface AuthState {
  isAuthenticated: boolean
  user: { email: string } | null
}

// Actions
login(email: string, password: string): boolean
// Returns true if email === 'test@test.com' && password === '1234'
// Sets isAuthenticated = true, user = { email }
// Persists to localStorage key 'loopa_auth'

logout(): void
// Clears state and localStorage

checkAuth(): void
// Called on app init. Reads localStorage, restores state.
```

### projectsStore.ts

```ts
// State
interface ProjectsState {
  projects: ProjectMeta[]
}

// Getters
sortedProjects: ProjectMeta[]  // sorted by updatedAt descending

// Actions
loadAllProjects(): void
// Reads 'loopa_projects_index' from localStorage

createProject(name: string, width: number, height: number): string
// Creates ProjectMeta + empty ProjectData, saves both, returns id

deleteProject(id: string): void

updateProjectMeta(id: string, updates: Partial<ProjectMeta>): void

loadProjectData(id: string): ProjectData | null
// Reads 'loopa_project_{id}' from localStorage

saveProjectData(id: string, data: ProjectData): void
// Writes to 'loopa_project_{id}' and updates meta's updatedAt
```

### editorStore.ts

```ts
// State
interface EditorState {
  projectId: string | null
  elements: Element[]
  keyframes: Keyframe[]
}

// Getters
getElementById(id: string): Element | undefined
getElementsByIds(ids: string[]): Element[]
getKeyframesForElement(elementId: string): Keyframe[]

// Actions
loadProject(data: ProjectData): void
clearProject(): void
addElement(element: Element): void
updateElement(id: string, updates: Partial<Element>): void
deleteElements(ids: string[]): void
reorderElement(id: string, newIndex: number): void
duplicateElements(ids: string[]): string[]  // returns new IDs
addKeyframe(keyframe: Keyframe): void
updateKeyframe(id: string, updates: Partial<Keyframe>): void
deleteKeyframe(id: string): void
deleteKeyframesForElement(elementId: string): void
```

### uiStore.ts

```ts
// State
interface UiState {
  currentTool: ToolType
  selectedIds: Set<string>
  selectedKeyframeId: string | null
  activePanel: 'design' | 'animate'
  panelWidths: {
    left: number    // default 232
    right: number   // default 256
    bottomHeight: number // default 180
  }
  showGrid: boolean
  snapToGrid: boolean
  gridSize: number    // default 10
  onionSkin: OnionSkinSettings
  activeModal: string | null  // 'export' | 'import' | 'newProject' | 'projectSettings' | 'shortcuts' | null
  contextMenu: { show: boolean; x: number; y: number }
  pathEditMode: boolean
  editingPathId: string | null
}

// Actions
setTool(tool: ToolType): void
select(id: string): void               // single select
addToSelection(id: string): void        // shift+click
toggleSelection(id: string): void       // cmd+click
clearSelection(): void
selectAll(): void
selectKeyframe(id: string | null): void
setActivePanel(panel: 'design' | 'animate'): void
openModal(name: string): void
closeModal(): void
setPanelWidth(panel: 'left' | 'right' | 'bottomHeight', value: number): void
toggleGrid(): void
toggleSnap(): void
enterPathEditMode(pathId: string): void
exitPathEditMode(): void
showContextMenu(x: number, y: number): void
hideContextMenu(): void
```

### timelineStore.ts

```ts
// State
interface TimelineState {
  currentFrame: number
  totalFrames: number   // default 60
  fps: number           // default 24
  isPlaying: boolean
  loop: boolean
  direction: PlaybackDirection
}

// Getters
duration: number  // totalFrames / fps in seconds
currentTime: string  // formatted "M:SS.s"
totalTime: string

// Actions
play(): void
pause(): void
stop(): void
togglePlay(): void
seek(frame: number): void
nextFrame(): void
prevFrame(): void
setFps(fps: number): void
setTotalFrames(frames: number): void
setLoop(loop: boolean): void
setDirection(dir: PlaybackDirection): void
```

### clipboardStore.ts

```ts
// State
interface ClipboardState {
  data: ClipboardData | null
}

// Getters
hasPasteData: boolean

// Actions
copy(elements: Element[], keyframes: Keyframe[], projectId: string): void
// Deep clones and stores. Persists to localStorage 'loopa_clipboard'

paste(): { elements: Element[]; keyframes: Keyframe[] }
// Returns clones with NEW IDs. Keyframe elementId references remapped.
// Offsets position by +20px if same project.

clear(): void
```

---

## 7. COMPOSABLE CONTRACTS

Each composable is a function that returns reactive state and methods. They are used in `ProjectView.vue` and passed down to child components via props/provide-inject.

```ts
// useCanvas(viewportRef: Ref<HTMLElement>)
// Returns: { viewBox, zoom, panX, panY, screenToSvg(x,y), svgToScreen(x,y),
//            zoomIn, zoomOut, resetZoom, fitToView, onWheel, startPan, isPanning }

// useAnimation(editorStore, timelineStore)
// Returns: { play, pause, stop, seek, toggle, isPlaying,
//            getAnimatedProps(element): AnimatableProps,
//            getComputedFrame(frame?): ComputedElementState[] }

// useKeyframes(editorStore, timelineStore)
// Returns: { addKeyframeForSelected, addKeyframeForElement(id),
//            deleteKeyframe(id), updateKeyframe(id, partial),
//            getKeyframesForElement(id), getInterpolatedValue(elId, prop, frame) }

// useHistory(editorStore)
// Returns: { undo, redo, save, canUndo, canRedo, clear }
// Debounces continuous actions (drag/slider) at 300ms. Max 100 snapshots.

// useSelection(editorStore, uiStore)
// Returns: { selectedElements, selectedElement (single or null), isMultiSelect,
//            selectionBounds, selectionHandles, sharedProps (for multi-select),
//            select(id), selectAll, clearSelection, toggleSelection(id),
//            marqueeSelect(rect) }

// useDrag(options: { onStart, onMove, onEnd })
// Returns: { isDragging, startDrag(event) }

// useElementDrag(editorStore, uiStore, canvas)
// Returns: { onElementMouseDown(event, id), isDragging }

// useElementResize(editorStore, uiStore)
// Returns: { onResizeStart(event, handle), isResizing }

// useDrawTool(editorStore, uiStore, canvas)
// Returns: { onCanvasDown, onCanvasMove, onCanvasUp, drawPreview, isDrawing }

// usePenTool(editorStore, uiStore, canvas)
// Returns: { onCanvasClick, onCanvasMouseMove, onCanvasDoubleClick,
//            previewLine, currentPoints, isDrawingPath }

// usePathEditor(editorStore, uiStore)
// Returns: { editingPath, editingPointId, onPointDown, onHandleDown,
//            addPoint, deletePoint, togglePointType }

// useOnionSkin(editorStore, uiStore, timelineStore, animation)
// Returns: { onionFrames: { frame, opacity, color, states }[] }

// useClipboard(editorStore, uiStore, clipboardStore)
// Returns: { copy, paste, cut, canPaste }

// useShortcuts(all dependencies)
// Registers global keydown. Returns nothing.

// useExport(editorStore, timelineStore)
// Returns: { exportSvg, exportLottie, exportVideo, exportWebm,
//            getExportCode(format), download, copyToClipboard, progress }

// useImport(editorStore)
// Returns: { importSvgFile(file), importSvgString(svg), importResult, warnings }

// useResizablePanel(side, min, max, defaultSize)
// Returns: { size, onResizeStart, isResizing }
```

---

## 8. COMPONENT SPECIFICATIONS

### 8.1 Base UI Components

Every base component uses scoped CSS with the design tokens. No Tailwind.

#### BaseButton.vue
```
Props:
  variant: 'default' | 'accent' | 'ghost' | 'danger'  (default: 'default')
  size: 'xs' | 'sm' | 'md'  (default: 'md')
  icon: boolean  (default: false)  — makes it square
  active: boolean  (default: false)
  disabled: boolean

Slot: default

CSS: Height 26/24/20 per size. Matches .btn classes from prototype exactly.
```

#### BaseInput.vue
```
Props:
  modelValue: string | number
  type: 'text' | 'number'  (default: 'text')
  placeholder: string
  label: string (optional — renders .insp-label span before input)
  mono: boolean  (default: true for number type)
  size: 'sm' | 'md'  (default: 'md')  — md=26px, sm=22px height
  disabled: boolean
  width: string (optional CSS width like '76px')

Emits: update:modelValue

CSS: Matches .insp-input from prototype.
```

#### ColorInput.vue
```
Props:
  modelValue: string  (hex without #)
  label: string (optional)

Emits: update:modelValue

Renders: .color-field container with .color-swatch button (shows native color picker on click)
         + .color-hex text input. Exactly matches prototype.
```

#### BaseModal.vue
```
Props:
  open: boolean
  title: string
  width: string  (default: '420px')

Emits: close

Renders: Teleported overlay with backdrop blur. .modal-box with title, default slot, footer slot.
```

#### BaseSelect.vue
```
Props:
  modelValue: string
  options: { value: string; label: string }[]
  label: string (optional)

Emits: update:modelValue

CSS: Matches .insp-select from prototype. Custom caret SVG.
```

#### ToggleGroup.vue
```
Props:
  modelValue: string
  options: { value: string; label?: string; icon?: string; title?: string }[]

Emits: update:modelValue

Renders: .toggle-group with .toggle-btn buttons. Active button gets .active class.
Supports SVG icon content via slot or icon prop.
```

#### ContextMenu.vue
```
Props:
  show: boolean
  x: number
  y: number
  items: { label: string; shortcut?: string; action: () => void; separator?: boolean; danger?: boolean }[]

Emits: close

Renders: Fixed position menu. Matches prototype .context-menu style.
```

### 8.2 Layout Components

#### AppTopbar.vue
```
Layout (left to right):
  Logo (SVG icon + "Loopa" text)  |  File / Import / Export buttons  |  divider
  |  Undo / Redo icon buttons  |  divider  |  Project name (editable)
  |  flex spacer  |  artboard dimensions  |  divider  |  Export accent button

The Export button opens the export modal via uiStore.openModal('export').
```

#### ResizablePanel.vue
```
Props:
  side: 'left' | 'right' | 'bottom'
  min: number
  max: number
  defaultSize: number

Slot: default

Renders a div wrapping the slot content with a drag handle on the inner edge.
Handle is 4px wide (or tall for bottom), cursor col-resize / row-resize.
Uses useResizablePanel composable internally.
Persists size to uiStore.panelWidths.
```

### 8.3 Right Panel — PropertiesPanel.vue

**THIS IS THE MOST IMPORTANT COMPONENT.** It must EXACTLY match the prototype.

```
Structure:
  <div class="panel-r">
    <!-- Mode Toggle -->
    <div class="mode-toggle">
      <div class="mode-tabs">
        <button :class="{ active: activePanel === 'design' }">Design</button>
        <button :class="{ active: activePanel === 'animate' }">Animate</button>
      </div>
    </div>

    <div class="panel-scroll">
      <!-- DESIGN content when activePanel === 'design' -->
      <template v-if="activePanel === 'design'">

        <!-- When element(s) selected: -->
        <AlignmentSection />
        <LayoutSection />
        <ClipContentSection v-if="singleRect" />
        <TextSection v-if="isText" />
        <PathSection v-if="isPath" />
        <OpacitySection />
        <FillSection />
        <StrokeSection />
        <ShadowSection />
        <BlurSection />

        <!-- When NOTHING selected: -->
        <ArtboardSection />
        <GridSnapSection />

      </template>

      <!-- ANIMATE content when activePanel === 'animate' -->
      <template v-if="activePanel === 'animate'">

        <PlaybackSection />

        <!-- When element(s) selected: -->
        <AnimateStatusSection />
        <QuickAnimateSection />
        <KeyframeDetailSection v-if="selectedKeyframe" />
        <KeyframeListSection />
        <ElementTimingSection />
        <StaggerSection v-if="isMultiSelect" />

        <!-- Always: -->
        <OnionSkinSection />

      </template>
    </div>
  </div>
```

### 8.4 Design Panel Sections (EXACT structure from prototype)

#### AlignmentSection.vue
Six icon buttons in one row: align-left, align-center-h, align-right, align-top, align-center-v, align-bottom. Uses `.align-row` and `.align-btn` CSS. SVG icons from Webflow (Material Symbols viewBox 0 -960 960 960).

#### LayoutSection.vue
```
Title: "Layout"
Rows:
  Position  [X input w-md] [Y input w-md]
  Size      [W input w-md] [H input w-md]
  Angle     [angle input w-md]
  Corner radius  [radius input w-md]   ← only for rect elements

Label width = 72px. Input width = w-md (76px).
Two inputs per row for Position and Size.
```

#### FillSection.vue
```
Checkbox title: "Fill" (checked = section expanded, unchecked = collapsed)
When expanded:
  Color  [ColorInput]

The checkbox toggles fills[0].visible.
```

#### StrokeSection.vue
```
Checkbox title: "Stroke"
When expanded:
  Weight    [number input]
  Color     [ColorInput]
  Position  [select: Centered/Inside/Outside]
```

#### ShadowSection.vue
```
Checkbox title: "Shadow"
When expanded:
  Offset  [X input w-md] [Y input w-md]
  Blur    [number input]
  Opacity [number input]
  Color   [ColorInput]
```

#### BlurSection.vue
```
Checkbox title: "Blur"
When expanded:
  Radius  [number input]
```

#### OpacitySection.vue
```
Single row (no title):
  Opacity (bold label)  [number input 56px]  [blend mode icon button]
```

#### ClipContentSection.vue
```
Checkbox title: "Clip content" — single toggle, no children.
```

### 8.5 Animate Panel Sections

#### PlaybackSection.vue
```
Title: "Playback"
Rows:
  Duration     [input] sec
  Frame rate   [input] fps
  Direction    [select: Normal/Reverse/Alternate/Alt-Reverse]
  [checkbox] Loop animation
```

#### AnimateStatusSection.vue
```
Title: "{element name}" + "N keyframes" right-aligned in accent
Stats:
  Status    ● Animated (or ○ Static)
  Range     Frame 0 → 60
```

#### QuickAnimateSection.vue
```
Title: "Quick Animate"
2-column grid of preset buttons:
  Fade In / Fade Out / Slide Right / Slide Up / Scale In / Bounce / Spin CW / Pulse

Below grid:
  Duration  [input] sec
  Easing    [select]
```

#### KeyframeDetailSection.vue
```
Title: "Keyframe @ Frame {N}"

EasingCurveEditor component (80px tall, shows bezier curve visualization)

Easing  [select dropdown with all presets]

Subheading: "Recorded properties"
For each animatable prop:
  [checkbox] {Prop name}  [value input if checked, "inherited" text if not]
```

#### EasingCurveEditor.vue
```
80px tall SVG visualization of the current easing curve.
Shows: curve path, two control points with drag handles, handle lines.
Dragging handles updates easingCurve { x1, y1, x2, y2 } on the selected keyframe.
Background: var(--bg-3), border: 1px var(--border), border-radius: var(--r-md).
```

#### KeyframeListSection.vue
```
Title: "Keyframes"
List of .kf-list-item rows for the selected element's keyframes.
Each row: diamond icon, "Frame N", easing name right-aligned.
Selected keyframe highlighted with accent background.
Click = select keyframe + seek timeline to that frame.
Double-click = delete keyframe.
```

#### OnionSkinSection.vue
```
Checkbox title: "Onion Skin"
When expanded:
  Frames before  [input]
  Frames after   [input]
  Opacity        [slider + value]
  Before color   [ColorInput]
  After color    [ColorInput]
  Scope          [select: Selected/All Elements]
```

### 8.6 Canvas Components

#### CanvasViewport.vue
Main SVG workspace. Contains:
- `<defs>` with grid patterns
- `<CanvasArtboard />`
- `<CanvasGrid v-if="showGrid" />`
- `<OnionSkinLayer />`
- `<ElementRenderer v-for="el in elements" />`
- `<SelectionOverlay />`
- `<DrawPreview />`
- `<PenToolOverlay />`

Handles: mousedown/mousemove/mouseup (delegated), wheel (zoom), contextmenu.

viewBox is computed from zoom + pan offset. Background uses subtle radial gradient:
```css
background:
  radial-gradient(ellipse at 50% 45%, rgba(67,83,255,.04) 0%, transparent 65%),
  var(--bg-1);
```

#### ElementRenderer.vue
```
Props: element: Element, animatedProps: AnimatableProps

Renders the correct SVG primitive based on element.type using a <component :is="..."> or v-if chain. Applies fills, strokes, shadows via SVG attributes and filters.
```

#### SelectionOverlay.vue
```
Renders when selectedIds.size > 0:
- Dashed rect around selection bounds (stroke-dasharray: 5 4)
- 4 corner resize handles (8x8 white rects with accent border)
Handles have cursor styles: nw-resize, ne-resize, sw-resize, se-resize.
```

### 8.7 Timeline Components

#### TimelinePanel.vue
```
Full bottom panel layout:
  TimelineControls (top bar: play/stop, time display, frame/fps inputs, keyframe button)
  TimelineBody:
    TimelineTrackList (left column: element names, 160px wide)
    Tracks area (scrollable):
      TimelineRuler (sticky top, frame numbers)
      TimelineTrack rows with TimelineKeyframe diamonds
      TimelinePlayhead (red vertical line)
```

#### TimelineKeyframe.vue
```
Props: keyframe, selected, x position

Diamond shape: 9x9px, rotated 45deg, accent fill, white border.
Selected: yellow fill with glow.
Events: click (select), dblclick (delete), mousedown (start drag to move frame).
```

### 8.8 Modal Components

#### ExportModal.vue
```
Tabs: Lottie | Video (MP4) | WebM | SVG
Each tab has format-specific options.
Video/WebM tabs show progress bar during rendering.
Preview area. Copy/Download/Cancel buttons in footer.
```

#### ImportModal.vue
```
Two methods:
1. Drop SVG file / click to browse
2. Paste SVG code in textarea

Auto-detects Figma export.
Shows warnings for unsupported features.
Shows layer count preview before importing.
"Figma API" tab stubbed as "Coming Soon".
```

---

## 9. LIB MODULES

### lib/utils/id.ts
```ts
// Generates unique IDs like 'el_a1b2c3d4'
export function generateId(prefix = 'el'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 10)}`
}
```

### lib/utils/math.ts
```ts
export function clamp(val: number, min: number, max: number): number
export function lerp(a: number, b: number, t: number): number
export function snapToGrid(val: number, gridSize: number): number
export function distance(x1: number, y1: number, x2: number, y2: number): number
export function degreesToRadians(deg: number): number
export function radiansToDegrees(rad: number): number
```

### lib/utils/color.ts
```ts
export function hexToRgb(hex: string): { r: number; g: number; b: number }
export function rgbToHex(r: number, g: number, b: number): string
export function interpolateColor(colorA: string, colorB: string, t: number): string
export function isValidHex(hex: string): boolean
```

### lib/engine/Easing.ts
```ts
// Pure functions. Each takes t (0-1) and returns eased value (0-1).
export function linear(t: number): number
export function easeIn(t: number): number         // t^2
export function easeOut(t: number): number         // 1-(1-t)^2
export function easeInOut(t: number): number       // smooth S-curve
export function easeInCubic(t: number): number     // t^3
export function easeOutCubic(t: number): number
export function easeInOutCubic(t: number): number
export function easeInBack(t: number): number      // overshoot start
export function easeOutBack(t: number): number     // overshoot end
export function easeOutBounce(t: number): number   // bounce at end
export function easeOutElastic(t: number): number  // elastic spring
export function spring(t: number): number          // spring physics
export function steps(t: number, count: number): number
export function cubicBezier(t: number, x1: number, y1: number, x2: number, y2: number): number
export function resolveEasing(easing: EasingType): (t: number) => number
// Maps string name → function. Handles 'steps(N)' and 'cubic-bezier(...)' parsing.
```

### lib/engine/AnimationEngine.ts
```ts
// THE CORE. Pure function. No Vue, no DOM.
export function computeFrame(
  elements: Element[],
  keyframes: Keyframe[],
  frame: number
): ComputedElementState[]
// For each element:
//   1. Get keyframes for this element, sorted by frame
//   2. Find prev/next keyframes surrounding `frame`
//   3. Compute t = (frame - prev.frame) / (next.frame - prev.frame)
//   4. Apply easing to t
//   5. Interpolate each prop in next.props using prev value as start
//   6. For missing props, fall through to element's base value
//   7. Return resolved props
```

### lib/engine/Interpolator.ts
```ts
export function interpolateNumber(a: number, b: number, t: number): number
export function interpolateColor(a: string, b: string, t: number): string
export function interpolatePath(a: PathPoint[], b: PathPoint[], t: number): PathPoint[]
// Path interpolation: if arrays are different lengths, pad shorter one.
```

### lib/elements/ElementFactory.ts
```ts
export function createDefaultElement(type: ElementType): Element
// Creates element with sensible defaults:
//   rect: 100x100, fill #4353ff, rx 4
//   circle: r 50, centered
//   text: "Text", fontSize 24, DM Sans
//   path: empty points array
//   etc.
// Position defaults to artboard center.
// Name defaults to "Type N" (e.g. "Rect 1", "Circle 2")
```

### lib/elements/ElementBounds.ts
```ts
export function getBounds(element: Element): { x: number; y: number; width: number; height: number }
// Handles center-based elements (circle, ellipse) vs top-left (rect, text).
// For circle: { x: el.x - el.width/2, y: el.y - el.height/2, ... }

export function getMultiBounds(elements: Element[]): { x, y, width, height }
// Bounding box around all elements.
```

### lib/animation/presets.ts
```ts
// Each preset generates Keyframe[] for a given element.
export const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: 'fade-in', name: 'Fade In', icon: 'plus', category: 'entrance',
    generate(elementId, startFrame, duration, easing) {
      return [
        { id: generateId('kf'), elementId, frame: startFrame, props: { opacity: 0 }, easing },
        { id: generateId('kf'), elementId, frame: startFrame + duration, props: { opacity: 1 }, easing }
      ]
    }
  },
  // ... fade-out, slide-right, slide-up, slide-down, scale-in, bounce, spin-cw, pulse, etc.
]
```

---

## 10. VIEWS

### LoginView.vue
```
Full-screen centered card. Dark background.
Card: 380px wide, bg-2, border, rounded lg.
Fields: Email input, Password input.
Button: "Sign in" accent full-width.
Error message shown on invalid credentials.
Footer: "test@test.com / 1234" hint in text-4.

On success: router.push('/')
```

### DashboardView.vue
```
Topbar: Logo + "Dashboard" title + logout button.
Content: Grid of project cards (3 columns, responsive).
Each card: bg-2, border, rounded lg, thumbnail preview area, name, date, delete button.
Empty state when no projects: icon + "No projects yet" + "Create your first project" button.
Floating "New Project" accent button bottom-right, opens NewProjectModal.
```

### ProjectView.vue
```
THE MAIN EDITOR. This orchestrates everything.

Layout:
  AppTopbar (44px)
  Main area (flex row):
    ResizablePanel (left): LayerPanel
    Center (flex column):
      CanvasToolbar (38px)
      CanvasViewport (flex: 1)
      ResizablePanel (bottom): TimelinePanel
    ResizablePanel (right): PropertiesPanel

On mount:
  1. Load project from projectsStore by route param :id
  2. Load into editorStore
  3. Initialize all composables
  4. Register keyboard shortcuts
  5. Auto-save on editorStore changes (debounced 2s)

On unmount:
  1. Save project
  2. Cleanup animation frame
  3. Remove keyboard listeners
```

---

## 11. ROUTING & AUTH

### src/router/index.ts

```ts
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', name: 'Login', component: () => import('@/views/LoginView.vue'), meta: { guest: true } },
  { path: '/', name: 'Dashboard', component: () => import('@/views/DashboardView.vue'), meta: { auth: true } },
  { path: '/project/:id', name: 'Project', component: () => import('@/views/ProjectView.vue'), meta: { auth: true }, props: true },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  authStore.checkAuth()

  if (to.meta.auth && !authStore.isAuthenticated) return next('/login')
  if (to.meta.guest && authStore.isAuthenticated) return next('/')
  next()
})
```

---

## 12. KEYBOARD SHORTCUTS

Register ALL of these in `useShortcuts.ts`. Only active when not typing in an input field.

```
V           → Select tool
R           → Rectangle tool
C           → Circle tool
E           → Ellipse tool
L           → Line tool
P           → Pen tool
T           → Text tool
H           → Hand (pan) tool
Space       → Toggle play/pause
K           → Add keyframe at current frame for selected element(s)
Delete/Backspace → Delete selected element(s)
Enter       → Enter/exit path edit mode
Escape      → Deselect / Exit mode / Close modal
Cmd+Z       → Undo
Cmd+Shift+Z → Redo
Cmd+D       → Duplicate selected
Cmd+C       → Copy
Cmd+V       → Paste
Cmd+X       → Cut
Cmd+A       → Select all
Cmd+S       → Save project (prevent default)
M           → Toggle Design/Animate panel
[           → Zoom out
]           → Zoom in
0           → Reset zoom
Arrow keys  → Nudge selected 1px
Shift+Arrows → Nudge 10px
?           → Show shortcuts modal
```

---

## 13. BUILD PHASES

**CRITICAL: Follow these phases in order. Each phase should result in a working state before proceeding to the next. Test each phase.**

### PHASE 1: Project Scaffold
Create the Vite project structure, install deps, configure TypeScript.

```
Files to create:
  package.json
  vite.config.ts
  tsconfig.json (references tsconfig.app.json and tsconfig.node.json)
  tsconfig.app.json
  tsconfig.node.json
  env.d.ts (declare module '*.vue')
  index.html
  public/favicon.svg (Loopa logo — blue rounded square with question mark)
  src/main.ts (createApp, use pinia, use router, mount)
  src/App.vue (<router-view />)
```

Run: `npm install`

### PHASE 2: Types
Create ALL type definition files. These are the contracts everything depends on.

```
Files:
  src/types/elements.ts
  src/types/animation.ts
  src/types/project.ts
  src/types/tools.ts
  src/types/clipboard.ts
  src/types/export.ts
```

### PHASE 3: Styles
Create the global CSS. These variables are used by every component.

```
Files:
  src/assets/styles/variables.css
  src/assets/styles/reset.css
  src/assets/styles/global.css (utility classes, scrollbar, selection)
  src/assets/styles/typography.css (Google Fonts import)

Import all in main.ts:
  import './assets/styles/variables.css'
  import './assets/styles/reset.css'
  import './assets/styles/typography.css'
  import './assets/styles/global.css'
```

### PHASE 4: Lib Utilities
Pure TypeScript utilities with zero Vue dependency.

```
Files:
  src/lib/utils/id.ts
  src/lib/utils/math.ts
  src/lib/utils/color.ts
  src/lib/utils/svg.ts
  src/lib/elements/ElementFactory.ts
  src/lib/elements/ElementBounds.ts
```

### PHASE 5: Base UI Components
Build ALL reusable UI components. These are used everywhere.

```
Files (create ALL of these):
  src/components/ui/BaseButton.vue
  src/components/ui/BaseInput.vue
  src/components/ui/BaseSelect.vue
  src/components/ui/BaseSlider.vue
  src/components/ui/BaseCheckbox.vue
  src/components/ui/BaseModal.vue
  src/components/ui/BaseTooltip.vue
  src/components/ui/BaseProgress.vue
  src/components/ui/ColorInput.vue
  src/components/ui/ToggleGroup.vue
  src/components/ui/IconButton.vue
  src/components/ui/ContextMenu.vue
  src/components/ui/EmptyState.vue
  src/components/ui/Divider.vue
  src/components/ui/ConfirmDialog.vue
```

The visual style of every component must match the prototype CSS exactly. Reference section 3 Design Tokens.

### PHASE 6: Icon Components
Create inline SVG icon components. Each renders a single `<svg>` element.

```
Files:
  src/components/icons/IconCursor.vue (select tool arrow)
  src/components/icons/IconRect.vue
  src/components/icons/IconCircle.vue
  src/components/icons/IconEllipse.vue
  src/components/icons/IconLine.vue
  src/components/icons/IconPolygon.vue
  src/components/icons/IconStar.vue
  src/components/icons/IconText.vue
  src/components/icons/IconPen.vue
  src/components/icons/IconHand.vue
  src/components/icons/IconPlay.vue
  src/components/icons/IconPause.vue
  src/components/icons/IconStop.vue
  src/components/icons/IconUndo.vue
  src/components/icons/IconRedo.vue
  src/components/icons/IconPlus.vue
  src/components/icons/IconTrash.vue
  src/components/icons/IconEye.vue
  src/components/icons/IconEyeOff.vue
  src/components/icons/IconDownload.vue
  src/components/icons/IconUpload.vue
  src/components/icons/IconSettings.vue
  src/components/icons/IconKeyframe.vue
  src/components/icons/IconGrid.vue
  src/components/icons/IconZoomIn.vue
  src/components/icons/IconZoomOut.vue
  src/components/icons/IconChevron.vue
  src/components/icons/IconFolder.vue
  src/components/icons/IconLogout.vue
  src/components/icons/IconAlignLeft.vue (+ center, right, top, middle, bottom)
  src/components/icons/index.ts (barrel export all)

Each icon: <template><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">...</svg></template>
```

### PHASE 7: Stores + Router
Create all Pinia stores and the router with auth guard.

```
Files:
  src/stores/authStore.ts
  src/stores/projectsStore.ts
  src/stores/editorStore.ts
  src/stores/uiStore.ts
  src/stores/timelineStore.ts
  src/stores/clipboardStore.ts
  src/composables/useLocalStorage.ts
  src/router/index.ts

Update src/main.ts to register Pinia and Router.
```

### PHASE 8: Login + Dashboard Views
First working pages.

```
Files:
  src/views/LoginView.vue
  src/views/DashboardView.vue
  src/components/modals/NewProjectModal.vue
```

**✅ CHECKPOINT: Can log in with test@test.com/1234, see dashboard, create/delete projects, navigate to /project/:id (blank page is fine).**

### PHASE 9: Layout Components + Canvas Composables

```
Files:
  src/components/layout/AppTopbar.vue
  src/components/layout/ResizablePanel.vue
  src/components/layout/PanelHeader.vue
  src/composables/useCanvas.ts
  src/composables/useSelection.ts
  src/composables/useDrag.ts
  src/composables/useElementDrag.ts
  src/composables/useElementResize.ts
  src/composables/useDrawTool.ts
  src/composables/useResizablePanel.ts
```

### PHASE 10: Canvas Components

```
Files:
  src/components/canvas/CanvasViewport.vue
  src/components/canvas/CanvasToolbar.vue
  src/components/canvas/CanvasGrid.vue
  src/components/canvas/CanvasArtboard.vue
  src/components/canvas/CanvasInfo.vue
  src/components/canvas/CanvasZoom.vue
  src/components/canvas/ElementRenderer.vue
  src/components/canvas/SelectionOverlay.vue
  src/components/canvas/MarqueeSelect.vue
  src/components/canvas/DrawPreview.vue
```

### PHASE 11: Layers Panel

```
Files:
  src/components/layers/LayerPanel.vue
  src/components/layers/LayerItem.vue
  src/components/layers/LayerDragHandle.vue
```

### PHASE 12: Properties Panel (Design Tab)

This is the most visually critical phase. Every section must match the prototype EXACTLY.

```
Files:
  src/components/properties/PropertiesPanel.vue
  src/components/properties/AlignmentSection.vue
  src/components/properties/LayoutSection.vue
  src/components/properties/OpacitySection.vue
  src/components/properties/FillSection.vue
  src/components/properties/StrokeSection.vue
  src/components/properties/ShadowSection.vue
  src/components/properties/BlurSection.vue
  src/components/properties/ClipContentSection.vue
  src/components/properties/TextSection.vue
  src/components/properties/CornerRadiusSection.vue
  src/components/properties/ArtboardSection.vue
  src/components/properties/GridSnapSection.vue
  src/components/properties/MultiSelectInfo.vue
```

### PHASE 13: ProjectView Assembly

```
Files:
  src/views/ProjectView.vue
  src/components/modals/ProjectSettingsModal.vue
```

**✅ CHECKPOINT: Full editor layout visible. Can create shapes, select, move, resize, delete. Design panel shows correct properties. Layers panel works. Resizable panels work.**

### PHASE 14: Animation Engine

```
Files:
  src/lib/engine/Easing.ts
  src/lib/engine/Interpolator.ts
  src/lib/engine/AnimationEngine.ts
  src/lib/animation/presets.ts
```

### PHASE 15: Timeline + Keyframes

```
Files:
  src/composables/useAnimation.ts
  src/composables/useKeyframes.ts
  src/components/timeline/TimelinePanel.vue
  src/components/timeline/TimelineControls.vue
  src/components/timeline/TimelineRuler.vue
  src/components/timeline/TimelineTrackList.vue
  src/components/timeline/TimelineTrack.vue
  src/components/timeline/TimelineKeyframe.vue
  src/components/timeline/TimelinePlayhead.vue
```

### PHASE 16: Properties Panel (Animate Tab)

```
Files:
  src/components/properties/PlaybackSection.vue
  src/components/properties/AnimateStatusSection.vue
  src/components/properties/QuickAnimateSection.vue
  src/components/properties/KeyframeDetailSection.vue
  src/components/properties/EasingCurveEditor.vue
  src/components/properties/KeyframeListSection.vue
  src/components/properties/ElementTimingSection.vue
  src/components/properties/StaggerSection.vue
  src/components/properties/OnionSkinSection.vue
```

**✅ CHECKPOINT: Animation works end-to-end. Can add keyframes, scrub timeline, play, adjust easing. Design/Animate tabs switch correctly.**

### PHASE 17: Path System + Pen Tool

```
Files:
  src/lib/path/PathParser.ts
  src/lib/path/PathBuilder.ts
  src/lib/path/PathInterpolator.ts
  src/lib/path/PathHitTest.ts
  src/composables/usePenTool.ts
  src/composables/usePathEditor.ts
  src/components/canvas/PenToolOverlay.vue
  src/components/canvas/PathPointHandle.vue
  src/components/properties/PathSection.vue
```

### PHASE 18: Onion Skinning

```
Files:
  src/composables/useOnionSkin.ts
  src/components/canvas/OnionSkinLayer.vue
```

### PHASE 19: History + Clipboard + Shortcuts

```
Files:
  src/composables/useHistory.ts
  src/composables/useClipboard.ts
  src/composables/useShortcuts.ts
  src/components/modals/ShortcutsModal.vue
```

### PHASE 20: Import System

```
Files:
  src/lib/import/SvgParser.ts
  src/lib/import/SvgImporter.ts
  src/lib/import/TransformDecomposer.ts
  src/composables/useImport.ts
  src/components/modals/ImportModal.vue
```

### PHASE 21: Export System

```
Files:
  src/lib/render/RenderEngine.ts
  src/lib/render/SvgSerializer.ts
  src/lib/render/CanvasDrawers.ts
  src/lib/exporters/BaseExporter.ts
  src/lib/exporters/LottieExporter.ts
  src/lib/exporters/VideoExporter.ts
  src/lib/exporters/WebmExporter.ts
  src/lib/exporters/SvgExporter.ts
  src/composables/useExport.ts
  src/components/modals/ExportModal.vue
```

**✅ CHECKPOINT: Full feature set working. All exports produce valid output. SVG import works including Figma exports.**

### PHASE 22: Polish

```
- Smooth transitions on all panel switches and modal open/close
- Empty states for: no layers, no keyframes, no projects
- Auto-save with visual indicator
- Panel width persistence across sessions
- Canvas fit-to-view on project load
- Proper error boundaries
- Loading states during export rendering
- Accessibility: focus rings, aria labels, keyboard navigation
```

---

## FINAL NOTES FOR CLAUDE CODE

1. **ALWAYS use `<script setup lang="ts">` in Vue components.**
2. **ALWAYS use scoped CSS with `<style scoped>`.** Use CSS custom properties from variables.css.
3. **NEVER use Tailwind or utility classes.** Write semantic CSS.
4. **EVERY input, button, and interactive element must match the prototype dimensions and colors exactly.**
5. **The right panel Design/Animate toggle must use the exact `.mode-tabs` / `.mode-tab` CSS from the prototype.**
6. **Inspector sections use `.insp-section`, `.insp-title`, `.insp-row`, `.insp-label`, `.insp-input` classes.**
7. **Checkbox title rows (Fill, Stroke, Shadow, Blur, Clip Content, Onion Skin) use `.insp-title-check` pattern: checkbox + label. When unchecked, hide children and dim the label.**
8. **Color inputs are ALWAYS the combined swatch + hex pattern (`.color-field` / `.color-swatch` / `.color-hex`).**
9. **Test each phase before moving to the next.**
10. **The lib/ directory contains ZERO Vue imports.** Pure TypeScript only.

---

*This document is complete. Build it phase by phase and the result will be Loopa.*

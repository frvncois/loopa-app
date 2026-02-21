# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Loopa** — browser-based SVG/motion graphics keyframe animation tool with a Webflow-inspired dark UI. Local-first, no backend, localStorage only.

**PROTOYPE.html** (note: typo in filename — missing a T) is the visual source of truth. Every component must match it pixel-for-pixel.

## Commands

```bash
npm run dev       # Start dev server (localhost:5173)
npm run build     # vue-tsc --noEmit && vite build
npm run preview   # Preview production build
```

## Tech Stack

- **Vue 3.4** + `<script setup lang="ts">` + `<style scoped>` — mandatory on all components
- **Vue Router 4.3** — `src/router/index.ts`, route guard calls `authStore.checkAuth()`
- **Pinia 2.2** — stores in `src/stores/`
- **Vite 5.4** — path alias `@/` → `./src/`
- **TypeScript ~5.4**, strict mode
- **No Tailwind, no component libraries, no icon libraries** — scoped CSS + inline SVG only

## Design Tokens

All in `src/assets/styles/variables.css` (MASTER.md §3). Key tokens:
- Surfaces: `--bg-0: #0c0c0f` … `--bg-6: #33333e`
- Accent: `--accent: #4353ff`, `--accent-h: #5c6aff`
- Text: `--text-1: #ededf0` … `--text-4: #4a4a5c`
- Fonts: `--font: 'DM Sans'`, `--mono: 'JetBrains Mono'`
- Layout (rem): `--topbar-h: 2.75rem`, `--toolbar-h: 2.375rem`, `--panel-l-default: 14.5rem`, `--panel-r-default: 16rem`, `--timeline-default: 11.25rem`
- Radii (rem): `--r-sm: 0.25rem`, `--r-md: 0.375rem`, `--r-lg: 0.625rem`

## CSS Conventions (mandatory)

All components use `<style scoped>` — scoping prevents collisions so no component prefixes needed.

**Class naming:** flat item name + `&.is-*` modifier pattern. No BEM (`__`/`--`). No prefixes.
```css
/* ✅ Correct */
.button { ... }
.button.is-accent { ... }
.button.is-sm { ... }
.track.is-selected { ... }
.item.is-danger { ... }

/* ❌ Wrong */
.btn-accent { ... }
.tl-track { ... }
.insp-section { ... }
```

**Modifier nesting:** use `&.is-*` and `&:hover`/`&:focus`/`&:disabled` inside the base selector. One level deep only.
```css
.button {
  &.is-active { background: var(--accent-s); }
  &:hover:not(:disabled) { background: var(--bg-5); }
  &:disabled { opacity: 0.4; }
}
```

**Units:** px → rem (1rem = 16px). Keep `1px` for borders/outlines only.
Common inspector values: `height: 1.625rem` (26px), label width `4.5rem` (72px), padding `0.4375rem` (7px).

**Inspector section pattern** (Design/Animate tab):
- Wrapper: `.section` — `padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border)`
- Title: `.title` — `font-size: 0.75rem; font-weight: 600; color: var(--text-2)`
- Checkbox title: `<label class="title" :class="{ 'is-collapsed': !active }">` — `&.is-collapsed { color: var(--text-3) }`
- Row: `.row` — `display: flex; align-items: center; gap: 0.375rem; min-height: 1.625rem`
- Label: `.label` — `width: 4.5rem; min-width: 4.5rem; font-size: 0.75rem; color: var(--text-3)`
- Field: `.field` — `height: 1.625rem; background: var(--bg-3)` + `.field.is-pair` for 4.75rem paired inputs
- Select: `.select` — same height/bg as `.field`
- Checkbox row: `.check` — `display: flex; align-items: center; gap: 0.5rem`

**Color input pattern:** `.field` (wrapper) > `.swatch` + `.hex` — always combined
**Timeline keyframe:** `.keyframe` — 0.5625rem diamond rotated 45°, accent fill, white 1.5px border, `.keyframe.is-selected` → yellow

## Architecture

### `lib/` — Zero Vue dependency
Pure TypeScript only. **Never import Vue here.**
- `engine/` — `AnimationEngine.ts` (core `computeFrame()`), `Easing.ts`, `Interpolator.ts`
- `render/` — `RenderEngine`, `SvgSerializer`, `CanvasDrawers`
- `exporters/` — Lottie, Video, WebM, SVG exporters
- `import/` — SVG parser + Figma export support
- `path/` — `PathParser`, `PathBuilder`, `PathInterpolator`, `PathHitTest`
- `elements/` — `ElementFactory` (defaults), `ElementBounds`
- `utils/` — `id.ts` (`generateId(prefix)`), `math.ts`, `color.ts`, `svg.ts`

### Stores (Pinia)
- `authStore` — hardcoded `test@test.com` / `1234`, key `loopa_auth`
- `projectsStore` — index at `loopa_projects_index`, data at `loopa_project_{id}`
- `editorStore` — active project's elements + keyframes, getters + CRUD actions
- `uiStore` — tool, selectedIds (Set), panelWidths, modal state, pathEditMode
- `timelineStore` — currentFrame, fps, isPlaying, loop, direction
- `clipboardStore` — copy/paste with new ID generation + position offset

### Composables
Instantiated in `ProjectView.vue`, passed to children via props/provide-inject.
Key: `useCanvas` (pan/zoom, screenToSvg), `useAnimation` (playback + `getAnimatedProps`), `useKeyframes`, `useHistory` (undo/redo, max 100 snapshots, 300ms debounce), `useSelection` (marquee, multi-select), `useDrawTool`, `usePenTool`, `usePathEditor`, `useShortcuts`.

### Views
- `LoginView` — centered card (380px), hardcoded auth
- `DashboardView` — 3-column project grid, empty state, NewProjectModal
- `ProjectView` — orchestrates everything: AppTopbar | ResizablePanel(left=LayerPanel) | [CanvasToolbar + CanvasViewport + ResizablePanel(bottom=TimelinePanel)] | ResizablePanel(right=PropertiesPanel)

### PropertiesPanel (most critical component)
Design tab: AlignmentSection → LayoutSection → ClipContentSection → TextSection → PathSection → OpacitySection → FillSection → StrokeSection → ShadowSection → BlurSection (when element selected); ArtboardSection + GridSnapSection (nothing selected).
Animate tab: PlaybackSection → AnimateStatusSection → QuickAnimateSection → KeyframeDetailSection (when keyframe selected) → KeyframeListSection → ElementTimingSection → StaggerSection (multi-select).

## Build Phases (MASTER.md §13)

22 phases — follow in order, test each before proceeding:
1. Project Scaffold · 2. Types · 3. Styles · 4. Lib Utilities · 5. Base UI Components · 6. Icon Components · 7. Stores + Router · 8. Login + Dashboard ✅ · 9. Layout + Canvas Composables · 10. Canvas Components · 11. Layers Panel · 12. Properties Panel (Design) · 13. ProjectView Assembly ✅ · 14. Animation Engine · 15. Timeline + Keyframes · 16. Properties Panel (Animate) ✅ · 17. Path System + Pen Tool · 18. History + Clipboard + Shortcuts · 19. Import System · 20. Export System ✅ · 21. Polish

## Auth

Hardcoded: `test@test.com` / `1234`. Stored as boolean `loopa_auth` in localStorage. `checkAuth()` called on every route navigation.

## Figma Integration

OAuth flow using a Cloudflare Worker proxy — the client secret never touches the browser.

**Files:**
- `src/lib/figma/figmaAuth.ts` — Token storage, `getAuthUrl()`, `exchangeCode()`, `refreshToken()`, `ensureValidToken()`
- `src/lib/figma/figmaApi.ts` — `figmaFetch()`, `parseFigmaUrl()`, `getFileNodes()`, `getFileImages()`
- `src/lib/figma/FigmaNodeConverter.ts` — Figma node tree → Loopa elements
- `src/composables/useFigmaImport.ts` — `connect()` popup, `previewLink()`, `importFromLink()`
- `src/views/FigmaCallbackView.vue` — OAuth redirect landing page (route: `/auth/figma/callback`)

**Conventions:**
- All Figma API calls go through `VITE_FIGMA_PROXY_URL` (Cloudflare Worker), never direct to `api.figma.com`
- Figma tokens stored in `loopa_figma_token` localStorage key as `FigmaTokens { access_token, refresh_token, expires_at, user_id }`
- `ensureValidToken()` auto-refreshes when expired; clears tokens on 401 refresh failure
- Node conversion primary path: RECTANGLE → RectElement, ELLIPSE → Circle/EllipseElement, TEXT → TextElement, VECTOR/BOOLEAN_OPERATION → PathElement, FRAME/GROUP → flatten children
- Fallback for complex nodes: `getFileImages(..., 'svg')` → fetch SVG URL → `importSvg()` (SvgImporter)
- Figma URL format: `figma.com/design/FILEKEY/Title?node-id=21-2` → node-id uses `-` separator; API wants `:` separator
- `connect()` opens a 600×700 popup, polls `popup.closed` every 500ms, then checks `isConnected()`
- `parseFigmaUrl()` returns `{ fileKey, nodeId }` with nodeId already converted to `:` format, or `null` if not a valid Figma URL

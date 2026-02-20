<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseProgress from '@/components/ui/BaseProgress.vue'
import { useExport } from '@/composables/useExport'
import { useTimelineStore } from '@/stores/timelineStore'

const props = defineProps<{ open: boolean; artboardWidth: number; artboardHeight: number }>()
const emit  = defineEmits<{ close: [] }>()

const exporter  = useExport()
const timeline  = useTimelineStore()
const artboard  = computed(() => ({ width: props.artboardWidth, height: props.artboardHeight }))

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'lottie' | 'video' | 'webm' | 'svg'
const activeTab = ref<Tab>('lottie')
const formats   = exporter.getAvailableFormats()

// ── Options state ─────────────────────────────────────────────────────────────
const lottieLoop       = ref(true)
const lottiePretty     = ref(true)
const svgAnimated      = ref(true)
const svgLoop          = ref(true)
const videoResolution  = ref<'1x' | '2x'>('1x')
const videoQuality     = ref(0.85)
const videoBitrate     = ref(8_000_000)
const videoLoop        = ref(false)
const webmTransparent  = ref(false)

// ── Preview state ─────────────────────────────────────────────────────────────
const lottieJson      = ref('')
const svgCode         = ref('')
const lottiePreviewEl = ref<HTMLDivElement | null>(null)
const lottieLoaded    = ref(false)
const isRendering     = ref(false)
const copied          = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null
let lottieInstance: { destroy: () => void } | null = null

// ── Generate previews when tab becomes active ─────────────────────────────────

watch(() => props.open, async (open) => {
  if (open) {
    await generateLottiePreview()
  } else {
    resetAll()
  }
})

watch(activeTab, async (tab) => {
  if (tab === 'lottie' && !lottieJson.value) await generateLottiePreview()
  if (tab === 'svg'    && !svgCode.value)    await generateSvgPreview()
})

watch([lottieLoop, lottiePretty], async () => {
  if (activeTab.value === 'lottie') await generateLottiePreview()
})
watch([svgAnimated, svgLoop], async () => {
  if (activeTab.value === 'svg') await generateSvgPreview()
})

async function generateLottiePreview() {
  lottieJson.value = await exporter.exportLottie(
    { loop: lottieLoop.value, prettyPrint: lottiePretty.value },
    artboard.value
  )
  destroyLottiePreview()
  if (lottiePreviewEl.value) {
    loadLottiePreview()
  }
}

async function generateSvgPreview() {
  svgCode.value = await exporter.exportSvg(
    { animated: svgAnimated.value, loop: svgLoop.value },
    artboard.value
  )
}

async function loadLottiePreview() {
  if (!lottiePreviewEl.value || !lottieJson.value) return
  try {
    // Dynamic import bypassing Vite's static analysis — works if lottie-web is installed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dynamicImport: (m: string) => Promise<any> = new Function('m', 'return import(m)')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lottie: any = await dynamicImport('lottie-web').catch(() => null)
    if (!lottie) { lottieLoaded.value = false; return }
    lottieInstance = lottie.loadAnimation({
      container: lottiePreviewEl.value,
      renderer: 'svg',
      loop: lottieLoop.value,
      autoplay: true,
      animationData: JSON.parse(lottieJson.value),
    })
    lottieLoaded.value = true
  } catch {
    lottieLoaded.value = false
  }
}

function destroyLottiePreview() {
  lottieInstance?.destroy()
  lottieInstance = null
  lottieLoaded.value = false
}

function resetAll() {
  lottieJson.value = ''
  svgCode.value    = ''
  isRendering.value = false
  destroyLottiePreview()
  exporter.resetProgress()
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function onDownloadLottie() {
  if (!lottieJson.value) await generateLottiePreview()
  const name = `loopa-export-${Date.now()}.json`
  exporter.download(lottieJson.value, name)
}

async function onCopyLottie() {
  if (!lottieJson.value) await generateLottiePreview()
  await exporter.copyToClipboard(lottieJson.value)
  flashCopied()
}

async function onDownloadSvg() {
  if (!svgCode.value) await generateSvgPreview()
  const name = `loopa-export-${Date.now()}.svg`
  exporter.download(svgCode.value, name)
}

async function onCopySvg() {
  if (!svgCode.value) await generateSvgPreview()
  await exporter.copyToClipboard(svgCode.value)
  flashCopied()
}

async function onExportVideo() {
  if (isRendering.value) return
  isRendering.value = true
  try {
    const blob = await exporter.exportVideoFile({
      resolution: videoResolution.value,
      quality: videoQuality.value,
      videoBitrate: videoBitrate.value,
      transparentBackground: false,
      loop: videoLoop.value,
    }, artboard.value)
    exporter.download(blob, `loopa-export-${Date.now()}.mp4`)
  } catch (e) {
    exporter.progress.phase = 'error'
    exporter.progress.error = String(e)
  } finally {
    isRendering.value = false
  }
}

async function onExportWebm() {
  if (isRendering.value) return
  isRendering.value = true
  try {
    const blob = await exporter.exportWebmFile({
      resolution: videoResolution.value,
      quality: videoQuality.value,
      videoBitrate: videoBitrate.value,
      transparentBackground: webmTransparent.value,
      loop: videoLoop.value,
    }, artboard.value)
    exporter.download(blob, `loopa-export-${Date.now()}.webm`)
  } catch (e) {
    exporter.progress.phase = 'error'
    exporter.progress.error = String(e)
  } finally {
    isRendering.value = false
  }
}

function cancelExport() {
  isRendering.value = false
  exporter.resetProgress()
}

function flashCopied() {
  copied.value = true
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copied.value = false }, 1800)
}

const progressLabel = computed(() => {
  const p = exporter.progress
  if (p.phase === 'rendering') return `Rendering frame ${p.currentFrame} / ${p.totalFrames}`
  if (p.phase === 'encoding')  return 'Encoding…'
  if (p.phase === 'complete')  return 'Done'
  if (p.phase === 'error')     return `Error: ${p.error}`
  return 'Preparing…'
})

const svgPreviewLines = computed(() => {
  if (!svgCode.value) return ''
  return svgCode.value.slice(0, 600) + (svgCode.value.length > 600 ? '\n…' : '')
})

const lottiePreviewJson = computed(() => {
  if (!lottieJson.value) return ''
  return lottieJson.value.slice(0, 800) + (lottieJson.value.length > 800 ? '\n…' : '')
})

onUnmounted(() => {
  destroyLottiePreview()
  if (copyTimer) clearTimeout(copyTimer)
})
</script>

<template>
  <BaseModal :open="open" title="Export" width="540px" @close="emit('close')">
    <!-- Tab bar -->
    <div class="tabs">
      <button
        v-for="tab in (['lottie', 'video', 'webm', 'svg'] as Tab[])"
        :key="tab"
        class="tab"
        :class="{ active: activeTab === tab, disabled: (tab === 'video' && !formats.mp4) }"
        :title="tab === 'video' && !formats.mp4 ? 'MP4 not supported in this browser (use WebM instead)' : undefined"
        @click="activeTab = tab"
      >
        {{ tab === 'lottie' ? 'Lottie' : tab === 'video' ? 'Video (MP4)' : tab === 'webm' ? 'WebM' : 'SVG' }}
        <span v-if="tab === 'video' && !formats.mp4" class="tab-badge">Not supported</span>
      </button>
    </div>

    <!-- ── LOTTIE tab ──────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'lottie'" class="tab-content">
      <div class="options-row">
        <label class="opt-label">
          <input type="checkbox" v-model="lottieLoop" />
          Loop
        </label>
        <label class="opt-label">
          <input type="checkbox" v-model="lottiePretty" />
          Pretty print
        </label>
      </div>

      <!-- Lottie preview -->
      <div class="preview-area">
        <div v-if="lottieJson" class="preview-top">
          <div ref="lottiePreviewEl" class="lottie-canvas" />
          <span v-if="!lottieLoaded" class="preview-hint">
            Install <code>lottie-web</code> for live preview
          </span>
        </div>
        <pre v-if="lottieJson" class="code-block">{{ lottiePreviewJson }}</pre>
        <div v-else class="preview-placeholder">Generating preview…</div>
      </div>
    </div>

    <!-- ── VIDEO tab ─────────────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'video'" class="tab-content">
      <div v-if="!formats.mp4" class="warn-banner">
        MP4 export is not supported in this browser. Try WebM instead.
      </div>
      <div class="options-grid">
        <div class="opt-row">
          <span class="opt-key">Resolution</span>
          <div class="toggle-pair">
            <button
              class="tog-btn"
              :class="{ active: videoResolution === '1x' }"
              @click="videoResolution = '1x'"
            >1x</button>
            <button
              class="tog-btn"
              :class="{ active: videoResolution === '2x' }"
              @click="videoResolution = '2x'"
            >2x</button>
          </div>
        </div>
        <div class="opt-row">
          <span class="opt-key">Quality</span>
          <input
            type="range" min="0.4" max="1" step="0.05"
            v-model.number="videoQuality"
            class="range-input"
          />
          <span class="opt-val">{{ Math.round(videoQuality * 100) }}%</span>
        </div>
        <div class="opt-row">
          <span class="opt-key">Bitrate</span>
          <select v-model.number="videoBitrate" class="sel">
            <option :value="4_000_000">4 Mbps</option>
            <option :value="8_000_000">8 Mbps</option>
            <option :value="16_000_000">16 Mbps</option>
          </select>
        </div>
        <label class="opt-label full">
          <input type="checkbox" v-model="videoLoop" />
          Loop
        </label>
      </div>

      <!-- Progress -->
      <div v-if="isRendering" class="progress-area">
        <BaseProgress :value="exporter.progress.percent" />
        <span class="progress-label">{{ progressLabel }}</span>
      </div>
      <div v-if="exporter.progress.phase === 'error'" class="error-banner">
        {{ exporter.progress.error }}
      </div>
    </div>

    <!-- ── WEBM tab ───────────────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'webm'" class="tab-content">
      <div class="options-grid">
        <div class="opt-row">
          <span class="opt-key">Resolution</span>
          <div class="toggle-pair">
            <button class="tog-btn" :class="{ active: videoResolution === '1x' }" @click="videoResolution = '1x'">1x</button>
            <button class="tog-btn" :class="{ active: videoResolution === '2x' }" @click="videoResolution = '2x'">2x</button>
          </div>
        </div>
        <div class="opt-row">
          <span class="opt-key">Quality</span>
          <input type="range" min="0.4" max="1" step="0.05" v-model.number="videoQuality" class="range-input" />
          <span class="opt-val">{{ Math.round(videoQuality * 100) }}%</span>
        </div>
        <div class="opt-row">
          <span class="opt-key">Bitrate</span>
          <select v-model.number="videoBitrate" class="sel">
            <option :value="4_000_000">4 Mbps</option>
            <option :value="8_000_000">8 Mbps</option>
            <option :value="16_000_000">16 Mbps</option>
          </select>
        </div>
        <label class="opt-label full">
          <input type="checkbox" v-model="webmTransparent" />
          Transparent background (alpha)
        </label>
        <label class="opt-label full">
          <input type="checkbox" v-model="videoLoop" />
          Loop
        </label>
      </div>

      <div v-if="isRendering" class="progress-area">
        <BaseProgress :value="exporter.progress.percent" />
        <span class="progress-label">{{ progressLabel }}</span>
      </div>
      <div v-if="exporter.progress.phase === 'error'" class="error-banner">
        {{ exporter.progress.error }}
      </div>
    </div>

    <!-- ── SVG tab ────────────────────────────────────────────────────────────── -->
    <div v-else class="tab-content">
      <div class="options-row">
        <label class="opt-label">
          <input type="checkbox" v-model="svgAnimated" />
          Animated (CSS/SMIL)
        </label>
        <label class="opt-label" v-if="svgAnimated">
          <input type="checkbox" v-model="svgLoop" />
          Loop
        </label>
      </div>

      <div class="preview-area">
        <pre v-if="svgCode" class="code-block">{{ svgPreviewLines }}</pre>
        <div v-else class="preview-placeholder">Generating preview…</div>
      </div>
    </div>

    <!-- ── Footer ─────────────────────────────────────────────────────────────── -->
    <template #footer>
      <button class="btn btn-ghost" @click="emit('close')">Close</button>

      <!-- Lottie footer -->
      <template v-if="activeTab === 'lottie'">
        <button class="btn btn-default" @click="onCopyLottie">
          {{ copied ? 'Copied!' : 'Copy JSON' }}
        </button>
        <button class="btn btn-accent" @click="onDownloadLottie">Download .json</button>
      </template>

      <!-- Video footer -->
      <template v-else-if="activeTab === 'video'">
        <button v-if="isRendering" class="btn btn-danger" @click="cancelExport">Cancel</button>
        <button
          v-else
          class="btn btn-accent"
          :disabled="!formats.mp4"
          @click="onExportVideo"
        >
          Render &amp; Download .mp4
        </button>
      </template>

      <!-- WebM footer -->
      <template v-else-if="activeTab === 'webm'">
        <button v-if="isRendering" class="btn btn-danger" @click="cancelExport">Cancel</button>
        <button v-else class="btn btn-accent" @click="onExportWebm">
          Render &amp; Download .webm
        </button>
      </template>

      <!-- SVG footer -->
      <template v-else>
        <button class="btn btn-default" @click="onCopySvg">
          {{ copied ? 'Copied!' : 'Copy SVG' }}
        </button>
        <button class="btn btn-accent" @click="onDownloadSvg">Download .svg</button>
      </template>
    </template>
  </BaseModal>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 14px;
  background: var(--bg-3);
  border-radius: var(--r-md);
  padding: 3px;
}
.tab {
  flex: 1;
  height: 26px;
  border: none;
  border-radius: calc(var(--r-md) - 2px);
  background: transparent;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all var(--ease);
  &:hover { color: var(--text-2); }
  &.active { background: var(--bg-5); color: var(--text-1); }
  &.disabled { opacity: 0.5; cursor: not-allowed; }
}
.tab-badge {
  font-size: 9px;
  background: var(--bg-6);
  color: var(--text-4);
  padding: 1px 5px;
  border-radius: 999px;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
}

.options-row {
  display: flex;
  gap: 20px;
}
.options-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.opt-row {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 26px;
}
.opt-key {
  font-size: 11px;
  color: var(--text-3);
  width: 70px;
  flex-shrink: 0;
}
.opt-val {
  font-size: 11px;
  color: var(--text-2);
  width: 36px;
  font-family: var(--mono);
  text-align: right;
}
.opt-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-2);
  cursor: pointer;
  user-select: none;
  input[type="checkbox"] { accent-color: var(--accent); }
}
.opt-label.full { margin-top: 2px; }

.toggle-pair {
  display: flex;
  gap: 2px;
  background: var(--bg-3);
  border-radius: var(--r-sm);
  padding: 2px;
}
.tog-btn {
  height: 22px;
  padding: 0 10px;
  border: none;
  border-radius: calc(var(--r-sm) - 1px);
  background: transparent;
  color: var(--text-3);
  font-size: 11px;
  font-family: var(--mono);
  cursor: pointer;
  transition: all var(--ease);
  &.active { background: var(--bg-5); color: var(--text-1); }
  &:hover:not(.active) { color: var(--text-2); }
}

.range-input {
  flex: 1;
  accent-color: var(--accent);
}

.sel {
  height: 26px;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-1);
  font-size: 11px;
  padding: 0 6px;
  outline: none;
  cursor: pointer;
}

.preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 140px;
}
.preview-top {
  position: relative;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  overflow: hidden;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lottie-canvas {
  width: 100%;
  min-height: 100px;
  max-height: 160px;
}
.preview-hint {
  position: absolute;
  bottom: 6px;
  right: 8px;
  font-size: 10px;
  color: var(--text-4);
  code { font-family: var(--mono); color: var(--text-3); }
}

.code-block {
  flex: 1;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 10px 12px;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text-2);
  line-height: 1.6;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 180px;
  overflow-y: auto;
}
.preview-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--text-4);
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  min-height: 140px;
}

.progress-area {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.progress-label {
  font-size: 10px;
  color: var(--text-3);
  font-family: var(--mono);
}

.error-banner {
  padding: 7px 10px;
  background: var(--red-s);
  border: 1px solid var(--red);
  border-radius: var(--r-md);
  font-size: 11px;
  color: var(--red);
}
.warn-banner {
  padding: 7px 10px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: var(--r-md);
  font-size: 11px;
  color: var(--yellow);
}

/* Footer buttons (inherits from BaseModal footer slot) */
.btn {
  height: 26px;
  padding: 0 12px;
  border-radius: var(--r-md);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--ease);
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}
.btn-ghost {
  background: transparent;
  color: var(--text-2);
  border-color: var(--border);
  &:hover:not(:disabled) { background: var(--bg-4); color: var(--text-1); }
}
.btn-default {
  background: var(--bg-4);
  color: var(--text-1);
  border-color: var(--border-l);
  &:hover:not(:disabled) { background: var(--bg-5); }
}
.btn-accent {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  &:hover:not(:disabled) { background: var(--accent-h); }
}
.btn-danger {
  background: var(--red-s);
  color: var(--red);
  border-color: var(--red);
  &:hover { background: rgba(248,113,113,0.2); }
}
</style>

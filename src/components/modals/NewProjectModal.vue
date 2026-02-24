<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import { useFigmaImport } from '@/composables/useFigmaImport'

import type { Frame } from '@/types/frame'
import type { Element } from '@/types/elements'

const emit = defineEmits<{
  create: [name: string, width: number, height: number]
  createFromFigma: [name: string, frames: Frame[], elements: Element[]]
  close: []
}>()

const props = defineProps<{ open: boolean }>()

const activeTab = ref<'blank' | 'figma'>('blank')

// ── Blank tab ──────────────────────────────────────────────────

interface SizePreset {
  name: string
  width: number
  height: number
}

interface PresetCategory {
  name: string
  presets: SizePreset[]
}

const PRESET_CATEGORIES: PresetCategory[] = [
  {
    name: 'Screen',
    presets: [
      { name: 'Desktop',        width: 1440, height: 900  },
      { name: 'Desktop HD',     width: 1920, height: 1080 },
      { name: 'MacBook Pro 14"', width: 1512, height: 982  },
      { name: 'MacBook Pro 16"', width: 1728, height: 1117 },
      { name: 'iMac',           width: 2560, height: 1440 },
      { name: 'Tablet',         width: 1024, height: 768  },
      { name: 'iPad Pro 11"',   width: 1194, height: 834  },
      { name: 'iPad Pro 12.9"', width: 1366, height: 1024 },
      { name: 'Surface Pro',    width: 1368, height: 912  },
    ]
  },
  {
    name: 'Phone',
    presets: [
      { name: 'iPhone 16',         width: 393, height: 852 },
      { name: 'iPhone 16 Pro Max', width: 440, height: 956 },
      { name: 'iPhone SE',         width: 375, height: 667 },
      { name: 'Android Small',     width: 360, height: 800 },
      { name: 'Android Large',     width: 412, height: 915 },
    ]
  },
  {
    name: 'Social Media',
    presets: [
      { name: 'Instagram Post',    width: 1080, height: 1080 },
      { name: 'Instagram Story',   width: 1080, height: 1920 },
      { name: 'Instagram Reel',    width: 1080, height: 1920 },
      { name: 'TikTok',            width: 1080, height: 1920 },
      { name: 'Facebook Post',     width: 1200, height: 630  },
      { name: 'Facebook Story',    width: 1080, height: 1920 },
      { name: 'Facebook Cover',    width: 1640, height: 624  },
      { name: 'X / Twitter Post',  width: 1200, height: 675  },
      { name: 'X / Twitter Header', width: 1500, height: 500 },
      { name: 'LinkedIn Post',     width: 1200, height: 627  },
      { name: 'LinkedIn Cover',    width: 1584, height: 396  },
      { name: 'YouTube Thumbnail', width: 1280, height: 720  },
      { name: 'Pinterest Pin',     width: 1000, height: 1500 },
    ]
  },
  {
    name: 'Presentation',
    presets: [
      { name: 'Slide 16:9',  width: 1920, height: 1080 },
      { name: 'Slide 4:3',   width: 1024, height: 768  },
      { name: 'Slide 16:10', width: 1920, height: 1200 },
    ]
  },
  {
    name: 'Banner',
    presets: [
      { name: 'Leaderboard',       width: 728, height: 90  },
      { name: 'Medium Rectangle',  width: 300, height: 250 },
      { name: 'Wide Skyscraper',   width: 160, height: 600 },
      { name: 'Large Rectangle',   width: 336, height: 280 },
      { name: 'Full Banner',       width: 468, height: 60  },
      { name: 'Half Page',         width: 300, height: 600 },
    ]
  },
  {
    name: 'Custom',
    presets: [],
  },
]

const nameInputRef = ref<HTMLInputElement>()
const name         = ref('My Animation')
const activeCategory  = ref('Social Media')
const selectedPreset  = ref<SizePreset | null>(null)
const customWidth  = ref(1080)
const customHeight = ref(1080)

const activePresets = computed(() => {
  const cat = PRESET_CATEGORIES.find(c => c.name === activeCategory.value)
  return cat?.presets ?? []
})

function selectPreset(preset: SizePreset) {
  selectedPreset.value = preset
  customWidth.value    = preset.width
  customHeight.value   = preset.height
}

function previewStyle(preset: SizePreset): Record<string, string> {
  const maxW   = 64
  const maxH   = 48
  const aspect = preset.width / preset.height
  let w: number, h: number
  if (aspect > maxW / maxH) {
    w = maxW
    h = maxW / aspect
  } else {
    h = maxH
    w = maxH * aspect
  }
  return { width: `${w}px`, height: `${h}px` }
}

function onCreate() {
  const n = name.value.trim() || 'My Animation'
  const w = customWidth.value  || 1080
  const h = customHeight.value || 1080
  emit('create', n, w, h)
}

// Deselect preset when custom inputs diverge
watch([customWidth, customHeight], ([w, h]) => {
  if (selectedPreset.value && (selectedPreset.value.width !== w || selectedPreset.value.height !== h)) {
    selectedPreset.value = null
  }
})

// ── Figma tab ──────────────────────────────────────────────────

const figma = useFigmaImport()

const figmaLink  = ref('')
const figmaName  = ref('')
const isCreating = ref(false)

watch(() => figma.fileStructure.value, (fs) => {
  if (fs) figmaName.value = fs.name
})

async function onFigmaLinkLoad() {
  await figma.loadFileStructure(figmaLink.value.trim())
}

async function onCreateFromFigma() {
  if (figma.selectedNodeIds.value.size === 0 || !figmaName.value.trim()) return
  isCreating.value = true
  try {
    const { frames, elements } = await figma.collectFrames()
    emit('createFromFigma', figmaName.value.trim(), frames, elements)
  } catch (e) {
    figma.error.value = e instanceof Error ? e.message : 'Import failed'
    figma.step.value  = 'browse'
  } finally {
    isCreating.value = false
  }
}

// ── Reset on open / close ─────────────────────────────────────

watch(() => props.open, (open) => {
  if (open) {
    name.value           = 'My Animation'
    activeCategory.value = 'Social Media'
    selectedPreset.value = null
    customWidth.value    = 1080
    customHeight.value   = 1080
    nextTick(() => nameInputRef.value?.focus())
  } else {
    resetAll()
  }
})

function resetAll() {
  activeTab.value      = 'blank'
  name.value           = 'My Animation'
  activeCategory.value = 'Social Media'
  selectedPreset.value = null
  customWidth.value    = 1080
  customHeight.value   = 1080
  figmaLink.value      = ''
  figmaName.value      = ''
  isCreating.value     = false
  figma.resetToLink()
}
</script>

<template>
  <BaseModal :open="open" title="New Project" width="640px" @close="emit('close')">

    <!-- Tab switcher -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'blank' }" @click="activeTab = 'blank'">Blank</button>
      <button class="tab" :class="{ active: activeTab === 'figma' }" @click="activeTab = 'figma'">From Figma</button>
    </div>

    <!-- ── Blank tab ── -->
    <div v-if="activeTab === 'blank'">

      <!-- Project name -->
      <div class="field-group">
        <label class="field-label">Project name</label>
        <input
          ref="nameInputRef"
          v-model="name"
          class="name-input"
          type="text"
          placeholder="My Animation"
          @keydown.enter="onCreate"
        />
      </div>

      <!-- Category tabs -->
      <div class="category-tabs">
        <button
          v-for="cat in PRESET_CATEGORIES"
          :key="cat.name"
          class="cat-tab"
          :class="{ 'is-active': activeCategory === cat.name }"
          @click="activeCategory = cat.name"
        >{{ cat.name }}</button>
      </div>

      <!-- Preset grid -->
      <div v-if="activePresets.length > 0" class="preset-grid">
        <button
          v-for="preset in activePresets"
          :key="preset.name"
          class="preset-card"
          :class="{ 'is-selected': selectedPreset?.name === preset.name }"
          @click="selectPreset(preset)"
        >
          <div class="preset-preview">
            <div class="preset-frame" :style="previewStyle(preset)" />
          </div>
          <div class="preset-name">{{ preset.name }}</div>
          <div class="preset-size">{{ preset.width }}×{{ preset.height }}</div>
        </button>
      </div>

      <!-- Custom size inputs -->
      <div class="custom-size">
        <span class="custom-label">{{ activePresets.length > 0 ? 'Or set custom size' : 'Set size' }}</span>
        <div class="custom-inputs">
          <div class="size-field">
            <label class="size-label">Width</label>
            <input
              v-model.number="customWidth"
              class="size-input"
              type="number"
              min="1"
              max="10000"
            />
          </div>
          <span class="size-x">×</span>
          <div class="size-field">
            <label class="size-label">Height</label>
            <input
              v-model.number="customHeight"
              class="size-input"
              type="number"
              min="1"
              max="10000"
            />
          </div>
        </div>
      </div>

    </div>

    <!-- ── Figma tab ── -->
    <div v-else class="figma-tab">

      <!-- Not connected -->
      <div v-if="!figma.isConnected.value" class="figma-connect">
        <div class="figma-logo" aria-hidden="true">
          <svg viewBox="0 0 38 57" width="40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE"/>
            <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0z" fill="#0ACF83"/>
            <path d="M19 0v19h9.5a9.5 9.5 0 0 0 0-19H19z" fill="#FF7262"/>
            <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#F24E1E"/>
            <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#A259FF"/>
          </svg>
        </div>
        <p class="connect-title">Connect your Figma account</p>
        <p class="connect-sub">Import designs directly as new projects</p>
        <button class="btn btn-accent" @click="figma.connect()">Connect with Figma</button>
        <p class="connect-privacy">We only request read access to your files</p>
      </div>

      <!-- Connected -->
      <div v-else class="figma-connected">

        <!-- Badge + disconnect -->
        <div class="connected-hdr">
          <span class="connected-badge">
            <span class="dot" />
            Connected to Figma
          </span>
          <button class="btn-link" @click="figma.disconnect()">Disconnect</button>
        </div>

        <!-- Step: link input -->
        <template v-if="figma.step.value === 'link'">
          <div class="link-row">
            <input
              class="input"
              style="flex:1"
              v-model="figmaLink"
              placeholder="Paste a Figma file link…"
              @keydown.enter="onFigmaLinkLoad"
            />
            <button
              class="btn btn-accent load-btn"
              :disabled="!figmaLink.trim() || figma.isLoading.value"
              @click="onFigmaLinkLoad"
            >
              <span v-if="figma.isLoading.value" class="spinner" />
              <template v-else>Load</template>
            </button>
          </div>
          <div v-if="figma.error.value" class="error-bar">{{ figma.error.value }}</div>
        </template>

        <!-- Step: browse frame tree -->
        <template v-else-if="figma.step.value === 'browse'">
          <div class="browse-hdr">
            <span class="file-name">{{ figma.fileStructure.value?.name }}</span>
            <button class="btn-link" @click="figma.resetToLink()">← Back</button>
          </div>
          <div v-if="figma.error.value" class="error-bar">{{ figma.error.value }}</div>

          <div class="frame-tree">
            <template
              v-for="page in figma.fileStructure.value?.document.children"
              :key="page.id"
            >
              <div class="page-row" @click="figma.selectAllInPage(page)">
                <BaseToggle
                  :model-value="figma.allSelectedInPage(page)"
                  @update:model-value="figma.selectAllInPage(page)"
                  @click.stop
                />
                <span class="page-name">{{ page.name }}</span>
                <span class="page-count">
                  {{ page.children.filter((c: { type: string }) => c.type === 'FRAME' || c.type === 'COMPONENT').length }}
                </span>
              </div>
              <div
                v-for="frame in page.children.filter((c: { type: string }) => c.type === 'FRAME' || c.type === 'COMPONENT')"
                :key="frame.id"
                class="frame-row"
                :class="{ selected: figma.selectedNodeIds.value.has(frame.id) }"
                @click="figma.toggleNode(frame.id)"
              >
                <BaseToggle
                  :model-value="figma.selectedNodeIds.value.has(frame.id)"
                  @update:model-value="figma.toggleNode(frame.id)"
                  @click.stop
                />
                <span class="frame-name">{{ frame.name }}</span>
                <span v-if="frame.absoluteBoundingBox" class="frame-dims">
                  {{ Math.round(frame.absoluteBoundingBox.width) }}×{{ Math.round(frame.absoluteBoundingBox.height) }}
                </span>
              </div>
            </template>
          </div>

          <div v-if="figma.selectedNodeIds.value.size > 0" class="sel-row">
            {{ figma.selectedNodeIds.value.size }} frame{{ figma.selectedNodeIds.value.size !== 1 ? 's' : '' }} selected
            <button class="btn-link sm" @click="figma.selectNone()">Clear</button>
          </div>

          <div class="field mt-10">
            <label class="label">Project name</label>
            <input v-model="figmaName" class="input" type="text" placeholder="Project name" />
          </div>
        </template>

        <!-- Step: creating project -->
        <template v-else>
          <div class="creating-state">
            <span class="spinner lg" />
            <p class="creating-label">Creating project…</p>
            <div v-if="figma.importProgress.value" class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${(figma.importProgress.value.done / figma.importProgress.value.total) * 100}%` }"
              />
            </div>
            <p v-if="figma.importProgress.value" class="progress-text">
              {{ figma.importProgress.value.done }} / {{ figma.importProgress.value.total }} frames
            </p>
          </div>
        </template>

      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <BaseButton variant="ghost" size="sm" @click="emit('close')">Cancel</BaseButton>
      <BaseButton v-if="activeTab === 'blank'" variant="accent" size="sm" @click="onCreate">Create Project</BaseButton>
      <BaseButton
        v-else-if="figma.step.value === 'browse'"
        variant="accent"
        size="sm"
        :disabled="figma.selectedNodeIds.value.size === 0 || !figmaName.trim() || isCreating"
        @click="onCreateFromFigma"
      >Create &amp; Import {{ figma.selectedNodeIds.value.size > 0 ? `${figma.selectedNodeIds.value.size} frame${figma.selectedNodeIds.value.size !== 1 ? 's' : ''}` : '' }}</BaseButton>
      <BaseButton v-else-if="figma.step.value === 'importing'" variant="accent" size="sm" disabled>Creating…</BaseButton>
    </template>

  </BaseModal>
</template>

<style scoped>
/* ── Tab switcher ── */
.tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 1rem;
  background: var(--bg-3);
  border-radius: var(--r-md);
  padding: 3px;
}
.tab {
  flex: 1;
  height: 24px;
  border: none;
  border-radius: calc(var(--r-md) - 2px);
  background: transparent;
  color: var(--text-3);
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--ease);
  &:hover { color: var(--text-2); }
  &.active { background: var(--bg-5); color: var(--text-1); }
}

/* ── Project name ── */
.field-group { margin-bottom: 1rem; }

.field-label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-2);
  margin-bottom: 0.375rem;
}

.name-input {
  width: 100%;
  height: 2rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  color: var(--text-1);
  padding: 0 0.625rem;
  font-size: 0.8125rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 150ms var(--ease);
  &:focus { border-color: var(--accent); }
  &::placeholder { color: var(--text-4); }
}

/* ── Category tabs ── */
.category-tabs {
  display: flex;
  gap: 0.125rem;
  margin-bottom: 0.875rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.cat-tab {
  padding: 0.3125rem 0.625rem;
  border: none;
  background: none;
  color: var(--text-3);
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--r-md);
  white-space: nowrap;
  transition: all 150ms var(--ease);
  &:hover { color: var(--text-1); background: var(--bg-4); }
  &.is-active { color: var(--text-1); background: var(--accent-s); font-weight: 600; }
}

/* ── Preset grid ── */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6.25rem, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
  max-height: 15rem;
  overflow-y: auto;
  padding: 0.125rem;
}

.preset-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.625rem 0.375rem;
  background: var(--bg-3);
  border: 1.5px solid var(--border);
  border-radius: var(--r-md);
  cursor: pointer;
  transition: all 150ms var(--ease);
  &:hover { border-color: var(--accent); background: var(--bg-4); }
  &.is-selected {
    border-color: var(--accent);
    background: var(--accent-s);
    box-shadow: 0 0 0 1px var(--accent);
  }
}

.preset-preview {
  width: 4rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.125rem;
}

.preset-frame {
  background: var(--bg-5);
  border: 1px solid var(--border-l);
  border-radius: 2px;
  transition: background 150ms var(--ease);
  .preset-card.is-selected & {
    background: var(--accent);
    border-color: var(--accent);
    opacity: 0.5;
  }
}

.preset-name {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--text-1);
  text-align: center;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.preset-size {
  font-size: 0.5625rem;
  color: var(--text-4);
  font-family: var(--mono);
}

/* ── Custom size ── */
.custom-size {
  border-top: 1px solid var(--border);
  padding-top: 0.875rem;
}

.custom-label {
  font-size: 0.6875rem;
  color: var(--text-3);
  display: block;
  margin-bottom: 0.5rem;
}

.custom-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.size-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.size-label {
  font-size: 0.5625rem;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.size-input {
  width: 6.25rem;
  height: 1.875rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  color: var(--text-1);
  padding: 0 0.5rem;
  font-size: 0.75rem;
  font-family: var(--mono);
  outline: none;
  &:focus { border-color: var(--accent); }
}

.size-x {
  color: var(--text-4);
  font-size: 0.75rem;
  margin-top: 1rem;
}

/* ── Shared field styles (used by Figma tab) ── */
.field { display: flex; flex-direction: column; gap: 0.3125rem; }
.label { font-size: 0.75rem; font-weight: 500; color: var(--text-3); }
.input {
  height: 1.875rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-1);
  padding: 0 0.5rem;
  font-size: 0.75rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--ease);
  &:focus { border-color: var(--accent); }
}
.mt-10 { margin-top: 10px; }

/* ── Figma tab ── */
.figma-tab { min-height: 160px; }

.figma-connect {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 200px;
  text-align: center;
}
.figma-logo { margin-bottom: 4px; }
.connect-title { font-size: 13px; font-weight: 600; color: var(--text-1); }
.connect-sub { font-size: 11px; color: var(--text-3); max-width: 240px; line-height: 1.5; }
.connect-privacy { font-size: 10px; color: var(--text-4); margin-top: -2px; }

.figma-connected { display: flex; flex-direction: column; gap: 10px; }

.connected-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.connected-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--green);
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--green);
}

.link-row { display: flex; gap: 6px; }
.load-btn {
  height: 30px;
  padding: 0 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.browse-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.file-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.frame-tree {
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  overflow-y: auto;
  max-height: 200px;
  background: var(--bg-3);
}
.page-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  background: var(--bg-4);
  cursor: pointer;
  user-select: none;
  position: sticky;
  top: 0;
  z-index: 1;
  &:hover { background: var(--bg-5); }
}
.page-name {
  flex: 1;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.page-count {
  font-size: 10px;
  color: var(--text-4);
  background: var(--bg-5);
  padding: 1px 5px;
  border-radius: 9px;
}
.frame-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px 5px 22px;
  cursor: pointer;
  user-select: none;
  border-top: 1px solid var(--border-l);
  transition: background var(--ease);
  &:hover { background: var(--bg-4); }
  &.selected { background: var(--accent-s); }
}
.frame-name {
  flex: 1;
  font-size: 11px;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.frame-dims {
  font-size: 10px;
  color: var(--text-4);
  font-family: var(--mono);
  flex-shrink: 0;
}
.sel-row {
  font-size: 11px;
  color: var(--text-2);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Creating state ── */
.creating-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 0;
}
.creating-label { font-size: 12px; color: var(--text-2); }
.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--border-l);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.3s ease;
}
.progress-text { font-size: 11px; color: var(--text-3); font-family: var(--mono); }

/* ── Inline buttons ── */
.btn {
  height: 28px;
  padding: 0 12px;
  border-radius: var(--r-md);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--ease);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}
.btn-accent {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  &:hover:not(:disabled) { background: var(--accent-h); }
}
.btn-link {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 11px;
  cursor: pointer;
  padding: 0;
  &:hover { text-decoration: underline; }
  &.sm { font-size: 10px; }
}

/* ── Misc ── */
.error-bar {
  padding: 6px 10px;
  background: var(--red-s);
  border: 1px solid var(--red);
  border-radius: var(--r-md);
  font-size: 11px;
  color: var(--red);
}
.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  &.lg {
    width: 22px;
    height: 22px;
    border-color: var(--border-l);
    border-top-color: var(--accent);
  }
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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

const name   = ref('My Animation')
const width  = ref(800)
const height = ref(600)

const PRESETS = [
  { label: '800 × 600',   w: 800,  h: 600  },
  { label: '1920 × 1080', w: 1920, h: 1080 },
  { label: '1280 × 720',  w: 1280, h: 720  },
  { label: '400 × 400',   w: 400,  h: 400  },
  { label: '500 × 500',   w: 500,  h: 500  },
]

function applyPreset(w: number, h: number) {
  width.value  = w
  height.value = h
}

function onCreate() {
  if (!name.value.trim()) return
  emit('create', name.value.trim(), width.value, height.value)
}

// ── Figma tab ──────────────────────────────────────────────────

const figma = useFigmaImport()

const figmaLink  = ref('')
const figmaName  = ref('')
const isCreating = ref(false)

// Auto-fill project name when file structure is loaded
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
    figma.step.value = 'browse'
  } finally {
    isCreating.value = false
  }
}

// ── Reset on close ─────────────────────────────────────────────

watch(() => props.open, (open) => {
  if (!open) resetAll()
})

function resetAll() {
  activeTab.value  = 'blank'
  name.value       = 'My Animation'
  width.value      = 800
  height.value     = 600
  figmaLink.value  = ''
  figmaName.value  = ''
  isCreating.value = false
  figma.resetToLink()
}
</script>

<template>
  <BaseModal :open="open" title="New Project" width="480px" @close="emit('close')">

    <!-- Tab switcher -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'blank' }" @click="activeTab = 'blank'">Blank</button>
      <button class="tab" :class="{ active: activeTab === 'figma' }" @click="activeTab = 'figma'">From Figma</button>
    </div>

    <!-- ── Blank tab ── -->
    <div v-if="activeTab === 'blank'" class="form">
      <div class="field">
        <label class="label">Project name</label>
        <input v-model="name" class="input" type="text" placeholder="My Animation" />
      </div>
      <div class="field">
        <label class="label">Artboard size</label>
        <div class="size-row">
          <input v-model.number="width"  class="input is-compact" type="number" min="1" max="8192" />
          <span class="times">×</span>
          <input v-model.number="height" class="input is-compact" type="number" min="1" max="8192" />
        </div>
      </div>
      <div class="presets">
        <button
          v-for="p in PRESETS"
          :key="p.label"
          class="chip"
          :class="{ 'is-active': width === p.w && height === p.h }"
          @click="applyPreset(p.w, p.h)"
        >{{ p.label }}</button>
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
                  {{ page.children.filter(c => c.type === 'FRAME' || c.type === 'COMPONENT').length }}
                </span>
              </div>
              <div
                v-for="frame in page.children.filter(c => c.type === 'FRAME' || c.type === 'COMPONENT')"
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
      <BaseButton v-if="activeTab === 'blank'" variant="accent" size="sm" @click="onCreate">Create</BaseButton>
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
  margin-bottom: 14px;
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
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--ease);
  &:hover { color: var(--text-2); }
  &.active { background: var(--bg-5); color: var(--text-1); }
}

/* ── Shared field / form styles ── */
.form { display: flex; flex-direction: column; gap: 0.875rem; }
.field { display: flex; flex-direction: column; gap: 0.3125rem; }
.label { font-size: 0.75rem; font-weight: 500; color: var(--text-3); }
.label-note { font-size: 0.625rem; color: var(--text-4); font-weight: 400; }
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
  &.is-compact { width: 5rem; flex: none; font-family: var(--mono); }
}
.size-row { display: flex; align-items: center; gap: 0.5rem; }
.times { font-size: 0.75rem; color: var(--text-4); }
.presets { display: flex; flex-wrap: wrap; gap: 0.25rem; }
.chip {
  height: 1.375rem;
  padding: 0 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--bg-3);
  color: var(--text-3);
  font-size: 0.625rem;
  cursor: pointer;
  transition: all var(--ease);
  font-family: var(--mono);
  &:hover, &.is-active {
    background: var(--accent-s);
    color: var(--accent);
    border-color: var(--accent);
  }
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

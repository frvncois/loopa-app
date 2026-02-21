<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useImport } from '@/composables/useImport'
import { importSvg } from '@/lib/import/SvgImporter'
import type { ImportResult } from '@/types/export'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { importSvgString } = useImport()

const activeTab    = ref<'file' | 'code'>('file')
const svgCode      = ref('')
const isDragging   = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const preview      = ref<ImportResult | null>(null)
const pendingSvg   = ref('')
const parseError   = ref('')

watch(() => props.open, (open) => {
  if (!open) resetAll()
})

function resetAll() {
  svgCode.value    = ''
  preview.value    = null
  pendingSvg.value = ''
  parseError.value = ''
  isDragging.value = false
  activeTab.value  = 'file'
}

function tryPreview(svg: string) {
  parseError.value = ''
  try {
    preview.value    = importSvg(svg)
    pendingSvg.value = svg
  } catch {
    parseError.value = 'Could not parse SVG — check the code and try again.'
    preview.value    = null
    pendingSvg.value = ''
  }
}

function onCodeInput() {
  if (svgCode.value.trim()) {
    tryPreview(svgCode.value)
  } else {
    preview.value    = null
    pendingSvg.value = ''
    parseError.value = ''
  }
}

async function handleFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
    parseError.value = 'Please select an SVG (.svg) file.'
    return
  }
  tryPreview(await file.text())
}

function onDragOver(e: DragEvent) { e.preventDefault(); isDragging.value = true }
function onDragLeave() { isDragging.value = false }

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) handleFile(file)
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleFile(file)
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function confirmImport() {
  if (!pendingSvg.value) return
  importSvgString(pendingSvg.value)
  emit('close')
}
</script>

<template>
  <BaseModal :open="open" title="Import SVG" width="500px" @close="emit('close')">
    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'file' }" @click="activeTab = 'file'">SVG File</button>
      <button class="tab" :class="{ active: activeTab === 'code' }" @click="activeTab = 'code'">Paste Code</button>
    </div>

    <!-- File tab -->
    <div v-if="activeTab === 'file'" class="tab-body">
      <div
        class="drop-zone"
        :class="{ dragging: isDragging }"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @click="fileInputRef?.click()"
      >
        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5-5 5 5M12 6v10" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="drop-label">Drop SVG file here</span>
        <span class="drop-sub">or click to browse</span>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept=".svg,image/svg+xml"
        style="display:none"
        @change="onFileChange"
      />
    </div>

    <!-- Code tab -->
    <div v-else class="tab-body">
      <textarea
        v-model="svgCode"
        class="code-area"
        placeholder="Paste SVG code here…"
        spellcheck="false"
        @input="onCodeInput"
      />
    </div>

    <!-- Parse error -->
    <div v-if="parseError" class="error-bar">{{ parseError }}</div>

    <!-- Preview -->
    <div v-if="preview" class="preview">
      <div class="preview-row">
        <span class="preview-label">Layers found</span>
        <span class="preview-value accent">{{ preview.metadata.layerCount }}</span>
      </div>
      <div v-if="preview.metadata.isFigmaExport" class="preview-row">
        <span class="preview-label">Source</span>
        <span class="preview-value figma-badge">Figma export</span>
      </div>
      <div v-if="preview.warnings.length > 0" class="warnings">
        <div v-for="(w, i) in preview.warnings" :key="i" class="warn-item">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
            <path d="M8 1L15 14H1L8 1z" stroke="currentColor" stroke-width="1.2"/>
            <path d="M8 6v4M8 11.5v1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          {{ w.message }}
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-ghost" @click="emit('close')">Cancel</button>
      <button class="btn btn-accent" :disabled="!pendingSvg" @click="confirmImport">
        Import{{ preview ? ` ${preview.metadata.layerCount} layer${preview.metadata.layerCount !== 1 ? 's' : ''}` : '' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 12px;
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
  transition: all var(--ease);
  &:hover { color: var(--text-2); }
  &.active { background: var(--bg-5); color: var(--text-1); }
}

.tab-body { min-height: 140px; }

.drop-zone {
  min-height: 140px;
  border: 1.5px dashed var(--border-l);
  border-radius: var(--r-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all var(--ease);
  color: var(--text-3);
  &:hover, &.dragging {
    border-color: var(--accent);
    background: var(--accent-s);
    color: var(--text-2);
  }
}
.upload-icon {
  width: 28px;
  height: 28px;
  color: var(--text-4);
  .drop-zone:hover &, .drop-zone.dragging & { color: var(--accent); }
}
.drop-label { font-size: 12px; font-weight: 500; color: var(--text-2); }
.drop-sub   { font-size: 10px; color: var(--text-4); }

.code-area {
  width: 100%;
  min-height: 140px;
  resize: vertical;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  color: var(--text-1);
  font-family: var(--mono);
  font-size: 10px;
  line-height: 1.6;
  padding: 8px 10px;
  outline: none;
  transition: border-color var(--ease);
  &:focus { border-color: var(--border-focus); }
}

.error-bar {
  margin-top: 10px;
  padding: 7px 10px;
  background: var(--red-s);
  border: 1px solid var(--red);
  border-radius: var(--r-md);
  font-size: 11px;
  color: var(--red);
}

.preview {
  margin-top: 12px;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.preview-label { font-size: 11px; color: var(--text-3); }
.preview-value {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-1);
  font-family: var(--mono);
  &.accent { color: var(--accent); }
}
.figma-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: var(--r-sm);
  background: rgba(100, 210, 130, 0.12);
  border: 1px solid rgba(100, 210, 130, 0.3);
  color: #64d282;
}
.warnings { margin-top: 4px; display: flex; flex-direction: column; gap: 4px; }
.warn-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--yellow);
  svg { flex-shrink: 0; }
}

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
.btn-accent {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  &:hover:not(:disabled) { background: var(--accent-h); }
}
</style>

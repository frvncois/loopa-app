<script setup lang="ts">
import { ref } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { saveVideo } from '@/lib/utils/videoStorage'
import { generateId } from '@/lib/utils/id'
import type { VideoElement } from '@/types/elements'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const editor = useEditorStore()
const ui = useUiStore()

const fileInputRef = ref<HTMLInputElement>()
const previewRef = ref<HTMLVideoElement>()
const dragOver = ref(false)
const videoFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const duration = ref(0)
const naturalWidth = ref(0)
const naturalHeight = ref(0)
const adding = ref(false)
const error = ref<string | null>(null)

function formatSize(bytes: number): string {
  return bytes < 1_048_576
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1_048_576).toFixed(1)} MB`
}

function setFile(file: File) {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  videoFile.value = file
  previewUrl.value = URL.createObjectURL(file)
  error.value = null
  duration.value = 0
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) setFile(file)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragOver.value = true
}
function onDragLeave() { dragOver.value = false }
function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('video/')) setFile(file)
}

function onLoadedMetadata() {
  const v = previewRef.value
  if (!v) return
  duration.value = v.duration
  naturalWidth.value = v.videoWidth
  naturalHeight.value = v.videoHeight
}

function onVideoError() {
  error.value = 'This video format is not supported by your browser.'
}

async function addVideo() {
  if (!videoFile.value || adding.value || error.value) return
  adding.value = true
  try {
    const storageId = generateId('vid')
    await saveVideo(storageId, videoFile.value)

    const frameId = ui.activeFrameId
    const frame = frameId ? editor.frames.find(f => f.id === frameId) : null
    const fw = frame?.width ?? 800
    const fh = frame?.height ?? 600

    const scale = Math.min((fw * 0.8) / naturalWidth.value, (fh * 0.8) / naturalHeight.value, 1)
    const w = Math.round(naturalWidth.value * scale)
    const h = Math.round(naturalHeight.value * scale)

    const el: VideoElement = {
      id: generateId('el'),
      type: 'video',
      name: videoFile.value.name.replace(/\.[^.]+$/, ''),
      x: Math.round((fw - w) / 2),
      y: Math.round((fh - h) / 2),
      width: w,
      height: h,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      blendMode: 'normal',
      fills: [],
      strokes: [],
      shadows: [],
      blur: 0,
      visible: true,
      locked: false,
      flipX: false,
      flipY: false,
      videoStorageId: storageId,
      fileName: videoFile.value.name,
      fileSize: videoFile.value.size,
      duration: duration.value,
      naturalWidth: naturalWidth.value,
      naturalHeight: naturalHeight.value,
      trimStart: 0,
      trimEnd: duration.value,
      fit: 'contain',
      playbackRate: 1,
    }

    if (frameId) {
      editor.addElement(el, frameId)
      ui.select(el.id)
    }
    closeAndReset()
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'QuotaExceededError') {
      error.value = 'Not enough browser storage. Try removing unused videos or clearing browser data.'
    } else {
      error.value = 'Failed to save video. Please try again.'
    }
  } finally {
    adding.value = false
  }
}

function closeAndReset() {
  emit('close')
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
  videoFile.value = null
  duration.value = 0
  error.value = null
  dragOver.value = false
  if (fileInputRef.value) fileInputRef.value.value = ''
}
</script>

<template>
  <BaseModal :open="open" title="Add Video" @close="closeAndReset">
    <div class="body">

      <!-- Drop zone (no file yet) -->
      <div
        v-if="!videoFile"
        class="drop-zone"
        :class="{ 'is-over': dragOver }"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @click="fileInputRef?.click()"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" opacity="0.4">
          <rect x="2" y="3" width="15" height="14" rx="2.5"/>
          <path d="M17 8.5L22 6v12l-5-2.5V8.5z"/>
        </svg>
        <p class="drop-title">Drop video here or click to browse</p>
        <p class="drop-hint">MP4, WebM, MOV, OGG</p>
        <input ref="fileInputRef" type="file" accept="video/*" style="display:none" @change="onFileChange" />
      </div>

      <!-- Preview -->
      <div v-else class="preview-section">
        <div class="video-wrap">
          <video
            ref="previewRef"
            :src="previewUrl!"
            class="video-preview"
            controls
            preload="metadata"
            @loadedmetadata="onLoadedMetadata"
            @error="onVideoError"
          />
        </div>
        <div class="meta">
          <span class="file-name">{{ videoFile!.name }}</span>
          <span class="file-size">
            {{ formatSize(videoFile!.size) }} · {{ Math.round(duration * 10) / 10 }}s
            <template v-if="naturalWidth"> · {{ naturalWidth }}×{{ naturalHeight }}</template>
          </span>
        </div>
        <button class="replace-btn" @click="fileInputRef?.click()">
          Replace File
        </button>
        <input ref="fileInputRef" type="file" accept="video/*" style="display:none" @change="onFileChange" />
      </div>

      <!-- Error -->
      <p v-if="error" class="error">{{ error }}</p>

      <!-- Privacy note -->
      <div class="privacy">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="flex-shrink:0;margin-top:1px">
          <circle cx="8" cy="8" r="7"/>
          <line x1="8" y1="7" x2="8" y2="11"/>
          <circle cx="8" cy="5" r="0.75" fill="currentColor" stroke="none"/>
        </svg>
        Videos are stored locally in your browser and never uploaded to any server.
      </div>

    </div>

    <template #footer>
      <button class="btn" @click="closeAndReset">Cancel</button>
      <button
        class="btn is-accent"
        :disabled="!videoFile || adding || !!error || duration === 0"
        @click="addVideo"
      >{{ adding ? 'Adding…' : 'Add Video' }}</button>
    </template>
  </BaseModal>
</template>

<style scoped>
.body { display: flex; flex-direction: column; gap: 0.75rem; }

.drop-zone {
  border: 1.5px dashed var(--border-l);
  border-radius: var(--r-lg);
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all var(--ease);
  &:hover, &.is-over { border-color: var(--accent); background: rgba(67, 83, 255, 0.04); }
}
.drop-title { font-size: 0.8125rem; font-weight: 500; color: var(--text-2); margin: 0; }
.drop-hint  { font-size: 0.6875rem; color: var(--text-4); margin: 0; }

.preview-section { display: flex; flex-direction: column; gap: 0.5rem; }
.video-wrap {
  background: #000;
  border-radius: var(--r-md);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 220px;
}
.video-preview { max-width: 100%; max-height: 220px; display: block; }

.meta { display: flex; flex-direction: column; gap: 0.125rem; }
.file-name {
  font-family: var(--mono);
  font-size: 0.625rem;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-size { font-size: 0.625rem; color: var(--text-4); }

.replace-btn {
  align-self: flex-start;
  height: 1.625rem;
  padding: 0 0.625rem;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: none;
  color: var(--text-2);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all var(--ease);
  &:hover { background: var(--bg-4); }
}

.error {
  margin: 0;
  font-size: 0.75rem;
  color: #ef4444;
  padding: 0.5rem 0.625rem;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--r-sm);
}

.privacy {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  padding: 0.5rem 0.625rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  font-size: 0.6875rem;
  color: var(--text-3);
  line-height: 1.4;
}

.btn {
  height: 1.875rem;
  padding: 0 0.875rem;
  border-radius: var(--r-md);
  border: 1px solid var(--border);
  background: var(--bg-3);
  color: var(--text-2);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--ease);
  &:hover { background: var(--bg-4); color: var(--text-1); }
  &.is-accent {
    background: var(--accent);
    border-color: transparent;
    color: #fff;
    &:hover:not(:disabled) { background: var(--accent-h); }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }
}
</style>

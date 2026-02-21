<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { saveVideo, deleteVideo } from '@/lib/utils/videoStorage'
import { generateId } from '@/lib/utils/id'
import type { VideoElement } from '@/types/elements'

const editor = useEditorStore()
const ui = useUiStore()

const el = computed((): VideoElement | null => {
  if (ui.selectedIds.size !== 1) return null
  const e = editor.getElementById([...ui.selectedIds][0])
  return e?.type === 'video' ? (e as VideoElement) : null
})

function update(changes: Record<string, unknown>) {
  if (!el.value) return
  editor.updateElement(el.value.id, changes as Partial<VideoElement>)
}

function parseSec(val: string): number {
  return Math.max(0, parseFloat(val) || 0)
}

function formatSize(bytes: number): string {
  return bytes < 1_048_576
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1_048_576).toFixed(1)} MB`
}

async function replaceVideo() {
  if (!el.value) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'video/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file || !el.value) return

    const tmpUrl = URL.createObjectURL(file)
    const tmpVid = document.createElement('video')
    tmpVid.preload = 'metadata'
    tmpVid.src = tmpUrl

    await new Promise<void>((resolve) => {
      tmpVid.onloadedmetadata = () => resolve()
      tmpVid.onerror = () => resolve()
      tmpVid.load()
    })

    const dur = tmpVid.duration || 0
    const nw = tmpVid.videoWidth || el.value.naturalWidth
    const nh = tmpVid.videoHeight || el.value.naturalHeight
    URL.revokeObjectURL(tmpUrl)

    const newId = generateId('vid')
    const oldId = el.value.videoStorageId
    try {
      await saveVideo(newId, file)
      update({
        videoStorageId: newId,
        fileName: file.name,
        fileSize: file.size,
        duration: dur,
        naturalWidth: nw,
        naturalHeight: nh,
        trimStart: 0,
        trimEnd: dur,
      })
      deleteVideo(oldId).catch(() => {})
    } catch {
      // ignore
    }
  }
  input.click()
}
</script>

<template>
  <div v-if="el" class="section">
    <div class="title">Video</div>

    <!-- File info -->
    <div class="info-block">
      <span class="file-name">{{ el.fileName }}</span>
      <span class="file-size">{{ formatSize(el.fileSize) }} · {{ Math.round(el.duration * 10) / 10 }}s · {{ el.naturalWidth }}×{{ el.naturalHeight }}</span>
    </div>

    <!-- Trim -->
    <div class="row">
      <span class="label">Trim</span>
      <div class="pair">
        <input
          class="field"
          type="number" min="0" :max="el.trimEnd" step="0.1"
          :value="Math.round(el.trimStart * 100) / 100"
          title="Trim start (s)"
          @change="update({ trimStart: Math.min(parseSec(($event.target as HTMLInputElement).value), el!.trimEnd) })"
        />
        <input
          class="field"
          type="number" :min="el.trimStart" :max="el.duration" step="0.1"
          :value="Math.round(el.trimEnd * 100) / 100"
          title="Trim end (s)"
          @change="update({ trimEnd: Math.max(parseSec(($event.target as HTMLInputElement).value), el!.trimStart) })"
        />
      </div>
      <span class="unit">s</span>
    </div>

    <!-- Fit -->
    <div class="row">
      <span class="label">Fit</span>
      <select
        class="select"
        :value="el.fit"
        @change="update({ fit: ($event.target as HTMLSelectElement).value })"
      >
        <option value="contain">Contain</option>
        <option value="cover">Cover</option>
        <option value="fill">Fill</option>
      </select>
    </div>

    <!-- Speed -->
    <div class="row">
      <span class="label">Speed</span>
      <input
        class="field"
        type="number" min="0.25" max="4" step="0.25"
        :value="el.playbackRate"
        @change="update({ playbackRate: Math.min(4, Math.max(0.25, parseFloat(($event.target as HTMLInputElement).value) || 1)) })"
      />
      <span class="unit">×</span>
    </div>

    <!-- Replace -->
    <button class="replace-btn" @click="replaceVideo">Replace Video…</button>
  </div>
</template>

<style scoped>
.section {
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.title { font-size: 0.6875rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.125rem; }

.info-block { display: flex; flex-direction: column; gap: 0.125rem; margin-bottom: 0.25rem; }
.file-name {
  font-family: var(--mono);
  font-size: 0.625rem;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-size { font-size: 0.625rem; color: var(--text-4); }

.row { display: flex; align-items: center; gap: 0.375rem; min-height: 1.625rem; }
.label {
  width: 4.5rem;
  min-width: 4.5rem;
  font-size: 0.6875rem;
  color: var(--text-3);
  font-weight: 500;
}
.pair { display: flex; gap: 0.25rem; flex: 1; }
.field {
  flex: 1;
  height: 1.625rem;
  min-width: 0;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-1);
  padding: 0 0.4375rem;
  font-family: var(--mono);
  font-size: 0.75rem;
  outline: none;
  transition: border-color var(--ease);
  &:focus { border-color: var(--accent); }
}
.select {
  flex: 1;
  height: 1.625rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-1);
  padding: 0 0.375rem;
  font-size: 0.75rem;
  outline: none;
  cursor: pointer;
  transition: border-color var(--ease);
  &:focus { border-color: var(--accent); }
}
.unit { font-size: 0.6875rem; color: var(--text-4); font-family: var(--mono); }

.replace-btn {
  align-self: flex-start;
  margin-top: 0.125rem;
  height: 1.625rem;
  padding: 0 0.625rem;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: none;
  color: var(--text-2);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all var(--ease);
  &:hover { background: var(--bg-4); color: var(--text-1); }
}
</style>

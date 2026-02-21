<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { storeImage } from '@/lib/utils/videoStorage'
import { generateId } from '@/lib/utils/id'
import type { ImageElement } from '@/types/elements'

const editor = useEditorStore()
const ui = useUiStore()

const fileInputRef = ref<HTMLInputElement>()

const el = computed(() => {
  const id = [...ui.selectedIds][0]
  return (editor.getElementById(id) as ImageElement | null) ?? null
})

function formatSize(bytes: number): string {
  return bytes < 1_048_576
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1_048_576).toFixed(1)} MB`
}

function setFit(fit: 'contain' | 'cover' | 'fill') {
  if (!el.value) return
  editor.updateElement(el.value.id, { objectFit: fit })
}

function getFilters() {
  return el.value?.imageFilters ?? { brightness: 100, contrast: 100, saturation: 100, hue: 0, grayscale: 0 }
}

function setFilter(key: keyof NonNullable<ImageElement['imageFilters']>, value: number) {
  if (!el.value) return
  editor.updateElement(el.value.id, {
    imageFilters: { ...getFilters(), [key]: value }
  })
}

function resetFilters() {
  if (!el.value) return
  editor.updateElement(el.value.id, {
    imageFilters: { brightness: 100, contrast: 100, saturation: 100, hue: 0, grayscale: 0 }
  })
}

async function onReplaceFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !el.value) return
  try {
    const img = new Image()
    const tempUrl = URL.createObjectURL(file)
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject()
      img.src = tempUrl
    })
    const storageId = generateId('img')
    await storeImage(storageId, file)
    editor.updateElement(el.value.id, {
      imageStorageId: storageId,
      imageFileName: file.name,
      imageFileSize: file.size,
      imageWidth: img.naturalWidth,
      imageHeight: img.naturalHeight,
    })
    URL.revokeObjectURL(tempUrl)
  } catch {
    // silently ignore replace errors
  } finally {
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

const filters = computed(() => getFilters())
</script>

<template>
  <div v-if="el" class="section">
    <div class="title">Image</div>

    <!-- File info -->
    <div class="info-row">
      <span class="file-name">{{ el.imageFileName }}</span>
      <span class="file-meta">{{ formatSize(el.imageFileSize) }} · {{ el.imageWidth }}×{{ el.imageHeight }}</span>
    </div>

    <!-- Object fit -->
    <div class="row">
      <span class="label">Fit</span>
      <div class="fit-group">
        <button
          class="fit-btn"
          :class="{ 'is-active': el.objectFit === 'contain' }"
          @click="setFit('contain')"
        >Contain</button>
        <button
          class="fit-btn"
          :class="{ 'is-active': el.objectFit === 'cover' }"
          @click="setFit('cover')"
        >Cover</button>
        <button
          class="fit-btn"
          :class="{ 'is-active': el.objectFit === 'fill' }"
          @click="setFit('fill')"
        >Fill</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-title">
      <span>Adjustments</span>
      <button class="reset-btn" @click="resetFilters">Reset</button>
    </div>

    <div class="row">
      <span class="label">Brightness</span>
      <input
        type="range" min="0" max="200" step="1"
        :value="filters.brightness"
        class="slider"
        @input="setFilter('brightness', +($event.target as HTMLInputElement).value)"
      />
      <span class="val">{{ filters.brightness }}</span>
    </div>
    <div class="row">
      <span class="label">Contrast</span>
      <input
        type="range" min="0" max="200" step="1"
        :value="filters.contrast"
        class="slider"
        @input="setFilter('contrast', +($event.target as HTMLInputElement).value)"
      />
      <span class="val">{{ filters.contrast }}</span>
    </div>
    <div class="row">
      <span class="label">Saturate</span>
      <input
        type="range" min="0" max="200" step="1"
        :value="filters.saturation"
        class="slider"
        @input="setFilter('saturation', +($event.target as HTMLInputElement).value)"
      />
      <span class="val">{{ filters.saturation }}</span>
    </div>
    <div class="row">
      <span class="label">Hue</span>
      <input
        type="range" min="-180" max="180" step="1"
        :value="filters.hue"
        class="slider"
        @input="setFilter('hue', +($event.target as HTMLInputElement).value)"
      />
      <span class="val">{{ filters.hue }}</span>
    </div>
    <div class="row">
      <span class="label">Grayscale</span>
      <input
        type="range" min="0" max="100" step="1"
        :value="filters.grayscale"
        class="slider"
        @input="setFilter('grayscale', +($event.target as HTMLInputElement).value)"
      />
      <span class="val">{{ filters.grayscale }}</span>
    </div>

    <!-- Replace -->
    <button class="replace-btn" @click="fileInputRef?.click()">Replace Image</button>
    <input ref="fileInputRef" type="file" accept="image/*" style="display:none" @change="onReplaceFile" />
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

.title {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-2);
  margin-bottom: 0.125rem;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  margin-bottom: 0.25rem;
}
.file-name {
  font-family: var(--mono);
  font-size: 0.625rem;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-meta { font-size: 0.625rem; color: var(--text-4); }

.row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 1.625rem;
}
.label {
  width: 4.5rem;
  min-width: 4.5rem;
  font-size: 0.6875rem;
  color: var(--text-3);
}

.fit-group {
  display: flex;
  gap: 0.125rem;
  flex: 1;
}
.fit-btn {
  flex: 1;
  height: 1.625rem;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--bg-3);
  color: var(--text-3);
  font-size: 0.625rem;
  cursor: pointer;
  transition: all var(--ease);
  &:hover { color: var(--text-1); background: var(--bg-4); }
  &.is-active { background: var(--accent-s); color: var(--accent); border-color: var(--accent); }
}

.filter-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-3);
  margin-top: 0.25rem;
}
.reset-btn {
  font-size: 0.625rem;
  color: var(--text-4);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  &:hover { color: var(--text-2); }
}

.slider {
  flex: 1;
  height: 0.25rem;
  appearance: none;
  background: var(--bg-5);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  &::-webkit-slider-thumb {
    appearance: none;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
  }
}
.val {
  font-family: var(--mono);
  font-size: 0.625rem;
  color: var(--text-3);
  width: 2rem;
  text-align: right;
}

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
  margin-top: 0.25rem;
  &:hover { background: var(--bg-4); }
}
</style>

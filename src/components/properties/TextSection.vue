<script setup lang="ts">
import { computed, inject, ref, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import type { TextElement, Element } from '@/types/elements'
import type { AnimatableProps } from '@/types/animation'
import type { useCustomFonts } from '@/composables/useCustomFonts'
import { BUILTIN_FONTS } from '@/composables/useCustomFonts'

const editor = useEditorStore()
const ui = useUiStore()

const getAnimatedEl = inject<(id: string) => Element | null>(
  'getAnimatedElement',
  (id) => editor.getElementById(id) ?? null
)
const setAnimatedProp = inject<(id: string, props: Partial<AnimatableProps>) => void>(
  'setAnimatedProperty',
  (id, props) => editor.updateElement(id, props)
)
const customFonts = inject<ReturnType<typeof useCustomFonts> | undefined>('customFonts', undefined)

const el = computed(() => {
  if (ui.selectedIds.size !== 1) return null
  const e = getAnimatedEl([...ui.selectedIds][0])
  return e?.type === 'text' ? (e as TextElement) : null
})

function update(key: string, val: any) {
  if (!el.value) return
  if (key === 'fontSize') {
    const num = parseFloat(val)
    if (!isNaN(num)) setAnimatedProp(el.value.id, { fontSize: num })
  } else {
    editor.updateElement(el.value.id, { [key]: val })
  }
  // Trigger accurate text bounds remeasurement after any text property change
  const id = el.value.id
  window.dispatchEvent(new CustomEvent('loopa:remeasureText', { detail: { id } }))
}

// ── Font picker ────────────────────────────────────────────────

const pickerOpen = ref(false)
const fontSearch = ref('')
const pickerAnchor = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const filteredBuiltin = computed(() => {
  const q = fontSearch.value.toLowerCase()
  return q ? BUILTIN_FONTS.filter(f => f.toLowerCase().includes(q)) : BUILTIN_FONTS
})

const filteredCustom = computed(() => {
  const q = fontSearch.value.toLowerCase()
  const fonts = customFonts?.customFonts.value ?? []
  return q ? fonts.filter(f => f.family.toLowerCase().includes(q)) : fonts
})

function openPicker() {
  pickerOpen.value = true
  fontSearch.value = ''
}

function selectFont(family: string) {
  pickerOpen.value = false
  update('fontFamily', family)
  customFonts?.loadGoogleFont(family)
}

async function deleteCustomFont(id: string) {
  await customFonts?.removeFont(id)
}

function triggerUpload() {
  fileInput.value?.click()
}

async function onFontUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !customFonts) return
  ;(e.target as HTMLInputElement).value = ''
  const meta = await customFonts.addFont(file)
  if (meta) {
    update('fontFamily', meta.family)
    pickerOpen.value = false
  }
}

function onDocMouseDown(e: MouseEvent) {
  if (!pickerOpen.value) return
  if (!pickerAnchor.value?.contains(e.target as Node)) {
    pickerOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onDocMouseDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocMouseDown))
</script>

<template>
  <div v-if="el" class="section">

    <!-- Font family picker -->
    <div class="row" ref="pickerAnchor">
      <span class="label">Font</span>
      <div class="picker-wrap">
        <button
          class="field is-full"
          :style="{ fontFamily: el.fontFamily }"
          @click="openPicker"
        >
          <span class="picker-label">{{ el.fontFamily }}</span>
          <svg width="8" height="5" viewBox="0 0 8 5" fill="none" class="caret">
            <path d="M1 1L4 4L7 1" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
          </svg>
        </button>

        <!-- Dropdown -->
        <div v-if="pickerOpen" class="font-dropdown" @mousedown.stop>
          <input
            class="font-search"
            type="text"
            placeholder="Search fonts…"
            v-model="fontSearch"
            autofocus
          />
          <div class="font-list">
            <!-- Custom uploaded fonts -->
            <template v-if="filteredCustom.length">
              <div class="font-group">Custom</div>
              <div
                v-for="font in filteredCustom"
                :key="font.id"
                class="font-item"
                :class="{ 'is-active': el.fontFamily === font.family }"
                @click="selectFont(font.family)"
              >
                <span :style="{ fontFamily: font.family }">{{ font.family }}</span>
                <button
                  class="font-delete"
                  title="Remove font"
                  @click.stop="deleteCustomFont(font.id)"
                >×</button>
              </div>
            </template>

            <!-- Built-in / Google fonts -->
            <div class="font-group">Fonts</div>
            <div
              v-for="name in filteredBuiltin"
              :key="name"
              class="font-item"
              :class="{ 'is-active': el.fontFamily === name }"
              @click="selectFont(name)"
            >
              <span :style="{ fontFamily: name }">{{ name }}</span>
            </div>

            <div v-if="!filteredBuiltin.length && !filteredCustom.length" class="font-empty">
              No fonts found
            </div>
          </div>
          <button class="upload-btn" @click="triggerUpload">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="flex-shrink:0">
              <path d="M5 1v6M2 4l3-3 3 3M1 9h8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
            </svg>
            Upload font…
          </button>
          <input
            ref="fileInput"
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            style="display:none"
            @change="onFontUpload"
          />
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="row" style="align-items: flex-start; padding-top: 0.125rem">
      <span class="label" style="padding-top: 0.25rem">Content</span>
      <textarea
        class="field"
        style="height: auto; min-height: 3rem; resize: vertical; padding-top: 0.25rem; padding-bottom: 0.25rem; line-height: 1.4; white-space: pre-wrap; font-family: var(--mono)"
        rows="2"
        :value="el.text"
        @change="update('text', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>

    <!-- Font size -->
    <div class="row">
      <span class="label">Font size</span>
      <input class="field is-pair" type="number" :value="el.fontSize" min="1" @change="update('fontSize', parseFloat(($event.target as HTMLInputElement).value))" />
    </div>

    <!-- Weight -->
    <div class="row">
      <span class="label">Weight</span>
      <select class="select" :value="String(el.fontWeight)" @change="update('fontWeight', parseInt(($event.target as HTMLSelectElement).value))">
        <option value="100">Thin</option>
        <option value="200">ExtraLight</option>
        <option value="300">Light</option>
        <option value="400">Regular</option>
        <option value="500">Medium</option>
        <option value="600">Semibold</option>
        <option value="700">Bold</option>
        <option value="800">ExtraBold</option>
        <option value="900">Black</option>
      </select>
    </div>

    <!-- Align -->
    <div class="row">
      <span class="label">Align</span>
      <select class="select" :value="el.textAlign" @change="update('textAlign', ($event.target as HTMLSelectElement).value)">
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
        <option value="justify">Justify</option>
      </select>
    </div>

  </div>
</template>

<style scoped>
.section { padding: 0.375rem 0.75rem 0.625rem; }
.row {
  display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.375rem; min-height: 1.625rem;
  &:last-child { margin-bottom: 0; }
}
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.75rem; color: var(--text-3); font-weight: 500; }
.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--r-sm);
  color: var(--text-1); padding: 0 0.4375rem; font-family: var(--mono); font-size: 0.75rem; outline: none;
  transition: border-color var(--ease); min-width: 0;
  &:focus { border-color: var(--accent); }
  &.is-pair { width: 4.75rem; min-width: 4.75rem; flex: none; }
  &.is-full { width: 100%; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; padding: 0 0.375rem; }
}
.select {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--r-sm);
  color: var(--text-1); padding: 0 1.25rem 0 0.375rem; font-size: 0.75rem; outline: none; cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236a6a7e' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 0.375rem center;
}

/* Font picker */
.picker-wrap {
  flex: 1;
  position: relative;
}
.picker-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  font-size: 0.75rem;
}
.caret {
  flex-shrink: 0;
  color: var(--text-3);
}
.font-dropdown {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  min-width: 10rem;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  z-index: 300;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.font-search {
  height: 1.75rem;
  background: var(--bg-3);
  border: none;
  border-bottom: 1px solid var(--border);
  color: var(--text-1);
  padding: 0 0.5rem;
  font-size: 0.75rem;
  outline: none;
  &::placeholder { color: var(--text-4); }
}
.font-list {
  max-height: 11rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.font-group {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--text-4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.375rem 0.5rem 0.125rem;
}
.font-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: 0.8125rem;
  color: var(--text-2);
  &:hover { background: var(--bg-4); }
  &.is-active { color: var(--accent); }
  > span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
.font-delete {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  line-height: 1rem;
  text-align: center;
  font-size: 0.875rem;
  background: none;
  border: none;
  color: var(--text-4);
  cursor: pointer;
  border-radius: 2px;
  &:hover { color: var(--danger, #ff4f4f); background: var(--bg-5); }
}
.font-empty {
  padding: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-4);
  text-align: center;
}
.upload-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  height: 1.75rem;
  padding: 0 0.5rem;
  background: none;
  border: none;
  border-top: 1px solid var(--border);
  color: var(--text-3);
  font-size: 0.75rem;
  cursor: pointer;
  &:hover { color: var(--text-1); background: var(--bg-3); }
}
</style>

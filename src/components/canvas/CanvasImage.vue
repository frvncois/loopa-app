<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { getImageBlob } from '@/lib/utils/videoStorage'
import type { ImageElement } from '@/types/elements'

const props = defineProps<{ element: ImageElement }>()

const blobUrl = ref<string | null>(null)
const missing = ref(false)

onMounted(async () => {
  try {
    const blob = await getImageBlob(props.element.imageStorageId)
    if (blob) {
      blobUrl.value = URL.createObjectURL(blob)
    } else {
      missing.value = true
    }
  } catch {
    missing.value = true
  }
})

onBeforeUnmount(() => {
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
})

const preserveAspectRatio = computed(() => {
  switch (props.element.objectFit) {
    case 'cover': return 'xMidYMid slice'
    case 'fill':  return 'none'
    default:      return 'xMidYMid meet'
  }
})

const imageFilter = computed(() => {
  const f = props.element.imageFilters
  if (!f) return undefined
  const parts: string[] = []
  if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`)
  if (f.contrast !== 100)   parts.push(`contrast(${f.contrast}%)`)
  if (f.saturation !== 100) parts.push(`saturate(${f.saturation}%)`)
  if (f.hue !== 0)          parts.push(`hue-rotate(${f.hue}deg)`)
  if (f.grayscale > 0)      parts.push(`grayscale(${f.grayscale}%)`)
  return parts.length ? parts.join(' ') : undefined
})
</script>

<template>
  <!-- Missing placeholder -->
  <g v-if="missing">
    <rect
      :x="element.x" :y="element.y"
      :width="element.width" :height="element.height"
      fill="#111827" rx="4"
    />
    <text
      :x="element.x + element.width / 2"
      :y="element.y + element.height / 2 - 10"
      fill="#6b7280" font-size="11" text-anchor="middle" font-family="sans-serif"
    >Image not found</text>
    <text
      :x="element.x + element.width / 2"
      :y="element.y + element.height / 2 + 6"
      fill="#4b5563" font-size="9" text-anchor="middle" font-family="sans-serif"
    >{{ element.imageFileName }}</text>
  </g>

  <!-- Loading placeholder -->
  <rect
    v-else-if="!blobUrl"
    :x="element.x" :y="element.y"
    :width="element.width" :height="element.height"
    fill="#111" rx="4"
  />

  <!-- Image -->
  <image
    v-else
    :x="element.x"
    :y="element.y"
    :width="element.width"
    :height="element.height"
    :href="blobUrl"
    :preserveAspectRatio="preserveAspectRatio"
    :style="imageFilter ? { filter: imageFilter } : undefined"
  />
</template>

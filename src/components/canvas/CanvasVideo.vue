<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useTimelineStore } from '@/stores/timelineStore'
import { getVideo } from '@/lib/utils/videoStorage'
import type { VideoElement } from '@/types/elements'

const props = defineProps<{ element: VideoElement }>()

const timeline = useTimelineStore()
const videoRef = ref<HTMLVideoElement>()
const blobUrl = ref<string | null>(null)
const missing = ref(false)

// ── Computed target time ──────────────────────────────────────────────────────

function targetTime(frame: number): number {
  const el = props.element
  const t = (frame / Math.max(1, timeline.fps)) + el.trimStart
  return Math.max(el.trimStart, Math.min(el.trimEnd, t))
}

// ── Core seek function ────────────────────────────────────────────────────────

function syncVideoToFrame(frame: number) {
  const v = videoRef.value
  if (!v) return
  const t = targetTime(frame)
  if (Math.abs(v.currentTime - t) > 0.01) v.currentTime = t
}

// ── Play / pause watcher ──────────────────────────────────────────────────────
// When playback starts: sync once, then let browser play for smooth output.
// When stopped: pause immediately (video never runs freely).

watch(
  () => timeline.isPlaying,
  (playing) => {
    const v = videoRef.value
    if (!v || !blobUrl.value) return
    if (playing) {
      const t = targetTime(timeline.currentFrame)
      v.currentTime = t
      v.playbackRate = props.element.playbackRate
      v.play().catch(() => {})
    } else {
      v.pause()
      syncVideoToFrame(timeline.currentFrame)
    }
  },
  { immediate: true }
)

// ── Frame watcher ─────────────────────────────────────────────────────────────
// While NOT playing → pure seek-based sync (scrubbing).
// While playing → detect drift (loop reset, manual seek, reverse) and re-sync.
// Also handles: past trimEnd → freeze at trimEnd.

watch(
  () => timeline.currentFrame,
  (frame) => {
    const v = videoRef.value
    if (!v || !blobUrl.value) return

    const expected = targetTime(frame)

    // Past trimEnd: freeze the video at the trim boundary
    if (expected >= props.element.trimEnd) {
      if (timeline.isPlaying) v.pause()
      v.currentTime = props.element.trimEnd
      return
    }

    if (!timeline.isPlaying) {
      // Scrubbing: always follow exactly
      if (Math.abs(v.currentTime - expected) > 0.01) v.currentTime = expected
    } else {
      // Playing: re-sync if drift exceeds 2 frames (loop, reverse, manual seek)
      const frameDuration = 1 / Math.max(1, timeline.fps)
      if (Math.abs(v.currentTime - expected) > frameDuration * 2) {
        v.currentTime = expected
        v.playbackRate = props.element.playbackRate
        v.play().catch(() => {})
      }
    }
  }
)

// ── Load video blob ───────────────────────────────────────────────────────────

onMounted(async () => {
  try {
    const blob = await getVideo(props.element.videoStorageId)
    if (blob) {
      blobUrl.value = URL.createObjectURL(blob)
    } else {
      missing.value = true
    }
  } catch {
    missing.value = true
  }
})

// Sync immediately once blob is ready
watch(blobUrl, (url) => {
  if (!url) return
  const v = videoRef.value
  if (!v) return
  v.pause()
  const t = targetTime(timeline.currentFrame)
  // Wait for canplay before seeking
  v.addEventListener('canplay', () => { v.currentTime = t }, { once: true })
})

onBeforeUnmount(() => {
  videoRef.value?.pause()
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
})

// ── Object-fit mapping ────────────────────────────────────────────────────────

const fitStyle = computed(() => props.element.fit === 'fill' ? 'fill' : props.element.fit)
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
    >Video not found</text>
    <text
      :x="element.x + element.width / 2"
      :y="element.y + element.height / 2 + 6"
      fill="#4b5563" font-size="9" text-anchor="middle" font-family="sans-serif"
    >{{ element.fileName }}</text>
  </g>

  <!-- Loading placeholder -->
  <g v-else-if="!blobUrl">
    <rect
      :x="element.x" :y="element.y"
      :width="element.width" :height="element.height"
      fill="#111" rx="4"
    />
  </g>

  <!-- Video via foreignObject -->
  <foreignObject
    v-else
    :x="element.x" :y="element.y"
    :width="element.width" :height="element.height"
  >
    <div style="width:100%;height:100%;overflow:hidden;background:#000">
      <video
        ref="videoRef"
        :src="blobUrl"
        preload="auto"
        muted
        playsinline
        :style="{ width: '100%', height: '100%', objectFit: fitStyle, display: 'block' }"
      />
    </div>
  </foreignObject>
</template>

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PlaybackDirection } from '@/types/animation'
import type { Frame } from '@/types/frame'

export const useTimelineStore = defineStore('timeline', () => {
  const currentFrame = ref(0)
  const totalFrames = ref(60)
  const fps = ref(24)
  const isPlaying = ref(false)
  const loop = ref(true)
  const direction = ref<PlaybackDirection>('normal')

  let rafId: number | null = null
  let lastTime: number | null = null

  // ── Getters ──
  const duration = computed(() => totalFrames.value / fps.value)

  const currentTime = computed(() => {
    const sec = currentFrame.value / fps.value
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    const f = Math.floor((sec % 1) * 10)
    return `${m}:${String(s).padStart(2, '0')}.${f}`
  })

  const totalTime = computed(() => {
    const sec = duration.value
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    const f = Math.floor((sec % 1) * 10)
    return `${m}:${String(s).padStart(2, '0')}.${f}`
  })

  // ── Playback ──
  function _tick(ts: number): void {
    if (!isPlaying.value) return
    if (lastTime === null) { lastTime = ts }
    const delta = ts - lastTime
    lastTime = ts
    const frameDelta = (delta / 1000) * fps.value

    let next = currentFrame.value + frameDelta
    if (next >= totalFrames.value) {
      if (loop.value) {
        next = next % totalFrames.value
      } else {
        next = totalFrames.value
        pause()
      }
    }
    currentFrame.value = Math.min(next, totalFrames.value)
    if (isPlaying.value) rafId = requestAnimationFrame(_tick)
  }

  function play(): void {
    if (isPlaying.value) return
    isPlaying.value = true
    lastTime = null
    rafId = requestAnimationFrame(_tick)
  }

  function pause(): void {
    isPlaying.value = false
    lastTime = null
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
  }

  function stop(): void {
    pause()
    currentFrame.value = 0
  }

  function togglePlay(): void {
    isPlaying.value ? pause() : play()
  }

  function seek(frame: number): void {
    currentFrame.value = Math.max(0, Math.min(frame, totalFrames.value))
  }

  function nextFrame(): void { seek(currentFrame.value + 1) }
  function prevFrame(): void { seek(currentFrame.value - 1) }

  // ── Frame sync ──
  // Loads playback settings from a Frame object (called when active frame changes)
  function syncFromFrame(frame: Frame): void {
    pause()
    currentFrame.value = 0
    fps.value = frame.fps
    totalFrames.value = frame.totalFrames
    loop.value = frame.loop
    direction.value = frame.direction
  }

  // setters write back to the active frame via editorStore
  // (import is deferred to avoid circular dep at module load time)
  function setFps(val: number): void {
    fps.value = Math.max(1, Math.min(120, val))
    _writeBack({ fps: fps.value })
  }

  function setTotalFrames(frames: number): void {
    totalFrames.value = Math.max(1, frames)
    _writeBack({ totalFrames: totalFrames.value })
  }

  function setLoop(val: boolean): void {
    loop.value = val
    _writeBack({ loop: val })
  }

  function setDirection(dir: PlaybackDirection): void {
    direction.value = dir
    _writeBack({ direction: dir })
  }

  function _writeBack(updates: Partial<Frame>): void {
    // Deferred import to avoid circular dependency at module init
    import('@/stores/uiStore').then(({ useUiStore }) => {
      import('@/stores/editorStore').then(({ useEditorStore }) => {
        const ui = useUiStore()
        const editor = useEditorStore()
        if (ui.activeFrameId) {
          editor.updateFrame(ui.activeFrameId, updates)
        }
      })
    })
  }

  return {
    currentFrame, totalFrames, fps, isPlaying, loop, direction,
    duration, currentTime, totalTime,
    play, pause, stop, togglePlay, seek, nextFrame, prevFrame,
    syncFromFrame, setFps, setTotalFrames, setLoop, setDirection
  }
})

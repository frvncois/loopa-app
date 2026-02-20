import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PlaybackDirection } from '@/types/animation'

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

  function setFps(val: number): void { fps.value = Math.max(1, Math.min(120, val)) }
  function setTotalFrames(frames: number): void { totalFrames.value = Math.max(1, frames) }
  function setLoop(val: boolean): void { loop.value = val }
  function setDirection(dir: PlaybackDirection): void { direction.value = dir }

  return {
    currentFrame, totalFrames, fps, isPlaying, loop, direction,
    duration, currentTime, totalTime,
    play, pause, stop, togglePlay, seek, nextFrame, prevFrame,
    setFps, setTotalFrames, setLoop, setDirection
  }
})

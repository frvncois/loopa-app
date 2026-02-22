import { ref, computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useTimelineStore } from '@/stores/timelineStore'
import { useUiStore } from '@/stores/uiStore'
import { askAiAnimator, type ProjectContext } from '@/lib/ai/AiAnimationService'
import { executeAiCommands } from '@/lib/ai/AiCommandExecutor'
import type { useHistory } from '@/composables/useHistory'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions?: string[]
}

export function useAiAssistant(history: ReturnType<typeof useHistory>) {
  const editor = useEditorStore()
  const timeline = useTimelineStore()
  const ui = useUiStore()

  const isOpen = ref(false)
  const isLoading = ref(false)
  const messages = ref<Message[]>([])
  const inputText = ref('')

  const hasApiKey = computed(() => !!import.meta.env.VITE_OPENAI_API_KEY)

  function toggle() { isOpen.value = !isOpen.value }
  function open()   { isOpen.value = true }
  function close()  { isOpen.value = false }

  function getProjectContext(): ProjectContext {
    const activeFrameId = ui.activeFrameId
    const activeFrame = activeFrameId
      ? editor.frames.find(f => f.id === activeFrameId) ?? null
      : null

    // Only include elements in the active frame so the AI has a focused context
    const frameElements = activeFrameId
      ? editor.getElementsForFrame(activeFrameId)
      : editor.elements

    const elementIds = new Set(frameElements.map(e => e.id))

    return {
      elements: frameElements.map(el => ({
        id: el.id,
        name: el.name,
        type: el.type,
        x: Math.round(el.x),
        y: Math.round(el.y),
        width: Math.round(el.width),
        height: Math.round(el.height),
        rotation: el.rotation ?? 0,
        opacity: el.opacity ?? 1,
      })),
      keyframes: editor.keyframes
        .filter(kf => elementIds.has(kf.elementId))
        .map(kf => {
          const el = editor.getElementById(kf.elementId)
          return {
            elementId: kf.elementId,
            elementName: el?.name ?? 'Unknown',
            frame: kf.frame,
            properties: kf.props as Record<string, unknown>,
          }
        }),
      timeline: {
        fps: timeline.fps,
        totalFrames: timeline.totalFrames,
        currentFrame: timeline.currentFrame,
        loop: timeline.loop,
        direction: timeline.direction,
      },
      artboard: {
        width: activeFrame?.width ?? 800,
        height: activeFrame?.height ?? 600,
      },
    }
  }

  async function send() {
    const text = inputText.value.trim()
    if (!text || isLoading.value) return

    inputText.value = ''
    const userMsg: Message = { id: `${Date.now()}-u`, role: 'user', content: text }
    messages.value.push(userMsg)
    isLoading.value = true

    // Check for key before making API call
    if (!hasApiKey.value) {
      messages.value.push({
        id: `${Date.now()}-a`,
        role: 'assistant',
        content: 'OpenAI API key not configured. Add VITE_OPENAI_API_KEY to your .env.local file to use the assistant.',
      })
      isLoading.value = false
      return
    }

    try {
      const context = getProjectContext()
      // Build conversation history excluding the message we just appended
      const history_msgs = messages.value
        .slice(0, -1)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      const response = await askAiAnimator(text, context, history_msgs)

      const actions = executeAiCommands(response.commands, editor, timeline, history)

      messages.value.push({
        id: `${Date.now()}-a`,
        role: 'assistant',
        content: response.message,
        actions: actions.length > 0 ? actions : undefined,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const displayMsg = msg === 'OPENAI_KEY_MISSING'
        ? 'OpenAI API key not configured. Add VITE_OPENAI_API_KEY to .env.local.'
        : `Something went wrong: ${msg}`
      messages.value.push({
        id: `${Date.now()}-a`,
        role: 'assistant',
        content: displayMsg,
      })
    } finally {
      isLoading.value = false
    }
  }

  function sendSuggestion(text: string) {
    inputText.value = text
    send()
  }

  function clearChat() {
    messages.value = []
  }

  return { isOpen, isLoading, messages, inputText, hasApiKey, toggle, open, close, send, sendSuggestion, clearChat }
}

/**
 * AiCommandExecutor — translates AI commands into Loopa store mutations.
 * Pure TypeScript, no Vue dependency.
 */
import { generateId } from '@/lib/utils/id'
import type { EasingType } from '@/types/animation'
import type { AiCommand } from './AiAnimationService'
import type { useEditorStore } from '@/stores/editorStore'
import type { useTimelineStore } from '@/stores/timelineStore'

type EditorStore = ReturnType<typeof useEditorStore>
type TimelineStore = ReturnType<typeof useTimelineStore>

const EASING_CURVES: Record<string, { x1: number; y1: number; x2: number; y2: number }> = {
  'linear':          { x1: 0,    y1: 0,    x2: 1,    y2: 1 },
  'ease-in':         { x1: 0.42, y1: 0,    x2: 1,    y2: 1 },
  'ease-out':        { x1: 0,    y1: 0,    x2: 0.58, y2: 1 },
  'ease-in-out':     { x1: 0.42, y1: 0,    x2: 0.58, y2: 1 },
  'spring':          { x1: 0.175,y1: 0.885,x2: 0.32, y2: 1.275 },
  'ease-out-back':   { x1: 0.34, y1: 1.56, x2: 0.64, y2: 1 },
  'ease-out-bounce': { x1: 0.34, y1: 1.56, x2: 0.64, y2: 1 },
  'ease-in-out-cubic':{ x1: 0.65,y1: 0,    x2: 0.35, y2: 1 },
}

export function executeAiCommands(
  commands: AiCommand[],
  editor: EditorStore,
  timeline: TimelineStore,
  history: { save: () => void }
): string[] {
  const log: string[] = []

  for (const cmd of commands) {
    try {
      switch (cmd.action) {

        case 'addKeyframe': {
          const el = editor.elements.find(e => e.name === cmd.elementName)
          if (!el) {
            log.push(`⚠ Element "${cmd.elementName}" not found`)
            continue
          }
          const easing = (cmd.easing ?? 'ease-out') as EasingType
          editor.addKeyframe({
            id: generateId('kf'),
            elementId: el.id,
            frame: cmd.frame ?? 0,
            props: (cmd.properties ?? {}) as Record<string, never>,
            easing,
            easingCurve: EASING_CURVES[easing] ?? EASING_CURVES['ease-out'],
          })
          log.push(`◆ Keyframe frame ${cmd.frame ?? 0} → "${cmd.elementName}"`)
          break
        }

        case 'updateElement': {
          const el = editor.elements.find(e => e.name === cmd.elementName)
          if (!el) {
            log.push(`⚠ Element "${cmd.elementName}" not found`)
            continue
          }
          editor.updateElement(el.id, (cmd.properties ?? {}) as Record<string, never>)
          log.push(`✎ Updated "${cmd.elementName}"`)
          break
        }

        case 'updateTimeline': {
          if (cmd.fps !== undefined) timeline.setFps(cmd.fps)
          if (cmd.totalFrames !== undefined) timeline.setTotalFrames(cmd.totalFrames)
          if (cmd.loop !== undefined) timeline.setLoop(cmd.loop)
          if (cmd.direction !== undefined) timeline.setDirection(cmd.direction as never)
          log.push('⏱ Timeline updated')
          break
        }

      }
    } catch (err) {
      log.push(`⚠ Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (commands.length > 0) history.save()

  return log
}

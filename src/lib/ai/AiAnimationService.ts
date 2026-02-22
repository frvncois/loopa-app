/**
 * AiAnimationService — calls OpenAI to generate animation commands.
 * API key is read from VITE_OPENAI_API_KEY in .env.local; never hardcoded.
 */

export interface AiCommand {
  action: 'addKeyframe' | 'updateElement' | 'updateTimeline'
  elementName?: string
  frame?: number
  /** Animatable property values (maps to Keyframe.props or element update) */
  properties?: Record<string, unknown>
  easing?: string
  // Timeline update fields
  fps?: number
  totalFrames?: number
  loop?: boolean
  direction?: string
}

export interface AiResponse {
  message: string
  commands: AiCommand[]
}

export interface ProjectContext {
  elements: {
    id: string
    name: string
    type: string
    x: number
    y: number
    width: number
    height: number
    rotation: number
    opacity: number
  }[]
  keyframes: {
    elementId: string
    elementName: string
    frame: number
    properties: Record<string, unknown>
  }[]
  timeline: {
    fps: number
    totalFrames: number
    currentFrame: number
    loop: boolean
    direction: string
  }
  artboard: {
    width: number
    height: number
  }
}

function buildSystemPrompt(ctx: ProjectContext): string {
  const elementList = ctx.elements.length > 0
    ? ctx.elements.map(el =>
        `  - "${el.name}" (${el.type}) x:${el.x} y:${el.y} size:${el.width}×${el.height} rotation:${el.rotation}° opacity:${el.opacity}`
      ).join('\n')
    : '  (no elements — ask the user to add elements first)'

  const kfList = ctx.keyframes.length > 0
    ? ctx.keyframes.map(kf =>
        `  - "${kf.elementName}" frame ${kf.frame}: ${JSON.stringify(kf.properties)}`
      ).join('\n')
    : '  (none)'

  return `You are an animation assistant for Loopa, a keyframe animation tool. You generate structured JSON commands to create animations. You NEVER create new elements — you only animate and modify existing ones.

RESPONSE FORMAT — always respond with valid JSON:
{
  "message": "Brief 1-2 sentence explanation of what you animated",
  "commands": [
    {
      "action": "addKeyframe",
      "elementName": "exact name from the list below",
      "frame": 0,
      "properties": { "x": 100, "opacity": 0 },
      "easing": "ease-out"
    }
  ]
}

AVAILABLE ACTIONS:
- "addKeyframe": Add a keyframe (requires elementName, frame, properties)
- "updateElement": Change base element properties with no animation (requires elementName, properties)
- "updateTimeline": Change timeline settings (optional fields: fps, totalFrames, loop, direction)

ANIMATABLE PROPERTIES (use these exact keys in properties):
  x, y — position in pixels
  width, height — size in pixels
  rotation — degrees (positive = clockwise)
  opacity — 0.0 to 1.0
  scaleX, scaleY — scale factor (1 = 100%)
  fillColor — hex color without # (e.g. "ff0000")
  strokeColor — hex color without #
  strokeWidth — pixels
  blur — blur radius in pixels
  shadowOffsetX, shadowOffsetY, shadowBlur, shadowOpacity
  transformOriginX, transformOriginY — 0 to 1 (0.5 = center)

EASING OPTIONS: linear, ease-in, ease-out, ease-in-out, spring, ease-out-back, ease-out-bounce, ease-in-out-cubic

RULES:
1. Reference elements by their EXACT name as listed below (case-sensitive)
2. Off-screen positions: use negative values or values beyond artboard (${ctx.artboard.width}×${ctx.artboard.height}px)
   - Off-screen left: x = -element_width
   - Off-screen right: x = ${ctx.artboard.width}
   - Off-screen top: y = -element_height
   - Off-screen bottom: y = ${ctx.artboard.height}
3. Always create at least 2 keyframes per animated element (start state + end state)
4. For staggered animations, offset each element by 5–10 frames
5. If the timeline is too short, add an updateTimeline command to extend totalFrames
6. Keep the message brief — 1-2 sentences
7. If an element name doesn't exist, say so and provide zero commands
8. If asked to create elements, explain you can only animate existing ones

CURRENT PROJECT STATE:
Artboard: ${ctx.artboard.width}×${ctx.artboard.height}px
Timeline: ${ctx.timeline.fps}fps, ${ctx.timeline.totalFrames} frames (${(ctx.timeline.totalFrames / ctx.timeline.fps).toFixed(1)}s), loop: ${ctx.timeline.loop}, direction: ${ctx.timeline.direction}

Elements (${ctx.elements.length}):
${elementList}

Existing keyframes (${ctx.keyframes.length}):
${kfList}`
}

export async function askAiAnimator(
  userMessage: string,
  projectContext: ProjectContext,
  conversationHistory: { role: string; content: string }[]
): Promise<AiResponse> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
  if (!apiKey) {
    throw new Error('OPENAI_KEY_MISSING')
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt(projectContext) },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ]

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const content: string = data.choices?.[0]?.message?.content ?? '{}'

  try {
    const parsed = JSON.parse(content) as AiResponse
    return {
      message: parsed.message ?? 'Done.',
      commands: Array.isArray(parsed.commands) ? parsed.commands : [],
    }
  } catch {
    return { message: content, commands: [] }
  }
}

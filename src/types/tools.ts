export type ToolType = 'select' | 'rect' | 'ellipse' | 'line' | 'polygon' | 'star' | 'text' | 'pen' | 'hand' | 'crop' | 'motion-path'

export interface ToolDefinition {
  id: ToolType
  label: string
  shortcut: string
  iconName: string
}

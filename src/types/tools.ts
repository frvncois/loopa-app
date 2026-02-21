export type ToolType = 'select' | 'rect' | 'circle' | 'ellipse' | 'line' | 'polygon' | 'star' | 'text' | 'pen' | 'hand' | 'crop'

export interface ToolDefinition {
  id: ToolType
  label: string
  shortcut: string
  iconName: string
}

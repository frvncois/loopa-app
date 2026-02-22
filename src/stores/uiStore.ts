import { defineStore } from 'pinia'
import { ref, reactive, watch } from 'vue'
import type { ToolType } from '@/types/tools'
const PANEL_STORAGE_KEY = 'loopa_panel_widths'

function loadPanelWidths() {
  try {
    const raw = localStorage.getItem(PANEL_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as { left: number; right: number; bottomHeight: number }
  } catch {}
  return null
}

export const useUiStore = defineStore('ui', () => {
  const currentTool = ref<ToolType>('select')
  const selectedIds = ref<Set<string>>(new Set())
  const selectedKeyframeIds = ref<Set<string>>(new Set())
  const activePanel = ref<'design' | 'animate'>('design')

  const savedWidths = loadPanelWidths()
  const panelWidths = reactive({
    left: savedWidths?.left ?? 232,
    right: savedWidths?.right ?? 256,
    bottomHeight: savedWidths?.bottomHeight ?? 180
  })

  watch(
    panelWidths,
    val => {
      try { localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(val)) } catch {}
    },
    { deep: true }
  )

  const showGrid = ref(false)
  const snapToGrid = ref(false)
  const gridSize = ref(10)

  const isTransforming = ref(false)
  const activeFrameId = ref<string | null>(null)
  const activeModal = ref<string | null>(null)
  const contextMenu = reactive({ show: false, x: 0, y: 0 })
  const pathEditMode = ref(false)
  const editingPathId = ref<string | null>(null)
  const activeGroupId = ref<string | null>(null)

  // ── Actions ──
  function setTool(tool: ToolType): void { currentTool.value = tool }

  function select(id: string): void {
    selectedIds.value = new Set([id])
  }

  function addToSelection(id: string): void {
    const s = new Set(selectedIds.value)
    s.add(id)
    selectedIds.value = s
  }

  function toggleSelection(id: string): void {
    const s = new Set(selectedIds.value)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    selectedIds.value = s
  }

  function clearSelection(): void {
    selectedIds.value = new Set()
    selectedKeyframeIds.value = new Set()
  }

  function selectAll(allIds: string[]): void {
    selectedIds.value = new Set(allIds)
  }

  function selectKeyframe(id: string | null, shift = false): void {
    if (id === null) { selectedKeyframeIds.value = new Set(); return }
    if (shift) {
      const s = new Set(selectedKeyframeIds.value)
      if (s.has(id)) s.delete(id); else s.add(id)
      selectedKeyframeIds.value = s
    } else {
      selectedKeyframeIds.value = new Set([id])
    }
  }

  function selectKeyframes(ids: string[]): void {
    selectedKeyframeIds.value = new Set(ids)
  }

  function clearKeyframeSelection(): void {
    selectedKeyframeIds.value = new Set()
  }

  function setActivePanel(panel: 'design' | 'animate'): void {
    activePanel.value = panel
  }

  function openModal(name: string): void { activeModal.value = name }
  function closeModal(): void { activeModal.value = null }

  function setPanelWidth(panel: 'left' | 'right' | 'bottomHeight', value: number): void {
    panelWidths[panel] = value
  }

  function toggleGrid(): void { showGrid.value = !showGrid.value }
  function toggleSnap(): void { snapToGrid.value = !snapToGrid.value }

  function enterPathEditMode(pathId: string): void {
    pathEditMode.value = true
    editingPathId.value = pathId
  }

  function exitPathEditMode(): void {
    pathEditMode.value = false
    editingPathId.value = null
  }

  function setActiveFrame(frameId: string): void {
    activeFrameId.value = frameId
    selectedIds.value = new Set()
    selectedKeyframeIds.value = new Set()
    activeGroupId.value = null
    editingPathId.value = null
    pathEditMode.value = false
  }

  function enterGroup(groupId: string): void {
    activeGroupId.value = groupId
    selectedIds.value = new Set()
  }

  function exitGroup(): void {
    const groupId = activeGroupId.value
    activeGroupId.value = null
    selectedIds.value = groupId ? new Set([groupId]) : new Set()
  }

  function showContextMenu(x: number, y: number): void {
    contextMenu.show = true
    contextMenu.x = x
    contextMenu.y = y
  }

  function hideContextMenu(): void { contextMenu.show = false }

  function setTransforming(v: boolean): void { isTransforming.value = v }

  return {
    currentTool, selectedIds, selectedKeyframeIds, activePanel,
    panelWidths, showGrid, snapToGrid, gridSize,
    isTransforming, activeFrameId,
    activeModal, contextMenu, pathEditMode, editingPathId, activeGroupId,
    setTool, select, addToSelection, toggleSelection, clearSelection, selectAll,
    selectKeyframe, selectKeyframes, clearKeyframeSelection,
    setActivePanel, openModal, closeModal, setPanelWidth,
    toggleGrid, toggleSnap, enterPathEditMode, exitPathEditMode,
    setActiveFrame, enterGroup, exitGroup, showContextMenu, hideContextMenu,
    setTransforming
  }
})

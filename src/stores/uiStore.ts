import { defineStore } from 'pinia'
import { ref, reactive, watch } from 'vue'
import type { ToolType } from '@/types/tools'
import type { OnionSkinSettings } from '@/types/animation'

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
  const selectedKeyframeId = ref<string | null>(null)
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

  const onionSkin = reactive<OnionSkinSettings>({
    enabled: false,
    framesBefore: 2,
    framesAfter: 2,
    opacityBefore: 0.4,
    opacityAfter: 0.4,
    colorBefore: 'ff4444',
    colorAfter: '4444ff',
    interval: 1,
    scope: 'selected'
  })

  const activeModal = ref<string | null>(null)
  const contextMenu = reactive({ show: false, x: 0, y: 0 })
  const pathEditMode = ref(false)
  const editingPathId = ref<string | null>(null)

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
    selectedKeyframeId.value = null
  }

  function selectAll(allIds: string[]): void {
    selectedIds.value = new Set(allIds)
  }

  function selectKeyframe(id: string | null): void {
    selectedKeyframeId.value = id
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

  function showContextMenu(x: number, y: number): void {
    contextMenu.show = true
    contextMenu.x = x
    contextMenu.y = y
  }

  function hideContextMenu(): void { contextMenu.show = false }

  return {
    currentTool, selectedIds, selectedKeyframeId, activePanel,
    panelWidths, showGrid, snapToGrid, gridSize, onionSkin,
    activeModal, contextMenu, pathEditMode, editingPathId,
    setTool, select, addToSelection, toggleSelection, clearSelection, selectAll,
    selectKeyframe, setActivePanel, openModal, closeModal, setPanelWidth,
    toggleGrid, toggleSnap, enterPathEditMode, exitPathEditMode,
    showContextMenu, hideContextMenu
  }
})

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '@/stores/editorStore'
import { useProjectsStore } from '@/stores/projectsStore'
import { useUiStore } from '@/stores/uiStore'
import { useTimelineStore } from '@/stores/timelineStore'
import { useCanvas } from '@/composables/useCanvas'
import { useSelection } from '@/composables/useSelection'
import { useElementDrag } from '@/composables/useElementDrag'
import { useElementResize } from '@/composables/useElementResize'
import { useDrawTool } from '@/composables/useDrawTool'
import { useAnimation } from '@/composables/useAnimation'
import { useKeyframes } from '@/composables/useKeyframes'
import { useHistory } from '@/composables/useHistory'
import { useClipboard } from '@/composables/useClipboard'
import { useShortcuts } from '@/composables/useShortcuts'
import { usePenTool } from '@/composables/usePenTool'
import { usePathEditor } from '@/composables/usePathEditor'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import ResizablePanel from '@/components/layout/ResizablePanel.vue'
import LayerPanel from '@/components/layers/LayerPanel.vue'
import CanvasToolbar from '@/components/canvas/CanvasToolbar.vue'
import CanvasViewport from '@/components/canvas/CanvasViewport.vue'
import PropertiesPanel from '@/components/properties/PropertiesPanel.vue'
import TimelinePanel from '@/components/timeline/TimelinePanel.vue'
import ProjectSettingsModal from '@/components/modals/ProjectSettingsModal.vue'
import ShortcutsModal from '@/components/modals/ShortcutsModal.vue'
import ImportModal from '@/components/modals/ImportModal.vue'
import ExportModal from '@/components/modals/ExportModal.vue'
import ContextMenu from '@/components/ui/ContextMenu.vue'

const props = defineProps<{ id: string }>()

const router = useRouter()
const editor = useEditorStore()
const projects = useProjectsStore()
const ui = useUiStore()
const timeline = useTimelineStore()

// ── Composables ──────────────────────────────────────────────
const viewportEl = ref<HTMLElement | null>(null)
const canvas = useCanvas(viewportEl)
const selection = useSelection(editor, ui)
const elementDrag = useElementDrag(editor, ui, canvas)
const elementResize = useElementResize(editor, ui, canvas)
const drawTool = useDrawTool(editor, ui, canvas)
const animation = useAnimation(editor, timeline)
const keyframeOps = useKeyframes(editor, ui, timeline)
const history = useHistory(editor)
const clipboard = useClipboard(editor, ui)
const shortcuts = useShortcuts(editor, ui, timeline, history, clipboard, selection, canvas)

// Path system
const penTool = usePenTool(editor, ui, canvas, () => history.save())
const pathEditor = usePathEditor(editor, ui, canvas, () => history.save())

provide('animation', animation)
provide('keyframeOps', keyframeOps)
provide('pathEditor', pathEditor)

// ── Template refs ─────────────────────────────────────────────
const canvasVpRef = ref<InstanceType<typeof CanvasViewport> | null>(null)

// ── Project meta ──────────────────────────────────────────────
const meta = computed(() =>
  projects.projects.find(p => p.id === editor.projectId) ?? null
)

// ── History auto-wiring via $onAction ─────────────────────────
let unsubscribeActions: (() => void) | null = null

function wireHistory() {
  unsubscribeActions = editor.$onAction(({ name, after }) => {
    after(() => {
      if (name === 'updateElement') {
        history.saveDebounced()
      } else if (['addElement', 'deleteElements', 'reorderElement',
                  'addKeyframe', 'deleteKeyframe', 'deleteKeyframesForElement',
                  'duplicateElements'].includes(name)) {
        history.save()
      }
    })
  })
}

// Cancel pen tool whenever the active tool changes away from 'pen'
watch(() => ui.currentTool, (tool) => {
  if (tool !== 'pen' && penTool.isDrawingPath.value) {
    penTool.cancel()
  }
})

// Exit path edit mode when selection changes away from the editing path
watch(() => ui.selectedIds, () => {
  if (!ui.editingPathId) return
  if (!ui.selectedIds.has(ui.editingPathId)) {
    ui.exitPathEditMode()
    pathEditor.editingPointId.value = null
  }
})

// ── Load project ──────────────────────────────────────────────
onMounted(() => {
  projects.loadAllProjects()
  const data = projects.loadProjectData(props.id)
  if (!data) {
    router.push('/')
    return
  }
  editor.loadProject(data)
  timeline.setFps(data.fps)
  timeline.setTotalFrames(data.totalFrames)

  viewportEl.value = canvasVpRef.value?.viewportEl ?? null

  setTimeout(() => {
    canvas.fitToView(data.meta.artboardWidth, data.meta.artboardHeight)
  }, 50)

  history.seed()
  wireHistory()
  shortcuts.register()

  window.addEventListener('loopa:addKeyframe', onAddKeyframe as EventListener)
  window.addEventListener('loopa:deletePathPoint', onDeletePathPoint as EventListener)
})

function onAddKeyframe() {
  keyframeOps.addKeyframeForSelected()
}

function onDeletePathPoint() {
  pathEditor.deleteSelectedPoint()
}

// ── Auto-save (debounced 2s) ──────────────────────────────────
let saveTimer: ReturnType<typeof setTimeout> | null = null
let savedTimer: ReturnType<typeof setTimeout> | null = null
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')

watch(
  [() => editor.elements, () => editor.keyframes],
  () => {
    if (!editor.projectId) return
    if (saveTimer) clearTimeout(saveTimer)
    saveState.value = 'saving'
    saveTimer = setTimeout(save, 2000)
  },
  { deep: true }
)

function save() {
  if (!editor.projectId) return
  const existing = projects.loadProjectData(editor.projectId)
  if (!existing) return
  projects.saveProjectData(editor.projectId, {
    ...existing,
    elements: editor.elements,
    keyframes: editor.keyframes,
    fps: timeline.fps,
    totalFrames: timeline.totalFrames,
  })
  saveState.value = 'saved'
  if (savedTimer) clearTimeout(savedTimer)
  savedTimer = setTimeout(() => { saveState.value = 'idle' }, 2500)
}

// ── Cleanup ───────────────────────────────────────────────────
onBeforeUnmount(() => {
  shortcuts.unregister()
  window.removeEventListener('loopa:addKeyframe', onAddKeyframe as EventListener)
  window.removeEventListener('loopa:deletePathPoint', onDeletePathPoint as EventListener)
  unsubscribeActions?.()
  if (saveTimer) clearTimeout(saveTimer)
  if (savedTimer) clearTimeout(savedTimer)
  timeline.stop()
  save()
  editor.clearProject()
  ui.clearSelection()
  ui.exitPathEditMode()
  history.clear()
})

// ── Context menu ──────────────────────────────────────────────
const contextItems = computed(() => {
  const items: {
    label: string
    shortcut?: string
    action: () => void
    separator?: boolean
    danger?: boolean
  }[] = []

  if (ui.selectedIds.size > 0) {
    items.push({
      label: `Duplicate${ui.selectedIds.size > 1 ? ` (${ui.selectedIds.size})` : ''}`,
      shortcut: '⌘D',
      action: () => {
        const newIds = editor.duplicateElements([...ui.selectedIds])
        ui.selectAll(newIds)
      }
    })
    items.push({
      label: 'Copy',
      shortcut: '⌘C',
      action: () => clipboard.copy()
    })

    // Only show ordering items for single selection
    if (ui.selectedIds.size === 1) {
      const selId = [...ui.selectedIds][0]
      const selIdx = editor.elements.findIndex(e => e.id === selId)
      items.push({ separator: true, label: '', action: () => {} })
      items.push({
        label: 'Bring to Front',
        action: () => {
          editor.reorderElement(selId, editor.elements.length - 1)
          history.save()
        }
      })
      items.push({
        label: 'Send to Back',
        action: () => {
          editor.reorderElement(selId, 0)
          history.save()
        }
      })
      if (selIdx < editor.elements.length - 1) {
        items.push({
          label: 'Bring Forward',
          action: () => {
            editor.reorderElement(selId, selIdx + 1)
            history.save()
          }
        })
      }
      if (selIdx > 0) {
        items.push({
          label: 'Send Backward',
          action: () => {
            editor.reorderElement(selId, selIdx - 1)
            history.save()
          }
        })
      }
    }

    items.push({ separator: true, label: '', action: () => {} })
    items.push({
      label: 'Delete',
      shortcut: '⌫',
      action: () => {
        editor.deleteElements([...ui.selectedIds])
        ui.clearSelection()
      },
      danger: true
    })
  } else {
    items.push({
      label: 'Paste',
      shortcut: '⌘V',
      action: () => { clipboard.paste(); history.save() }
    })
    items.push({
      label: 'Project Settings',
      action: () => ui.openModal('settings')
    })
  }
  return items
})
</script>

<template>
  <div class="editor">
    <!-- Topbar -->
    <AppTopbar
      :project-name="meta?.name"
      :artboard-width="meta?.artboardWidth"
      :artboard-height="meta?.artboardHeight"
      :can-undo="history.canUndo.value"
      :can-redo="history.canRedo.value"
      :save-state="saveState"
      @update:project-name="n => projects.updateProjectMeta(props.id, { name: n })"
      @undo="history.undo()"
      @redo="history.redo()"
    />

    <!-- Main area -->
    <div class="editor-main">
      <!-- Left: Layers panel -->
      <ResizablePanel side="left" :min="160" :max="400" :default-size="232">
        <LayerPanel />
      </ResizablePanel>

      <!-- Center: Canvas area -->
      <div class="editor-center">
        <CanvasToolbar />
        <CanvasViewport
          ref="canvasVpRef"
          :canvas="canvas"
          :draw-tool="drawTool"
          :element-drag="elementDrag"
          :element-resize="elementResize"
          :selection="selection"
          :pen-tool="penTool"
          :path-editor="pathEditor"
          :artboard-width="meta?.artboardWidth ?? 800"
          :artboard-height="meta?.artboardHeight ?? 600"
        />
        <!-- Timeline -->
        <ResizablePanel side="bottom" :min="100" :max="400" :default-size="180">
          <TimelinePanel :keyframe-ops="keyframeOps" />
        </ResizablePanel>
      </div>

      <!-- Right: Properties panel -->
      <ResizablePanel side="right" :min="200" :max="400" :default-size="256">
        <PropertiesPanel />
      </ResizablePanel>
    </div>

    <!-- Modals -->
    <ProjectSettingsModal
      :open="ui.activeModal === 'settings'"
      @close="ui.closeModal()"
    />
    <ImportModal
      :open="ui.activeModal === 'import'"
      @close="ui.closeModal()"
    />
    <ExportModal
      :open="ui.activeModal === 'export'"
      :artboard-width="meta?.artboardWidth ?? 800"
      :artboard-height="meta?.artboardHeight ?? 600"
      @close="ui.closeModal()"
    />
    <ShortcutsModal />

    <!-- Context menu -->
    <ContextMenu
      :show="ui.contextMenu.show"
      :x="ui.contextMenu.x"
      :y="ui.contextMenu.y"
      :items="contextItems"
      @close="ui.hideContextMenu()"
    />
  </div>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-1);
}

.editor-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.editor-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
</style>

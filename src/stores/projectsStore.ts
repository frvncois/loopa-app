import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ProjectMeta, ProjectData } from '@/types/project'
import type { Frame } from '@/types/frame'
import type { Element } from '@/types/elements'
import { generateId } from '@/lib/utils/id'
import { lsGet, lsSet, lsRemove } from '@/composables/useLocalStorage'
import { pathPointsToD } from '@/lib/path/PathBuilder'
import { pointsToSvgPath } from '@/lib/path/motionPathMath'

const INDEX_KEY = 'loopa_projects_index'
const projectKey = (id: string) => `loopa_project_${id}`

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<ProjectMeta[]>([])

  const sortedProjects = computed(() =>
    [...projects.value].sort((a, b) => b.updatedAt - a.updatedAt)
  )

  function loadAllProjects(): void {
    const index = lsGet<ProjectMeta[]>(INDEX_KEY)
    projects.value = index ?? []
  }

  function createProject(name: string, width: number, height: number): string {
    const id = generateId('proj')
    const frameId = generateId('frame')
    const now = Date.now()

    const meta: ProjectMeta = {
      id, name,
      createdAt: now, updatedAt: now,
      thumbnail: null,
      artboardWidth: width, artboardHeight: height
    }

    const defaultFrame: Frame = {
      id: frameId,
      name: 'Frame 1',
      width,
      height,
      backgroundColor: 'ffffff',
      elements: [],
      order: 0,
      fps: 24,
      totalFrames: 60,
      loop: true,
      direction: 'normal',
    }

    const data: ProjectData = {
      meta,
      frames: [defaultFrame],
      elements: [],
      keyframes: [],
    }

    projects.value.push(meta)
    _saveIndex()
    lsSet(projectKey(id), data)
    return id
  }

  function createProjectWithFrames(name: string, importedFrames: Frame[], importedElements: Element[]): string {
    const id = generateId('proj')
    const now = Date.now()
    const firstFrame = importedFrames[0]

    const meta: ProjectMeta = {
      id, name,
      createdAt: now, updatedAt: now,
      thumbnail: null,
      artboardWidth:  firstFrame?.width,
      artboardHeight: firstFrame?.height,
    }

    const data: ProjectData = {
      meta,
      frames: importedFrames,
      elements: importedElements,
      keyframes: [],
    }

    projects.value.push(meta)
    _saveIndex()
    lsSet(projectKey(id), data)
    return id
  }

  function deleteProject(id: string): void {
    projects.value = projects.value.filter(p => p.id !== id)
    _saveIndex()
    lsRemove(projectKey(id))
  }

  function updateProjectMeta(id: string, updates: Partial<ProjectMeta>): void {
    const meta = projects.value.find(p => p.id === id)
    if (meta) {
      Object.assign(meta, updates, { updatedAt: Date.now() })
      _saveIndex()
    }
  }

  function loadProjectData(id: string): ProjectData | null {
    const data = lsGet<ProjectData>(projectKey(id))
    if (!data) return null
    // Migrate: circle elements → ellipse
    for (const el of data.elements ?? []) {
      if ((el as any).type === 'circle') (el as any).type = 'ellipse'
    }
    // Migrate: path elements with absolute coords → relative coords
    // Old paths stored points in absolute SVG space; new paths are relative to (el.x, el.y).
    for (const el of data.elements ?? []) {
      if ((el as any).type === 'path' && !(el as any).relativePoints) {
        const ox: number = (el as any).x ?? 0
        const oy: number = (el as any).y ?? 0
        ;(el as any).points = ((el as any).points ?? []).map((p: any) => ({
          ...p,
          x: p.x - ox,
          y: p.y - oy,
          handleIn:  p.handleIn  ? { x: p.handleIn.x  - ox, y: p.handleIn.y  - oy } : null,
          handleOut: p.handleOut ? { x: p.handleOut.x - ox, y: p.handleOut.y - oy } : null,
        }))
        // Rebuild d from migrated relative points
        if ((el as any).points.length >= 2) {
          ;(el as any).d = pathPointsToD((el as any).points, (el as any).closed)
        }
        ;(el as any).relativePoints = true
      }
    }
    // Migrate: motion path points from absolute canvas coords → relative to element center.
    // Old paths stored absolute SVG positions; new paths store offsets from element center.
    const elementMap = new Map((data.elements ?? []).map((e: any) => [e.id, e]))
    for (const mp of (data.motionPaths ?? []) as any[]) {
      if (!mp.points?.length) continue
      // Skip already-migrated paths (flag set by previous migration)
      if (mp._relativePoints) continue
      const el = elementMap.get(mp.elementId)
      if (!el) continue
      // Subtract element center from all point positions (handles stay relative to their point)
      const cx = (el.x ?? 0) + (el.width ?? 0) / 2
      const cy = (el.y ?? 0) + (el.height ?? 0) / 2
      for (const pt of mp.points) {
        pt.x -= cx
        pt.y -= cy
      }
      mp.d = pointsToSvgPath(mp.points)
      mp._relativePoints = true
    }
    return data
  }

  function saveProjectData(id: string, data: ProjectData): void {
    data.meta.updatedAt = Date.now()
    lsSet(projectKey(id), data)
    updateProjectMeta(id, { updatedAt: data.meta.updatedAt, thumbnail: data.meta.thumbnail })
  }

  function _saveIndex(): void {
    lsSet(INDEX_KEY, projects.value)
  }

  return {
    projects, sortedProjects,
    loadAllProjects, createProject, createProjectWithFrames, deleteProject,
    updateProjectMeta, loadProjectData, saveProjectData
  }
})

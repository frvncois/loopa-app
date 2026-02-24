import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ProjectMeta, ProjectData } from '@/types/project'
import type { Frame } from '@/types/frame'
import type { Element } from '@/types/elements'
import { generateId } from '@/lib/utils/id'
import { lsGet, lsRemove } from '@/composables/useLocalStorage'
import { pathPointsToD } from '@/lib/path/PathBuilder'
import { pointsToSvgPath } from '@/lib/path/motionPathMath'
import { supabase } from '@/lib/supabase'

// Supabase row shape (snake_case columns)
interface ProjectRow {
  id: string
  name: string
  artboard_width: number
  artboard_height: number
  thumbnail: string | null
  created_at: number
  updated_at: number
}

function rowToMeta(row: ProjectRow): ProjectMeta {
  return {
    id: row.id,
    name: row.name,
    artboardWidth: row.artboard_width,
    artboardHeight: row.artboard_height,
    thumbnail: row.thumbnail,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Legacy localStorage keys (used only for one-time migration)
const INDEX_KEY = 'loopa_projects_index'
const projectKey = (id: string) => `loopa_project_${id}`

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<ProjectMeta[]>([])

  const sortedProjects = computed(() =>
    [...projects.value].sort((a, b) => b.updatedAt - a.updatedAt)
  )

  async function loadAllProjects(): Promise<void> {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, artboard_width, artboard_height, thumbnail, created_at, updated_at')

    if (error || !data) {
      // Offline fallback: read from legacy localStorage index
      const index = lsGet<ProjectMeta[]>(INDEX_KEY)
      projects.value = index ?? []
      return
    }

    projects.value = (data as unknown as ProjectRow[]).map(rowToMeta)

    // One-time migration: if Supabase is empty, import existing localStorage projects
    if (projects.value.length === 0) {
      await _migrateFromLocalStorage()
    }
  }

  async function _migrateFromLocalStorage(): Promise<void> {
    const index = lsGet<ProjectMeta[]>(INDEX_KEY)
    if (!index || index.length === 0) return

    for (const meta of index) {
      const data = lsGet<ProjectData>(projectKey(meta.id))
      if (!data) continue
      _applyMigrations(data)
      await supabase.from('projects').upsert({
        id: meta.id,
        name: meta.name,
        artboard_width: meta.artboardWidth ?? 800,
        artboard_height: meta.artboardHeight ?? 600,
        thumbnail: meta.thumbnail ?? null,
        created_at: meta.createdAt,
        updated_at: meta.updatedAt,
        data,
      })
    }

    const { data: rows } = await supabase
      .from('projects')
      .select('id, name, artboard_width, artboard_height, thumbnail, created_at, updated_at')
    if (rows) projects.value = (rows as unknown as ProjectRow[]).map(rowToMeta)

    // Clean up localStorage after successful migration
    for (const meta of index) lsRemove(projectKey(meta.id))
    lsRemove(INDEX_KEY)
  }

  async function createProject(name: string, width: number, height: number): Promise<string> {
    const id = generateId('proj')
    const frameId = generateId('frame')
    const now = Date.now()

    const meta: ProjectMeta = {
      id, name,
      createdAt: now, updatedAt: now,
      thumbnail: null,
      artboardWidth: width, artboardHeight: height,
    }

    const defaultFrame: Frame = {
      id: frameId,
      name: 'Frame 1',
      width, height,
      backgroundColor: 'ffffff',
      elements: [],
      order: 0,
      fps: 24,
      totalFrames: 60,
      loop: true,
      direction: 'normal',
    }

    const data: ProjectData = { meta, frames: [defaultFrame], elements: [], keyframes: [] }

    await supabase.from('projects').insert({
      id,
      name,
      artboard_width: width,
      artboard_height: height,
      thumbnail: null,
      created_at: now,
      updated_at: now,
      data,
    })

    projects.value.push(meta)
    return id
  }

  async function createProjectWithFrames(
    name: string,
    importedFrames: Frame[],
    importedElements: Element[]
  ): Promise<string> {
    const id = generateId('proj')
    const now = Date.now()
    const firstFrame = importedFrames[0]

    const meta: ProjectMeta = {
      id, name,
      createdAt: now, updatedAt: now,
      thumbnail: null,
      artboardWidth: firstFrame?.width,
      artboardHeight: firstFrame?.height,
    }

    const data: ProjectData = {
      meta,
      frames: importedFrames,
      elements: importedElements,
      keyframes: [],
    }

    await supabase.from('projects').insert({
      id,
      name,
      artboard_width: firstFrame?.width ?? 800,
      artboard_height: firstFrame?.height ?? 600,
      thumbnail: null,
      created_at: now,
      updated_at: now,
      data,
    })

    projects.value.push(meta)
    return id
  }

  async function deleteProject(id: string): Promise<void> {
    projects.value = projects.value.filter(p => p.id !== id)
    await supabase.from('projects').delete().eq('id', id)
  }

  async function updateProjectMeta(id: string, updates: Partial<ProjectMeta>): Promise<void> {
    const meta = projects.value.find(p => p.id === id)
    if (!meta) return
    const now = Date.now()
    Object.assign(meta, updates, { updatedAt: now })

    // Only update the denormalized columns — full data JSONB synced on next auto-save
    const dbUpdates: Record<string, unknown> = { updated_at: now }
    if ('name' in updates) dbUpdates.name = updates.name
    if ('artboardWidth' in updates) dbUpdates.artboard_width = updates.artboardWidth
    if ('artboardHeight' in updates) dbUpdates.artboard_height = updates.artboardHeight
    if ('thumbnail' in updates) dbUpdates.thumbnail = updates.thumbnail

    await supabase.from('projects').update(dbUpdates).eq('id', id)
  }

  async function loadProjectData(id: string): Promise<ProjectData | null> {
    const { data: row, error } = await supabase
      .from('projects')
      .select('data')
      .eq('id', id)
      .single()

    let data: ProjectData | null = null
    if (!error && row?.data) {
      data = row.data as ProjectData
    } else {
      // Fallback: try legacy localStorage
      data = lsGet<ProjectData>(projectKey(id))
    }

    if (!data) return null
    _applyMigrations(data)
    return data
  }

  function _applyMigrations(data: ProjectData): void {
    // Migration: circle elements → ellipse
    for (const el of data.elements ?? []) {
      if ((el as any).type === 'circle') (el as any).type = 'ellipse'
    }
    // Migration: path elements with absolute coords → relative coords
    for (const el of data.elements ?? []) {
      if ((el as any).type === 'path' && !(el as any).relativePoints) {
        const ox: number = (el as any).x ?? 0
        const oy: number = (el as any).y ?? 0
        ;(el as any).points = ((el as any).points ?? []).map((p: any) => ({
          ...p,
          x: p.x - ox, y: p.y - oy,
          handleIn:  p.handleIn  ? { x: p.handleIn.x  - ox, y: p.handleIn.y  - oy }  : null,
          handleOut: p.handleOut ? { x: p.handleOut.x - ox, y: p.handleOut.y - oy } : null,
        }))
        if ((el as any).points.length >= 2) {
          ;(el as any).d = pathPointsToD((el as any).points, (el as any).closed)
        }
        ;(el as any).relativePoints = true
      }
    }
    // Migration: motion path absolute coords → relative to element center
    const elementMap = new Map((data.elements ?? []).map((e: any) => [e.id, e]))
    for (const mp of (data.motionPaths ?? []) as any[]) {
      if (!mp.points?.length || mp._relativePoints) continue
      const el = elementMap.get(mp.elementId)
      if (!el) continue
      const cx = (el.x ?? 0) + (el.width ?? 0) / 2
      const cy = (el.y ?? 0) + (el.height ?? 0) / 2
      for (const pt of mp.points) { pt.x -= cx; pt.y -= cy }
      mp.d = pointsToSvgPath(mp.points)
      mp._relativePoints = true
    }
  }

  async function saveProjectData(id: string, data: ProjectData): Promise<void> {
    data.meta.updatedAt = Date.now()
    await supabase.from('projects').update({
      name: data.meta.name,
      artboard_width: data.meta.artboardWidth ?? 800,
      artboard_height: data.meta.artboardHeight ?? 600,
      thumbnail: data.meta.thumbnail ?? null,
      updated_at: data.meta.updatedAt,
      data,
    }).eq('id', id)

    // Keep local meta cache in sync
    const meta = projects.value.find(p => p.id === id)
    if (meta) {
      Object.assign(meta, {
        name: data.meta.name,
        artboardWidth: data.meta.artboardWidth,
        artboardHeight: data.meta.artboardHeight,
        thumbnail: data.meta.thumbnail,
        updatedAt: data.meta.updatedAt,
      })
    }
  }

  return {
    projects, sortedProjects,
    loadAllProjects, createProject, createProjectWithFrames, deleteProject,
    updateProjectMeta, loadProjectData, saveProjectData,
  }
})

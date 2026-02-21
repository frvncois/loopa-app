import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ProjectMeta, ProjectData } from '@/types/project'
import type { Frame } from '@/types/frame'
import type { Element } from '@/types/elements'
import { generateId } from '@/lib/utils/id'
import { lsGet, lsSet, lsRemove } from '@/composables/useLocalStorage'

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
    return lsGet<ProjectData>(projectKey(id))
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

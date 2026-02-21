<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '@/stores/projectsStore'
import { useAuthStore } from '@/stores/authStore'
import type { Frame } from '@/types/frame'
import type { Element } from '@/types/elements'
import IconLogo from '@/components/icons/IconLogo.vue'
import IconLogout from '@/components/icons/IconLogout.vue'
import IconEmpty from '@/components/icons/IconEmpty.vue'
import IconTrash from '@/components/icons/IconTrash.vue'
import IconPlus from '@/components/icons/IconPlus.vue'
import NewProjectModal from '@/components/modals/NewProjectModal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const router = useRouter()
const projects = useProjectsStore()
const auth = useAuthStore()

const showNew = ref(false)
const deleteTarget = ref<string | null>(null)

onMounted(() => projects.loadAllProjects())

function onCreate(name: string, w: number, h: number) {
  const id = projects.createProject(name, w, h)
  showNew.value = false
  router.push(`/project/${id}`)
}

function onCreateFromFigma(name: string, frames: Frame[], elements: Element[]) {
  const id = projects.createProjectWithFrames(name, frames, elements)
  showNew.value = false
  router.push(`/project/${id}`)
}

function onDelete(id: string) {
  projects.deleteProject(id)
  deleteTarget.value = null
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="dash-page">
    <!-- Topbar -->
    <header class="dash-top">
      <div class="dash-logo">
        <IconLogo />
        <span class="dash-brand">Loopa</span>
      </div>
      <span class="dash-title">Dashboard</span>
      <div class="dash-spacer" />
      <span class="dash-user">{{ auth.user?.email }}</span>
      <button class="logout-btn" @click="logout">
        <IconLogout />
        Logout
      </button>
    </header>

    <!-- Content -->
    <main class="dash-content">
      <div v-if="projects.sortedProjects.length === 0" class="dash-empty">
        <EmptyState title="No projects yet" subtitle="Create your first animation project">
          <template #action>
            <button class="new-btn" @click="showNew = true">New Project</button>
          </template>
        </EmptyState>
      </div>

      <div v-else class="proj-grid">
        <div
          v-for="proj in projects.sortedProjects"
          :key="proj.id"
          class="proj-card"
          @click="router.push(`/project/${proj.id}`)"
        >
          <div class="proj-thumb">
            <img v-if="proj.thumbnail" :src="proj.thumbnail" alt="" />
            <div v-else class="proj-thumb-empty">
              <IconEmpty />
            </div>
            <div class="proj-dims">{{ proj.artboardWidth }} × {{ proj.artboardHeight }}</div>
          </div>
          <div class="proj-info">
            <span class="proj-name">{{ proj.name }}</span>
            <span class="proj-date">{{ formatDate(proj.updatedAt) }}</span>
          </div>
          <button
            class="proj-del"
            title="Delete project"
            @click.stop="deleteTarget = proj.id"
          >
            <IconTrash />
          </button>
        </div>
      </div>
    </main>

    <!-- New project FAB -->
    <button v-if="projects.sortedProjects.length > 0" class="fab" @click="showNew = true">
      <IconPlus />
      New Project
    </button>

    <NewProjectModal :open="showNew" @create="onCreate" @createFromFigma="onCreateFromFigma" @close="showNew = false" />

    <ConfirmDialog
      :open="deleteTarget !== null"
      title="Delete project"
      message="This will permanently delete this project and all its data. This cannot be undone."
      confirm-label="Delete"
      :danger="true"
      @confirm="onDelete(deleteTarget!)"
      @cancel="deleteTarget = null"
    />
  </div>
</template>

<style scoped>
.dash-page {
  min-height: 100vh;
  background: var(--bg-0);
  display: flex;
  flex-direction: column;
}
.dash-top {
  height: 52px;
  background: var(--bg-2);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 12px;
}
.dash-logo { display: flex; align-items: center; gap: 8px; }
.dash-brand { font-size: 15px; font-weight: 700; color: var(--text-1); }
.dash-title {
  font-size: 12px;
  color: var(--text-3);
  border-left: 1px solid var(--border);
  padding-left: 12px;
}
.dash-spacer { flex: 1; }
.dash-user { font-size: 11px; color: var(--text-3); font-family: var(--mono); }
.logout-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-3);
  font-size: 11px;
  cursor: pointer;
  transition: all var(--ease);
}
.logout-btn:hover { background: var(--bg-4); color: var(--text-1); border-color: var(--border-l); }

.dash-content { flex: 1; padding: 32px; }
.dash-empty { display: flex; align-items: center; justify-content: center; min-height: 400px; }

.proj-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  max-width: 960px;
}
.proj-card {
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--ease);
  position: relative;
}
.proj-card:hover { border-color: var(--border-l); transform: translateY(-1px); }
.proj-thumb {
  height: 140px;
  background: var(--bg-1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.proj-thumb img { width: 100%; height: 100%; object-fit: cover; }
.proj-thumb-empty { display: flex; align-items: center; justify-content: center; }
.proj-dims {
  position: absolute;
  bottom: 6px;
  right: 8px;
  font-size: 9px;
  font-family: var(--mono);
  color: var(--text-4);
  background: rgba(0,0,0,0.4);
  padding: 2px 5px;
  border-radius: 3px;
}
.proj-info {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.proj-name { font-size: 12px; font-weight: 500; color: var(--text-1); }
.proj-date { font-size: 10px; color: var(--text-4); }
.proj-del {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-3);
  cursor: pointer;
  opacity: 0;
  transition: all var(--ease);
}
.proj-card:hover .proj-del { opacity: 1; }
.proj-del:hover { background: var(--red-s); color: var(--red); border-color: var(--red); }

.fab {
  position: fixed;
  bottom: 28px;
  right: 28px;
  height: 40px;
  padding: 0 16px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--r-md);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background var(--ease);
  box-shadow: 0 4px 16px rgba(67, 83, 255, 0.35);
}
.fab:hover { background: var(--accent-h); }

.new-btn {
  height: 34px;
  padding: 0 16px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--r-md);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--ease);
}
.new-btn:hover { background: var(--accent-h); }
</style>

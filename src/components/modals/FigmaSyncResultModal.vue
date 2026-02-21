<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { SyncResult } from '@/lib/figma/FigmaSync'

const props = defineProps<{
  open: boolean
  result: SyncResult | null
  keepDecisions: Map<string, boolean>
}>()

const emit = defineEmits<{
  done: []
  close: []
}>()

// Aggregate all unique change type strings across updated elements
const changesSummary = computed(() => {
  if (!props.result) return ''
  const types = new Set<string>()
  for (const u of props.result.updated) {
    for (const c of u.changes) types.add(c)
  }
  return [...types].join(', ')
})

const hasAnyChanges = computed(() =>
  !!props.result && (
    props.result.updated.length > 0 ||
    props.result.added.length > 0 ||
    props.result.removed.length > 0
  )
)

function toggleKeep(id: string): void {
  props.keepDecisions.set(id, !(props.keepDecisions.get(id) ?? true))
}
</script>

<template>
  <BaseModal :open="open" title="Sync Complete" width="360px" @close="emit('close')">
    <div class="sync-result">

      <!-- Nothing changed -->
      <p v-if="!hasAnyChanges" class="sync-empty">
        Everything is up to date — no changes found in Figma.
      </p>

      <template v-else>
        <!-- Updated -->
        <div v-if="result!.updated.length > 0" class="sync-item is-updated">
          <span class="sync-icon">✓</span>
          <span>
            {{ result!.updated.length }} element{{ result!.updated.length !== 1 ? 's' : '' }} updated
            <span v-if="changesSummary" class="sync-detail">({{ changesSummary }})</span>
          </span>
        </div>

        <!-- Added -->
        <div v-if="result!.added.length > 0" class="sync-item is-added">
          <span class="sync-icon">+</span>
          <span>
            {{ result!.added.length }} new element{{ result!.added.length !== 1 ? 's' : '' }} added
          </span>
        </div>

        <!-- Removed -->
        <template v-if="result!.removed.length > 0">
          <div class="sync-item is-removed">
            <span class="sync-icon">⚠</span>
            <span>
              {{ result!.removed.length }} element{{ result!.removed.length !== 1 ? 's' : '' }} removed in Figma:
            </span>
          </div>
          <div
            v-for="item in result!.removed"
            :key="item.id"
            class="sync-removed-row"
          >
            <span class="sync-removed-name">"{{ item.name }}"</span>
            <div class="sync-removed-actions">
              <button
                class="sync-action-btn"
                :class="{ 'is-active': keepDecisions.get(item.id) !== false }"
                @click="toggleKeep(item.id)"
              >Keep</button>
              <button
                class="sync-action-btn is-danger"
                :class="{ 'is-active': keepDecisions.get(item.id) === false }"
                @click="toggleKeep(item.id)"
              >Delete</button>
            </div>
          </div>
        </template>

        <p class="sync-note">Updated elements keep all their keyframes and animations.</p>
      </template>
    </div>

    <template #footer>
      <BaseButton variant="accent" size="sm" @click="emit('done')">Done</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.sync-result {
  padding: 0.75rem;
}

.sync-empty {
  font-size: 0.75rem;
  color: var(--text-3);
  text-align: center;
  padding: 0.5rem 0;
}

.sync-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.75rem;

  &.is-updated { color: var(--accent); }
  &.is-added   { color: var(--green); }
  &.is-removed { color: var(--yellow); }
}

.sync-icon {
  width: 1rem;
  text-align: center;
  flex-shrink: 0;
  font-size: 0.75rem;
}

.sync-detail {
  color: var(--text-3);
  font-size: 0.625rem;
}

.sync-removed-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0 0.25rem 1.5rem;
  border-top: 1px solid var(--border-l);
}

.sync-removed-name {
  font-size: 0.75rem;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.sync-removed-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.sync-action-btn {
  height: 1.25rem;
  padding: 0 0.4375rem;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--bg-3);
  color: var(--text-3);
  font-size: 0.625rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--ease);

  &:hover { background: var(--bg-5); color: var(--text-1); }
  &.is-active {
    background: var(--accent-s);
    color: var(--accent);
    border-color: var(--accent);
  }
  &.is-danger.is-active {
    background: var(--red-s);
    color: var(--red);
    border-color: var(--red);
  }
}

.sync-note {
  margin-top: 0.75rem;
  font-size: 0.625rem;
  color: var(--text-4);
  line-height: 1.5;
}
</style>

<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

defineProps<{
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <BaseModal
    :open="open"
    :title="title ?? 'Confirm'"
    width="360px"
    @close="emit('cancel')"
  >
    <p class="msg">{{ message }}</p>
    <template #footer>
      <BaseButton variant="ghost" size="sm" @click="emit('cancel')">
        {{ cancelLabel ?? 'Cancel' }}
      </BaseButton>
      <BaseButton :variant="danger ? 'danger' : 'accent'" size="sm" @click="emit('confirm')">
        {{ confirmLabel ?? 'Confirm' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.msg {
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.5;
}
</style>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="$emit('cancel')">
        <div class="modal sm">
          <div class="modal-header">
            <h3 class="modal-title">{{ title }}</h3>
            <button class="modal-close" @click="$emit('cancel')">✕</button>
          </div>
          <div class="modal-body">
            <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.6">{{ message }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn" @click="$emit('cancel')">Cancelar</button>
            <button class="btn" :class="danger ? 'btn-danger-solid' : 'btn-primary'" @click="$emit('confirm')">
              {{ confirmLabel || 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  show: Boolean,
  title: { type: String, default: 'Confirmar acção' },
  message: String,
  confirmLabel: String,
  danger: Boolean,
})
defineEmits(['confirm', 'cancel'])
</script>

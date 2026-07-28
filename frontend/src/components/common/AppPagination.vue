<template>
  <div class="app-pagination">
    <label class="app-pagination-size">
      <span class="muted">Mostrar</span>
      <select class="input" :value="pageSize" @change="onSizeChange">
        <option v-for="s in sizeOptions" :key="s" :value="s">{{ s }}</option>
      </select>
      <span class="muted">de {{ total }} registos</span>
    </label>
    <div class="app-pagination-nav" v-if="totalPages > 1">
      <button class="btn btn-sm btn-page-arrow" :disabled="page<=1" @click="$emit('update:page', page-1)" aria-label="Página anterior">←</button>
      <span class="muted" style="font-size:12px;white-space:nowrap">Página {{ page }} de {{ totalPages }}</span>
      <button class="btn btn-sm btn-page-arrow" :disabled="page>=totalPages" @click="$emit('update:page', page+1)" aria-label="Próxima página">→</button>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({
  page: { type: Number, required: true },
  total: { type: Number, required: true },
  pageSize: { type: Number, default: 10 },
  sizeOptions: { type: Array, default: () => [5, 10, 25, 50, 100] },
})
const emit = defineEmits(['update:page', 'update:pageSize'])
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
function onSizeChange(e) {
  emit('update:pageSize', Number(e.target.value))
  emit('update:page', 1)
}
</script>
<style scoped>
.app-pagination{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:12px 4px 2px}
.app-pagination-size{display:flex;align-items:center;gap:6px;font-size:12px}
.app-pagination-size select{padding:2px 8px;font-size:12px;width:auto}
.app-pagination-nav{display:flex;align-items:center;gap:12px}
.btn-page-arrow{font-weight:700;line-height:1;padding:4px 10px}
</style>

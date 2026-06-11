<template>
  <div class="loading-wrap">
    <div class="spinner-ring"></div>
    <span v-if="label" style="font-size:12px;color:var(--mk-text-2)">{{ label }}</span>
  </div>
</template>
<script setup>
defineProps({ label: String, size: { type: String, default: 'md' } })
</script>
<style scoped>
.loading-wrap { display:flex; align-items:center; gap:10px; justify-content:center; padding:32px; }
.spinner-ring {
  width:22px; height:22px; border-radius:50%;
  border:2.5px solid rgba(26,111,245,.2);
  border-top-color:var(--blue-600);
  animation:spin .6s linear infinite; flex-shrink:0;
}
@keyframes spin { to { transform:rotate(360deg); } }
</style>

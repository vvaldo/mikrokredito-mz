<!-- LoadingSpinner.vue -->
<template>
  <div class="loading-wrap">
    <svg class="spinner" width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M11 2a9 9 0 010 18" stroke-linecap="round"/>
    </svg>
    <span v-if="label" class="text-sm text-muted">{{ label }}</span>
  </div>
</template>
<script setup>
defineProps({ label: String })
</script>
<style scoped>
.loading-wrap{display:flex;align-items:center;gap:8px;justify-content:center;padding:40px;color:var(--color-text-secondary)}
.spinner{animation:spin .7s linear infinite;color:var(--mk-brand-600,#185FA5)}
@keyframes spin{to{transform:rotate(360deg)}}
</style>

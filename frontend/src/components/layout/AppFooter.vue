<template>
  <footer class="app-footer">
    <div>
      <strong>{{ brand.name }}</strong> — {{ brand.tagline }}
    </div>
    <div>
      <a href="https://www.otech.co.mz" target="_blank" rel="noopener" style="color:var(--blue-400)">
        {{ brand.poweredBy }}
      </a>
    </div>
  </footer>
</template>
<script setup>
import { useBrandingStore } from '@/stores/branding'
const brand = useBrandingStore()
</script>

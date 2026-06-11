<template>
  <nav class="sidebar" :class="{ open: isOpen }">
    <div class="sidebar-section">
      <template v-for="item in items" :key="item.tab ?? item._key">
        <div v-if="item.sep" class="sidebar-sep" />
        <div v-else
          class="sidebar-item"
          :class="{ active: activeTab === item.tab }"
          @click="handleClick(item)">
          <span v-html="item.icon" />
          <span class="truncate">{{ item.label }}</span>
          <span v-if="item.count" class="badge-count">{{ item.count }}</span>
        </div>
      </template>
    </div>
  </nav>
</template>
<script setup>
const props = defineProps({ items: Array, activeTab: String, isOpen: Boolean })
const emit  = defineEmits(['set-tab', 'close'])
function handleClick(item) {
  emit('set-tab', item.tab)
  emit('close')
}
</script>
